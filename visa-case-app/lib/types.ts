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
  processing: "OCR処理中",
  review: "確認待ち",
  confirmed: "確定済み",
} as const;

export type WorkflowStatus = keyof typeof WORKFLOW_LABELS;

export type DocumentStatus = "uploaded" | "processing" | "processed" | "failed";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "アップロード済み",
  processing: "処理中",
  processed: "処理完了",
  failed: "失敗",
};

export type FieldKey =
  | "legalName"
  | "nationality"
  | "dateOfBirth"
  | "residenceStatus"
  | "residenceExpiryDate";

export const REQUIRED_FIELDS: { key: FieldKey; label: string; placeholder: string }[] = [
  { key: "legalName", label: "氏名", placeholder: "LI MING" },
  { key: "nationality", label: "国籍・地域", placeholder: "中国" },
  { key: "dateOfBirth", label: "生年月日", placeholder: "YYYY-MM-DD" },
  { key: "residenceStatus", label: "在留資格", placeholder: "技術・人文知識・国際業務" },
  { key: "residenceExpiryDate", label: "在留期間の満了日", placeholder: "YYYY-MM-DD" },
];

export interface Extraction {
  field: FieldKey;
  /** OCRが抽出した値（変更しない） */
  extractedValue: string;
  /** 行政書士が確認・修正した値 */
  value: string;
  confidence: number;
  reviewStatus: "pending" | "confirmed";
}

export interface DocumentRecord {
  id: string;
  documentType: "residence_card";
  fileName: string;
  mimeType: string;
  /** 仮データ方式のみ。容量の都合上、小さいファイルだけ保持する */
  dataUrl?: string;
  /** Supabase の非公開ストレージ上の保存先 */
  storagePath?: string;
  status: DocumentStatus;
  uploadedAt: string;
  extractions: Extraction[];
}

/** 案件名とは別に保持する、確認済みの正式な申請人情報 */
export interface Applicant {
  legalName: string;
  nationality: string;
  dateOfBirth: string;
  residenceStatus: string;
  residenceExpiryDate: string;
  confirmationStatus: "unconfirmed" | "confirmed";
  confirmedAt?: string;
  confirmedBy?: string;
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
  documents: DocumentRecord[];
}
