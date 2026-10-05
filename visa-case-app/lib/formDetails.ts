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

  // 在留資格認定証明書交付申請（別記第六号の三様式）に固有の項目（Issue #85）。
  // 根拠：docs/phase13-coe-forms-research.md
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
  /** 高度専門職の「行う活動」（使う様式の選択に使う。lib/hspForm.ts。Issue #181） */
  hspActivity: string;
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
  hspActivity: "",
  stayPurpose: "",
  guarantorName: "",
  guarantorRelationship: "",
  guarantorAddress: "",
  guarantorPhone: "",
  guarantorMobilePhone: "",

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

// ---------------------------------------------------------------------------
// 手続種別ごとの項目番号表（Issue #83 で新設）
//
// 公式様式は手続種別ごとに項目番号・項目名が異なる（例：変更様式は項目5に「出生地」があり、
// 以降が更新様式より1つ繰り下がる）。画面（FormDetailsForm）は、番号・名称を直接書かず、
// ここの FormLayout から取得する。FormLayout に項目名がないフィールドは、その手続では表示しない。
//
// 新しい様式は、FORM_LAYOUTS に自分の手続種別の1エントリを追加するだけでよい（取得は #87 で追加）。
// 追加の手順は docs/phase12-change-forms-research.md の「項目番号表の仕組み」。
// ---------------------------------------------------------------------------

export type FormFieldKey = keyof FormDetails;

/** 画面の区切り（見出し）。様式ごとに項番の範囲が異なりうるため、表で持つ */
export type FormSectionKey = "applicant1" | "relatives" | "applicant2" | "workHistory" | "organization";

// 様式にない項目・セクションを表示しない仕組み（認定・取得が使う）:
// - labels に項目名がないフィールドは描画しない。
// - sectionTitles に見出しがないセクションは、セクションごと描画しない。
// - 学歴の区分（educationLevel）は、labels に項目名がなければ描画しない。

export interface FormLayout {
  /** 様式名（画面の説明文に表示） */
  formName: string;
  /** 様式の識別（出典・調査報告との対応用） */
  formId: string;
  /** 見出し。ここにないセクションは、この手続の画面に表示しない（職歴・所属機関等を持たない様式など） */
  sectionTitles: Partial<Record<FormSectionKey, string>>;
  /** 項目名（番号付き）。ここにないフィールドは、この手続の画面に表示しない */
  labels: Partial<Record<FormFieldKey, string>>;
  /**
   * 「希望する在留資格」のように、案件情報（CaseRecord.targetStatus）を表示のみする項目の名称。
   * 指定した手続では、入力欄を設けず、案件情報の値を表示する（二重入力を避ける）
   */
  desiredStatusLabel?: string;
  /** desiredStatusLabel の項目が参照する、案件情報の入力欄の名称（ヒント文に表示）。省略時は「希望する在留資格」 */
  desiredStatusCaseLabel?: string;
  /** 在日親族・同居者の「同居の有無」の列名。様式により「同居予定の有無」となる。省略時は「同居の有無」 */
  livesTogetherLabel?: string;
}

/**
 * 番号を含まない項目名。どの様式でも項目名が同じ（所属機関等作成用の「3 (x)」は様式間で共通の番号）。
 * 番号が様式ごとに異なる項目は、ここではなく、各様式の FormLayout.labels に書く。
 */
const UNNUMBERED_LABELS: Partial<Record<FormFieldKey, string>> = {
  agentName: "取次者 氏名",
  agentAddress: "取次者 住所",
  agentAffiliation: "取次者 所属機関等",
  agentPhone: "取次者 電話番号",
  corporateNumber: "3 (2) 法人番号（13桁）",
  employmentInsuranceNumber: "3 (4) 雇用保険適用事業所番号（11桁）",
  orgPhone: "3 (6) 電話番号",
  annualSales: "3 (8) 年間売上高（直近年度）",
  foreignStaffCount: "3 (9) 外国人職員数",
};

/** 更新・変更で番号・名称が共通の項目（項目10以降、および所属機関等作成用・申請人等作成用2）。認定は番号が異なるため使わない */
const COMMON_LABELS: Partial<Record<FormFieldKey, string>> = {
  ...UNNUMBERED_LABELS,
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
  desiredStatusCaseLabel: "変更後の在留資格",
};

/**
 * 別記第六号の三様式（Issue #85）。海外から呼び寄せる申請のため、更新・変更と項番が大きく異なる
 * （申請人等作成用2は22〜27、所属機関等作成用の実務経験年数以降は8・9・10・12）。
 * COMMON_LABELS は展開せず、原本（docs/official/coe-application-form_930004030.xlsx）の項番を直接書く。
 */
const COE_LAYOUT: FormLayout = {
  formName: "在留資格認定証明書交付申請書",
  formId: "930004030",
  sectionTitles: {
    applicant1: "申請人等作成用1（項番5〜20）",
    relatives: "21 在日親族（父・母・配偶者・子・兄弟姉妹・祖父母・叔(伯)父・叔(伯)母など）及び同居者",
    applicant2: "申請人等作成用2（N）（項番22〜27）",
    workHistory: "26 職歴（外国におけるものを含む）",
    organization: "所属機関等作成用1・2（N）",
  },
  labels: {
    ...UNNUMBERED_LABELS,
    placeOfBirth: "5 出生地",
    maritalStatus: "6 配偶者の有無",
    occupation: "7 職業",
    homeAddress: "8 本国における居住地",
    contactInJapan: "9 日本における連絡先",
    phone: "9 電話番号（連絡先の欄）",
    mobilePhone: "9 携帯電話番号（連絡先の欄）",
    passportNumber: "10 (1) 旅券番号",
    passportExpiry: "10 (2) 旅券の有効期限",
    plannedEntryDate: "12 入国予定年月日",
    portOfEntry: "13 上陸予定港",
    plannedStay: "14 滞在予定期間",
    accompanied: "15 同伴者の有無",
    visaApplicationPlace: "16 査証申請予定地",
    entryHistory: "17 過去の出入国歴",
    entryHistoryCount: "17 回数",
    entryHistoryLastFrom: "17 直近の出入国歴（入国年月日）",
    entryHistoryLastTo: "17 直近の出入国歴（出国年月日）",
    coeHistory: "18 過去の在留資格認定証明書交付申請歴",
    coeHistoryCount: "18 回数",
    coeHistoryNonIssuedCount: "18 うち不交付となった回数",
    criminalRecord: "19 犯罪を理由とする処分を受けたことの有無",
    criminalDetail: "19 具体的内容",
    deportationHistory: "20 退去強制又は出国命令による出国の有無",
    deportationCount: "20 回数",
    deportationLastDate: "20 直近の送還歴（年月日）",
    branchName: "22 勤務先 支店・事業所名",
    workPhone: "22 (3) 勤務先 電話番号",
    educationPlace: "23 (1) 最終学歴の所在",
    educationLevel: "23 (2) 学歴の区分",
    schoolName: "23 (3) 学校名",
    graduationDate: "23 (4) 卒業年月日",
    majorField: "24 専攻・専門分野",
    itQualification: "25 情報処理技術者資格又は試験合格",
    legalRepName: "27 申請人、法定代理人、法第7条の2第2項に規定する代理人 (1) 氏名",
    legalRepRelationship: "27 (2) 本人との関係",
    legalRepAddress: "27 (3) 住所",
    legalRepPhone: "27 電話番号",
    experienceYears: "8 実務経験年数",
    positionTitle: "9 職務上の地位（役職名）",
    occupationCode: "10 職種（別紙「職種一覧」の番号）",
    dispatchName: "12 派遣先等 (1) 名称",
    dispatchCorporateNumber: "12 (2) 法人番号",
    dispatchBranchName: "12 (3) 支店・事業所名",
    dispatchInsuranceNumber: "12 (4) 雇用保険適用事業所番号",
    dispatchAddress: "12 (6) 所在地",
    dispatchPhone: "12 (6) 電話番号",
    dispatchCapital: "12 (7) 資本金",
    dispatchAnnualSales: "12 (8) 年間売上高",
    dispatchPeriod: "12 (9) 派遣予定期間",
  },
  desiredStatusLabel: "11 入国目的",
  livesTogetherLabel: "同居予定の有無",
};

/**
 * 別記第三十六号様式（Issue #87）。用紙は1枚で、職歴・所属機関等・学歴の欄はない（sectionTitles に書かず、表示しない）。
 * 項番は更新・変更と異なる（出生地5、取得の事由11、在留の理由12、身元保証人16、代理人17）。
 * COMMON_LABELS は展開せず、原本（docs/official/acquisition-application-form_930004121.xlsx）の項番を直接書く。
 * 代理人（17）の携帯電話番号は、項目を追加しない（docs/phase14-acquisition-forms-research.md の3章）。
 */
const ACQUISITION_LAYOUT: FormLayout = {
  formName: "在留資格取得許可申請書",
  formId: "930004121",
  sectionTitles: {
    applicant1: "申請人等作成用（項番5〜14）",
    relatives: "15 在日親族及び同居者",
    applicant2: "申請人等作成用（項番16・17、取次者）",
  },
  labels: {
    ...UNNUMBERED_LABELS,
    placeOfBirth: "5 出生地",
    maritalStatus: "6 配偶者の有無",
    occupation: "7 職業",
    homeAddress: "8 本国における居住地",
    phone: "9 電話番号（住居地の欄）",
    mobilePhone: "9 携帯電話番号（住居地の欄）",
    passportNumber: "10 (1) 旅券番号",
    passportExpiry: "10 (2) 旅券の有効期限",
    acquisitionCause: "11 在留資格取得の事由",
    acquisitionCauseOther: "11 その他の内容",
    stayPurpose: "12 在留の理由",
    desiredPeriod: "13 在留期間（希望する在留資格に対する期間）",
    criminalRecord: "14 犯罪を理由とする処分を受けたことの有無",
    criminalDetail: "14 具体的内容",
    guarantorName: "16 (1) 在日身元保証人又は連絡先 氏名",
    guarantorRelationship: "16 (2) 本人との関係",
    guarantorAddress: "16 (3) 住所",
    guarantorPhone: "16 電話番号",
    guarantorMobilePhone: "16 携帯電話番号",
    legalRepName: "17 (1) 代理人 氏名（法定代理人による申請の場合）",
    legalRepRelationship: "17 (2) 本人との関係",
    legalRepAddress: "17 (3) 代理人 住所",
    legalRepPhone: "17 電話番号",
  },
  desiredStatusLabel: "13 希望する在留資格",
};

/** 手続種別ごとの項目番号表。未対応の手続種別（その他）は、従来どおり更新様式の表記で表示する */
export const FORM_LAYOUTS: Partial<Record<ProcedureType, FormLayout>> = {
  renewal: RENEWAL_LAYOUT,
  change: CHANGE_LAYOUT,
  coe: COE_LAYOUT,
  acquisition: ACQUISITION_LAYOUT,
};

export function getFormLayout(procedureType: ProcedureType): FormLayout {
  return FORM_LAYOUTS[procedureType] ?? RENEWAL_LAYOUT;
}

/** 日付の形式を確認する項目。入力エラーの要約には、画面と同じ様式別の項目名（FormLayout.labels）を使う */
export const DATE_FIELD_KEYS = [
  "passportExpiry",
  "graduationDate",
  "plannedEntryDate",
  "entryHistoryLastFrom",
  "entryHistoryLastTo",
  "deportationLastDate",
] as const satisfies readonly FormFieldKey[];

const DATE_MESSAGE = "日付をカレンダーから選び直してください。";

/**
 * 日付の形式のみ確認する（公式様式の項目は、確定の前提としない）。
 * layout を渡すと、その様式で表示しない項目（labels にないもの）は確認しない
 * （画面にない項目の誤りで、保存できなくなることを避ける）。
 */
export function validateFormDetails(f: FormDetails, layout?: FormLayout): FormDetailsErrors {
  const errors: FormDetailsErrors = {};
  for (const k of DATE_FIELD_KEYS) {
    if (layout && !layout.labels[k]) continue;
    if (f[k] && !isValidDate(f[k])) errors[k] = DATE_MESSAGE;
  }
  return errors;
}

/**
 * 保存は妨げないが、確認を促す注意（エラーではない）。
 * 直近の出入国歴で、入国年月日が出国年月日より後になっている場合。
 */
export function getFormDetailsWarnings(f: FormDetails): string[] {
  const warnings: string[] = [];
  const { entryHistoryLastFrom: from, entryHistoryLastTo: to } = f;
  if (from && to && isValidDate(from) && isValidDate(to) && from > to) {
    warnings.push("直近の出入国歴で、入国年月日が出国年月日より後になっています。日付を確認してください（保存はできます）。");
  }
  return warnings;
}

export function isYearMonthOrDate(v: string): boolean {
  return v === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(v) || isValidDate(v);
}
