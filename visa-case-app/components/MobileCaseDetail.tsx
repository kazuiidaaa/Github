"use client";

import Link from "next/link";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { Badge, type Tone } from "@/components/ui";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import { formatDate } from "@/lib/format";
import { checkDisplayName } from "@/lib/i18n/caseChecks";
import { requirementName } from "@/lib/i18n/caseRequirements";
import { useLabels } from "@/lib/i18n/labels";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { evaluate } from "@/lib/requirements/evaluate";
import { sortChecks, unresolvedCount } from "@/lib/checks/definitions";
import { PROCEDURE_TYPES, type CaseRecord, type CheckStatus } from "@/lib/types";

const CHECK_TONES: Record<CheckStatus, Tone> = {
  passed: "green",
  warning: "yellow",
  failed: "red",
  pending: "gray",
  not_applicable: "gray",
};

const DOCUMENT_KEYS = {
  residence_card: "display.docResidenceCard",
  photo: "display.docPhoto",
} as const satisfies Record<string, MessageKey>;

/** 案件詳細の戻る導線（LargeTitleHeader の leading）。押せる範囲は 44pt 以上 */
export function BackToCases() {
  const t = useT();
  return (
    <Link href="/m/cases" className="inline-flex min-h-[44px] items-center gap-1 px-2 text-base text-accent">
      <svg aria-hidden="true" viewBox="0 0 10 18" width="10" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1 1 9l8 8" />
      </svg>
      {t("mobileDetail.backToCases")}
    </Link>
  );
}

/** 案件が見つからないときの表示 */
export function MobileCaseNotFound() {
  const t = useT();
  return (
    <>
      <LargeTitleHeader title={t("mobileDetail.notFound")} leading={<BackToCases />} />
    </>
  );
}

/**
 * 案件詳細（iPhone 版）。閲覧のみ。編集・書類の登録は PC 版へのリンクで補う。
 * 状態は色だけでなく文字と図形（Badge）で示す。
 */
export function MobileCaseDetail({ record }: { record: CaseRecord }) {
  const t = useT();
  const { lang } = useLang();
  const labels = useLabels();
  const a = record.applicant;
  const procedure = PROCEDURE_TYPES.find((p) => p.value === record.procedureType)?.label ?? "";
  const empty = t("mobileDetail.empty");
  const ev = evaluate(record);
  const checks = sortChecks(record.checks);
  const unresolved = unresolvedCount(record.checks);
  const fields: [MessageKey, string][] = [
    ["casePage.field_legalName", a.legalName],
    ["casePage.field_nationality", a.nationality],
    ["casePage.field_dateOfBirth", a.dateOfBirth ? formatDate(a.dateOfBirth) : ""],
    ["casePage.field_gender", a.gender],
    ["casePage.field_address", a.address],
    ["casePage.field_residenceStatus", a.residenceStatus],
    ["casePage.field_residenceCardNumber", a.residenceCardNumber],
    ["casePage.field_workRestriction", a.workRestriction],
  ];

  return (
    <>
      <LargeTitleHeader title={record.caseName} leading={<BackToCases />} />

      <GroupedList header={t("mobileDetail.overview")}>
        <GroupedRow title={procedure} subtitle={t("mobileDetail.procedure")} />
        <GroupedRow title={record.currentStatus || empty} subtitle={t("mobileDetail.currentStatus")} />
        {record.targetStatus && <GroupedRow title={record.targetStatus} subtitle={t("mobileDetail.targetStatus")} />}
        <GroupedRow title={t("mobileDetail.state")} trailing={<WorkflowBadge status={record.workflowStatus} />} />
        <GroupedRow
          title={t("casePage.applicantInfo")}
          trailing={
            <Badge tone={a.confirmationStatus === "confirmed" ? "green" : "yellow"}>
              {a.confirmationStatus === "confirmed" ? t("casePage.applicantConfirmed") : t("casePage.applicantDraft")}
            </Badge>
          }
        />
      </GroupedList>

      <GroupedList header={t("mobileDetail.deadlines")}>
        <GroupedRow
          title={a.residenceExpiryDate ? <ExpiryBadge date={a.residenceExpiryDate} /> : empty}
          subtitle={t("casePage.field_residenceExpiryDate")}
        />
        <GroupedRow
          title={record.plannedApplicationDate ? formatDate(record.plannedApplicationDate) : t("mobileDetail.notSet")}
          subtitle={t("mobileDetail.plannedApplicationDate")}
        />
        <GroupedRow
          title={record.acceptedDate ? formatDate(record.acceptedDate) : t("mobileDetail.notSet")}
          subtitle={t("mobileDetail.acceptedDate")}
        />
      </GroupedList>

      <GroupedList header={t("casePage.applicantInfo")} footer={t("mobileDetail.applicantNote")}>
        {fields.map(([key, value]) => (
          <GroupedRow key={key} title={value || empty} subtitle={t(key)} />
        ))}
      </GroupedList>

      <GroupedList header={t("mobileDetail.documents")}>
        {record.documents.length === 0 && <GroupedRow title={t("mobileDetail.documentsNone")} />}
        {record.documents.map((d) => (
          <GroupedRow
            key={d.id}
            title={d.fileName}
            subtitle={t(DOCUMENT_KEYS[d.documentType])}
            trailing={<Badge tone="blue">{labels.documentStatus(d.status)}</Badge>}
          />
        ))}
      </GroupedList>

      <GroupedList header={t("mobileDetail.requirements")}>
        {ev.ruleSet === null ? (
          <GroupedRow title={t("mobileDetail.requirementsNotApplicable")} />
        ) : (
          <>
            <GroupedRow
              title={t("mobileDetail.requirementsProgress", { received: ev.receivedCount, required: ev.requiredCount })}
            />
            {ev.missing.length === 0 && <GroupedRow title={t("mobileDetail.requirementsNone")} />}
            {ev.missing.map((i) => (
              <GroupedRow
                key={i.rule.id}
                title={requirementName(t, lang, i.rule)}
                subtitle={t("mobileDetail.requirementsMissing")}
                trailing={<Badge tone="yellow">{labels.requirementStatus(i.state.status)}</Badge>}
              />
            ))}
          </>
        )}
      </GroupedList>

      <GroupedList
        header={t("mobileDetail.checks")}
        footer={checks.length > 0 ? t("mobileDetail.checksUnresolved", { count: unresolved }) : undefined}
      >
        {checks.length === 0 && <GroupedRow title={t("mobileDetail.checksNone")} />}
        {checks.map((c) => (
          <GroupedRow
            key={c.key}
            title={checkDisplayName(t, lang, c)}
            trailing={<Badge tone={CHECK_TONES[c.status]}>{labels.checkStatus(c.status)}</Badge>}
          />
        ))}
      </GroupedList>

      <GroupedList footer={t("mobileDetail.openInDesktopNote")}>
        {/* /cases/[id] は端末の振り分け対象外のため、Cookie を足さず、そのまま PC 版の画面を開く */}
        <GroupedRow href={`/cases/${record.id}`} title={<span className="text-accent font-bold">{t("mobileDetail.openInDesktop")}</span>} />
      </GroupedList>
    </>
  );
}
