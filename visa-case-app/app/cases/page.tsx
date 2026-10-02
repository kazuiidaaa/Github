"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { CaseFilters } from "@/components/CaseFilters";
import { DashboardCards, type CardKey } from "@/components/DashboardCards";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { Badge } from "@/components/ui";
import { applyFilter, DEFAULT_FILTER, isFilterActive, summarize, type CaseFilter, type SortKey } from "@/lib/caseMetrics";
import { formatDateTime } from "@/lib/format";
import { useCases, useStoreError, useStoreLoaded } from "@/lib/store";
import { PROCEDURE_TYPES, WORKFLOW_LABELS } from "@/lib/types";

function readFilter(p: URLSearchParams): CaseFilter {
  return {
    query: p.get("q") ?? "",
    procedure: p.get("procedure") ?? "all",
    status: p.get("status") ?? "all",
    within30: p.get("within30") === "1",
    missingDocs: p.get("missing") === "1",
    unconfirmed: p.get("unconfirmed") === "1",
    checksPending: p.get("checks") === "1",
    sort: (p.get("sort") === "expiry" ? "expiry" : "updated") as SortKey,
  };
}

function toQuery(f: CaseFilter): string {
  const p = new URLSearchParams();
  if (f.query) p.set("q", f.query);
  if (f.procedure !== "all") p.set("procedure", f.procedure);
  if (f.status !== "all") p.set("status", f.status);
  if (f.within30) p.set("within30", "1");
  if (f.missingDocs) p.set("missing", "1");
  if (f.unconfirmed) p.set("unconfirmed", "1");
  if (f.checksPending) p.set("checks", "1");
  if (f.sort !== "updated") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "?";
}

/** ダッシュボードのカードに対応する絞り込みを返す */
function cardFilter(key: CardKey): CaseFilter {
  const f = { ...DEFAULT_FILTER };
  if (key === "review") f.status = "review_required";
  if (key === "checksPending") f.checksPending = true;
  if (key === "ready") f.status = "application_ready";
  if (key === "missingDocs") f.missingDocs = true;
  if (key === "within30") {
    f.within30 = true;
    f.sort = "expiry";
  }
  return f;
}

function activeCard(f: CaseFilter): CardKey | null {
  const keys: CardKey[] = ["total", "review", "missingDocs", "checksPending", "ready", "within30"];
  return keys.find((k) => toQuery(cardFilter(k)) === toQuery(f)) ?? null;
}

function CasesView() {
  const cases = useCases();
  const loaded = useStoreLoaded();
  const error = useStoreError();
  const router = useRouter();
  const params = useSearchParams();

  const filter = useMemo(() => readFilter(new URLSearchParams(params.toString())), [params]);
  const summary = useMemo(() => summarize(cases), [cases]);
  const rows = useMemo(() => applyFilter(cases, filter), [cases, filter]);
  const active = isFilterActive(filter);

  const go = (f: CaseFilter) => router.replace(`/cases${toQuery(f)}`, { scroll: false });

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
        <Link href="/cases/new" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          新規案件
        </Link>
      </div>
      {loaded && <DashboardCards summary={summary} active={activeCard(filter)} onSelect={(k) => go(cardFilter(k))} />}
      <CaseFilters filter={filter} active={active} onChange={(patch) => go({ ...filter, ...patch })} onReset={() => go(DEFAULT_FILTER)} />
      <p className="mb-2 text-xs text-slate-500">
        期限の表示は業務上の注意喚起です。申請の可否や許可の見込みを示すものではありません。
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">案件名</th>
              <th className="px-4 py-3">申請人氏名</th>
              <th className="px-4 py-3">手続種別</th>
              <th className="px-4 py-3">在留資格</th>
              <th className="px-4 py-3">在留期限</th>
              <th className="px-4 py-3">状況</th>
              <th className="px-4 py-3">最終更新</th>
            </tr>
          </thead>
          <tbody>
            {empty && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {empty}
                  {loaded && cases.length > 0 && active && (
                    <button onClick={() => go(DEFAULT_FILTER)} className="ml-2 text-blue-700 hover:underline">
                      条件をリセット
                    </button>
                  )}
                </td>
              </tr>
            )}
            {rows.map(({ record: c, metrics: m }) => (
              <tr key={c.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/cases/${c.id}`} className="text-blue-700 hover:underline">
                    {c.caseName}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.applicant.legalName || <span className="text-slate-400">未入力</span>}</td>
                <td className="px-4 py-3">{PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label}</td>
                <td className="px-4 py-3">{c.applicant.residenceStatus || c.currentStatus || "-"}</td>
                <td className="px-4 py-3">
                  <ExpiryBadge date={c.applicant.residenceExpiryDate} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <Badge tone={c.workflowStatus === "application_ready" || c.workflowStatus === "applicant_confirmed" ? "green" : c.workflowStatus === "review_required" ? "yellow" : "gray"}>
                      {WORKFLOW_LABELS[c.workflowStatus]}
                    </Badge>
                    {m.missingCount > 0 && <Badge tone="yellow">未受領書類 {m.missingCount}件</Badge>}
                    {m.unconfirmed && <Badge tone="gray">申請人情報 確認未了</Badge>}
                    {m.checksPending && <Badge tone="gray">申請前チェック未完了</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
