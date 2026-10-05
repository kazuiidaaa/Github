import path from "node:path";
import ExcelJS from "exceljs";
import type { FormDetails } from "../../formDetails";
import { HSP_POINT_SHEETS, checkedRows, estimateHspPoints, resolveHspPointSheet, type HspPointSheetKey } from "../../hspPoints";
import { sheetKey } from "./renewalMapping";

/** 差し込み元テンプレート（高度専門職ポイント計算表。リポジトリ同梱。Node.js ランタイムで、ファイルシステム経由で読み込む） */
export const HSP_POINT_TEMPLATE_PATH = path.join(process.cwd(), "docs", "official", "points-calculation-table_930001673.xlsx");

const CHECK_COLUMN = "AF";

/**
 * 案件で選んだチェック欄（□→■）を、号に応じたシートへ差し込み、ワークブックをバッファで返す。
 * 使わないシート（他の号のシート）は、出力から除く。合計欄には、選んだ項目の印字点数の合計を値で書き込む（点数の印字がない項目や、択一の区分の重複があるときは、行政書士が確認して記入するため、書き込まない）。
 * 注意：Edge ランタイムでは使えない（node:fs を使う）。
 */
export async function fillHspPointExcel(
  targetStatus: string,
  f: FormDetails,
): Promise<{ buffer: Buffer; warnings: string[] }> {
  const resolution = resolveHspPointSheet(targetStatus, f.hspPointSheet);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(HSP_POINT_TEMPLATE_PATH);
  const warnings: string[] = [];

  if (resolution.kind !== "resolved") {
    warnings.push(
      resolution.kind === "needs_choice"
        ? "使うシート（1号イ・ロ・ハ）が決まっていません。案件の「ポイント計算表」で、シートを選択してください。チェックは差し込んでいません。"
        : "この案件の在留資格は、高度専門職ではないため、ポイント計算表を差し込んでいません。",
    );
    return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), warnings };
  }

  const sheet: HspPointSheetKey = resolution.sheet;
  const def = HSP_POINT_SHEETS[sheet];
  const byKey = new Map(wb.worksheets.map((ws) => [sheetKey(ws.name), ws]));
  const target = byKey.get(sheetKey(def.sheetName));
  if (!target) throw new Error(`テンプレートにシートがありません: ${def.sheetName}`);

  const rows = checkedRows(sheet, f.hspPointChecks);
  const selected = new Set(rows.map((r) => r.row));
  for (const r of def.rows) {
    const cell = target.getCell(`${r.col ?? CHECK_COLUMN}${r.row}`);
    if (selected.has(r.row)) cell.value = "■";
    else if (r.blankInTemplate) cell.value = "□"; // ラジオボタン（フォーム部品）は書き出しで消えるため、選択欄を文字で示す
  }

  for (const [k, other] of Object.entries(HSP_POINT_SHEETS) as [HspPointSheetKey, (typeof HSP_POINT_SHEETS)[HspPointSheetKey]][]) {
    if (k === sheet) continue;
    const ws = byKey.get(sheetKey(other.sheetName));
    if (ws) wb.removeWorksheet(ws.id);
  }

  const est = estimateHspPoints(sheet, f.hspPointChecks);
  if (rows.length === 0) warnings.push("チェックを選んでいません。計算表の各項目は、様式上で記入してください。");
  if (est.totalWritable) {
    target.getCell(def.totalCell).value = est.total;
  } else if (rows.length > 0) {
    warnings.push("点数が印字されていない項目、または択一の区分の重複があるため、合計欄は書き込んでいません。計算表で確認し、合計欄を記入してください。");
  }
  warnings.push(`選択した項目の印字点数の単純合計は ${est.total} 点です（目安）。${est.totalWritable ? "合計欄へ書き込みました。" : ""}研究実績の2つ以上の組み合わせ・年齢による年収の範囲は判定していません。計算表で確認してください。`);
  warnings.push(...est.notes);
  warnings.push("特別加算の試験研究費等の割合、申出人の署名・作成年月日は、案件情報にないため差し込んでいません。様式上で記入してください。");
  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), warnings };
}
