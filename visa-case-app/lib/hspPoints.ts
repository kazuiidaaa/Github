import { HSP_POINT_SHEETS, type HspPointRow, type HspPointSheetKey } from "./hspPointRows";
import { ADVANCED_PROFESSIONAL_GRADE_2 } from "./types";

export { HSP_POINT_SHEETS };
export type { HspPointRow, HspPointSheetKey };

/** 高度専門職の合格の基準（ポイントの合計） */
export const HSP_PASS_POINTS = 70;

/** 号から、使うシートを決める。2号・号が未選択の場合は、案件で選ぶシート（override）を使う */
const GRADE_SHEET: Record<string, HspPointSheetKey> = {
  "高度専門職（1号イ）": "A",
  "高度専門職（1号ロ）": "B",
  "高度専門職（1号ハ）": "C",
};

export type HspPointSheetResolution =
  | { kind: "not_applicable" }
  | { kind: "resolved"; sheet: HspPointSheetKey; fromGrade: boolean }
  | { kind: "needs_choice" };

export function resolveHspPointSheet(status: string, override: string): HspPointSheetResolution {
  const s = status.trim();
  const byGrade = GRADE_SHEET[s];
  if (byGrade) return { kind: "resolved", sheet: byGrade, fromGrade: true };
  // 「高度専門職」（号が未選択）と2号は、使うシートを案件で選ぶ（2号の変更は、1号イ・ロ・ハのいずれかのシートを使う）
  if (s !== "高度専門職" && s !== ADVANCED_PROFESSIONAL_GRADE_2) return { kind: "not_applicable" };
  return override === "A" || override === "B" || override === "C" ? { kind: "resolved", sheet: override, fromGrade: false } : { kind: "needs_choice" };
}

/** チェックの保存値。シートごとに行が異なるため、「シート:行」で持つ（例：「B:20」） */
export const pointCheckId = (sheet: HspPointSheetKey, row: number) => `${sheet}:${row}`;

export function checkedRows(sheet: HspPointSheetKey, checks: readonly string[]): HspPointRow[] {
  const set = new Set(checks);
  return HSP_POINT_SHEETS[sheet].rows.filter((r) => set.has(pointCheckId(sheet, r.row)));
}

/** 択一の区分（同じ区分で2つ以上選ぶと、通常は誤り） */
const EXCLUSIVE_SECTIONS = ["職歴", "年収", "年齢", "地位"];

export interface HspPointEstimate {
  /** 選んだ項目の、様式に印字された点数の単純合計 */
  total: number;
  /** 印字された点数がなく、合計に含めていない項目 */
  unscored: HspPointRow[];
  reachesPass: boolean;
  notes: string[];
  /** 様式の合計欄へ、合計点を書き込んでよいか。項目を選んでいて、点数の印字がない項目と、択一の区分の重複がないときだけ true */
  totalWritable: boolean;
}

/**
 * 目安の合計点。選んだ項目に印字された点数の単純合計。
 * 様式の合計欄へは、totalWritable のときだけ書き込む（点数の印字がない項目や、択一の区分の重複があるときは、行政書士が確認して記入する）。
 * 研究実績の2つ以上の組み合わせ、特別加算の上限、年齢による年収の範囲などは判定しない（行政書士が、計算表の欄で確認する）。
 */
export function estimateHspPoints(sheet: HspPointSheetKey, checks: readonly string[]): HspPointEstimate {
  const rows = checkedRows(sheet, checks);
  const total = rows.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const unscored = rows.filter((r) => r.points === null);
  const notes: string[] = [];
  let duplicated = false;
  for (const section of EXCLUSIVE_SECTIONS) {
    if (rows.filter((r) => r.section === section).length > 1) {
      duplicated = true;
      notes.push(`「${section}」は、1つだけ選ぶ項目です。複数選んでいます。`);
    }
  }
  if (unscored.length > 0) notes.push(`点数が印字されていない項目（${unscored.map((r) => r.label.slice(0, 12)).join("、")}…）は、合計に含めていません。計算表で点数を確認してください。`);
  if (rows.length > 0 && !rows.some((r) => r.section === "年収")) notes.push("年収が未選択です。年収が300万円に満たないときは、他の項目の合計が70点以上でも、高度専門職外国人としては認められません。");
  return { total, unscored, reachesPass: total >= HSP_PASS_POINTS, notes, totalWritable: rows.length > 0 && unscored.length === 0 && !duplicated };
}

/** 保存値から、存在しないチェック（様式の改正や、別シートの値）を除く */
export function sanitizePointChecks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(
    (Object.keys(HSP_POINT_SHEETS) as HspPointSheetKey[]).flatMap((k) => HSP_POINT_SHEETS[k].rows.map((r) => pointCheckId(k, r.row))),
  );
  return [...new Set(raw.filter((v): v is string => typeof v === "string" && valid.has(v)))];
}
