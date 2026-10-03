import type { FormDetails } from "./formDetails";

export const PROCEDURE_TYPES = [
  {
    value: "renewal",
    label: "在留期間更新許可申請",
    description:
      "現在の在留資格を維持したまま、在留期間の更新を申請する案件です。",
  },
  {
    value: "change",
    label: "在留資格変更許可申請",
    description: "現在の在留資格から、別の在留資格への変更を申請する案件です。",
  },
  {
    value: "coe",
    label: "在留資格認定証明書交付申請",
    description: "海外から呼び寄せる外国人について、認定証明書の交付を申請する案件です。",
  },
  {
    value: "acquisition",
    label: "在留資格取得許可申請",
    description:
      "出生や日本国籍の離脱・喪失などにより、上陸の手続を経ずに在留資格を取得する案件です。",
  },
  { value: "other", label: "その他", description: "上記以外の案件です。" },
] as const;

export type ProcedureType = (typeof PROCEDURE_TYPES)[number]["value"];

/** 変更後・希望する在留資格を案件情報で入力する手続か（更新・その他は現在の在留資格のまま） */
export function procedureNeedsTarget(type: ProcedureType | ""): boolean {
  return type === "change" || type === "coe" || type === "acquisition";
}

/** 案件情報の「変更後／希望する在留資格」の入力欄の名称 */
export function targetStatusLabel(type: ProcedureType | ""): string {
  return type === "change" ? "変更後の在留資格" : "希望する在留資格";
}

/** 「変更後（希望）の在留資格」を入力・表示する手続種別か（新規案件の入力欄の判定と一致させる） */
export function needsTargetStatus(procedureType: string): boolean {
  return procedureNeedsTarget(procedureType as ProcedureType | "");
}

/** 案件一覧に出す「変更後／希望の在留資格」の表示内容。value が null のときは未入力 */
export interface TargetStatusDisplay {
  /** 表（md 以上）の接頭辞 */
  tableLabel: string;
  /** カード（md 未満）の項目名 */
  cardLabel: string;
  value: string | null;
}

/** 手続種別ごとの表示内容を返す。change=変更後、coe=希望、それ以外は表示なし（null）。空白だけの値は未入力 */
export function getTargetStatusDisplay(procedureType: string, targetStatus: string | undefined): TargetStatusDisplay | null {
  if (!needsTargetStatus(procedureType)) return null;
  const value = (targetStatus ?? "").trim() || null;
  return procedureType === "change"
    ? { tableLabel: "変更後：", cardLabel: "変更後の在留資格", value }
    : { tableLabel: "希望：", cardLabel: "希望する在留資格", value };

}

/** 入管法別表第一・第二の在留資格（案件の入力欄のプルダウン用）。表記は規則の判定と一致させる */
export const RESIDENCE_STATUSES = [
  "外交",
  "公用",
  "教授",
  "芸術",
  "宗教",
  "報道",
  "高度専門職",
  "経営・管理",
  "法律・会計業務",
  "医療",
  "研究",
  "教育",
  "技術・人文知識・国際業務",
  "企業内転勤",
  "介護",
  "興行",
  "技能",
  "特定技能",
  "技能実習",
  "文化活動",
  "短期滞在",
  "留学",
  "研修",
  "家族滞在",
  "特定活動",
  "永住者",
  "日本人の配偶者等",
  "永住者の配偶者等",
  "定住者",
] as const;

export const WORKFLOW_LABELS = {
  preparing: "準備中",
  applicant_confirmed: "申請人情報 確認済み",
  review_required: "要確認",
  application_ready: "申請準備完了",
} as const;

export type WorkflowStatus = keyof typeof WORKFLOW_LABELS;

export type DocumentStatus = "uploaded";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "アップロード済み",
};

export interface DocumentRecord {
  id: string;
  documentType: "residence_card" | "photo";
  fileName: string;
  mimeType: string;
  fileSize?: number;
  /** 仮データ方式のみ。容量の都合上、小さいファイルだけ保持する */
  dataUrl?: string;
  /** Supabase の非公開ストレージ上の保存先 */
  storagePath?: string;
  status: DocumentStatus;
  uploadedAt: string;
}

/** 案件名とは別に保持する、行政書士が手入力した申請人情報 */
export interface Applicant {
  legalName: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  residenceStatus: string;
  residenceExpiryDate: string;
  residenceCardNumber: string;
  workRestriction: string;
  confirmationStatus: "draft" | "confirmed";
  confirmedAt?: string;
  confirmedBy?: string;
}

export const EMPTY_APPLICANT: Applicant = {
  legalName: "",
  nationality: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  residenceStatus: "",
  residenceExpiryDate: "",
  residenceCardNumber: "",
  workRestriction: "",
  confirmationStatus: "draft",
};

export type OrgCategory = "" | "1" | "2" | "3" | "4";

/** 雇用・会社情報（申請人情報とは別に保持する） */
export interface EmploymentInfo {
  companyName: string;
  companyAddress: string;
  industry: string;
  capital: string;
  employeeCount: string;
  /** 所属機関のカテゴリー（1〜4） */
  category: OrgCategory;
  /** 源泉所得税の納期の特例の承認を受けているか */
  withholdingSpecial: boolean;
  jobDescription: string;
  employmentType: string;
  monthlySalary: string;
  employmentStartDate: string;
  contractPeriod: string;
}

export const EMPTY_EMPLOYMENT: EmploymentInfo = {
  companyName: "",
  companyAddress: "",
  industry: "",
  capital: "",
  employeeCount: "",
  category: "",
  withholdingSpecial: false,
  jobDescription: "",
  employmentType: "",
  monthlySalary: "",
  employmentStartDate: "",
  contractPeriod: "",
};

/** 必要書類の収集状況（管理上の状態であり、書類の適否の判断ではない） */
export const REQUIREMENT_STATUS_LABELS = {
  not_received: "未受領",
  requested: "依頼済み",
  received: "受領済み",
  reviewed: "確認済み",
} as const;

export type RequirementStatus = keyof typeof REQUIREMENT_STATUS_LABELS;

export const REQUIREMENT_STATUSES = Object.keys(REQUIREMENT_STATUS_LABELS) as RequirementStatus[];

/** 必要書類ごとの、行政書士による記録 */
export interface RequirementState {
  status: RequirementStatus;
  /** 受領の期限（YYYY-MM-DD） */
  dueDate?: string;
  /** 規則の判定を行政書士が上書きした場合 */
  override?: "required" | "not_required";
  note?: string;
}

/** 規則にない書類として、行政書士が案件ごとに追加する書類 */
export interface CustomRequirement {
  id: string;
  name: string;
  party: "applicant" | "organization";
  isRequired: boolean;
  status: RequirementStatus;
  dueDate?: string;
  note?: string;
}

export type CheckStatus = "pending" | "passed" | "warning" | "failed" | "not_applicable";
export type CheckType = "applicant" | "document" | "deadline" | "manual";

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  pending: "未確認",
  passed: "確認済み",
  warning: "注意あり",
  failed: "要対応",
  not_applicable: "対象外",
};

export const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  applicant: "申請人情報",
  document: "必要書類",
  deadline: "期限",
  manual: "手動項目",
};

/** 申請前チェックの1項目。システムの判定ではなく、行政書士が付ける管理状態 */
export interface CheckRecord {
  /** 項目の固定ID（手動項目は "manual.<uuid>"） */
  key: string;
  type: CheckType;
  name: string;
  status: CheckStatus;
  note: string;
  checkedAt?: string;
  /** 確認したユーザーID。画面での変更直後のみ "self"（保存時に置き換える） */
  checkedBy?: string;
}

export interface CaseRecord {
  id: string;
  caseName: string;
  procedureType: ProcedureType;
  currentStatus: string;
  targetStatus: string;
  memo: string;
  workflowStatus: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  applicant: Applicant;
  employment: EmploymentInfo;
  /** 公式の申請書にあって、上記にない入力項目（フェーズ9） */
  formDetails: FormDetails;
  requirementStates: Record<string, RequirementState>;
  customRequirements: CustomRequirement[];
  /** 申請予定日（YYYY-MM-DD）。未定なら空 */
  plannedApplicationDate: string;
  /** 申請前チェック全体に対する行政書士メモ */
  checkMemo: string;
  checks: CheckRecord[];
  documents: DocumentRecord[];
}
