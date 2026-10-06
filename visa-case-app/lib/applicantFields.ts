import type { Applicant } from "@/lib/types";

/** 概要の「未入力」から移動できる、申請人情報の入力欄 */
export type JumpField = keyof Pick<
  Applicant,
  | "legalName"
  | "nationality"
  | "dateOfBirth"
  | "gender"
  | "address"
  | "residenceStatus"
  | "residenceExpiryDate"
  | "residenceCardNumber"
  | "workRestriction"
>;

/** 申請人情報フォームの入力欄の id（概要からのフォーカス移動と共有する） */
export function applicantFieldId(key: JumpField): string {
  return `applicant-field-${key}`;
}

/** 概要の「未入力」をリンクにするか。編集権限があり、申請人情報が確認済みでないときのみ */
export function canJumpToApplicantField(canEdit: boolean, confirmationStatus: Applicant["confirmationStatus"]): boolean {
  return canEdit && confirmationStatus !== "confirmed";
}
