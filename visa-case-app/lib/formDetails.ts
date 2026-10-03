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
  // 在留資格認定証明書交付申請（別記第六号の三様式）に固有の項目（Issue #85）。
  // 根拠：docs/phase13-coe-forms-research.md
  /** 5 出生地（変更・認定・取得の各様式にある。更新様式にはない） */
  placeOfBirth: string;
  /** 9 日本における連絡先 */
  contactInJapan: string;
  /** 12 入国予定年月日 */
  plannedEntryDate: string;
  /** 13 上陸予定港 */
  portOfEntry: string;
  /** 14 滞在予定期間 */
  plannedStay: string;
  /** 15 同伴者の有無 */
  accompanied: "" | "yes" | "no";
  /** 16 査証申請予定地 */
  visaApplicationPlace: string;
  /** 17 過去の出入国歴（有無・回数・直近の出入国の年月日） */
  entryHistory: "" | "yes" | "no";
  entryHistoryCount: string;
  entryHistoryLastFrom: string;
  entryHistoryLastTo: string;
  /** 18 過去の在留資格認定証明書交付申請歴（有無・回数・うち不交付となった回数） */
  coeHistory: "" | "yes" | "no";
  coeHistoryCount: string;
  coeHistoryNonIssuedCount: string;
  /** 20 退去強制又は出国命令による出国の有無（有無・回数・直近の送還歴） */
  deportationHistory: "" | "yes" | "no";
  deportationCount: string;
  deportationLastDate: string;
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
  contactInJapan: "",
  plannedEntryDate: "",
  portOfEntry: "",
  plannedStay: "",
  accompanied: "",
  visaApplicationPlace: "",
  entryHistory: "",
  entryHistoryCount: "",
  entryHistoryLastFrom: "",
  entryHistoryLastTo: "",
  coeHistory: "",
  coeHistoryCount: "",
  coeHistoryNonIssuedCount: "",
  deportationHistory: "",
  deportationCount: "",
  deportationLastDate: "",
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

export type FormDetailsErrors = Partial<Record<keyof FormDetails, string>>;

/** 入力エラーの要約に表示する、項目名（画面のラベル文言と同じ） */
export const FORM_DETAILS_FIELD_LABELS: Partial<Record<keyof FormDetails, string>> = {
  passportExpiry: "10 (2) 旅券の有効期限",
  graduationDate: "18 (4) 卒業年月日",
};

/** 認定証明書交付申請の項目で、日付の形式を確認するもの（Issue #85） */
const COE_DATE_FIELDS = ["plannedEntryDate", "entryHistoryLastFrom", "entryHistoryLastTo", "deportationLastDate"] as const;

/** 認定証明書交付申請の入力エラーの要約に表示する、項目名（別記第六号の三様式の項番） */
export const COE_FORM_DETAILS_FIELD_LABELS: Partial<Record<keyof FormDetails, string>> = {
  passportExpiry: "10 (2) 旅券の有効期限",
  plannedEntryDate: "12 入国予定年月日",
  entryHistoryLastFrom: "17 直近の出入国歴（入国年月日）",
  entryHistoryLastTo: "17 直近の出入国歴（出国年月日）",
  deportationLastDate: "20 直近の送還歴",
  graduationDate: "23 (4) 卒業年月日",
};

const DATE_MESSAGE = "日付をカレンダーから選び直してください。";

/** 日付の形式のみ確認する（公式様式の項目は、確定の前提としない） */
export function validateFormDetails(f: FormDetails): FormDetailsErrors {
  const errors: FormDetailsErrors = {};
  for (const k of ["passportExpiry", "graduationDate"] as const) {
    if (f[k] && !isValidDate(f[k])) errors[k] = DATE_MESSAGE;
  }
  for (const k of COE_DATE_FIELDS) {
    if (f[k] && !isValidDate(f[k])) errors[k] = DATE_MESSAGE;
  }
  return errors;
}

export function isYearMonthOrDate(v: string): boolean {
  return v === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(v) || isValidDate(v);
}
