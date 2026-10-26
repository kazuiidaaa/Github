"use client";

import Link from "next/link";
import { GroupRelationBadge } from "@/components/GroupRelationBadge";
import { ToneIcon } from "@/components/ui";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import type { CaseRow as CaseRowData } from "@/lib/caseMetrics";
import { useT } from "@/lib/i18n/LanguageProvider";
import { PROCEDURE_TYPES } from "@/lib/types";

/**
 * 案件 1 件の行（GroupedList の中に並べる）。行全体が 1 つのリンクで、高さは 44pt 以上。固定の高さは持たず、文字を大きくすると折り返す。
 * 1 行目：案件名（太字）と、右に状態（WorkflowBadge。色だけでなく図形と文字）。
 * 2 行目：申請人氏名 ・ 手続の種類。在留期限が 30 日以内（超過を含む。caseMetrics の within30 と同じ）のときだけ、末尾に
 * 図形つきの短い文（「あと12日」「本日まで」「超過」）を足す。通常の案件には、期限の日付・段階のバッジを出さない。
 * 未受領書類の件数・確認未了・申請前チェック未完了は、行に出さない（詳細 /m/cases/[id] で確認できる。絞り込みの条件としては使える）。
 *
 * 移動先：iPhone 版の案件詳細 /m/cases/[id]。
 *
 * グループの中の行（inGroup）で、主たる申請人との関係があるときは、3 行目に文字の印（GroupRelationBadge）を出す（色だけにしない）。
 *
 * props:
 * - row  applyFilter が返す 1 行分（record と metrics）
 * - inGroup  グループの見出しの下に並ぶ行か
 */
export function CaseRow({ row, inGroup = false }: { row: CaseRowData; inGroup?: boolean }) {
  const t = useT();
  const { record: c, metrics: m } = row;
  const procedure = PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label;
  // 期限が近い・過ぎている案件だけ、残り日数を添える。days が null（未入力）のときは within30 も false
  const urgent = m.within30 && m.days !== null;
  const urgentText = m.days === null ? "" : m.days < 0 ? t("mobile.caseRowOverdue") : m.days === 0 ? t("mobile.caseRowToday") : t("mobile.caseRowDaysLeft", { days: m.days });
  return (
    <li className="m-row relative">
      <Link href={`/m/cases/${c.id}`} className="block min-h-[44px] px-4 py-3 active:bg-slate-100">
        <span className="flex items-start gap-3">
          <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <span className="min-w-0 max-w-full flex-1 basis-[8rem] break-words text-base font-bold">{c.caseName}</span>
            <span className="shrink-0">
              <WorkflowBadge status={c.workflowStatus} />
            </span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1.5 shrink-0 text-slate-400">
            <path d="m1 1 6 6-6 6" />
          </svg>
        </span>
        <span className="mt-0.5 block break-words text-sm text-slate-600">
          {c.applicant.legalName || t("caseList.notEntered")}
          {procedure && <span> ・ {procedure}</span>}
          {urgent && (
            <span className="whitespace-nowrap font-bold text-danger-text">
              {" ・ "}
              <span className="inline-flex items-center gap-1 align-baseline">
                <ToneIcon tone="red" />
                <span className="sr-only">{t("mobile.caseRowExpiryLabel")}</span>
                {urgentText}
              </span>
            </span>
          )}
        </span>
        {inGroup && c.groupRelation && (
          <span className="mt-1 block">
            <GroupRelationBadge relation={c.groupRelation} />
          </span>
        )}
      </Link>
    </li>
  );
}
