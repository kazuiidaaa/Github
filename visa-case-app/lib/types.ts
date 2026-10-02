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
  { value: "other", label: "その他", description: "上記以外の案件です。" },
] as const;

export type ProcedureType = (typeof PROCEDURE_TYPES)[number]["value"];

export const WORKFLOW_LABELS = {
  preparing: "準備中",
  applicant_confirmed: "申請人情報 確認済み",
} as const;

export type WorkflowStatus = keyof typeof WORKFLOW_LABELS;

export type DocumentStatus = "uploaded";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "アップロード済み",
};

export interface DocumentRecord {
  id: string;
  documentType: "residence_card";
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
  requirementStates: Record<string, RequirementState>;
  customRequirements: CustomRequirement[];
  documents: DocumentRecord[];
}
