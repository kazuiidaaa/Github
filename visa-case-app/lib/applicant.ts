import { isValidDate } from "./format";
import type { Applicant } from "./types";

export type ApplicantField = keyof Pick<
  Applicant,
  "legalName" | "nationality" | "dateOfBirth" | "residenceStatus" | "residenceExpiryDate"
>;

/** 確認済みにするための必須項目を検証する。問題がなければ空のオブジェクトを返す。 */
/**
 * 日付欄は type="date" のため、通常は形式の誤りは入力されない。
 * 過去に自由入力で保存された値が残っている場合に限り、選び直しを促す（isValidDate は安全網として残す）。
 */
export function validateApplicant(a: Applicant): Partial<Record<ApplicantField, string>> {
  const errors: Partial<Record<ApplicantField, string>> = {};
  if (!a.legalName.trim()) errors.legalName = "氏名を入力してください。";
  if (!a.nationality.trim()) errors.nationality = "国籍・地域を入力してください。";
  if (!a.residenceStatus.trim()) errors.residenceStatus = "在留資格を選択してください。";
  if (!a.dateOfBirth) errors.dateOfBirth = "生年月日を入力してください。";
  else if (!isValidDate(a.dateOfBirth)) errors.dateOfBirth = "日付をカレンダーから選び直してください。";
  if (!a.residenceExpiryDate) errors.residenceExpiryDate = "在留期間の満了日を入力してください。";
  else if (!isValidDate(a.residenceExpiryDate)) errors.residenceExpiryDate = "日付をカレンダーから選び直してください。";
  return errors;
}

/** 下書き保存時の検証。日付は、入力されている場合のみ形式を確認する。 */
export function validateDraft(a: Applicant): Partial<Record<ApplicantField, string>> {
  const errors: Partial<Record<ApplicantField, string>> = {};
  for (const k of ["dateOfBirth", "residenceExpiryDate"] as const) {
    if (a[k] && !isValidDate(a[k])) errors[k] = "日付をカレンダーから選び直してください。";
  }
  return errors;
}

/**
 * 申請人情報の在留資格を確認済みにしたとき、案件側の「現在の在留資格」を補う値を返す。
 * 案件側に既に入力がある場合は、手動入力を尊重して変更しない。
 */
export function fillCurrentStatus(currentStatus: string, residenceStatus: string): string {
  return currentStatus.trim() ? currentStatus : residenceStatus;
}
