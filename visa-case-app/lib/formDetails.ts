import { isValidDate } from "./format";

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
  maritalStatus: "" | "married" | "single";
  occupation: string;
  homeAddress: string;
  phone: string;
  mobilePhone: string;
  passportNumber: string;
  passportExpiry: string;
  periodOfStay: string;
  desiredPeriod: string;
  renewalReason: string;
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
  /** 5 出生地（変更・認定・取得の各様式にあり、更新様式にない） */
  placeOfBirth: string;
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
  placeOfBirth: "",
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

/** 入力エラーの要約に表示する、項目名（画面のラベル文言と同じ） */
export const FORM_DETAILS_FIELD_LABELS: Partial<Record<keyof FormDetails, string>> = {
  passportExpiry: "10 (2) 旅券の有効期限",
  graduationDate: "18 (4) 卒業年月日",
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
