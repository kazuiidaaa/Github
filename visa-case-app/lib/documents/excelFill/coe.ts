import path from "node:path";
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
import { COE_TABLE2, type Table2Mapping } from "./coeTable2";
import { fillWorkbook } from "./fillWorkbook";
import { JOB_DESCRIPTION_LINES, digitsOf, sheetKey, type FillCtx } from "./renewalMapping";

const KEIEI_KANRI = "経営・管理";

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
 * 差し込む範囲を決める。第2表以降（申請人用2以降・所属機関用）は、様式 N（coeMapping.ts）と、
 * I・L・M・U（coeTable2.ts）の対応表がある。様式を特定できない高度専門職では、第1表だけを差し込む
 * （他の様式の表を流用しない）。高度専門職ではない「経営・管理」は、様式 M を使う（Issue #191）。
 */
function planFill(r: CoeFormResolution, targetStatus: string): { form: CoeFormCode; firstOnly: boolean } {
  if (r.kind === "resolved") return { form: r.form, firstOnly: false };
  if (r.kind !== "not_applicable") return { form: "N", firstOnly: true };
  if (targetStatus.trim() === KEIEI_KANRI) return { form: "M", firstOnly: false };
  return { form: "N", firstOnly: false };
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
  const plan = planFill(resolution, targetStatus);
  const first = sheetKey(COE_SHEET_APPLICANT_1);
  const table2 = plan.form === "N" ? null : COE_TABLE2[plan.form];
  const firstOnly = <T extends { sheet: string }>(xs: T[]) => (table2 || plan.firstOnly ? xs.filter((x) => sheetKey(x.sheet) === first) : xs);
  const fillItems = [...firstOnly(COE_FILL_ITEMS), ...(table2 && !plan.firstOnly ? table2.fill : [])];
  const pickItems = [...firstOnly(COE_PICK_ITEMS), ...(table2 && !plan.firstOnly ? table2.pick : [])];
  const buffer = await fillWorkbook(COE_TEMPLATE_PATHS[plan.form], ctx, fillItems, pickItems);
  return { buffer, warnings: buildWarnings(ctx, resolution, plan.form === "N" || plan.firstOnly ? null : COE_TABLE2[plan.form]) };
}

function buildWarnings(c: FillCtx, resolution: CoeFormResolution, table2: Table2Mapping | null): string[] {
  const w: string[] = [];
  const maxWork = table2 ? table2.maxWork : COE_MAX_WORK_HISTORY;
  if (table2) {
    w.push(`${table2.name}の次の欄は、案件情報に項目がないため差し込んでいません。様式上で記入してください：${table2.manual}。`);
  }
  if (resolution.kind === "activity_missing" || resolution.kind === "unknown") {
    w.push(`${describeCoeForm(resolution)}様式Nの第1表のみ差し込んでいます。使う様式を確認し、必要なら別の様式へ転記してください。`);
  }
  if (c.a.confirmationStatus !== "confirmed") {
    w.push("申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。");
  }
  if (c.f.relativesPresent === "yes" && c.f.relatives.length > COE_MAX_RELATIVES) {
    w.push(`在日親族・同居者は、様式の欄（${COE_MAX_RELATIVES}人分）に入らない分を差し込んでいません。別紙に記載してください。`);
  }
  if (c.f.workHistory.length > maxWork) {
    w.push(`職歴は、様式の欄（${maxWork}件分）に入らない分を差し込んでいません。別紙に記載してください。`);
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
