"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CaseRow } from "@/components/mobile/CaseRow";
import { FilterChips } from "@/components/mobile/FilterChips";
import { GroupedList } from "@/components/mobile/GroupedList";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { MenuButton } from "@/components/mobile/MenuButton";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { SearchField } from "@/components/mobile/SearchField";
import { SummaryCards } from "@/components/mobile/SummaryCards";
import { applyFilter, DEFAULT_FILTER, isFilterActive, PAGE_SIZE, SORT_KEYS, summarize, type CaseFilter, type SortKey } from "@/lib/caseMetrics";
import { activeCard, cardFilter, readFilter, readPage, toQueryWithPage } from "@/lib/caseListQuery";
import { useLabels } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { ensureLoaded, useCan, useCases, useStoreError, useStoreLoaded } from "@/lib/store";
import { PROCEDURE_TYPES, WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/types";

/** 検索語を URL へ反映するまでの待ち時間（components/CaseFilters.tsx と同じ） */
const SEARCH_DEBOUNCE_MS = 300;

/** 並び替えメニューの文言（SortKey に値を足すと、ここの漏れを tsc が検出する） */
const SORT_LABEL_KEYS: Record<SortKey, MessageKey> = {
  updated: "mobile.casesSortUpdated",
  updatedAsc: "mobile.casesSortUpdatedAsc",
  expiry: "mobile.casesSortExpiry",
  expiryDesc: "mobile.casesSortExpiryDesc",
  name: "mobile.casesSortName",
  nameDesc: "mobile.casesSortNameDesc",
  applicant: "mobile.casesSortApplicant",
  applicantDesc: "mobile.casesSortApplicantDesc",
};

/** 条件チップ（複数選択）。value は URL のクエリ名ではなく CaseFilter の項目名 */
const CONDITIONS = [
  { value: "within30", label: "caseList.within30" },
  { value: "missingDocs", label: "caseList.missingDocs" },
  { value: "unconfirmed", label: "caseList.unconfirmed" },
  { value: "checksPending", label: "caseList.checksPending" },
  { value: "noCard", label: "caseList.noCard" },
] as const satisfies readonly { value: keyof CaseFilter; label: MessageKey }[];

/**
 * 案件一覧（iPhone 版）。PC 版 app/cases/page.tsx と同じ論理（readFilter / applyFilter / summarize / cardFilter / activeCard /
 * toQueryWithPage）で絞り込み、URL のクエリも同じ名前（q・procedure・status・within30・missing・nocard・unconfirmed・checks・sort・page）。
 * データは lib/store.ts のフックだけを通す。
 *
 * PC 版との違い：
 * - ページ送りは「さらに読み込む」方式。page=N は「N ページ目だけ」ではなく「先頭から N ページ分（PAGE_SIZE 件ずつ）」を表す。
 * - 「在留カード未登録」の絞り込み（nocard）でも、まとめてアップロードの欄は出さず、通常の一覧で示す（アップロードは PC 版の画面で行う）。
 * - 行の移動先は iPhone 版の詳細 /m/cases/[id]、新規登録は /m/cases/new。
 */
function CasesView() {
  const t = useT();
  const labels = useLabels();
  const router = useRouter();
  const params = useSearchParams();
  const cases = useCases();
  const loaded = useStoreLoaded();
  const error = useStoreError();
  const canEdit = useCan("edit");

  const filter = useMemo(() => readFilter(new URLSearchParams(params.toString())), [params]);
  const requestedPage = readPage(new URLSearchParams(params.toString()));
  const summary = useMemo(() => summarize(cases), [cases]);
  const rows = useMemo(() => applyFilter(cases, filter), [cases, filter]);
  const active = isFilterActive(filter);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const shown = rows.slice(0, page * PAGE_SIZE);

  // 絞り込み・並び順を変えたときは、先頭（page なし）に戻す。
  const go = (f: CaseFilter, p = 1) => {
    router.replace(`/m/cases${toQueryWithPage(f, p)}`, { scroll: false });
  };

  // 検索欄：入力欄の状態で表示し、URL への反映は、変換の確定・入力の停止・Enter のときに行う（変換中は反映しない）。
  const [text, setText] = useState(filter.query);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushed = useRef(filter.query); // 最後に URL へ反映した（または URL から受け取った）検索語
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  const filterRef = useRef(filter);
  useEffect(() => {
    filterRef.current = filter;
  });
  const cancelTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const push = (value: string) => {
    cancelTimer();
    if (value === pushed.current) return;
    pushed.current = value;
    goRef.current({ ...filterRef.current, query: value });
  };
  // 戻る・進む、リセット、カードの選択などによる URL 側の変更を入力欄へ反映する（自分が反映した値の戻りは無視する）。
  useEffect(() => {
    if (filter.query === pushed.current) return;
    pushed.current = filter.query;
    cancelTimer();
    composing.current = false;
    setText(filter.query);
  }, [filter.query]);
  useEffect(() => cancelTimer, []);

  // 他の条件を変えたときは、未反映の検索語も同時に反映する。
  const change = (patch: Partial<CaseFilter>) => {
    cancelTimer();
    if (composing.current || text === pushed.current) return go({ ...filter, ...patch });
    pushed.current = text;
    go({ ...filter, ...patch, query: text });
  };
  const reset = () => {
    cancelTimer();
    composing.current = false;
    pushed.current = "";
    setText("");
    go(DEFAULT_FILTER);
  };

  const statusOptions = [
    { value: "all", label: t("mobile.casesAll") },
    ...(Object.keys(WORKFLOW_LABELS) as WorkflowStatus[]).map((k) => ({ value: k, label: labels.workflow(k) })),
  ];
  const procedureOptions = [{ value: "all", label: t("mobile.casesAll") }, ...PROCEDURE_TYPES.map((p) => ({ value: p.value, label: p.label }))];
  const conditionOptions = CONDITIONS.map((c) => ({ value: c.value, label: t(c.label) }));
  const selectedConditions = CONDITIONS.filter((c) => filter[c.value]).map((c) => c.value);

  const header = (
    <LargeTitleHeader
      title={t("mobile.tabCases")}
      trailing={
        <MenuButton
          label={t("mobile.casesSortLabel")}
          title={t("mobile.casesSortTitle")}
          value={filter.sort}
          options={SORT_KEYS.map((k) => ({ value: k, label: t(SORT_LABEL_KEYS[k]) }))}
          onSelect={(v) => change({ sort: v as SortKey })}
        />
      }
    />
  );

  // 読み込み中・失敗（案件が空のときだけ。読み込み済みなら、失敗しても手元の一覧を出す）
  if (!loaded) {
    return (
      <>
        {header}
        <PullToRefresh onRefresh={ensureLoaded}>
          <div className="mx-4 my-4">
            {error ? (
              <div role="alert" className="rounded-[10px] bg-red-50 p-4 text-sm text-red-800">
                <p>{t("caseList.loadError")}</p>
                <button type="button" onClick={() => void ensureLoaded()} className="mt-2 min-h-[44px] rounded-full border border-red-300 bg-white px-4 font-bold">
                  {t("mobile.casesRetry")}
                </button>
              </div>
            ) : (
              <p role="status" className="py-10 text-center text-sm text-slate-600">
                {t("caseList.loading")}
              </p>
            )}
          </div>
        </PullToRefresh>
      </>
    );
  }

  let empty = "";
  if (rows.length === 0) empty = cases.length === 0 ? t("caseList.noCases") : t("caseList.noMatch");

  return (
    <>
      {header}
      {/*
        引いて再読み込み：lib/store.ts には、読み込み済みのデータを取り直す関数が無い（ensureLoaded は読み込み済みなら何もしない。
        resetStore は権限などを一度消してしまう）。store.ts は今回の担当外のため、ensureLoaded を渡す。
        読み込みに失敗した後の再試行にはなるが、成功済みの一覧の最新化にはならない。取り直す関数ができたら onRefresh を差し替える。
      */}
      <PullToRefresh onRefresh={ensureLoaded}>
        <div className="px-4">
          <div onCompositionStart={() => { composing.current = true; cancelTimer(); }} onCompositionEnd={(e) => { composing.current = false; push((e.target as HTMLInputElement).value); }}>
            <div>
              <SearchField
                value={text}
                label={t("caseList.searchLabel")}
                placeholder={t("mobile.casesSearchPlaceholder")}
                onChange={(v) => {
                  setText(v);
                  if (composing.current) return;
                  cancelTimer();
                  // 消去ボタン（""）は待たずに反映する
                  if (v === "") push("");
                  else timer.current = setTimeout(() => push(v), SEARCH_DEBOUNCE_MS);
                }}
                onSubmit={() => {
                  if (!composing.current) push(text);
                }}
              />
            </div>
          </div>
          <div className="mt-3">
            <SummaryCards summary={summary} active={activeCard(filter)} onSelect={(k) => { cancelTimer(); composing.current = false; pushed.current = ""; setText(""); go(cardFilter(k)); }} ariaLabel={t("mobile.casesSummaryAria")} />
          </div>
          <FilterChips ariaLabel={t("mobile.casesStatusChipsAria")} options={statusOptions} selected={[filter.status]} onChange={([v]) => change({ status: v })} />
          <FilterChips ariaLabel={t("mobile.casesProcedureChipsAria")} options={procedureOptions} selected={[filter.procedure]} onChange={([v]) => change({ procedure: v })} />
          <FilterChips
            ariaLabel={t("mobile.casesConditionChipsAria")}
            options={conditionOptions}
            selected={selectedConditions}
            multiple
            onChange={(next) => change(Object.fromEntries(CONDITIONS.map((c) => [c.value, next.includes(c.value)])))}
          />
        </div>

        <p className="mx-4 mt-3 px-4 text-sm font-bold" role="status" aria-live="polite">
          {t("caseList.resultCount", { count: rows.length, total: cases.length })}
        </p>

        {empty ? (
          <div role="status" className="mx-4 my-4 rounded-[10px] bg-white px-4 py-10 text-center text-sm text-slate-600">
            <p>{empty}</p>
            {cases.length > 0 && active && (
              <button type="button" onClick={reset} className="mt-2 min-h-[44px] px-4 font-bold text-accent">
                {t("caseList.resetConditions")}
              </button>
            )}
            {/* 新規登録は権限（useCan）に従う */}
            {cases.length === 0 && canEdit && (
              <Link href="/m/cases/new" className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-accent px-5 text-sm font-bold text-accent-text">
                {t("caseList.newCase")}
              </Link>
            )}
          </div>
        ) : (
          <GroupedList ariaLabel={t("mobile.casesListAria")} footer={t("caseList.disclaimer")}>
            {shown.map((row) => (
              <CaseRow key={row.record.id} row={row} />
            ))}
          </GroupedList>
        )}

        {shown.length < rows.length && (
          <div className="mx-4 flex flex-col items-center gap-1 pb-2">
            <p className="text-xs text-slate-600" role="status">
              {t("mobile.casesShownOf", { shown: shown.length, total: rows.length })}
            </p>
            <button
              type="button"
              onClick={() => go(filter, page + 1)}
              className="min-h-[44px] w-full rounded-[10px] bg-white px-4 text-base font-bold text-accent active:bg-slate-100"
            >
              {t("mobile.casesLoadMore")}
            </button>
          </div>
        )}
      </PullToRefresh>
    </>
  );
}

function Fallback() {
  const t = useT();
  return (
    <p role="status" className="px-4 py-10 text-center text-sm text-slate-600">
      {t("caseList.loading")}
    </p>
  );
}

export default function MobileCasesPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CasesView />
    </Suspense>
  );
}
