import type { CaseRow } from "./caseMetrics";
import { formatDate, formatDateTime } from "./format";
import { decideNextAction } from "./nextAction";
import { PROCEDURE_TYPES, procedureNeedsTarget, WORKFLOW_LABELS, type CaseRecord } from "./types";

/**
 * 案件一覧（PC 版）の CSV 書き出し（Issue #515）。
 * - 書き出す列は、画面の表に出ている情報を基本にする（案件名・申請人氏名・手続種別・在留資格・状態・期限・次の作業・最終更新）。
 * - 書き出す対象は、呼び出し側（app/cases/page.tsx）が渡す行。絞り込み・並び順を反映した「表示中の行」（ページ送りの前の、全ページ分）を渡す想定。
 * - Excel で文字化けしないよう、BOM 付き UTF-8 にする（caseListCsvBlob）。
 * - 表示用の文言は、UI の言語切り替えに関わらず、常に日本語にする（行政書士向けの書き出しのため。lib の既定どおり jaT を使う）。
 */

/** Excel で UTF-8 の CSV を正しく開くための BOM */
const CSV_BOM = "﻿";

export const CASE_LIST_CSV_HEADERS = [
  "案件名",
  "申請人氏名",
  "手続種別",
  "在留資格（現在）",
  "在留資格（申請後）",
  "状態",
  "在留期限",
  "次の作業",
  "最終更新日時",
] as const;

function procedureLabelOf(c: CaseRecord): string {
  return PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label ?? "";
}

/** 現在の在留資格（案件一覧の従来の決め方と同じ。components/StatusTransition.tsx の currentStatusOf と一致させる） */
function currentStatusOf(c: CaseRecord): string {
  return c.applicant.residenceStatus || c.currentStatus || "";
}

/** 変更後／希望する在留資格。対象外の手続（更新・その他・永住）は空にする */
function targetStatusOf(c: CaseRecord): string {
  return procedureNeedsTarget(c.procedureType) ? (c.targetStatus ?? "").trim() : "";
}

function fieldsOf(row: CaseRow): string[] {
  const c = row.record;
  return [
    c.caseName,
    c.applicant.legalName,
    procedureLabelOf(c),
    currentStatusOf(c),
    targetStatusOf(c),
    WORKFLOW_LABELS[c.workflowStatus],
    c.applicant.residenceExpiryDate ? formatDate(c.applicant.residenceExpiryDate) : "",
    decideNextAction(c).message,
    formatDateTime(c.updatedAt),
  ];
}

/** CSV の1フィールドを、必要なときだけダブルクオートで囲んでエスケープする（カンマ・改行・ダブルクオートを含む場合） */
export function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsvLine(fields: readonly string[]): string {
  return fields.map(escapeCsvField).join(",") + "\r\n";
}

/** 案件一覧の行を CSV 文字列にする（BOM は含まない）。行が無いときは見出しのみ */
export function caseListToCsv(rows: CaseRow[]): string {
  let out = toCsvLine(CASE_LIST_CSV_HEADERS);
  for (const row of rows) out += toCsvLine(fieldsOf(row));
  return out;
}

/** Excel で文字化けしない、BOM 付き UTF-8 の CSV Blob を返す */
export function caseListCsvBlob(rows: CaseRow[]): Blob {
  return new Blob([CSV_BOM + caseListToCsv(rows)], { type: "text/csv;charset=utf-8" });
}

/** ファイル名（例：案件一覧_20261107.csv）。date は省略時に現在日時（端末のローカル日付） */
export function caseListCsvFileName(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `案件一覧_${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}.csv`;
}

/**
 * ブラウザ側で CSV をダウンロードする（Blob ＋ 一時的なリンク方式。サーバーへの送信はしない）。
 * 個人情報を含むため、呼び出しは利用者の明示の操作（ボタン押下）からのみ行うこと。
 */
export function downloadCaseListCsv(rows: CaseRow[], date: Date = new Date()): void {
  const blob = caseListCsvBlob(rows);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = caseListCsvFileName(date);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
