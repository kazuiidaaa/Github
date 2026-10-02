import type { CheckRecord, CheckType } from "../types";

// 申請前チェックの項目定義。状態は行政書士が付けるもので、システムは自動で変更しない。

export interface CheckDefinition {
  key: string;
  type: Exclude<CheckType, "manual">;
  name: string;
}

export const CHECK_DEFINITIONS: CheckDefinition[] = [
  { key: "applicant.legal_name", type: "applicant", name: "氏名が入力されている" },
  { key: "applicant.nationality", type: "applicant", name: "国籍・地域が入力されている" },
  { key: "applicant.date_of_birth", type: "applicant", name: "生年月日が入力されている" },
  { key: "applicant.residence_status", type: "applicant", name: "在留資格が入力されている" },
  { key: "applicant.residence_expiry", type: "applicant", name: "在留期間満了日が入力されている" },
  { key: "applicant.confirmed", type: "applicant", name: "申請人情報が確認済みになっている" },
  { key: "document.all_received", type: "document", name: "必須書類がすべて受領済み" },
  { key: "document.correct_type", type: "document", name: "受領したファイルが正しい書類種別" },
  { key: "document.no_missing", type: "document", name: "不足書類がない" },
  { key: "document.no_resubmission", type: "document", name: "再提出書類が残っていない" },
  { key: "document.reviewed", type: "document", name: "行政書士による確認が完了している" },
  { key: "deadline.expiry_checked", type: "deadline", name: "在留期間満了日を確認した" },
  { key: "deadline.planned_date_checked", type: "deadline", name: "申請予定日を確認した" },
  { key: "deadline.notice_checked", type: "deadline", name: "期限に関する注意事項を確認した" },
];

/** 既存の項目は変更せず、不足している項目だけを未確認で補う。補う必要がなければ null */
export function missingChecks(existing: CheckRecord[]): CheckRecord[] | null {
  const have = new Set(existing.map((c) => c.key));
  const added = CHECK_DEFINITIONS.filter((d) => !have.has(d.key)).map(
    (d): CheckRecord => ({ key: d.key, type: d.type, name: d.name, status: "pending", note: "" }),
  );
  return added.length > 0 ? added : null;
}

const TYPE_ORDER: CheckType[] = ["applicant", "document", "deadline", "manual"];
const DEF_ORDER = new Map(CHECK_DEFINITIONS.map((d, i) => [d.key, i]));

export function sortChecks(checks: CheckRecord[]): CheckRecord[] {
  return [...checks].sort(
    (a, b) =>
      TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
      (DEF_ORDER.get(a.key) ?? 999) - (DEF_ORDER.get(b.key) ?? 999),
  );
}

/** 確認済み（passed）または対象外でない項目の数 */
export function unresolvedCount(checks: CheckRecord[]): number {
  return checks.filter((c) => c.status !== "passed" && c.status !== "not_applicable").length;
}
