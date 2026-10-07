import { ADVANCED_PROFESSIONAL_STATUS, baseResidenceStatus, type CaseRecord, type ProcedureType } from "../types";
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
}

export interface OfficialFormSpec {
  /** この様式が対象とする手続種別 */
  procedureType: ProcedureType;
  /** 例：「在留期間更新許可申請書（技術・人文知識・国際業務）」 */
  label: string;
  form: OfficialFormContent["form"];
  /** 案件が、この様式の対象範囲か */
  isInScope(s: OfficialFormScope): boolean;
  /** 対象外の案件のときの注意 */
  outOfScopeWarning: string;
}

const RENEWAL_TARGET_STATUS = "技術・人文知識・国際業務";
/** 対象外の注意に表示する、更新の様式が対象とする在留資格（高度専門職を含む） */
export const RENEWAL_SCOPE_TEXT = `${RENEWAL_TARGET_STATUS}、高度専門職`;

/** 高度専門職か（号つきの値を含む）。高度専門職の更新・変更は、様式 I・L・M・N・U を切り替えて差し込む（Issue #212） */
const isHsp = (status: string) => baseResidenceStatus(status.trim()) === ADVANCED_PROFESSIONAL_STATUS;

export const RENEWAL_SPEC: OfficialFormSpec = {
  procedureType: "renewal",
  label: "在留期間更新許可申請書",
  form: {
    formName: "別記第三十号の二様式（第二十一条関係）在留期間更新許可申請書（Excel）",
    fileId: "930004095",
    sourceUrl: "https://www.moj.go.jp/isa/content/930004095.xlsx",
    confirmedOn: "2026-10-02",
  },
  isInScope: (s) =>
    s.procedureType === "renewal" &&
    (s.currentStatus.includes(RENEWAL_TARGET_STATUS) ||
      s.residenceStatus.includes(RENEWAL_TARGET_STATUS) ||
      isHsp(s.currentStatus) ||
      isHsp(s.residenceStatus)),
  outOfScopeWarning: `この様式は、在留期間更新許可申請（${RENEWAL_SCOPE_TEXT}）を対象としています。この案件は対象外の可能性があります。差し込み結果を、案件に合う様式と照合してください。`,
};

export const COE_SPEC: OfficialFormSpec = {
  procedureType: "coe",
  label: "在留資格認定証明書交付申請書",
  form: {
    formName: "別記第六号の三様式（第六条の二関係）在留資格認定証明書交付申請書（Excel）",
    fileId: "930004030",
    sourceUrl: "https://www.moj.go.jp/isa/content/930004030.xlsx",
    confirmedOn: "2026-10-03",
  },
  // 認定の案件は、現に有する在留資格がない（海外からの呼び寄せ）ため、在留資格による対象外の判定はしない。
  isInScope: (s) => s.procedureType === "coe",
  outOfScopeWarning: "この様式は、在留資格認定証明書交付申請を対象としています。この案件は対象外の可能性があります。",
};

export const CHANGE_SPEC: OfficialFormSpec = {
  procedureType: "change",
  label: "在留資格変更許可申請書",
  form: {
    formName: "別記第三十号様式（第二十条関係）在留資格変更許可申請書（Excel）",
    fileId: "930004065",
    sourceUrl: "https://www.moj.go.jp/isa/content/930004065.xlsx",
    confirmedOn: "2026-10-03",
  },
  isInScope: (s) => s.procedureType === "change",
  outOfScopeWarning: "この様式は、在留資格変更許可申請を対象としています。この案件は対象外の可能性があります。差し込み結果を、案件に合う様式と照合してください。",
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

/** 手続種別ごとの様式。未対応の手続種別は、現時点では更新の様式を、注意を付けて使う */
export const OFFICIAL_FORM_SPECS: Partial<Record<ProcedureType, OfficialFormSpec>> = {
  renewal: RENEWAL_SPEC,
  coe: COE_SPEC,
  change: CHANGE_SPEC,
  acquisition: ACQUISITION_SPEC,
};

/** 差し込みに使う様式。手続種別に専用の様式がなければ、更新の様式（対象外の注意が付く） */
export function officialFormSpecFor(procedureType: ProcedureType): OfficialFormSpec {
  return OFFICIAL_FORM_SPECS[procedureType] ?? RENEWAL_SPEC;
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
