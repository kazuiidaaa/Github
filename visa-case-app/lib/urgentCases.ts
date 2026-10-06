import { applyFilter, DEFAULT_FILTER, type CaseRow } from "./caseMetrics";
import { decideNextAction } from "./nextAction";
import type { CaseRecord } from "./types";

export interface UrgentRow extends CaseRow {
  /** 次に行うこと（個人情報を含まない案内文） */
  nextMessage: string;
}

/**
 * ホームの「要対応」に出す案件。在留期限が過ぎた案件と、30日以内の案件を、期限の近い順（過ぎた案件が先頭）に返す。
 * 在留期限が未入力の案件は含めない。
 */
export function urgentCases(cases: CaseRecord[]): UrgentRow[] {
  return applyFilter(cases, { ...DEFAULT_FILTER, within30: true, sort: "expiry" }).map((row) => ({
    ...row,
    nextMessage: decideNextAction(row.record).message,
  }));
}
