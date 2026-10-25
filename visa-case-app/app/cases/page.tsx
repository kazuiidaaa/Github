"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CaseFilters } from "@/components/CaseFilters";
import { CaseListTable, procedureLabel, ResidenceStatusCell, StatusBadges } from "@/components/CaseListTable";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { DashboardCards } from "@/components/DashboardCards";
import { LoadingNotice } from "@/components/LoadingNotice";
import { UploadBox } from "@/components/UploadBox";
import {
  applyFilter,
  DEFAULT_FILTER,
  isFilterActive,
  PAGE_SIZE,
  paginate,
  summarize,
  type CaseFilter,
} from "@/lib/caseMetrics";
import { activeCard, cardFilter, readFilter, readPage, toQueryWithPage } from "@/lib/caseListQuery";
import { useT } from "@/lib/i18n/LanguageProvider";
import { hasResidenceCard } from "@/lib/documentKinds";
import { formatDateTime } from "@/lib/format";
import { useCan, useCases, useStoreError, useStoreLoaded } from "@/lib/store";

/** 一覧の順次表示を再生済みか。同じ画面を開き直しても、再生しない（画面を開いた最初の一度だけ。Issue #392） */
let introPlayed = false;
/** 最初の表示が終わるまで（最大 約0.5秒＋余裕）の長さ */
const INTRO_MS = 700;

function CasesView() {
  const t = useT();
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
  // 順次表示は最初の一度だけ。絞り込み・並べ替え・ページ送りでは再生しない
  const [intro, setIntro] = useState(() => !introPlayed);
  useEffect(() => {
    if (!loaded || !intro) return;
    const id = setTimeout(() => {
      introPlayed = true;
      setIntro(false);
    }, INTRO_MS);
    return () => clearTimeout(id);
  }, [loaded, intro]);
  const stagger = intro ? "anim-stagger" : "";
  const pendingCount = useMemo(() => cases.filter((c) => !hasResidenceCard(c)).length, [cases]);

  // 絞り込み・並び順を変えたときは、1ページ目に戻す（page を付けない）。
  const go = (f: CaseFilter, page = 1) => {
    router.replace(`/cases${toQueryWithPage(f, page)}`, { scroll: false });
  };

  let empty = "";
  if (rows.length === 0) {
    if (!loaded) empty = error ? t("caseList.loadError") : t("caseList.loading");
    else if (cases.length === 0) empty = t("caseList.noCases");
    else empty = t("caseList.noMatch");
  }
  const emptyRole = loaded ? undefined : error ? "alert" : "status";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-mac-title2">{t("caseList.pageTitle")}</h1>
        {canEdit && (
          <Link href="/cases/new" className="inline-flex min-h-[44px] items-center rounded-full bg-accent px-4 text-sm font-bold text-accent-text hover:bg-accent-hover active:bg-accent-hover md:hidden">
            {t("caseList.newCase")}
          </Link>
        )}
      </div>
      {loaded && <DashboardCards summary={summary} active={activeCard(filter)} onSelect={(k) => go(cardFilter(k))} />}
      <CaseFilters filter={filter} active={active} onChange={(patch) => go({ ...filter, ...patch })} onReset={() => go(DEFAULT_FILTER)} />
      <p className="mb-2 text-xs text-slate-500">
        {t("caseList.disclaimer")}
      </p>
      {filter.noCard && (
        <section aria-label={t("caseList.bulkAria")} className="mb-6">
          <p className="mb-2 text-sm font-medium" role="status">
            {t("caseList.noCardRemaining", { count: pendingCount })}
            {rows.length !== pendingCount && <span className="ml-2 font-normal text-slate-500">{t("caseList.noCardFiltered", { count: rows.length })}</span>}
          </p>
          {!canEdit && <p className="mb-2 text-xs text-slate-500">{t("caseList.viewOnly")}</p>}
          {empty ? (
            <p role={emptyRole} className="mac-card rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
              {loaded && cases.length > 0 && pendingCount === 0 ? t("caseList.noCardNone") : empty}
            </p>
          ) : (
            <ul className={`${stagger} space-y-3`}>
              {rows.map(({ record: c }) => (
                <li key={c.id} className="grid gap-3 mac-card rounded-2xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-[1fr_2fr] md:items-center">
                  <div>
                    <Link href={`/cases/${c.id}`} className="font-medium text-blue-700 hover:underline">
                      {c.caseName}
                    </Link>
                    <p className="mt-1 text-slate-600">{c.applicant.legalName || <span className="text-slate-400">{t("caseList.notEntered")}</span>}</p>
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
          {t("caseList.resultCount", { count: rows.length, total: cases.length })}
          {pageData.totalPages > 1 && (
            <span className="ml-2 font-normal text-slate-500">
              {t("caseList.showingRange", { from: (pageData.page - 1) * PAGE_SIZE + 1, to: (pageData.page - 1) * PAGE_SIZE + shown.length })}
            </span>
          )}
        </p>
      )}
      <div className="@container">
      <CaseListTable
        rows={shown}
        filter={filter}
        onSort={(sort) => go({ ...filter, sort })}
        stagger={stagger}
        empty={
          empty && (
            <span role={emptyRole}>
              {empty}
              {loaded && cases.length > 0 && active && (
                <button onClick={() => go(DEFAULT_FILTER)} className="ml-2 min-h-[44px] text-blue-700 hover:underline">
                  {t("caseList.resetConditions")}
                </button>
              )}
              {loaded && cases.length === 0 && canEdit && (
                <span className="mt-4 block">
                  <Link href="/cases/new" className="inline-flex min-h-[44px] items-center rounded-full bg-accent px-4 text-sm font-bold text-accent-text hover:bg-accent-hover active:bg-accent-hover">
                    {t("caseList.newCase")}
                  </Link>
                </span>
              )}
            </span>
          )
        }
      />

      {/* 置き場所の幅が足りないとき（狭い画面幅、または文字を大きくしたとき）は、表に代えてカード形式で表示する */}
      <ul className={`${stagger} space-y-3 @[44rem]:hidden`}>
        {empty && (
          <li role={emptyRole} className="mac-card rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {empty}
            {loaded && cases.length > 0 && active && (
              <button onClick={() => go(DEFAULT_FILTER)} className="ml-2 min-h-[44px] text-blue-700 hover:underline">
                {t("caseList.resetConditions")}
              </button>
            )}
            {loaded && cases.length === 0 && canEdit && (
              <div className="mt-4">
                <Link href="/cases/new" className="inline-flex min-h-[44px] items-center rounded-full bg-accent px-4 text-sm font-bold text-accent-text hover:bg-accent-hover active:bg-accent-hover">
                  {t("caseList.newCase")}
                </Link>
              </div>
            )}
          </li>
        )}
        {shown.map(({ record: c, metrics: m }) => (
          <li key={c.id} className="relative mac-card rounded-2xl border border-slate-200 bg-white p-4 text-sm transition-colors active:bg-slate-100">
            <Link href={`/cases/${c.id}`} className="font-medium text-blue-700 after:absolute after:inset-0 hover:underline">
              {c.caseName}
            </Link>
            <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-2">
              <dt className="text-slate-500">{t("caseList.colApplicant")}</dt>
              <dd>{c.applicant.legalName || <span className="text-slate-400">{t("caseList.notEntered")}</span>}</dd>
              <dt className="text-slate-500">{t("caseList.colProcedure")}</dt>
              <dd>{procedureLabel(c)}</dd>
              <dt className="text-slate-500">{t("caseList.colStatus")}</dt>
              <dd className="min-w-0"><ResidenceStatusCell record={c} /></dd>
              <dt className="text-slate-500">{t("caseList.colExpiry")}</dt>
              <dd>
                <ExpiryBadge date={c.applicant.residenceExpiryDate} />
              </dd>
              <dt className="text-slate-500">{t("caseList.colState")}</dt>
              <dd>
                <StatusBadges record={c} metrics={m} />
              </dd>
              <dt className="text-slate-500">{t("caseList.colUpdated")}</dt>
              <dd className="text-slate-500">{formatDateTime(c.updatedAt)}</dd>
            </dl>
          </li>
        ))}
      </ul>
      </div>
      {pageData.totalPages > 1 && (
        <nav aria-label={t("caseList.pagerAria")} className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={pageData.page <= 1}
            onClick={() => go(filter, pageData.page - 1)}
            className="min-h-[44px] rounded-full border border-line-strong bg-white px-4 py-2 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50"
          >
            {t("caseList.prevPage")}
          </button>
          <span aria-current="page">
            {t("caseList.pageOf", { page: pageData.page, total: pageData.totalPages })}
          </span>
          <button
            type="button"
            disabled={pageData.page >= pageData.totalPages}
            onClick={() => go(filter, pageData.page + 1)}
            className="min-h-[44px] rounded-full border border-line-strong bg-white px-4 py-2 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50"
          >
            {t("caseList.nextPage")}
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
    <Suspense fallback={<LoadingNotice />}>
      <CasesView />
    </Suspense>
  );
}
