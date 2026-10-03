import { unresolvedCount } from "./checks/definitions";
import { evaluate } from "./requirements/evaluate";
import { daysUntil } from "./format";
import type { CaseRecord } from "./types";

// 業務上の注意喚起のための区分であり、申請の可否や期限の法的な判断ではない。
export type ExpiryLevel = "unknown" | "overdue" | "urgent" | "caution" | "normal";

export const URGENT_DAYS = 30;
export const CAUTION_DAYS = 90;

export const EXPIRY_LEVEL_LABELS: Record<ExpiryLevel, string> = {
  unknown: "未確認",
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
  if (days === null) return "在留期限は未確認です";
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

export type SortKey = "updated" | "expiry";

export interface CaseFilter {
  query: string;
  procedure: string; // "all" または手続種別
  status: string; // "all" または状態
  within30: boolean;
  missingDocs: boolean;
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
      if (f.unconfirmed && !m.unconfirmed) return false;
      if (f.checksPending && !m.checksPending) return false;
      return true;
    });
  rows.sort((a, b) => {
    if (f.sort === "expiry") {
      // 期限が近い順。期限未確認の案件は末尾に置く
      const da = a.metrics.days ?? Number.POSITIVE_INFINITY;
      const db = b.metrics.days ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da < db ? -1 : 1;
    }
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
    f.unconfirmed
  );
}
