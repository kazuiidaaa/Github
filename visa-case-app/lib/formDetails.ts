import { isValidDate } from "./format";
import type { ProcedureType } from "./types";

// 公式の在留期間更新許可申請書（技術・人文知識・国際業務）にあって、
// 申請人情報・雇用情報の既存項目にない入力項目。項目番号は公式様式のもの。
// 根拠：docs/phase9-official-forms-research.md

export interface Relative {
  id: string;
  /** 続柄 */
  relationship: string;
  name: string;
  dateOfBirth: string;
  nationality: string;
  /** 勤務先名称・通学先名称 */
  workplace: string;
  /** 同居の有無 */
  livesTogether: "" | "yes" | "no";
  /** 在留カード番号または特別永住者証明書番号 */
  cardNumber: string;
}

export interface WorkEntry {
  id: string;
  /** 入社（YYYY-MM または YYYY-MM-DD） */
  joinedOn: string;
  /** 退社（在職中は空） */
  leftOn: string;
  employer: string;
}

export interface FormDetails {
  // 申請人等作成用1
  /** 出生地（変更・認定・取得の各様式にあり、更新様式にはない） */
  placeOfBirth: string;
  maritalStatus: "" | "married" | "single";
  occupation: string;
  homeAddress: string;
  phone: string;
  mobilePhone: string;
  passportNumber: string;
  passportExpiry: string;
  periodOfStay: string;
  desiredPeriod: string;
  /** 更新の理由（更新様式の項目14。変更様式では changeReason を使う） */
  renewalReason: string;
  /** 変更の理由（変更様式の項目14） */
  changeReason: string;
  criminalRecord: "" | "none" | "yes";
  criminalDetail: string;
  relativesPresent: "" | "yes" | "no";
  relatives: Relative[];
  // 申請人等作成用2（N）
  branchName: string;
  workPhone: string;
  educationPlace: "" | "japan" | "foreign";
  educationLevel: string;
  schoolName: string;
  graduationDate: string;
  majorField: string;
  itQualification: string;
  workHistory: WorkEntry[];
  legalRepName: string;
  legalRepRelationship: string;
  legalRepAddress: string;
  legalRepPhone: string;
  agentName: string;
  agentAddress: string;
  agentAffiliation: string;
  agentPhone: string;
  // 所属機関等作成用1・2（N）
  corporateNumber: string;
  employmentInsuranceNumber: string;
  orgPhone: string;
  annualSales: string;
  foreignStaffCount: string;
  experienceYears: string;
  positionTitle: string;
  occupationCode: string;
  dispatchName: string;
  dispatchCorporateNumber: string;
  dispatchBranchName: string;
  dispatchInsuranceNumber: string;
  dispatchAddress: string;
  dispatchPhone: string;
  dispatchCapital: string;
  dispatchAnnualSales: string;
  dispatchPeriod: string;
  // 在留資格取得許可申請（別記第三十六号様式）固有の項目。根拠：docs/phase14-acquisition-forms-research.md
  /** 11 在留資格取得の事由 */
  acquisitionCause: "" | "birth" | "nationalityLoss" | "other";
  /** 11 その他の場合の内容 */
  acquisitionCauseOther: string;
  /** 12 在留の理由 */
  stayPurpose: string;
  /** 16 在日身元保証人又は連絡先 (1) 氏名 */
  guarantorName: string;
  /** 16 (2) 本人との関係 */
  guarantorRelationship: string;
  /** 16 (3) 住所 */
  guarantorAddress: string;
  /** 16 電話番号 */
  guarantorPhone: string;
  /** 16 携帯電話番号 */
  guarantorMobilePhone: string;
}

export const EMPTY_FORM_DETAILS: FormDetails = {
  placeOfBirth: "",
  maritalStatus: "",
  occupation: "",
  homeAddress: "",
  phone: "",
  mobilePhone: "",
  passportNumber: "",
  passportExpiry: "",
  periodOfStay: "",
  desiredPeriod: "",
  renewalReason: "",
  changeReason: "",
  criminalRecord: "",
  criminalDetail: "",
  relativesPresent: "",
  relatives: [],
  branchName: "",
  workPhone: "",
  educationPlace: "",
  educationLevel: "",
  schoolName: "",
  graduationDate: "",
  majorField: "",
  itQualification: "",
  workHistory: [],
  legalRepName: "",
  legalRepRelationship: "",
  legalRepAddress: "",
  legalRepPhone: "",
  agentName: "",
  agentAddress: "",
  agentAffiliation: "",
  agentPhone: "",
  corporateNumber: "",
  employmentInsuranceNumber: "",
  orgPhone: "",
  annualSales: "",
  foreignStaffCount: "",
  experienceYears: "",
  positionTitle: "",
  occupationCode: "",
  dispatchName: "",
  dispatchCorporateNumber: "",
  dispatchBranchName: "",
  dispatchInsuranceNumber: "",
  dispatchAddress: "",
  dispatchPhone: "",
  dispatchCapital: "",
  dispatchAnnualSales: "",
  dispatchPeriod: "",
  acquisitionCause: "",
  acquisitionCauseOther: "",
  stayPurpose: "",
  guarantorName: "",
  guarantorRelationship: "",
  guarantorAddress: "",
  guarantorPhone: "",
  guarantorMobilePhone: "",
};

export const EDUCATION_LEVELS = [
  "大学院（博士）",
  "大学院（修士）",
  "大学",
  "短期大学",
  "専門学校",
  "高等学校",
  "中学校",
  "その他",
] as const;

/** 保存済みの値（古い形式・欠けた項目を含む）を、現行の形式へ補う */
export function normalizeFormDetails(raw: unknown): FormDetails {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<FormDetails>;
  const merged = { ...EMPTY_FORM_DETAILS, ...r };
  return {
    ...merged,
    relatives: Array.isArray(r.relatives) ? r.relatives : [],
    workHistory: Array.isArray(r.workHistory) ? r.workHistory : [],
  };
}

/**
 * 在留資格取得許可申請書の項目番号つきのラベル（公式様式の表記）。
 * 取得様式は、更新様式と項目番号が異なる（例：職業は更新6、取得7）ため、別の表として持つ。
 */
export const ACQUISITION_LABELS = {
  placeOfBirth: "5 出生地",
  maritalStatus: "6 配偶者の有無",
  occupation: "7 職業",
  homeAddress: "8 本国における居住地",
  phone: "9 電話番号",
  mobilePhone: "9 携帯電話番号",
  passportNumber: "10 (1) 旅券番号",
  passportExpiry: "10 (2) 旅券の有効期限",
  acquisitionCause: "11 在留資格取得の事由",
  acquisitionCauseOther: "11 その他の内容",
  stayPurpose: "12 在留の理由",
  desiredPeriod: "13 在留期間（希望する在留資格に対する期間）",
  criminalRecord: "14 犯罪を理由とする処分を受けたことの有無",
  criminalDetail: "14 具体的内容",
  relatives: "15 在日親族及び同居者",
  guarantorName: "16 (1) 在日身元保証人又は連絡先 氏名",
  guarantorRelationship: "16 (2) 本人との関係",
  guarantorAddress: "16 (3) 住所",
  guarantorPhone: "16 電話番号",
  guarantorMobilePhone: "16 携帯電話番号",
  legalRepName: "17 (1) 代理人 氏名（法定代理人による申請の場合）",
  legalRepRelationship: "17 (2) 本人との関係",
  legalRepAddress: "17 (3) 代理人 住所",
  legalRepPhone: "17 電話番号",
} as const satisfies Partial<Record<keyof FormDetails, string>>;

export type FormDetailsErrors = Partial<Record<keyof FormDetails, string>>;

// ---------------------------------------------------------------------------
// 手続種別ごとの項目番号表（Issue #83 で新設）
//
// 公式様式は手続種別ごとに項目番号・項目名が異なる（例：変更様式は項目5に「出生地」があり、
// 以降が更新様式より1つ繰り下がる）。画面（FormDetailsForm）は、番号・名称を直接書かず、
// ここの FormLayout から取得する。FormLayout に項目名がないフィールドは、その手続では表示しない。
//
// 認定（Issue #85）・取得（Issue #87）は、FORM_LAYOUTS に自分の手続種別の1エントリを
// 追加するだけでよい。追加の手順は docs/phase12-change-forms-research.md の「項目番号表の仕組み」。
// ---------------------------------------------------------------------------

export type FormFieldKey = keyof FormDetails;

/** 画面の区切り（見出し）。様式ごとに項番の範囲が異なりうるため、表で持つ */
export type FormSectionKey = "applicant1" | "relatives" | "applicant2" | "workHistory" | "organization";

export interface FormLayout {
  /** 様式名（画面の説明文に表示） */
  formName: string;
  /** 様式の識別（出典・調査報告との対応用） */
  formId: string;
  sectionTitles: Record<FormSectionKey, string>;
  /** 項目名（番号付き）。ここにないフィールドは、この手続の画面に表示しない */
  labels: Partial<Record<FormFieldKey, string>>;
  /**
   * 「希望する在留資格」のように、案件情報（CaseRecord.targetStatus）を表示のみする項目の名称。
   * 指定した手続では、入力欄を設けず、案件情報の値を表示する（二重入力を避ける）
   */
  desiredStatusLabel?: string;
}

/** 更新・変更で番号・名称が共通の項目（項目10以降、および所属機関等作成用・申請人等作成用2） */
const COMMON_LABELS: Partial<Record<FormFieldKey, string>> = {
  passportNumber: "10 (1) 旅券番号",
  passportExpiry: "10 (2) 旅券の有効期限",
  periodOfStay: "11 現に有する在留期間",
  desiredPeriod: "13 希望する在留期間",
  criminalRecord: "15 犯罪を理由とする処分を受けたことの有無",
  criminalDetail: "15 具体的内容",
  branchName: "17 勤務先 支店・事業所名",
  workPhone: "17 (3) 勤務先 電話番号",
  educationPlace: "18 (1) 最終学歴の所在",
  educationLevel: "18 (2) 学歴の区分",
  schoolName: "18 (3) 学校名",
  graduationDate: "18 (4) 卒業年月日",
  majorField: "19 専攻・専門分野",
  itQualification: "20 情報処理技術者資格又は試験合格",
  legalRepName: "22 代理人 氏名（法定代理人による申請の場合）",
  legalRepRelationship: "22 本人との関係",
  legalRepAddress: "22 代理人 住所",
  legalRepPhone: "22 代理人 電話番号",
  agentName: "取次者 氏名",
  agentAddress: "取次者 住所",
  agentAffiliation: "取次者 所属機関等",
  agentPhone: "取次者 電話番号",
  corporateNumber: "3 (2) 法人番号（13桁）",
  employmentInsuranceNumber: "3 (4) 雇用保険適用事業所番号（11桁）",
  orgPhone: "3 (6) 電話番号",
  annualSales: "3 (8) 年間売上高（直近年度）",
  foreignStaffCount: "3 (9) 外国人職員数",
  experienceYears: "7 実務経験年数",
  positionTitle: "8 職務上の地位（役職名）",
  occupationCode: "9 職種（別紙「職種一覧」の番号）",
  dispatchName: "11 派遣先等 (1) 名称",
  dispatchCorporateNumber: "11 (2) 法人番号",
  dispatchBranchName: "11 (3) 支店・事業所名",
  dispatchInsuranceNumber: "11 (4) 雇用保険適用事業所番号",
  dispatchAddress: "11 (6) 所在地",
  dispatchPhone: "11 (6) 電話番号",
  dispatchCapital: "11 (7) 資本金",
  dispatchAnnualSales: "11 (8) 年間売上高",
  dispatchPeriod: "11 (9) 派遣予定期間",
};

const COMMON_SECTION_TITLES = {
  relatives: "16 在日親族及び同居者",
  applicant2: "申請人等作成用2（N）（項番17〜22）",
  workHistory: "21 職歴（外国におけるものを含む）",
  organization: "所属機関等作成用1・2（N）",
} as const;

const RENEWAL_LAYOUT: FormLayout = {
  formName: "在留期間更新許可申請書",
  formId: "930004094/930004095",
  sectionTitles: { ...COMMON_SECTION_TITLES, applicant1: "申請人等作成用1（項番5〜15）" },
  labels: {
    ...COMMON_LABELS,
    maritalStatus: "5 配偶者の有無",
    occupation: "6 職業",
    homeAddress: "7 本国における居住地",
    phone: "9 電話番号",
    mobilePhone: "9 携帯電話番号",
    renewalReason: "14 更新の理由",
  },
};

/** 別記第三十号様式。項目5に「出生地」があり、配偶者の有無以降が1つ繰り下がる。電話番号は項目9（住居地）の欄内 */
const CHANGE_LAYOUT: FormLayout = {
  formName: "在留資格変更許可申請書",
  formId: "930004065",
  sectionTitles: { ...COMMON_SECTION_TITLES, applicant1: "申請人等作成用1（項番5〜15）" },
  labels: {
    ...COMMON_LABELS,
    placeOfBirth: "5 出生地",
    maritalStatus: "6 配偶者の有無",
    occupation: "7 職業",
    homeAddress: "8 本国における居住地",
    phone: "9 電話番号（住居地の欄）",
    mobilePhone: "9 携帯電話番号（住居地の欄）",
    changeReason: "14 変更の理由",
  },
  desiredStatusLabel: "13 希望する在留資格",
};

/**
 * 手続種別ごとの項目番号表。未対応の手続種別（認定・その他）は、従来どおり更新様式の表記で表示する
 * （認定は #85、取得は #87 で追加する）。
 */
export const FORM_LAYOUTS: Partial<Record<ProcedureType, FormLayout>> = {
  renewal: RENEWAL_LAYOUT,
  change: CHANGE_LAYOUT,
};

export function getFormLayout(procedureType: ProcedureType): FormLayout {
  return FORM_LAYOUTS[procedureType] ?? RENEWAL_LAYOUT;
}

/** 入力エラーの要約に表示する、項目名（画面のラベル文言と同じ）。検証対象の項目は様式間で共通 */
export const FORM_DETAILS_FIELD_LABELS: Partial<Record<FormFieldKey, string>> = {
  passportExpiry: COMMON_LABELS.passportExpiry,
  graduationDate: COMMON_LABELS.graduationDate,
};

const DATE_MESSAGE = "日付をカレンダーから選び直してください。";

/** 日付の形式のみ確認する（公式様式の項目は、確定の前提としない） */
export function validateFormDetails(f: FormDetails): FormDetailsErrors {
  const errors: FormDetailsErrors = {};
  for (const k of ["passportExpiry", "graduationDate"] as const) {
    if (f[k] && !isValidDate(f[k])) errors[k] = DATE_MESSAGE;
  }
  return errors;
}

export function isYearMonthOrDate(v: string): boolean {
  return v === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(v) || isValidDate(v);
}
