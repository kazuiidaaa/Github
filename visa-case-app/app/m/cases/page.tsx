"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { CaseRow } from "@/components/mobile/CaseRow";
import { FilterChips } from "@/components/mobile/FilterChips";
import { GroupedList } from "@/components/mobile/GroupedList";
import { LoadingSpinner } from "@/components/mobile/LoadingSpinner";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { MenuButton } from "@/components/mobile/MenuButton";
import { SearchField } from "@/components/mobile/SearchField";
import { SummaryCards } from "@/components/mobile/SummaryCards";
import { applyFilter, DEFAULT_FILTER, isFilterActive, PAGE_SIZE, SORT_KEYS, summarize, type CaseFilter, type SortKey } from "@/lib/caseMetrics";
import { activeCard, cardFilter, readFilter, readPage, toQueryWithPage } from "@/lib/caseListQuery";
import { useLabels } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { ensureLoaded, refetch, useCan, useCases, useStoreError, useStoreLoaded } from "@/lib/store";
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

type ConditionKey = (typeof CONDITIONS)[number]["value"];

/**
 * 案件一覧（iPhone 版）。PC 版 app/cases/page.tsx と同じ論理（readFilter / applyFilter / summarize / cardFilter / activeCard /
 * toQueryWithPage）で絞り込み、URL のクエリも同じ名前（q・procedure・status・within30・missing・nocard・unconfirmed・checks・sort・page）。
 * データは lib/store.ts のフックだけを通す。
 *
 * PC 版との違い：
 * - 絞り込みは、状態のチップ 1 列を残し、手続の種類と条件はメニュー（MenuButton）に入れる。
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
  const [refreshFailed, setRefreshFailed] = useState(false);

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

  const sortLabel = t(SORT_LABEL_KEYS[filter.sort]);
  const procedureLabel = filter.procedure === "all" ? t("mobile.casesAll") : (PROCEDURE_TYPES.find((p) => p.value === filter.procedure)?.label ?? filter.procedure);

  // ナビゲーションバー右：新規登録は「操作」なので、タブでなく「+」に置く（権限があるときだけ）。並び替えは上下矢印の記号で、現在の並び順も読み上げる
  const header = (
    <LargeTitleHeader
      title={t("mobile.tabCases")}
      trailing={
        <div className="flex items-center">
          <MenuButton
            icon="sort"
            label={t("mobile.casesSortButtonAria", { label: sortLabel })}
            title={t("mobile.casesSortTitle")}
            value={filter.sort}
            options={SORT_KEYS.map((k) => ({ value: k, label: t(SORT_LABEL_KEYS[k]) }))}
            onSelect={(v) => change({ sort: v as SortKey })}
          />
          {canEdit && (
            <Link href="/m/cases/new" aria-label={t("mobile.newCase")} className="flex h-11 w-11 items-center justify-center rounded-full text-accent">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          )}
        </div>
      }
    />
  );

  // 読み込み中・失敗（案件が空のときだけ。読み込み済みなら、失敗しても手元の一覧を出す）
  if (!loaded) {
    return (
      <>
        {header}
        <div className="mx-4 my-4">
          {error ? (
            <div role="alert" className="rounded-[10px] bg-red-50 p-4 text-sm text-red-800">
              <p>{t("caseList.loadError")}</p>
              <button type="button" onClick={() => void ensureLoaded()} className="mt-2 min-h-[44px] rounded-full border border-red-300 bg-white px-4 font-bold">
                {t("mobile.casesRetry")}
              </button>
            </div>
          ) : (
            <LoadingSpinner />
          )}
        </div>
      </>
    );
  }

  // 引いて更新：store の再取得。失敗は文字で伝え（手元の一覧は残す）、PullToRefresh には失敗として返す（「更新しました」を出さない）
  const onRefresh = async () => {
    setRefreshFailed(false);
    if (!(await refetch())) {
      setRefreshFailed(true);
      throw new Error("refresh failed");
    }
  };

  let empty = "";
  if (rows.length === 0) empty = cases.length === 0 ? t("caseList.noCases") : t("caseList.noMatch");

  return (
    <PullToRefresh onRefresh={onRefresh}>
      {header}
      {refreshFailed && (
        <p role="alert" className="mx-4 mt-2 rounded-[10px] bg-red-50 p-3 text-sm text-red-800">
          {t("mobile.refreshFailed")}
        </p>
      )}
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
        {/* 手続の種類・条件はメニューへ。現在の選択を、ボタンの文字で示す */}
        <div className="flex flex-wrap gap-x-2">
          <MenuButton
            align="start"
            buttonText={t("mobile.casesProcedureButton", { value: procedureLabel })}
            label={t("mobile.casesProcedureChipsAria")}
            title={t("mobile.casesProcedureChipsAria")}
            value={filter.procedure}
            options={procedureOptions}
            onSelect={(v) => change({ procedure: v })}
          />
          <MenuButton
            align="start"
            buttonText={selectedConditions.length > 0 ? t("mobile.casesConditionButtonCount", { count: selectedConditions.length }) : t("mobile.casesConditionButton")}
            label={t("mobile.casesConditionChipsAria")}
            title={t("mobile.casesConditionChipsAria")}
            checked={selectedConditions}
            options={conditionOptions}
            onSelect={(v) => {
              const next = selectedConditions.includes(v as ConditionKey) ? selectedConditions.filter((c) => c !== v) : [...selectedConditions, v as ConditionKey];
              change(Object.fromEntries(CONDITIONS.map((c) => [c.value, next.includes(c.value)])));
            }}
          />
        </div>
      </div>

      <p className="mx-4 mt-3 px-4 text-sm" role="status" aria-live="polite">
        <span className="font-bold">{t("caseList.resultCount", { count: rows.length, total: cases.length })}</span>
        <span className="text-slate-600"> ・ {t("mobile.casesSortedBy", { label: sortLabel })}</span>
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
  );
}

export default function MobileCasesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CasesView />
    </Suspense>
  );
}
