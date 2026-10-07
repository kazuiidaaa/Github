import path from "node:path";
import type { FormDetails } from "../../formDetails";
import { isAdvancedProfessional, isFormUStatus, resolveRenewalForm, type CoeFormCode, type FormResolution } from "../../hspForm";
import type { Applicant, EmploymentInfo } from "../../types";
import {
  JOB_DESCRIPTION_LINES,
  MAX_RELATIVES,
  MAX_WORK_HISTORY,
  RENEWAL_DIGIT_CHECKS,
  RENEWAL_FILL_ITEMS,
  RENEWAL_PICK_ITEMS,
  SHEET_APPLICANT_1,
  digitsOf,
  sheetKey,
  type FillCtx,
} from "./renewalMapping";
import { fillWorkbook } from "./fillWorkbook";
import { hspChangeWarnings } from "./hspChangeCommon";
import { HSP_CHANGE_TABLE2 } from "./hspChangeTable2";
import { planFill as planHspFill, type Table2Mapping } from "./table2Common";

const officialPath = (file: string) => path.join(process.cwd(), "docs", "official", file);

/** 差し込み元テンプレート（様式N。リポジトリ同梱。Node.js ランタイムで、ファイルシステム経由で読み込む） */
export const RENEWAL_TEMPLATE_PATH = officialPath("renewal-application-form_930004095.xlsx");

/** 様式ごとのテンプレート。高度専門職（1号）の号・行う活動から決まる様式を使う（lib/hspForm.ts） */
export const RENEWAL_TEMPLATE_PATHS: Record<CoeFormCode, string> = {
  I: officialPath("renewal-application-form-I.xlsx"),
  L: officialPath("renewal-application-form-L.xlsx"),
  M: officialPath("renewal-application-form-M.xlsx"),
  N: RENEWAL_TEMPLATE_PATH,
  U: officialPath("renewal-application-form-U.xlsx"),
};

/**
 * 案件情報を、公式の在留期間更新許可申請書（Excel）の対応欄へ差し込み、ワークブックをバッファで返す。
 * 入力のない項目は、テンプレートの元の状態（空欄）のまま変更しない。
 * 高度専門職（1号）は、現在の在留資格の号と行う活動から、様式 I・L・M・N・U を選ぶ。様式を特定できない場合と、2号（更新がない）は、第1表のみ。
 * 注意：Edge ランタイムでは使えない（node:fs を使う）。
 */
export async function fillRenewalExcel(
  a: Applicant,
  e: EmploymentInfo,
  f: FormDetails,
  currentStatus = "",
): Promise<{ buffer: Buffer; warnings: string[] }> {
  const ctx: FillCtx = { a, e, f };
  const { resolution, status } = resolveRenewal(currentStatus, a.residenceStatus, f.hspActivity ?? "");
  // 高度専門職ではない「法律・会計業務」「医療」は、様式 U（第2表以降を含む）を使う（Issue #301・#302）
  const plan = planHspFill<CoeFormCode>(resolution, { notApplicable: isFormUStatus(status) ? "U" : "N", unresolved: "N" });
  // 高度専門職ではない「経営・管理」の更新は、第2表以降（様式Nの表）を使えないため、第1表（申請人用（更新）１）だけを差し込む（Issue #191）
  const keieiKanri = resolution.kind === "not_applicable" && (isKeieiKanri(currentStatus) || isKeieiKanri(a.residenceStatus));
  const table2 = plan.form === "N" || plan.firstOnly ? null : HSP_CHANGE_TABLE2[plan.form];
  const first = sheetKey(SHEET_APPLICANT_1);
  // 様式 I・L・M・U は、第1表だけ様式 N の座標と同じ。第2表以降は、様式ごとの対応表（hspChangeTable2.ts）を使う
  const firstSheetOnly = plan.firstOnly || keieiKanri || table2 !== null;
  const inRange = (sheet: string) => !firstSheetOnly || sheetKey(sheet) === first;
  const buffer = await fillWorkbook(
    RENEWAL_TEMPLATE_PATHS[plan.form],
    ctx,
    [...RENEWAL_FILL_ITEMS.filter((it) => inRange(it.sheet)), ...(table2 ? table2.fill : [])],
    [...RENEWAL_PICK_ITEMS.filter((p) => inRange(p.sheet)), ...(table2 ? table2.pick : [])],
  );
  return { buffer, warnings: buildWarnings(ctx, { resolution, status, keieiKanri, table2 }) };
}

/**
 * 更新の様式を、現在の在留資格（案件情報）から決める。現在の在留資格が空、または号が未選択のとき、申請人情報の在留資格が号つきなら、そちらで補う。
 */
function resolveRenewal(currentStatus: string, residenceStatus: string, activity: string) {
  let status = currentStatus.trim() ? currentStatus : residenceStatus;
  let resolution = resolveRenewalForm(status, activity);
  if (resolution.kind === "grade_missing" && isAdvancedProfessional(residenceStatus)) {
    const alt = resolveRenewalForm(residenceStatus, activity);
    if (alt.kind !== "grade_missing") {
      status = residenceStatus;
      resolution = alt;
    }
  }
  return { resolution, status };
}

const isKeieiKanri = (status: string) => status.trim() === "経営・管理";

function buildWarnings(
  c: FillCtx,
  o: { resolution: FormResolution<CoeFormCode>; status: string; keieiKanri: boolean; table2: Table2Mapping | null },
): string[] {
  const w: string[] = [];
  const maxWork = o.table2 && o.table2.fill.length > 0 ? o.table2.maxWork : MAX_WORK_HISTORY;
  if (isAdvancedProfessional(o.status)) {
    w.push(...hspChangeWarnings({ resolution: o.resolution, procedure: "renewal", firstSheet: SHEET_APPLICANT_1, status: o.status, table2: o.table2 }));
  }
  if (!isAdvancedProfessional(o.status) && o.table2) {
    w.push(`${o.table2.name}の次の欄は、案件情報に項目がないため差し込んでいません。様式上で記入してください：${o.table2.manual}。`);
  }
  if (o.keieiKanri) {
    w.push("在留資格が「経営・管理」のため、第1表（申請人用（更新）１）のみ差し込んでいます。第2表以降（申請人用２・所属機関用１）は、入管庁の「経営・管理」の様式で記入してください。");
  }
  if (c.a.confirmationStatus !== "confirmed") {
    w.push("申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。");
  }
  if (c.f.relativesPresent === "yes" && c.f.relatives.length > MAX_RELATIVES) {
    w.push(`在日親族は、様式の欄（${MAX_RELATIVES}人分）に入らない分を差し込んでいません。別紙に記載してください。`);
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
  for (const d of RENEWAL_DIGIT_CHECKS) {
    const raw = d.get(c);
    if (raw && digitsOf(raw).length !== d.length) {
      w.push(`${d.label}が${d.length}桁ではありません。原本と照合してください。`);
    }
  }
  return w;
}
