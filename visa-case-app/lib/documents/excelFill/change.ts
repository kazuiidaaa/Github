import path from "node:path";
import type { FormDetails } from "../../formDetails";
import { isAdvancedProfessional, isFormIStatus, isFormUStatus, resolveChangeForm, type CoeFormCode, type FormResolution } from "../../hspForm";
import type { Applicant, EmploymentInfo } from "../../types";
import {
  CHANGE_DIGIT_CHECKS,
  CHANGE_FILL_ITEMS,
  CHANGE_PICK_ITEMS,
  CHANGE_FORM_N_STATUSES,
  CHANGE_TARGET_STATUS,
  CHANGE_TARGET_STATUS_KEIEI_KANRI,
  SHEET_CHANGE_APPLICANT_1,
  JOB_DESCRIPTION_LINES,
  MAX_RELATIVES,
  MAX_WORK_HISTORY,
  digitsOf,
  sheetKey,
  type ChangeCtx,
} from "./changeMapping";
import { fillWorkbook } from "./fillWorkbook";
import { hspChangeWarnings } from "./hspChangeCommon";
import { HSP_CHANGE_TABLE2 } from "./hspChangeTable2";
import { planFill as planHspFill, type Table2Mapping } from "./table2Common";

const officialPath = (file: string) => path.join(process.cwd(), "docs", "official", file);

/** 差し込み元テンプレート（様式N。リポジトリ同梱。Node.js ランタイムで、ファイルシステム経由で読み込む） */
export const CHANGE_TEMPLATE_PATH = officialPath("change-application-form_930004065.xlsx");

/** 様式ごとのテンプレート。高度専門職の号・行う活動から決まる様式を使う（lib/hspForm.ts） */
export const CHANGE_TEMPLATE_PATHS: Record<CoeFormCode, string> = {
  I: officialPath("change-application-form-I.xlsx"),
  L: officialPath("change-application-form-L.xlsx"),
  M: officialPath("change-application-form-M.xlsx"),
  N: CHANGE_TEMPLATE_PATH,
  U: officialPath("change-application-form-U.xlsx"),
};

/**
 * 案件情報を、公式の在留資格変更許可申請書（Excel）の対応欄へ差し込み、ワークブックをバッファで返す。
 * targetStatus は案件情報の「変更後の在留資格」（項目13 希望する在留資格）。
 * 高度専門職は、号と行う活動（変更後の活動とみなす）から様式 I・L・M・N・U を選ぶ。様式を特定できないときは、第1表のみ。
 * 入力のない項目は、テンプレートの元の状態（空欄）のまま変更しない。
 * 注意：Edge ランタイムでは使えない（node:fs を使う）。
 */
export async function fillChangeExcel(
  a: Applicant,
  e: EmploymentInfo,
  f: FormDetails,
  targetStatus: string,
): Promise<{ buffer: Buffer; warnings: string[] }> {
  const ctx: ChangeCtx = { a, e, f, targetStatus };
  const resolution = resolveChangeForm(targetStatus, f.hspActivity ?? "");
  // 高度専門職ではない「教授」は様式 I（Issue #292）、「法律・会計業務」「医療」は様式 U（Issue #301・#302）を使う（いずれも第2表以降を含む）
  const notApplicable: CoeFormCode = isFormIStatus(targetStatus) ? "I" : isFormUStatus(targetStatus) ? "U" : "N";
  const plan = planHspFill<CoeFormCode>(resolution, { notApplicable, unresolved: "N" });
  // 高度専門職ではない「経営・管理」への変更は、第2表以降（様式Nの表）を使えないため、第1表だけを差し込む（Issue #191）
  const firstOnly = plan.firstOnly || (resolution.kind === "not_applicable" && isKeieiKanri(targetStatus));
  const table2 = plan.form === "N" || plan.firstOnly ? null : HSP_CHANGE_TABLE2[plan.form];
  const first = sheetKey(SHEET_CHANGE_APPLICANT_1);
  // 様式 I・L・M・U は、第1表だけ様式 N の座標と同じ。第2表以降は、様式ごとの対応表（hspChangeTable2.ts）を使う
  const firstSheetOnly = firstOnly || table2 !== null;
  const inRange = (sheet: string) => !firstSheetOnly || sheetKey(sheet) === first;
  const buffer = await fillWorkbook(
    CHANGE_TEMPLATE_PATHS[plan.form],
    ctx,
    [...CHANGE_FILL_ITEMS.filter((it) => inRange(it.sheet)), ...(table2 ? table2.fill : [])],
    [...CHANGE_PICK_ITEMS.filter((p) => inRange(p.sheet)), ...(table2 ? table2.pick : [])],
  );
  return { buffer, warnings: buildWarnings(ctx, resolution, table2) };
}

const isKeieiKanri = (targetStatus: string) => targetStatus.trim() === CHANGE_TARGET_STATUS_KEIEI_KANRI;

function buildWarnings(c: ChangeCtx, resolution: FormResolution<CoeFormCode>, table2: Table2Mapping | null): string[] {
  const w: string[] = [];
  const hsp = isAdvancedProfessional(c.targetStatus);
  const maxWork = table2 && table2.fill.length > 0 ? table2.maxWork : MAX_WORK_HISTORY;
  if (hsp) w.push(...hspChangeWarnings({ resolution, procedure: "change", firstSheet: SHEET_CHANGE_APPLICANT_1, status: c.targetStatus, table2 }));
  else if (table2) w.push(`${table2.name}の次の欄は、案件情報に項目がないため差し込んでいません。様式上で記入してください：${table2.manual}。`);
  if (c.a.confirmationStatus !== "confirmed") {
    w.push("申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。");
  }
  if (!c.targetStatus.trim()) {
    w.push("案件情報の「変更後の在留資格」が未入力のため、項目13「希望する在留資格」は空欄です。");
  } else if (isKeieiKanri(c.targetStatus)) {
    w.push(
      `変更後の在留資格が「${CHANGE_TARGET_STATUS_KEIEI_KANRI}」のため、第1表（申請人用（変更）１）のみ差し込んでいます。第2表以降（申請人用２・所属機関用１）は、入管庁の「経営・管理」の様式で記入してください。`,
    );
  } else if (!hsp && !isFormIStatus(c.targetStatus) && !isFormUStatus(c.targetStatus) && !c.targetStatus.includes(CHANGE_TARGET_STATUS) && !CHANGE_FORM_N_STATUSES.includes(c.targetStatus.trim())) {
    w.push(
      `この様式は、変更後の在留資格が「${CHANGE_TARGET_STATUS}」の申請を対象としています。変更後の在留資格に合う様式と照合してください。`,
    );
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
  for (const d of CHANGE_DIGIT_CHECKS) {
    const raw = d.get(c);
    if (raw && digitsOf(raw).length !== d.length) {
      w.push(`${d.label}が${d.length}桁ではありません。原本と照合してください。`);
    }
  }
  return w;
}
