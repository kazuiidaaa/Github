"use client";

import { ExpiryBadge } from "@/components/ExpiryBadge";
import { CaseEditAction } from "@/components/mobile/CaseEditSheet";
import { BackLink } from "@/components/mobile/BackLink";
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

/** 案件詳細の戻る導線（LargeTitleHeader の leading）。戻り先の画面名「案件」を添える標準形 */
export function BackToCases() {
  const t = useT();
  return <BackLink href="/m/cases" label={t("mobile.tabCases")} ariaLabel={t("mobile.backToCasesAria")} />;
}

/** 案件が見つからないときの表示。理由の説明と、一覧へ戻る行を出す */
export function MobileCaseNotFound() {
  const t = useT();
  return (
    <>
      <LargeTitleHeader title={t("mobileDetail.notFound")} leading={<BackToCases />} />
      <p className="px-4 text-base text-slate-600">{t("mobileDetail.notFoundBody")}</p>
      <GroupedList>
        <GroupedRow href="/m/cases" title={<span className="font-bold text-accent">{t("mobileDetail.backToList")}</span>} />
      </GroupedList>
    </>
  );
}

/**
 * 案件詳細（iPhone 版）。閲覧用。右上の「編集」（権限があるときだけ）で、案件名・手続・在留資格・メモを編集シートで直す。
 * 申請人情報・書類の登録は PC 版へのリンクで補う。
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
      <LargeTitleHeader title={record.caseName} leading={<BackToCases />} trailing={<CaseEditAction record={record} />} />

      <GroupedList header={t("mobileDetail.overview")}>
        <GroupedRow label={t("mobileDetail.procedure")} value={procedure} />
        <GroupedRow label={t("mobileDetail.currentStatus")} value={record.currentStatus || empty} />
        {record.targetStatus && <GroupedRow label={t("mobileDetail.targetStatus")} value={record.targetStatus} />}
        <GroupedRow label={t("mobileDetail.state")} value={<WorkflowBadge status={record.workflowStatus} />} />
        <GroupedRow
          label={t("casePage.applicantInfo")}
          value={
            <Badge tone={a.confirmationStatus === "confirmed" ? "green" : "yellow"}>
              {a.confirmationStatus === "confirmed" ? t("casePage.applicantConfirmed") : t("casePage.applicantDraft")}
            </Badge>
          }
        />
      </GroupedList>

      <GroupedList header={t("mobileDetail.deadlines")}>
        <GroupedRow label={t("casePage.field_residenceExpiryDate")} value={a.residenceExpiryDate ? <ExpiryBadge date={a.residenceExpiryDate} /> : empty} />
        <GroupedRow
          label={t("mobileDetail.plannedApplicationDate")}
          value={record.plannedApplicationDate ? formatDate(record.plannedApplicationDate) : t("mobileDetail.notSet")}
        />
        <GroupedRow label={t("mobileDetail.acceptedDate")} value={record.acceptedDate ? formatDate(record.acceptedDate) : t("mobileDetail.notSet")} />
      </GroupedList>

      <GroupedList header={t("casePage.applicantInfo")} footer={t("mobileDetail.applicantNote")}>
        {fields.map(([key, value]) => (
          <GroupedRow key={key} label={t(key)} value={value || empty} />
        ))}
      </GroupedList>

      <GroupedList>
        <GroupedRow href={`/m/cases/${record.id}/documents`} title={t("mobileDocuments.entry")} />
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
            label={checkDisplayName(t, lang, c)}
            value={<Badge tone={CHECK_TONES[c.status]}>{labels.checkStatus(c.status)}</Badge>}
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
