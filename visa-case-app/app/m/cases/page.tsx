"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { CaseRow } from "@/components/mobile/CaseRow";
import { CaseFilterSheet, countActiveConditions } from "@/components/mobile/CaseFilterSheet";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { LoadingSpinner } from "@/components/mobile/LoadingSpinner";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { SearchField } from "@/components/mobile/SearchField";
import { groupHeads as buildGroupHeads, orderRowsByGroup } from "@/lib/caseGroups";
import { applyFilter, DEFAULT_FILTER, isFilterActive, PAGE_SIZE, type CaseFilter } from "@/lib/caseMetrics";
import { readFilter, readPage, toQueryWithPage } from "@/lib/caseListQuery";
import { useT } from "@/lib/i18n/LanguageProvider";
import { ensureLoaded, refetch, useCan, useCases, useGroups, useStoreError, useStoreLoaded } from "@/lib/store";

/** グループの見出し（フォルダの印・名前・件数。GroupedList の header に置く） */
function GroupHeading({ name, count }: { name: string; count: number }) {
  const t = useT();
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2.5 5.5a1 1 0 0 1 1-1h4l1.5 2h7.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" strokeLinejoin="round" />
      </svg>
      <span className="min-w-0 break-words">{name}</span>
      <span className="shrink-0 font-normal">{t("caseGroup.countLabel", { count })}</span>
    </span>
  );
}

/** 検索語を URL へ反映するまでの待ち時間（components/CaseFilters.tsx と同じ） */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 案件一覧（iPhone 版）。PC 版 app/cases/page.tsx と同じ論理（readFilter / applyFilter / summarize / cardFilter / activeCard /
 * toQueryWithPage）で絞り込み、URL のクエリも同じ名前（q・procedure・status・within30・missing・nocard・unconfirmed・checks・sort・page）。
 * データは lib/store.ts のフックだけを通す。
 *
 * PC 版との違い：
 * - 画面の上は、大見出し・件数の 1 行・検索欄（と絞り込みボタン）・一覧だけ。要点カード・状態のチップ・メニューは置かない。
 *   状態・手続の種類・条件（期限 30 日以内など、要点カードの近道を含む）・並び順は、検索欄の横のボタンで開く 1 つのシート（CaseFilterSheet）に入れる。
 * - ページ送りは「さらに読み込む」方式。page=N は「N ページ目だけ」ではなく「先頭から N ページ分（PAGE_SIZE 件ずつ）」を表す。
 * - 「在留カード未登録」の絞り込み（nocard）でも、まとめてアップロードの欄は出さず、通常の一覧で示す（アップロードは PC 版の画面で行う）。
 * - 行の移動先は iPhone 版の詳細 /m/cases/[id]、新規登録は /m/cases/new。
 */
function CasesView() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const cases = useCases();
  const groups = useGroups();
  const loaded = useStoreLoaded();
  const error = useStoreError();
  const canEdit = useCan("edit");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filter = useMemo(() => readFilter(new URLSearchParams(params.toString())), [params]);
  const requestedPage = readPage(new URLSearchParams(params.toString()));
  // グループに入っている案件は、グループごとにまとめた並びにする（グループ外は従来どおり。「さらに読み込む」もこの並びで進む）
  const rows = useMemo(() => orderRowsByGroup(applyFilter(cases, filter), groups), [cases, filter, groups]);
  const groupHeads = useMemo(() => buildGroupHeads(rows, groups), [rows, groups]);
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

  // ナビゲーションバー右：新規登録は「操作」なので、タブでなく「+」に置く（権限があるときだけ）。
  const header = (
    <LargeTitleHeader
      title={t("mobile.tabCases")}
      trailing={
        canEdit ? (
          <Link href="/m/cases/new" aria-label={t("mobile.newCase")} className="flex h-11 w-11 items-center justify-center rounded-full text-accent">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        ) : undefined
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

  const resultText = t("caseList.resultCount", { count: rows.length, total: cases.length });
  const activeCount = countActiveConditions(filter);

  // 表示する行を、グループごと（連続する同じグループ）と、グループ外の連なりに分ける
  const segments: { groupId: string | null; rows: typeof shown }[] = [];
  for (const row of shown) {
    const gid = row.record.groupId && groupHeads.has(row.record.groupId) ? row.record.groupId : null;
    const prev = segments[segments.length - 1];
    if (prev && prev.groupId === gid) prev.rows.push(row);
    else segments.push({ groupId: gid, rows: [row] });
  }

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
      {/* 件数は大見出しの下に 1 行だけ（並び順は絞り込みシートで確認する） */}
      <p className="mx-4 text-sm font-bold" role="status" aria-live="polite">
        {resultText}
      </p>

      {/* 入口：期限が近い順の閲覧用一覧（/m/deadlines） */}
      <GroupedList>
        <GroupedRow href="/m/deadlines" title={t("mobileDeadlines.title")} subtitle={t("mobileDeadlines.entryNote")} />
      </GroupedList>

      <div className="mt-2 px-4">
        <div className="flex items-start gap-1">
          <div
            className="min-w-0 flex-1"
            onCompositionStart={() => { composing.current = true; cancelTimer(); }}
            onCompositionEnd={(e) => { composing.current = false; push((e.target as HTMLInputElement).value); }}
          >
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
          {/* 絞り込みと並び替えのシートを開く。指定中の数は、数字（文字）と読み上げ名で示す */}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label={activeCount > 0 ? t("mobile.casesFilterButtonAriaCount", { count: activeCount }) : t("mobile.casesFilterButtonAria")}
            onClick={() => setSheetOpen(true)}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-full px-2 text-accent"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
            {activeCount > 0 && (
              <span aria-hidden="true" className="min-w-[1.5rem] rounded-full bg-accent px-1.5 text-center text-sm font-bold leading-6 text-accent-text">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>
      {sheetOpen && <CaseFilterSheet filter={filter} onChange={change} onReset={reset} onClose={() => setSheetOpen(false)} resultText={resultText} />}

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
        <>
          {segments.map((seg, i) => {
            const last = i === segments.length - 1;
            const head = seg.groupId ? groupHeads.get(seg.groupId) : undefined;
            return (
              <GroupedList
                key={`${seg.groupId ?? "none"}-${seg.rows[0].record.id}`}
                ariaLabel={head ? undefined : t("mobile.casesListAria")}
                header={head ? <GroupHeading name={head.name} count={head.count} /> : undefined}
                footer={last ? t("caseList.disclaimer") : undefined}
              >
                {seg.rows.map((row) => (
                  <CaseRow key={row.record.id} row={row} inGroup={!!head} />
                ))}
              </GroupedList>
            );
          })}
        </>
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
