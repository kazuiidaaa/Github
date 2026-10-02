// 監査ログの detail を、個人情報を含まない形へ絞る。
// 氏名・住所・ファイル名・メモ本文・日付などの値は保存せず、変更された項目名のみを残す。

export type AuditOutcome = "success" | "failure";

/** 値をそのまま保存してよい項目（ID・種別・列挙値・件数のみ） */
const SAFE_KEYS = new Set([
  "requirementId",
  "checkKey",
  "documentType",
  "type",
  "status",
  "override",
  "version",
  "unresolved",
]);

const SAFE_VALUE = /^[A-Za-z0-9_.:-]{1,64}$/;

export function sanitizeAuditDetail(detail?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!detail) return undefined;
  const out: Record<string, unknown> = {};
  const changedFields: string[] = [];
  for (const [key, value] of Object.entries(detail)) {
    if (value === undefined) {
      // 値の消去も「変更された項目」として、名前のみ記録する
      changedFields.push(key);
    } else if (
      SAFE_KEYS.has(key) &&
      (typeof value === "number" || typeof value === "boolean" || (typeof value === "string" && SAFE_VALUE.test(value)))
    ) {
      out[key] = value;
    } else {
      changedFields.push(key);
    }
  }
  if (changedFields.length > 0) out.changedFields = changedFields.sort();
  return Object.keys(out).length > 0 ? out : undefined;
}
