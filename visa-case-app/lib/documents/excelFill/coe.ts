import path from "node:path";
import ExcelJS from "exceljs";
import type { FormDetails } from "../../formDetails";
import { describeCoeForm, resolveCoeForm, type CoeFormCode, type CoeFormResolution } from "../../hspForm";
import { ADVANCED_PROFESSIONAL_STATUS, type Applicant, type EmploymentInfo } from "../../types";
import {
  COE_DIGIT_CHECKS,
  COE_FILL_ITEMS,
  COE_MAX_RELATIVES,
  COE_MAX_WORK_HISTORY,
  COE_PICK_ITEMS,
  COE_PURPOSE_LABELS,
  COE_SHEET_APPLICANT_1,
} from "./coeMapping";
import { JOB_DESCRIPTION_LINES, digitsOf, sheetKey, type FillCtx } from "./renewalMapping";

const officialPath = (file: string) => path.join(process.cwd(), "docs", "official", file);

/** 差し込み元テンプレート（様式N。リポジトリ同梱。Node.js ランタイムで、ファイルシステム経由で読み込む） */
export const COE_TEMPLATE_PATH = officialPath("coe-application-form_930004030.xlsx");

/** 様式ごとのテンプレート。高度専門職の号・行う活動から決まる様式を使う（lib/hspForm.ts） */
export const COE_TEMPLATE_PATHS: Record<CoeFormCode, string> = {
  I: officialPath("coe-application-form-I_930004028.xlsx"),
  L: officialPath("coe-application-form-L_930004032.xlsx"),
  M: officialPath("coe-application-form-M_930004034.xlsx"),
  N: COE_TEMPLATE_PATH,
  U: officialPath("coe-application-form-U_930004059.xlsx"),
};

/**
 * 差し込む範囲を決める。第2表以降（申請人用2・所属機関用）の対応表は様式Nのものだけなので、
 * 様式N以外、および様式を特定できない高度専門職では、第1表だけを差し込む（Nの表を他の様式へ流用しない）。
 */
function planFill(r: CoeFormResolution): { form: CoeFormCode; firstSheetOnly: boolean } {
  if (r.kind === "resolved") return { form: r.form, firstSheetOnly: r.form !== "N" };
  return { form: "N", firstSheetOnly: r.kind !== "not_applicable" };
}

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
  const resolution = resolveCoeForm(targetStatus, f.hspActivity ?? "");
  const plan = planFill(resolution);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(COE_TEMPLATE_PATHS[plan.form]);

  const sheets = new Map(wb.worksheets.map((ws) => [sheetKey(ws.name), ws]));
  const sheetOf = (name: string) => {
    const ws = sheets.get(sheetKey(name));
    if (!ws) throw new Error(`テンプレートにシートがありません: ${name}`);
    return ws;
  };

  const first = sheetKey(COE_SHEET_APPLICANT_1);
  const inRange = (sheet: string) => !plan.firstSheetOnly || sheetKey(sheet) === first;
  for (const it of COE_FILL_ITEMS) {
    if (!inRange(it.sheet)) continue;
    const value = it.get(ctx);
    if (value === "") continue;
    sheetOf(it.sheet).getCell(it.cell).value = value;
  }
  for (const p of COE_PICK_ITEMS) {
    if (!inRange(p.sheet)) continue;
    const writes = p.writes[p.get(ctx)];
    if (!writes) continue;
    const ws = sheetOf(p.sheet);
    for (const [cell, value] of Object.entries(writes)) ws.getCell(cell).value = value === "" ? null : value;
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, warnings: buildWarnings(ctx, resolution) };
}

function buildWarnings(c: FillCtx, resolution: CoeFormResolution): string[] {
  const w: string[] = [];
  if (resolution.kind === "resolved" && resolution.form !== "N") {
    w.push(`様式 ${resolution.form} の第2表以降は未対応です。第1表のみ差し込んでいます。第2表以降は、様式上で記入してください。`);
  } else if (resolution.kind === "activity_missing" || resolution.kind === "unknown") {
    w.push(`${describeCoeForm(resolution)}様式Nの第1表のみ差し込んでいます。使う様式を確認し、必要なら別の様式へ転記してください。`);
  }
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
