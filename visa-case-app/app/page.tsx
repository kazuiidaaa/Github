"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HomeMetricCards } from "@/components/DashboardCards";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import { applyFilter, DEFAULT_FILTER, summarize, type CaseRow } from "@/lib/caseMetrics";
import { urgentCases } from "@/lib/urgentCases";
import { useT } from "@/lib/i18n/LanguageProvider";
import { nextActionMessage } from "@/lib/i18n/nextActionText";
import { formatDateTime } from "@/lib/format";
import { useCan, useCases, useStoreError, useStoreLoaded } from "@/lib/store";

const LIST_SIZE = 5;
const URGENT_SIZE = 10;

function CaseList({ rows, empty }: { rows: CaseRow[]; empty: string }) {
  const t = useT();
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
          <p className="mt-1 text-slate-600">{c.applicant.legalName || <span className="text-slate-400">{t("home.unentered")}</span>}</p>
          <p className="mt-2 text-xs text-slate-500">{t("home.lastUpdated", { date: formatDateTime(c.updatedAt) })}</p>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  const t = useT();
  const cases = useCases();
  const loaded = useStoreLoaded();
  const error = useStoreError();
  const canEdit = useCan("edit");

  const summary = useMemo(() => summarize(cases), [cases]);
  const urgentAll = useMemo(() => urgentCases(cases), [cases]);
  const urgent = urgentAll.slice(0, URGENT_SIZE);
  const recent = useMemo(() => applyFilter(cases, DEFAULT_FILTER).slice(0, LIST_SIZE), [cases]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
        <span className="flex items-center gap-3">
          <Link href="/cases" className="rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
            {t("home.openCases")}
          </Link>
          {canEdit && (
            <Link href="/cases/new" className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-text hover:bg-accent-hover">
              {t("home.newCase")}
            </Link>
          )}
        </span>
      </div>

      {!loaded ? (
        <p className="text-sm text-slate-500" role={error ? "alert" : "status"}>
          {error ? t("home.loadFailed") : t("common.loading")}
        </p>
      ) : (
        <>
          <section aria-label={t("home.urgentAria")} className="mb-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg">{t("home.urgentTitle")}</h2>
              {urgentAll.length > 0 && (
                <Link href="/cases?within30=1&sort=expiry" className="shrink-0 text-sm font-bold text-blue-700 hover:underline">
                  {t("home.urgentSeeAll", { count: urgentAll.length })}
                </Link>
              )}
            </div>
            {urgentAll.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{t("home.urgentNone")}</p>
            ) : (
              <ul className="anim-stagger space-y-3">
                {urgent.map(({ record: c }) => (
                  <li key={c.id} className="rounded-2xl border border-line-strong bg-white p-4 text-sm">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div>
                        <Link href={`/cases/${c.id}`} className="font-bold text-blue-700 hover:underline">
                          {c.caseName}
                        </Link>
                        <p className="mt-1 text-slate-600">{c.applicant.legalName || <span className="text-slate-400">{t("home.unentered")}</span>}</p>
                        <div className="mt-2">
                          <ExpiryBadge date={c.applicant.residenceExpiryDate} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600">{t("home.nextActionHeading")}</p>
                        <p className="mt-1 text-slate-800">{nextActionMessage(t, c)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label={t("home.countsAria")} className="mb-8">
            <h2 className="mb-3 text-sm text-slate-600">{t("home.countsTitle", { total: summary.total })}</h2>
            <HomeMetricCards summary={summary} />
          </section>

          <div>
            <section aria-label={t("home.recentAria")}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg">{t("home.recentTitle")}</h2>
                <Link href="/cases" className="text-sm font-bold text-blue-700 hover:underline">
                  {t("home.seeAll")}
                </Link>
              </div>
              <CaseList
                rows={recent}
                empty={canEdit ? t("home.emptyEdit") : t("home.emptyView")}
              />
            </section>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            {t("home.disclaimer")}
          </p>
        </>
      )}
    </div>
  );
}
