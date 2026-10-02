import { isValidDate } from "./format";
import type { Applicant } from "./types";

export type ApplicantField = keyof Pick<
  Applicant,
  "legalName" | "nationality" | "dateOfBirth" | "residenceStatus" | "residenceExpiryDate"
>;

/** 確認済みにするための必須項目を検証する。問題がなければ空のオブジェクトを返す。 */
export function validateApplicant(a: Applicant): Partial<Record<ApplicantField, string>> {
  const errors: Partial<Record<ApplicantField, string>> = {};
  if (!a.legalName.trim()) errors.legalName = "氏名を入力してください。";
  if (!a.nationality.trim()) errors.nationality = "国籍・地域を入力してください。";
  if (!a.residenceStatus.trim()) errors.residenceStatus = "在留資格を入力してください。";
  if (!a.dateOfBirth) errors.dateOfBirth = "生年月日を入力してください。";
  else if (!isValidDate(a.dateOfBirth)) errors.dateOfBirth = "YYYY-MM-DD の形式で、実在する日付を入力してください。";
  if (!a.residenceExpiryDate) errors.residenceExpiryDate = "在留期間の満了日を入力してください。";
  else if (!isValidDate(a.residenceExpiryDate)) errors.residenceExpiryDate = "YYYY-MM-DD の形式で、実在する日付を入力してください。";
  return errors;
}

/** 下書き保存時の検証。日付は、入力されている場合のみ形式を確認する。 */
export function validateDraft(a: Applicant): Partial<Record<ApplicantField, string>> {
  const errors: Partial<Record<ApplicantField, string>> = {};
  for (const k of ["dateOfBirth", "residenceExpiryDate"] as const) {
    if (a[k] && !isValidDate(a[k])) errors[k] = "YYYY-MM-DD の形式で、実在する日付を入力してください。";
  }
  return errors;
}
