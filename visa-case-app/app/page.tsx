"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HomeMetricCards } from "@/components/DashboardCards";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import { applyFilter, DEFAULT_FILTER, summarize, type CaseRow } from "@/lib/caseMetrics";
import { formatDateTime } from "@/lib/format";
import { useCan, useCases, useStoreError, useStoreLoaded } from "@/lib/store";

const LIST_SIZE = 5;

function CaseList({ rows, empty, showExpiry }: { rows: CaseRow[]; empty: string; showExpiry: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="anim-stagger space-y-3">
      {rows.map(({ record: c }) => (
        <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={`/cases/${c.id}`} className="font-bold text-blue-700 hover:underline">
              {c.caseName}
            </Link>
            <WorkflowBadge status={c.workflowStatus} />
          </div>
          <p className="mt-1 text-slate-600">{c.applicant.legalName || <span className="text-slate-400">未入力</span>}</p>
          <div className="mt-2">
            {showExpiry ? (
              <ExpiryBadge date={c.applicant.residenceExpiryDate} />
            ) : (
              <p className="text-xs text-slate-500">最終更新 {formatDateTime(c.updatedAt)}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  const cases = useCases();
  const loaded = useStoreLoaded();
  const error = useStoreError();
  const canEdit = useCan("edit");

  const summary = useMemo(() => summarize(cases), [cases]);
  const urgent = useMemo(
    () => applyFilter(cases, { ...DEFAULT_FILTER, within30: true, sort: "expiry" }).slice(0, LIST_SIZE),
    [cases],
  );
  const recent = useMemo(() => applyFilter(cases, DEFAULT_FILTER).slice(0, LIST_SIZE), [cases]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">ホーム</h1>
        <span className="flex items-center gap-3">
          <Link href="/cases" className="rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
            案件一覧を開く
          </Link>
          {canEdit && (
            <Link href="/cases/new" className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-text hover:bg-accent-hover">
              新規案件
            </Link>
          )}
        </span>
      </div>

      {!loaded ? (
        <p className="text-sm text-slate-500" role="status">
          {error ? "案件を読み込めませんでした。時間をおいて再度お試しください。" : "読み込み中……"}
        </p>
      ) : (
        <>
          <section aria-label="対応が必要な件数" className="mb-8">
            <h2 className="mb-3 text-sm text-slate-600">対応が必要な件数（{summary.total} 件中）</h2>
            <HomeMetricCards summary={summary} />
          </section>

          <div className="grid gap-8 md:grid-cols-2">
            <section aria-label="在留期限が近い案件">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg">在留期限が近い案件</h2>
                <Link href="/cases?within30=1&sort=expiry" className="text-sm font-bold text-blue-700 hover:underline">
                  すべて見る
                </Link>
              </div>
              <CaseList rows={urgent} empty="期限が30日以内の案件はありません。" showExpiry />
            </section>
            <section aria-label="最近更新した案件">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg">最近更新した案件</h2>
                <Link href="/cases" className="text-sm font-bold text-blue-700 hover:underline">
                  すべて見る
                </Link>
              </div>
              <CaseList
                rows={recent}
                empty={canEdit ? "案件がありません。「新規案件」から作成してください。" : "案件がありません。"}
                showExpiry={false}
              />
            </section>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            期限の表示は業務上の注意喚起です。申請の可否や許可の見込みを示すものではありません。
          </p>
        </>
      )}
    </div>
  );
}
