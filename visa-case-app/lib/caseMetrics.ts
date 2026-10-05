import { unresolvedCount } from "./checks/definitions";
import { evaluate } from "./requirements/evaluate";
import { hasResidenceCard } from "./documentKinds";
import { daysUntil } from "./format";
import type { CaseRecord } from "./types";

// 業務上の注意喚起のための区分であり、申請の可否や期限の法的な判断ではない。
export type ExpiryLevel = "unknown" | "overdue" | "urgent" | "caution" | "normal";

export const URGENT_DAYS = 30;
export const CAUTION_DAYS = 90;

export const EXPIRY_LEVEL_LABELS: Record<ExpiryLevel, string> = {
  unknown: "未入力",
  overdue: "期限超過",
  urgent: "緊急",
  caution: "注意",
  normal: "通常",
};

export function expiryLevel(days: number | null): ExpiryLevel {
  if (days === null) return "unknown";
  if (days < 0) return "overdue";
  if (days <= URGENT_DAYS) return "urgent";
  if (days <= CAUTION_DAYS) return "caution";
  return "normal";
}

export function expiryMessage(days: number | null): string {
  if (days === null) return "在留期限は未入力です";
  return days >= 0 ? `在留期限まで${days}日` : `在留期限を${-days}日経過`;
}

export interface CaseMetrics {
  days: number | null;
  level: ExpiryLevel;
  /** 期限が30日以内（経過を含む） */
  within30: boolean;
  /** 必要だが未提出の書類の数（規則が未整備の手続は0） */
  missingCount: number;
  /** 申請人情報が行政書士により確定されていない */
  unconfirmed: boolean;
  /** 申請前チェックが未実施、または未解決の項目が残っている */
  checksPending: boolean;
}

export function metricsOf(c: CaseRecord): CaseMetrics {
  const days = daysUntil(c.applicant.residenceExpiryDate);
  const level = expiryLevel(days);
  return {
    days,
    level,
    within30: level === "urgent" || level === "overdue",
    missingCount: evaluate(c).missing.length,
    unconfirmed: c.applicant.confirmationStatus !== "confirmed",
    checksPending: c.checks.length === 0 || unresolvedCount(c.checks) > 0,
  };
}

export interface Summary {
  total: number;
  review: number;
  missingDocs: number;
  unconfirmed: number;
  checksPending: number;
  ready: number;
  within30: number;
}

export function summarize(cases: CaseRecord[]): Summary {
  const s: Summary = { total: cases.length, review: 0, missingDocs: 0, unconfirmed: 0, checksPending: 0, ready: 0, within30: 0 };
  for (const c of cases) {
    const m = metricsOf(c);
    if (c.workflowStatus === "review_required") s.review++;
    if (c.workflowStatus === "application_ready") s.ready++;
    if (m.checksPending) s.checksPending++;
    if (m.missingCount > 0) s.missingDocs++;
    if (m.unconfirmed) s.unconfirmed++;
    if (m.within30) s.within30++;
  }
  return s;
}

export type SortKey =
  | "updated"
  | "updatedAsc"
  | "expiry"
  | "expiryDesc"
  | "name"
  | "nameDesc"
  | "applicant"
  | "applicantDesc";

export const SORT_KEYS: SortKey[] = ["updated", "updatedAsc", "expiry", "expiryDesc", "name", "nameDesc", "applicant", "applicantDesc"];

export function isSortKey(v: string | null): v is SortKey {
  return v !== null && (SORT_KEYS as string[]).includes(v);
}

/** 表の見出し（列）と並び順の対応。asc は昇順（在留期限は近い順、最終更新は古い順）。 */
export type SortColumn = "name" | "applicant" | "expiry" | "updated";
export const SORT_COLUMNS: Record<SortColumn, { asc: SortKey; desc: SortKey }> = {
  name: { asc: "name", desc: "nameDesc" },
  applicant: { asc: "applicant", desc: "applicantDesc" },
  expiry: { asc: "expiry", desc: "expiryDesc" },
  updated: { asc: "updatedAsc", desc: "updated" },
};

/** 現在の並び順が、どの列の昇順・降順か。 */
export function sortState(sort: SortKey): { column: SortColumn; dir: "asc" | "desc" } {
  for (const column of Object.keys(SORT_COLUMNS) as SortColumn[]) {
    if (SORT_COLUMNS[column].asc === sort) return { column, dir: "asc" };
    if (SORT_COLUMNS[column].desc === sort) return { column, dir: "desc" };
  }
  return { column: "updated", dir: "desc" };
}

/** 見出しを押したときの次の並び順。現在の列なら向きを反転し、別の列なら昇順（最終更新のみ新しい順）から始める。 */
export function nextSort(current: SortKey, column: SortColumn): SortKey {
  const st = sortState(current);
  if (st.column === column) return SORT_COLUMNS[column][st.dir === "asc" ? "desc" : "asc"];
  return column === "updated" ? SORT_COLUMNS.updated.desc : SORT_COLUMNS[column].asc;
}

/** 1ページに表示する件数 */
export const PAGE_SIZE = 50;

export interface Page<T> {
  items: T[];
  /** 範囲内に補正した現在のページ（1始まり） */
  page: number;
  totalPages: number;
  total: number;
}

export function paginate<T>(items: T[], page: number, size: number = PAGE_SIZE): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const p = Number.isFinite(page) ? Math.min(Math.max(1, Math.floor(page)), totalPages) : 1;
  return { items: items.slice((p - 1) * size, p * size), page: p, totalPages, total: items.length };
}

export interface CaseFilter {
  query: string;
  procedure: string; // "all" または手続種別
  status: string; // "all" または状態
  within30: boolean;
  missingDocs: boolean;
  /** 在留カードが未登録（documents が空）の案件のみ */
  noCard: boolean;
  unconfirmed: boolean;
  checksPending: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTER: CaseFilter = {
  query: "",
  procedure: "all",
  status: "all",
  within30: false,
  missingDocs: false,
  noCard: false,
  unconfirmed: false,
  checksPending: false,
  sort: "updated",
};

export interface CaseRow {
  record: CaseRecord;
  metrics: CaseMetrics;
}

export function applyFilter(cases: CaseRecord[], f: CaseFilter): CaseRow[] {
  const q = f.query.trim().toLowerCase();
  const rows = cases
    .map((record) => ({ record, metrics: metricsOf(record) }))
    .filter(({ record: c, metrics: m }) => {
      if (q) {
        const text = `${c.caseName} ${c.applicant.legalName} ${c.applicant.residenceStatus || c.currentStatus}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (f.procedure !== "all" && c.procedureType !== f.procedure) return false;
      if (f.status !== "all" && c.workflowStatus !== f.status) return false;
      if (f.within30 && !m.within30) return false;
      if (f.missingDocs && m.missingCount === 0) return false;
      if (f.noCard && hasResidenceCard(c)) return false;
      if (f.unconfirmed && !m.unconfirmed) return false;
      if (f.checksPending && !m.checksPending) return false;
      return true;
    });
  const { column, dir } = sortState(f.sort);
  const sign = dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    // 未入力の値は、昇順・降順のどちらでも末尾に置く
    let cmp = 0;
    if (column === "expiry") {
      const da = a.metrics.days;
      const db = b.metrics.days;
      if (da !== db) {
        if (da === null) return 1;
        if (db === null) return -1;
        cmp = da - db;
      }
    } else if (column === "name" || column === "applicant") {
      const va = column === "name" ? a.record.caseName : a.record.applicant.legalName;
      const vb = column === "name" ? b.record.caseName : b.record.applicant.legalName;
      if (!va !== !vb) return va ? -1 : 1;
      cmp = va.localeCompare(vb, "ja");
    } else {
      cmp = a.record.updatedAt.localeCompare(b.record.updatedAt);
    }
    if (cmp !== 0) return cmp * sign;
    return b.record.updatedAt.localeCompare(a.record.updatedAt);
  });
  return rows;
}

export function isFilterActive(f: CaseFilter): boolean {
  return (
    f.query.trim() !== "" ||
    f.procedure !== "all" ||
    f.status !== "all" ||
    f.within30 ||
    f.missingDocs ||
    f.noCard ||
    f.unconfirmed ||
    f.checksPending
  );
}

/** 有効な絞り込み条件の件数（並び順は含めない）。折りたたみ時の要約表示に使う。 */
export function countActiveFilters(f: CaseFilter): number {
  return [
    f.query.trim() !== "",
    f.procedure !== "all",
    f.status !== "all",
    f.within30,
    f.missingDocs,
    f.noCard,
    f.unconfirmed,
    f.checksPending,
  ].filter(Boolean).length;
}
