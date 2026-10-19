import { FORM_STATUSES, changeFormPlan, coeFormPlan, isStatusInFormScope, renewalFormPlan, type CoeFormCode } from "../hspForm";
import type { CaseRecord, ProcedureType } from "../types";
import type { OfficialFormContent } from "./types";

// 公式様式（Excel）の、手続種別ごとの定義。画面とサーバーの両方から使う（node:fs は使わない）。
//
// 【後続の #84（変更）・#86（認定）・#88（取得）の追加方法】
//  1. このファイルの OFFICIAL_FORM_SPECS に、手続種別の定義（様式の出典・対象範囲の判定）を足す。
//  2. lib/documents/excelFill/index.ts の FILLERS に、その手続種別の差し込み関数を足す。
//  3. 画面（app/cases/[id]/documents/page.tsx）・生成履歴・API は、手続種別を意識せず、この2か所だけで切り替わる。
// 詳細は docs/phase11-official-form-ui.md。

export interface OfficialFormScope {
  procedureType: ProcedureType;
  /** 案件の「現在の在留資格」 */
  currentStatus: string;
  /** 申請人情報の在留資格 */
  residenceStatus: string;
  /** 案件の「変更後（希望）の在留資格」。変更の対象範囲の判定に使う。省略・空は、判定しない */
  targetStatus?: string;
  /** 案件の特定活動の種別（formDetails.tokuteiKatsudoType）。在留資格が特定活動のときだけ、範囲の判定に使う。省略・空は、未選択として扱う */
  tokuteiKatsudoType?: string;
}

export interface OfficialFormSpec {
  /** この様式が対象とする手続種別 */
  procedureType: ProcedureType;
  /** 例：「在留期間更新許可申請書（技術・人文知識・国際業務）」 */
  label: string;
  /** 様式 N（各手続の基本の様式）。対象範囲の判定・フォールバックの基準 */
  form: OfficialFormContent["form"];
  /**
   * 様式 N 以外（I・L・M・U）の出典。差し込みで様式 N 以外を使う案件は、こちらを「対象の公式様式」欄に出す（officialFormFor）。
   * 省略は、様式が1つだけの手続（取得）
   */
  variants?: Record<Exclude<CoeFormCode, "N">, OfficialFormContent["form"]>;
  /** 案件が、この様式の対象範囲か */
  isInScope(s: OfficialFormScope): boolean;
  /** 対象外の案件のときの注意 */
  outOfScopeWarning: string;
  /** 注意の文面（画面の言語別の訳）の {status} に入れる、対象とする在留資格の表記。注意の文面に在留資格がない手続は省略 */
  scopeText?: string;
}

// 更新・変更の「対象範囲」は、在留資格が lib/hspForm.ts の FORM_STATUSES（様式 I・L・N・U の一覧）・高度専門職・経営・管理のいずれかか、で決める。
// 特定活動は、案件の特定活動の種別が様式Nを使う種別（tokuteiKenkyu・daigakuSotsugyo・tokuteiJoho。Issue #299・#300・#334）のときだけ対象。ほかの種別・未選択は対象外。
// 研究などは、FORM_STATUSES に足すまで対象外。

const FORM_N_HEADING_STATUS = FORM_STATUSES.N[0];
/** 対象外の注意に表示する、更新の様式の代表的な在留資格（高度専門職を含む。ほかの在留資格の様式は FORM_STATUSES を参照） */
export const RENEWAL_SCOPE_TEXT = `${FORM_N_HEADING_STATUS}、高度専門職`;


// 様式 I・L・M・U の出典（docs/official/README.md と一致させる）。
// 変更・更新の I・L・U は、人が高度専門職のページから提供したもの（2026-10-07）で、ファイル番号は未照合。
const HSP_PAGE_URL = "https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html";
const UNVERIFIED_FILE_ID = "未照合";
const VARIANT_NOTES: Record<Exclude<CoeFormCode, "N">, string> = {
  I: "様式 I：教授",
  L: "様式 L：企業内転勤",
  M: "様式 M：経営・管理。令和7年10月16日以降の様式",
  U: "様式 U：法律・会計業務、医療",
};

/** 様式 N の名称（末尾「（Excel）」）に、様式の別を足した名称 */
function variantForm(base: OfficialFormContent["form"], code: Exclude<CoeFormCode, "N">, fileId: string, sourceUrl: string, confirmedOn: string): OfficialFormContent["form"] {
  return { formName: base.formName.replace(/（Excel）$/, `（${VARIANT_NOTES[code]}。Excel）`), fileId, sourceUrl, confirmedOn };
}

const contentUrl = (fileId: string) => `https://www.moj.go.jp/isa/content/${fileId}.xlsx`;

/** 変更・更新の様式別。M は経営・管理のページの新しい様式（#397 R-13） */
function hspChangeVariants(base: OfficialFormContent["form"], mFileId: string): NonNullable<OfficialFormSpec["variants"]> {
  return {
    I: variantForm(base, "I", UNVERIFIED_FILE_ID, HSP_PAGE_URL, "2026-10-07"),
    L: variantForm(base, "L", UNVERIFIED_FILE_ID, HSP_PAGE_URL, "2026-10-07"),
    M: variantForm(base, "M", mFileId, contentUrl(mFileId), "2026-10-19"),
    U: variantForm(base, "U", UNVERIFIED_FILE_ID, HSP_PAGE_URL, "2026-10-07"),
  };
}

const RENEWAL_FORM_N: OfficialFormContent["form"] = {
  formName: "別記第三十号の二様式（第二十一条関係）在留期間更新許可申請書（Excel）",
  fileId: "930004095",
  sourceUrl: "https://www.moj.go.jp/isa/content/930004095.xlsx",
  confirmedOn: "2026-10-02",
};

const COE_FORM_N: OfficialFormContent["form"] = {
  formName: "別記第六号の三様式（第六条の二関係）在留資格認定証明書交付申請書（Excel）",
  fileId: "930004030",
  sourceUrl: "https://www.moj.go.jp/isa/content/930004030.xlsx",
  confirmedOn: "2026-10-03",
};

const CHANGE_FORM_N: OfficialFormContent["form"] = {
  formName: "別記第三十号様式（第二十条関係）在留資格変更許可申請書（Excel）",
  fileId: "930004065",
  sourceUrl: "https://www.moj.go.jp/isa/content/930004065.xlsx",
  confirmedOn: "2026-10-03",
};

export const RENEWAL_SPEC: OfficialFormSpec = {
  procedureType: "renewal",
  label: "在留期間更新許可申請書",
  form: RENEWAL_FORM_N,
  variants: hspChangeVariants(RENEWAL_FORM_N, "001448694"),
  // 現在の在留資格か、申請人情報の在留資格の、どちらかが対象範囲なら対象
  isInScope: (s) => s.procedureType === "renewal" && (isStatusInFormScope(s.currentStatus, s.tokuteiKatsudoType) || isStatusInFormScope(s.residenceStatus, s.tokuteiKatsudoType)),
  outOfScopeWarning: `この様式は、在留期間更新許可申請（${RENEWAL_SCOPE_TEXT}）を対象としています。この案件は対象外の可能性があります。差し込み結果を、案件に合う様式と照合してください。`,
  scopeText: RENEWAL_SCOPE_TEXT,
};

export const COE_SPEC: OfficialFormSpec = {
  procedureType: "coe",
  label: "在留資格認定証明書交付申請書",
  form: COE_FORM_N,
  // 認定の I・L・U は、ファイル番号まで照合済み（取得日 2026-10-05）。M は経営・管理のページの新しい様式（#397 R-13）
  variants: {
    I: variantForm(COE_FORM_N, "I", "930004028", contentUrl("930004028"), "2026-10-05"),
    L: variantForm(COE_FORM_N, "L", "930004032", contentUrl("930004032"), "2026-10-05"),
    M: variantForm(COE_FORM_N, "M", "001448690", contentUrl("001448690"), "2026-10-19"),
    U: variantForm(COE_FORM_N, "U", "930004059", contentUrl("930004059"), "2026-10-05"),
  },
  // 認定の案件は、現に有する在留資格がない（海外からの呼び寄せ）ため、在留資格による対象外の判定はしない。
  isInScope: (s) => s.procedureType === "coe",
  outOfScopeWarning: "この様式は、在留資格認定証明書交付申請を対象としています。この案件は対象外の可能性があります。",
};

export const CHANGE_SPEC: OfficialFormSpec = {
  procedureType: "change",
  label: "在留資格変更許可申請書",
  form: CHANGE_FORM_N,
  variants: hspChangeVariants(CHANGE_FORM_N, "001448692"),
  // 変更は、変更後の在留資格で決まる（現在の在留資格によらない）。未入力は、差し込み側が別の案内を出すため、ここでは判定しない
  isInScope: (s) => s.procedureType === "change" && (!s.targetStatus?.trim() || isStatusInFormScope(s.targetStatus, s.tokuteiKatsudoType)),
  outOfScopeWarning: `この様式は、変更後の在留資格が「${FORM_N_HEADING_STATUS}」の申請を対象としています。変更後の在留資格に合う様式と照合してください。`,
  scopeText: FORM_N_HEADING_STATUS,
};

export const ACQUISITION_SPEC: OfficialFormSpec = {
  procedureType: "acquisition",
  label: "在留資格取得許可申請書",
  form: {
    formName: "別記第三十六号様式（第二十四条関係）在留資格取得許可申請書（Excel）",
    fileId: "930004121",
    sourceUrl: "https://www.moj.go.jp/isa/content/930004121.xlsx",
    confirmedOn: "2026-10-03",
  },
  // 取得様式は在留資格を限定しない（希望する在留資格は様式の選択肢で選ぶ）ため、取得の手続種別なら対象
  isInScope: (s) => s.procedureType === "acquisition",
  outOfScopeWarning: "この様式は、在留資格取得許可申請を対象としています。この案件は対象外の可能性があります。",
};

/** 手続種別ごとの様式 */
export const OFFICIAL_FORM_SPECS: Partial<Record<ProcedureType, OfficialFormSpec>> = {
  renewal: RENEWAL_SPEC,
  coe: COE_SPEC,
  change: CHANGE_SPEC,
  acquisition: ACQUISITION_SPEC,
};

/**
 * 差し込みに使う様式。手続種別に専用の様式がなければ（現時点では「その他」）、更新の様式（対象外の注意が付く）。
 * このフォールバックは、ここだけで決める。差し込み関数の選択（excelFill/index.ts）も、この返り値の手続種別を使う。
 */
export function officialFormSpecFor(procedureType: ProcedureType): OfficialFormSpec {
  return OFFICIAL_FORM_SPECS[procedureType] ?? RENEWAL_SPEC;
}

/** 様式の選択に使う、案件の値（差し込みの入力値と同じ） */
export type OfficialFormSelectInput = Pick<OfficialFormContent["input"], "applicant" | "formDetails" | "currentStatus" | "targetStatus">;

/**
 * 差し込みで実際に使う様式（I・L・M・N・U）。選択は lib/hspForm.ts の coeFormPlan・changeFormPlan・renewalFormPlan
 * （差し込み関数 excelFill/{coe,change,renewal}.ts と同じ関数）。様式が1つの手続（取得）は undefined
 */
export function officialFormCodeFor(procedureType: ProcedureType, i: OfficialFormSelectInput): CoeFormCode | undefined {
  const activity = i.formDetails.hspActivity ?? "";
  switch (officialFormSpecFor(procedureType).procedureType) {
    case "coe":
      return coeFormPlan(i.targetStatus ?? "", activity).form;
    case "change":
      return changeFormPlan(i.targetStatus ?? "", activity).form;
    case "renewal":
      return renewalFormPlan(i.currentStatus, i.applicant.residenceStatus, activity).form;
    default:
      return undefined;
  }
}

/** 生成書類の「対象の公式様式」欄に出す様式（差し込みに実際に使う様式の出典）。値は複製して返す */
export function officialFormFor(procedureType: ProcedureType, i: OfficialFormSelectInput): OfficialFormContent["form"] {
  const spec = officialFormSpecFor(procedureType);
  const code = officialFormCodeFor(procedureType, i);
  return { ...((code && code !== "N" && spec.variants?.[code]) || spec.form) };
}

/** 対象外の案件の注意（なければ空）。画面の事前表示と、生成時の warnings の両方で同じ文言を使う */
export function officialFormScopeWarnings(s: OfficialFormScope): string[] {
  const spec = officialFormSpecFor(s.procedureType);
  return spec.procedureType === s.procedureType && spec.isInScope(s) ? [] : [spec.outOfScopeWarning];
}

/** 高度専門職のポイント計算表（参考書式）の出典。docs/official/README.md と一致させる */
export const HSP_POINT_FORM: OfficialFormContent["form"] = {
  formName: "高度専門職ポイント計算表（令和5年4月1日以降の参考書式。Excel）",
  fileId: "930001673",
  sourceUrl: "https://www.moj.go.jp/isa/content/930001673.xls",
  confirmedOn: "2026-10-05",
};

/** 案件の現在の内容から、差し込みの入力値の写しを作る（値はすべて複製し、案件への参照は持たない） */
export function officialFormInputOf(c: CaseRecord): OfficialFormContent["input"] {
  return JSON.parse(
    JSON.stringify({ applicant: c.applicant, employment: c.employment, formDetails: c.formDetails, currentStatus: c.currentStatus, targetStatus: c.targetStatus }),
  ) as OfficialFormContent["input"];
}
