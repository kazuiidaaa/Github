import path from "node:path";
import ExcelJS from "exceljs";
import type { FormDetails } from "../../formDetails";
import type { Applicant, EmploymentInfo } from "../../types";
import {
  JOB_DESCRIPTION_LINES,
  MAX_RELATIVES,
  MAX_WORK_HISTORY,
  RENEWAL_DIGIT_CHECKS,
  RENEWAL_FILL_ITEMS,
  RENEWAL_PICK_ITEMS,
  digitsOf,
  sheetKey,
  type FillCtx,
} from "./renewalMapping";

/** 差し込み元テンプレート（リポジトリ同梱。Node.js ランタイムで、ファイルシステム経由で読み込む） */
export const RENEWAL_TEMPLATE_PATH = path.join(process.cwd(), "docs", "official", "renewal-application-form_930004095.xlsx");

/**
 * 案件情報を、公式の在留期間更新許可申請書（Excel）の対応欄へ差し込み、ワークブックをバッファで返す。
 * 入力のない項目は、テンプレートの元の状態（空欄）のまま変更しない。
 * 注意：Edge ランタイムでは使えない（node:fs を使う）。
 */
export async function fillRenewalExcel(
  a: Applicant,
  e: EmploymentInfo,
  f: FormDetails,
): Promise<{ buffer: Buffer; warnings: string[] }> {
  const ctx: FillCtx = { a, e, f };
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(RENEWAL_TEMPLATE_PATH);

  const sheets = new Map(wb.worksheets.map((ws) => [sheetKey(ws.name), ws]));
  const sheetOf = (name: string) => {
    const ws = sheets.get(sheetKey(name));
    if (!ws) throw new Error(`テンプレートにシートがありません: ${name}`);
    return ws;
  };

  for (const it of RENEWAL_FILL_ITEMS) {
    const value = it.get(ctx);
    if (value === "") continue;
    sheetOf(it.sheet).getCell(it.cell).value = value;
  }
  for (const p of RENEWAL_PICK_ITEMS) {
    const writes = p.writes[p.get(ctx)];
    if (!writes) continue;
    const ws = sheetOf(p.sheet);
    for (const [cell, value] of Object.entries(writes)) ws.getCell(cell).value = value === "" ? null : value;
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, warnings: buildWarnings(ctx) };
}

function buildWarnings(c: FillCtx): string[] {
  const w: string[] = [];
  if (c.a.confirmationStatus !== "confirmed") {
    w.push("申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。");
  }
  if (c.f.relativesPresent === "yes" && c.f.relatives.length > MAX_RELATIVES) {
    w.push(`在日親族は、様式の欄（${MAX_RELATIVES}人分）に入らない分を差し込んでいません。別紙に記載してください。`);
  }
  if (c.f.workHistory.length > MAX_WORK_HISTORY) {
    w.push(`職歴は、様式の欄（${MAX_WORK_HISTORY}件分）に入らない分を差し込んでいません。別紙に記載してください。`);
  }
  if (c.e.jobDescription.split(/\r?\n/).filter((l) => l.trim() !== "").length > JOB_DESCRIPTION_LINES) {
    w.push("活動内容詳細が3行以上あるため、2行目に続けて差し込んでいます。欄に収まるか確認し、必要なら別紙に記載してください。");
  }
  if (c.e.industry && !/^\d{1,3}$/.test(c.e.industry.trim())) {
    w.push("業種が番号ではないため、所属機関等作成用1の業種欄は空欄です。別紙「業種一覧」の番号を記入してください。");
  }
  if (c.f.occupationCode && !/^\d{1,3}$/.test(c.f.occupationCode.trim())) {
    w.push("職種が番号ではないため、所属機関等作成用1の職種欄は空欄です。別紙「職種一覧」の番号を記入してください。");
  }
  for (const d of RENEWAL_DIGIT_CHECKS) {
    const raw = d.get(c);
    if (raw && digitsOf(raw).length !== d.length) {
      w.push(`${d.label}が${d.length}桁ではありません。原本と照合してください。`);
    }
  }
  return w;
}
