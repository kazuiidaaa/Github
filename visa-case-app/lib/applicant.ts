import { isValidDate } from "./format";
import type { Applicant } from "./types";

export type ApplicantField = keyof Pick<
  Applicant,
  "legalName" | "nationality" | "dateOfBirth" | "residenceStatus" | "residenceExpiryDate"
>;

/**
 * 確認済みにするための必須項目を検証する。問題がなければ空のオブジェクトを返す。
 *
 * 日付欄（DateField）は、存在しない日付を YYYY-MM-DD の形のまま渡すため、ここで弾く。
 * 過去に自由入力で保存された値が残っている場合に限り、選び直しを促す（isValidDate は安全網として残す）。
 */
export function validateApplicant(a: Applicant): Partial<Record<ApplicantField, string>> {
  const errors: Partial<Record<ApplicantField, string>> = {};
  if (!a.legalName.trim()) errors.legalName = "氏名を入力してください。";
  if (!a.nationality.trim()) errors.nationality = "国籍・地域を入力してください。";
  if (!a.residenceStatus.trim()) errors.residenceStatus = "在留資格を選択してください。";
  if (!a.dateOfBirth) errors.dateOfBirth = "生年月日を入力してください。";
  else if (!isValidDate(a.dateOfBirth)) errors.dateOfBirth = "存在する日付を、年4桁・月・日の順に入力してください（例：2000/01/31）。";
  if (!a.residenceExpiryDate) errors.residenceExpiryDate = "在留期間の満了日を入力してください。";
  else if (!isValidDate(a.residenceExpiryDate)) errors.residenceExpiryDate = "存在する日付を、年4桁・月・日の順に入力してください（例：2000/01/31）。";
  return errors;
}

/** 下書き保存時の検証。日付は、入力されている場合のみ形式を確認する。 */
export function validateDraft(a: Applicant): Partial<Record<ApplicantField, string>> {
  const errors: Partial<Record<ApplicantField, string>> = {};
  for (const k of ["dateOfBirth", "residenceExpiryDate"] as const) {
    if (a[k] && !isValidDate(a[k])) errors[k] = "存在する日付を、年4桁・月・日の順に入力してください（例：2000/01/31）。";
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

/**
 * 申請人情報タブを開いたときの、在留資格欄の初期値を返す（fillCurrentStatus と対になる関数）。
 * 申請人情報側が未入力で、案件側の「現在の在留資格」に値がある場合のみ、案件側の値を表示する。
 * 申請人情報側に既に値がある場合は上書きしない。保存は、下書き保存・確認済みにした時点で行う。
 */
export function initialResidenceStatus(residenceStatus: string, currentStatus: string): string {
  return residenceStatus.trim() ? residenceStatus : currentStatus;
}
