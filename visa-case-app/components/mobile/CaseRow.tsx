"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import type { CaseRow as CaseRowData } from "@/lib/caseMetrics";
import { formatDate } from "@/lib/format";
import { expiryLevelLabel, expiryText } from "@/lib/i18n/expiry";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import { PROCEDURE_TYPES } from "@/lib/types";

const EXPIRY_TONES = { overdue: "red", urgent: "red", caution: "yellow", normal: "green", unknown: "gray" } as const;

/**
 * 案件 1 件の行（GroupedList の中に並べる）。行全体が 1 つのリンクで、高さは 44pt 以上。
 * 表示：案件名、申請人氏名と手続の種類、在留期限（日付＋段階の Badge＋残り日数）、状態（WorkflowBadge）。
 * 期限・状態は、色だけでなく、文字と図形（Badge の印）を併記する（ExpiryBadge / WorkflowBadge と同じ考え方）。
 * 追加の注意（未受領書類・確認未了・申請前チェック未完了）は、PC 版の StatusBadges と同じ条件で Badge を出す。
 *
 * 移動先：/m/cases/[id] がまだ無いため、既存の PC 版 /cases/[id] へ移る。
 * iPhone 版の詳細画面ができたら、href をそちらへ差し替える（この 1 か所だけ）。
 *
 * props:
 * - row  applyFilter が返す 1 行分（record と metrics）
 */
export function CaseRow({ row }: { row: CaseRowData }) {
  const t = useT();
  const { lang } = useLang();
  const { record: c, metrics: m } = row;
  const procedure = PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label;
  return (
    <li className="m-row relative">
      <Link href={`/cases/${c.id}`} className="block min-h-[44px] px-4 py-3 active:bg-slate-100">
        <span className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-base font-bold">{c.caseName}</span>
            <span className="mt-0.5 block break-words text-sm text-slate-600">
              {c.applicant.legalName || t("caseList.notEntered")}
              {procedure && <span> ・ {procedure}</span>}
            </span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1.5 shrink-0 text-slate-400">
            <path d="m1 1 6 6-6 6" />
          </svg>
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          <WorkflowBadge status={c.workflowStatus} />
          <Badge tone={EXPIRY_TONES[m.level]}>{expiryLevelLabel(lang, m.level)}</Badge>
          {m.days !== null && (
            <span className="text-slate-600">
              {formatDate(c.applicant.residenceExpiryDate)}（{expiryText(lang, m.days)}）
            </span>
          )}
        </span>
        {(m.missingCount > 0 || m.unconfirmed || m.checksPending) && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {m.missingCount > 0 && <Badge tone="yellow">{t("caseList.missingBadge", { count: m.missingCount })}</Badge>}
            {m.unconfirmed && <Badge tone="gray">{t("caseList.unconfirmedInfo")}</Badge>}
            {m.checksPending && <Badge tone="gray">{t("caseList.checksPendingBadge")}</Badge>}
          </span>
        )}
      </Link>
    </li>
  );
}
