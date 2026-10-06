import type { Lang } from "@/lib/documents/lang";
import type { CheckRecord } from "@/lib/types";
import type { MessageKey } from "./messages";

/**
 * 申請前チェックの項目名の表示。内蔵の項目（lib/checks/definitions.ts の key）は、訳表から引く。
 * 行政書士が追加した手動項目（key が manual.）の名前は、利用者の入力のため、そのまま表示する。
 * 保存済みの name（日本語）は、変更しない。
 */
export const CHECK_NAME_KEYS: Record<string, MessageKey> = {
  "applicant.legal_name": "caseChecks.def_applicant_legal_name",
  "applicant.nationality": "caseChecks.def_applicant_nationality",
  "applicant.date_of_birth": "caseChecks.def_applicant_date_of_birth",
  "applicant.residence_status": "caseChecks.def_applicant_residence_status",
  "applicant.residence_expiry": "caseChecks.def_applicant_residence_expiry",
  "applicant.confirmed": "caseChecks.def_applicant_confirmed",
  "document.all_received": "caseChecks.def_document_all_received",
  "document.correct_type": "caseChecks.def_document_correct_type",
  "document.no_missing": "caseChecks.def_document_no_missing",
  "document.no_resubmission": "caseChecks.def_document_no_resubmission",
  "document.reviewed": "caseChecks.def_document_reviewed",
  "deadline.expiry_checked": "caseChecks.def_deadline_expiry_checked",
  "deadline.planned_date_checked": "caseChecks.def_deadline_planned_date_checked",
  "deadline.notice_checked": "caseChecks.def_deadline_notice_checked",
};

export function checkDisplayName(
  t: (key: MessageKey) => string,
  lang: Lang,
  check: Pick<CheckRecord, "key" | "type" | "name">,
): string {
  // 日本語は、保存済みの名前をそのまま表示する（元の表示と同じ）
  const key = lang === "ja" || check.type === "manual" ? undefined : CHECK_NAME_KEYS[check.key];
  return key ? t(key) : check.name;
}
