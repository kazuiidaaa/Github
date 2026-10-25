import { metricsOf, URGENT_DAYS, type CaseMetrics } from "./caseMetrics";
import type { CaseRecord } from "./types";

/** 「期限と次の作業」（iPhone 版 /m/deadlines）の見出しの区分。この順に並べる */
export type DeadlineGroupId = "overdue" | "within30" | "later" | "none";

export const DEADLINE_GROUP_ORDER: DeadlineGroupId[] = ["overdue", "within30", "later", "none"];

/** 在留期限までの日数から区分を決める。超過（負）、0〜30 日（本日を含む）、31 日以降、未入力（null） */
export function deadlineGroupOf(days: number | null): DeadlineGroupId {
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= URGENT_DAYS) return "within30";
  return "later";
}

export interface DeadlineRow {
  record: CaseRecord;
  metrics: CaseMetrics;
}

export interface DeadlineGroup {
  id: DeadlineGroupId;
  rows: DeadlineRow[];
}

/**
 * 案件を、在留期限が近い順（超過した案件が先頭）に区分して返す。件数が 0 の区分は含めない。
 * 期限が未入力の案件は、最後の区分「期限なし」にまとめる。同じ日数の案件は案件名順（さらに id 順）で、並びを一定にする。
 * 読むだけの関数で、保存・権限には触れない。
 */
export function groupByDeadline(cases: CaseRecord[]): DeadlineGroup[] {
  const rows: DeadlineRow[] = cases.map((record) => ({ record, metrics: metricsOf(record) }));
  rows.sort((a, b) => {
    const da = a.metrics.days;
    const db = b.metrics.days;
    if (da !== db) {
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    }
    return a.record.caseName.localeCompare(b.record.caseName, "ja") || a.record.id.localeCompare(b.record.id);
  });
  return DEADLINE_GROUP_ORDER.map((id) => ({ id, rows: rows.filter((r) => deadlineGroupOf(r.metrics.days) === id) })).filter((g) => g.rows.length > 0);
}
