"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { CaseFilters } from "@/components/CaseFilters";
import { DashboardCards, type CardKey } from "@/components/DashboardCards";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { UploadBox } from "@/components/UploadBox";
import { Badge } from "@/components/ui";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import {
  applyFilter,
  DEFAULT_FILTER,
  isFilterActive,
  isSortKey,
  nextSort,
  PAGE_SIZE,
  paginate,
  sortState,
  summarize,
  type CaseFilter,
  type SortColumn,
} from "@/lib/caseMetrics";
import { hasResidenceCard } from "@/lib/documentKinds";
import { formatDateTime } from "@/lib/format";
import { useCan, useCases, useStoreError, useStoreLoaded } from "@/lib/store";
import { getTargetStatusDisplay, PROCEDURE_TYPES, type CaseRecord } from "@/lib/types";
import type { CaseMetrics } from "@/lib/caseMetrics";

function readFilter(p: URLSearchParams): CaseFilter {
  return {
    query: p.get("q") ?? "",
    procedure: p.get("procedure") ?? "all",
    status: p.get("status") ?? "all",
    within30: p.get("within30") === "1",
    missingDocs: p.get("missing") === "1",
    noCard: p.get("nocard") === "1",
    unconfirmed: p.get("unconfirmed") === "1",
    checksPending: p.get("checks") === "1",
    sort: isSortKey(p.get("sort")) ? (p.get("sort") as CaseFilter["sort"]) : "updated",
  };
}

/** URL の page を読む。不正な値は 1 とする。 */
function readPage(p: URLSearchParams): number {
  const n = Number(p.get("page"));
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function toQuery(f: CaseFilter): string {
  const p = new URLSearchParams();
  if (f.query) p.set("q", f.query);
  if (f.procedure !== "all") p.set("procedure", f.procedure);
  if (f.status !== "all") p.set("status", f.status);
  if (f.within30) p.set("within30", "1");
  if (f.missingDocs) p.set("missing", "1");
  if (f.noCard) p.set("nocard", "1");
  if (f.unconfirmed) p.set("unconfirmed", "1");
  if (f.checksPending) p.set("checks", "1");
  if (f.sort !== "updated") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "?";
}

/** 並び替えの見出し。押すと並び順を切り替える（aria-sort は th に付ける）。 */
function SortHeader({ column, label, filter, onSort }: { column: SortColumn; label: string; filter: CaseFilter; onSort: (k: CaseFilter["sort"]) => void }) {
  const st = sortState(filter.sort);
  const current = st.column === column;
  const dirLabel = column === "expiry" ? (st.dir === "asc" ? "近い順" : "遠い順") : st.dir === "asc" ? "昇順" : "降順";
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-3"
      aria-sort={current ? (st.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button type="button" onClick={() => onSort(nextSort(filter.sort, column))} className="inline-flex items-center gap-1 font-bold hover:underline">
        {label}
        <span aria-hidden="true" className={current ? "" : "text-slate-400"}>
          {current ? (st.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
        <span className="sr-only">{current ? `（現在：${dirLabel}。押すと並び順を反転）` : "（押すと並び替え）"}</span>
      </button>
    </th>
  );
}

/** ダッシュボードのカードに対応する絞り込みを返す */
function cardFilter(key: CardKey): CaseFilter {
  const f = { ...DEFAULT_FILTER };
  if (key === "review") f.status = "review_required";
  if (key === "checksPending") f.checksPending = true;
  if (key === "ready") f.status = "application_ready";
  if (key === "missingDocs") f.missingDocs = true;
  if (key === "unconfirmed") f.unconfirmed = true;
  if (key === "within30") {
    f.within30 = true;
    f.sort = "expiry";
  }
  return f;
}

function activeCard(f: CaseFilter): CardKey | null {
  const keys: CardKey[] = ["total", "review", "missingDocs", "unconfirmed", "checksPending", "ready", "within30"];
  return keys.find((k) => toQuery(cardFilter(k)) === toQuery(f)) ?? null;
}

const procedureLabel = (c: CaseRecord) => PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label;

/** 一覧の「在留資格」表示。確認済みでない申請人情報の値（または案件側の値）には「未確認」を付ける。 */
function ResidenceStatusCell({ record: c }: { record: CaseRecord }) {
  const value = c.applicant.residenceStatus || c.currentStatus;
  if (!value) return <>-</>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {value}
      {c.applicant.confirmationStatus !== "confirmed" && <Badge tone="gray">未確認</Badge>}
    </span>
  );
}

/** 変更後（希望）の在留資格の値。未入力は「未入力」と表示する。 */
function TargetStatusValue({ value }: { value: string | null }) {
  return <>{value ?? <span className="text-slate-400">未入力</span>}</>;
}

/** 表（md 以上）：在留資格セルの2行目。表示対象外の手続種別では何も出さない。 */
function TargetStatusLine({ record: c }: { record: CaseRecord }) {
  const target = getTargetStatusDisplay(c.procedureType, c.targetStatus);
  if (!target) return null;
  return (
    <p className="mt-1 text-xs text-slate-600">
      <span className="text-slate-500">{target.tableLabel}</span>
      <TargetStatusValue value={target.value} />
    </p>
  );
}

/** カード（md 未満）：dl の1項目。表示対象外の手続種別では何も出さない。 */
function TargetStatusItem({ record: c }: { record: CaseRecord }) {
  const target = getTargetStatusDisplay(c.procedureType, c.targetStatus);
  if (!target) return null;
  return (
    <>
      <dt className="text-slate-500">{target.cardLabel}</dt>
      <dd>
        <TargetStatusValue value={target.value} />
      </dd>
    </>
  );
}

function StatusBadges({ record: c, metrics: m }: { record: CaseRecord; metrics: CaseMetrics }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <WorkflowBadge status={c.workflowStatus} />
      {m.missingCount > 0 && <Badge tone="yellow">未受領書類 {m.missingCount}件</Badge>}
      {m.unconfirmed && <Badge tone="gray">申請人情報 確認未了</Badge>}
      {m.checksPending && <Badge tone="gray">申請前チェック未完了</Badge>}
    </div>
  );
}

function CasesView() {
  const cases = useCases();
  const loaded = useStoreLoaded();
  const error = useStoreError();
  const router = useRouter();
  const canEdit = useCan("edit");
  const params = useSearchParams();

  const filter = useMemo(() => readFilter(new URLSearchParams(params.toString())), [params]);
  const summary = useMemo(() => summarize(cases), [cases]);
  const rows = useMemo(() => applyFilter(cases, filter), [cases, filter]);
  const pageData = useMemo(() => paginate(rows, readPage(new URLSearchParams(params.toString()))), [rows, params]);
  const shown = pageData.items;
  const active = isFilterActive(filter);
  const pendingCount = useMemo(() => cases.filter((c) => !hasResidenceCard(c)).length, [cases]);

  // 絞り込み・並び順を変えたときは、1ページ目に戻す（page を付けない）。
  const go = (f: CaseFilter, page = 1) => {
    const q = toQuery(f);
    const withPage = page > 1 ? `${q === "?" ? "?" : `${q}&`}page=${page}` : q;
    router.replace(`/cases${withPage}`, { scroll: false });
  };

  let empty = "";
  if (rows.length === 0) {
    if (!loaded) empty = error ? "案件を読み込めませんでした。時間をおいて再度お試しください。" : "読み込み中……";
    else if (cases.length === 0) empty = "案件がありません。「新規案件」から作成してください。";
    else empty = "該当する案件がありません。";
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">案件一覧</h1>
        {canEdit && (
          <Link href="/cases/new" className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-text hover:bg-accent-hover">
            新規案件
          </Link>
        )}
      </div>
      {loaded && <DashboardCards summary={summary} active={activeCard(filter)} onSelect={(k) => go(cardFilter(k))} />}
      <CaseFilters filter={filter} active={active} onChange={(patch) => go({ ...filter, ...patch })} onReset={() => go(DEFAULT_FILTER)} />
      <p className="mb-2 text-xs text-slate-500">
        期限の表示は業務上の注意喚起です。申請の可否や許可の見込みを示すものではありません。
      </p>
      {filter.noCard && (
        <section aria-label="在留カードのまとめてアップロード" className="mb-6">
          <p className="mb-2 text-sm font-medium" role="status">
            在留カード未登録：残り {pendingCount} 件
            {rows.length !== pendingCount && <span className="ml-2 font-normal text-slate-500">（絞り込み結果 {rows.length} 件）</span>}
          </p>
          {!canEdit && <p className="mb-2 text-xs text-slate-500">閲覧のみの権限のため、アップロードはできません。</p>}
          {empty ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
              {loaded && cases.length > 0 && pendingCount === 0 ? "在留カードが未登録の案件はありません。" : empty}
            </p>
          ) : (
            <ul className="anim-stagger space-y-3">
              {rows.map(({ record: c }) => (
                <li key={c.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-[1fr_2fr] md:items-center">
                  <div>
                    <Link href={`/cases/${c.id}`} className="font-medium text-blue-700 hover:underline">
                      {c.caseName}
                    </Link>
                    <p className="mt-1 text-slate-600">{c.applicant.legalName || <span className="text-slate-400">未入力</span>}</p>
                    <p className="text-xs text-slate-500">{procedureLabel(c)}</p>
                  </div>
                  {canEdit && <UploadBox caseId={c.id} compact onUploaded={() => {}} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {!filter.noCard && (
        <>
      {loaded && (
        <p className="mb-2 text-sm font-medium" role="status" aria-live="polite">
          該当 {rows.length} 件（全 {cases.length} 件）
          {pageData.totalPages > 1 && (
            <span className="ml-2 font-normal text-slate-500">
              {(pageData.page - 1) * PAGE_SIZE + 1}〜{(pageData.page - 1) * PAGE_SIZE + shown.length} 件目を表示
            </span>
          )}
        </p>
      )}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">案件一覧</caption>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <SortHeader column="name" label="案件名" filter={filter} onSort={(sort) => go({ ...filter, sort })} />
              <SortHeader column="applicant" label="申請人氏名" filter={filter} onSort={(sort) => go({ ...filter, sort })} />
              <th scope="col" className="whitespace-nowrap px-4 py-3">手続種別</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3">在留資格</th>
              <SortHeader column="expiry" label="在留期限" filter={filter} onSort={(sort) => go({ ...filter, sort })} />
              <th scope="col" className="whitespace-nowrap px-4 py-3">状況</th>
              <SortHeader column="updated" label="最終更新" filter={filter} onSort={(sort) => go({ ...filter, sort })} />
            </tr>
          </thead>
          <tbody className="anim-stagger">
            {empty && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {empty}
                  {loaded && cases.length > 0 && active && (
                    <button onClick={() => go(DEFAULT_FILTER)} className="ml-2 text-blue-700 hover:underline">
                      条件をリセット
                    </button>
                  )}
                  {loaded && cases.length === 0 && canEdit && (
                    <div className="mt-4">
                      <Link href="/cases/new" className="inline-block rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-text hover:bg-accent-hover">
                        新規案件
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            )}
            {shown.map(({ record: c, metrics: m }) => (
              <tr key={c.id} className="relative border-t border-slate-100 align-top hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/cases/${c.id}`} className="text-blue-700 after:absolute after:inset-0 hover:underline">
                    {c.caseName}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.applicant.legalName || <span className="text-slate-400">未入力</span>}</td>
                <td className="px-4 py-3">{procedureLabel(c)}</td>
                <td className="px-4 py-3">
                  <ResidenceStatusCell record={c} />
                  <TargetStatusLine record={c} />
                </td>
                <td className="px-4 py-3">
                  <ExpiryBadge date={c.applicant.residenceExpiryDate} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadges record={c} metrics={m} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 狭い画面幅（md 未満）では、表に代えてカード形式で表示する */}
      <ul className="anim-stagger space-y-3 md:hidden">
        {empty && (
          <li className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {empty}
            {loaded && cases.length > 0 && active && (
              <button onClick={() => go(DEFAULT_FILTER)} className="ml-2 text-blue-700 hover:underline">
                条件をリセット
              </button>
            )}
            {loaded && cases.length === 0 && canEdit && (
              <div className="mt-4">
                <Link href="/cases/new" className="inline-block rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-text hover:bg-accent-hover">
                  新規案件
                </Link>
              </div>
            )}
          </li>
        )}
        {shown.map(({ record: c, metrics: m }) => (
          <li key={c.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <Link href={`/cases/${c.id}`} className="font-medium text-blue-700 after:absolute after:inset-0 hover:underline">
              {c.caseName}
            </Link>
            <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-2">
              <dt className="text-slate-500">申請人氏名</dt>
              <dd>{c.applicant.legalName || <span className="text-slate-400">未入力</span>}</dd>
              <dt className="text-slate-500">手続種別</dt>
              <dd>{procedureLabel(c)}</dd>
              <dt className="text-slate-500">在留資格</dt>
              <dd><ResidenceStatusCell record={c} /></dd>
              <TargetStatusItem record={c} />
              <dt className="text-slate-500">在留期限</dt>
              <dd>
                <ExpiryBadge date={c.applicant.residenceExpiryDate} />
              </dd>
              <dt className="text-slate-500">状況</dt>
              <dd>
                <StatusBadges record={c} metrics={m} />
              </dd>
              <dt className="text-slate-500">最終更新</dt>
              <dd className="text-slate-500">{formatDateTime(c.updatedAt)}</dd>
            </dl>
          </li>
        ))}
      </ul>
      {pageData.totalPages > 1 && (
        <nav aria-label="ページ移動" className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={pageData.page <= 1}
            onClick={() => go(filter, pageData.page - 1)}
            className="rounded-full border border-line-strong bg-white px-4 py-2 disabled:opacity-50"
          >
            前のページ
          </button>
          <span aria-current="page">
            {pageData.page} / {pageData.totalPages} ページ
          </span>
          <button
            type="button"
            disabled={pageData.page >= pageData.totalPages}
            onClick={() => go(filter, pageData.page + 1)}
            className="rounded-full border border-line-strong bg-white px-4 py-2 disabled:opacity-50"
          >
            次のページ
          </button>
        </nav>
      )}
        </>
      )}
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">読み込み中……</p>}>
      <CasesView />
    </Suspense>
  );
}
