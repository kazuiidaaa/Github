import { isValidDate } from "./format";

/** 受任日が、申請予定日より後か（どちらかが未入力・不正な日付なら false） */
export function isAcceptedAfterPlanned(acceptedDate: string, plannedApplicationDate: string): boolean {
  if (!isValidDate(acceptedDate) || !isValidDate(plannedApplicationDate)) return false;
  return acceptedDate > plannedApplicationDate;
}

/** 受任日の入力が、存在しない日付などで不正か（未入力は正常） */
export function hasAcceptedDateError(acceptedDate: string): boolean {
  return acceptedDate !== "" && !isValidDate(acceptedDate);
}
