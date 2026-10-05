import path from "node:path";
import ExcelJS from "exceljs";
import type { FormDetails } from "../../formDetails";
import { ADVANCED_PROFESSIONAL_STATUS, type Applicant, type EmploymentInfo } from "../../types";
import {
  COE_DIGIT_CHECKS,
  COE_FILL_ITEMS,
  COE_MAX_RELATIVES,
  COE_MAX_WORK_HISTORY,
  COE_PICK_ITEMS,
  COE_PURPOSE_LABELS,
} from "./coeMapping";
import { JOB_DESCRIPTION_LINES, digitsOf, sheetKey, type FillCtx } from "./renewalMapping";

/** 差し込み元テンプレート（リポジトリ同梱。Node.js ランタイムで、ファイルシステム経由で読み込む） */
export const COE_TEMPLATE_PATH = path.join(process.cwd(), "docs", "official", "coe-application-form_930004030.xlsx");

/**
 * 案件情報を、公式の在留資格認定証明書交付申請書（Excel）の対応欄へ差し込み、ワークブックをバッファで返す。
 * 入力のない項目は、テンプレートの元の状態（空欄）のまま変更しない。
 * 入国目的（項目11）は様式のチェック欄だが、案件の「希望する在留資格」（targetStatus）が様式の選択肢と
 * 一字一句一致する場合に限り、該当の□を■へ置き換えて選択を反映する（一致しない場合は差し込まず、warningsで案内する）。
 * 注意：Edge ランタイムでは使えない（node:fs を使う）。
 */
export async function fillCoeExcel(
  a: Applicant,
  e: EmploymentInfo,
  f: FormDetails,
  targetStatus = "",
): Promise<{ buffer: Buffer; warnings: string[] }> {
  const ctx: FillCtx = { a, e, f, targetStatus };
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(COE_TEMPLATE_PATH);

  const sheets = new Map(wb.worksheets.map((ws) => [sheetKey(ws.name), ws]));
  const sheetOf = (name: string) => {
    const ws = sheets.get(sheetKey(name));
    if (!ws) throw new Error(`テンプレートにシートがありません: ${name}`);
    return ws;
  };

  for (const it of COE_FILL_ITEMS) {
    const value = it.get(ctx);
    if (value === "") continue;
    sheetOf(it.sheet).getCell(it.cell).value = value;
  }
  for (const p of COE_PICK_ITEMS) {
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
  if (c.f.relativesPresent === "yes" && c.f.relatives.length > COE_MAX_RELATIVES) {
    w.push(`在日親族・同居者は、様式の欄（${COE_MAX_RELATIVES}人分）に入らない分を差し込んでいません。別紙に記載してください。`);
  }
  if (c.f.workHistory.length > COE_MAX_WORK_HISTORY) {
    w.push(`職歴は、様式の欄（${COE_MAX_WORK_HISTORY}件分）に入らない分を差し込んでいません。別紙に記載してください。`);
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
  const target = (c.targetStatus ?? "").trim();
  if (target === ADVANCED_PROFESSIONAL_STATUS) {
    w.push("11 入国目的（高度専門職）は、号（イ・ロ・ハ）が未選択のため、チェックを付けていません。案件の「希望する在留資格」で号を選択してください。");
  } else if (target && !COE_PURPOSE_LABELS.includes(target)) {
    w.push(`11 入国目的（${target}）は、様式の選択肢と一致しないため、チェックを付けていません。様式上で該当の□を選択してください（「特定技能」「技能実習」「特定活動」は、号・種別の種類まで様式上でご確認ください）。`);
  }
  for (const d of COE_DIGIT_CHECKS) {
    const raw = d.get(c);
    if (raw && digitsOf(raw).length !== d.length) {
      w.push(`${d.label}が${d.length}桁ではありません。原本と照合してください。`);
    }
  }
  return w;
}
