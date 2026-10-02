import type { CheckStatus, CheckType, ProcedureType, RequirementStatus } from "../types";

/** 生成文書の種類。公式様式（official_application_form）は6-Aでは作成しない */
export type GeneratedDocumentType =
  | "case_summary"
  | "applicant_summary"
  | "application_checklist"
  | "reason_statement"
  | "official_application_form";

/** 6-Aで生成できる内部確認用の文書 */
export const INTERNAL_DOCUMENT_TYPES = ["case_summary", "applicant_summary", "application_checklist"] as const;
export type InternalDocumentType = (typeof INTERNAL_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<GeneratedDocumentType, string> = {
  case_summary: "案件確認シート",
  applicant_summary: "申請人情報一覧",
  application_checklist: "必要書類チェックリスト",
  reason_statement: "理由書ドラフト",
  official_application_form: "公式申請様式",
};

export type GeneratedDocumentStatus = "draft" | "reviewed" | "final" | "archived";

export const GENERATED_STATUS_LABELS: Record<GeneratedDocumentStatus, string> = {
  draft: "行政書士確認前",
  reviewed: "行政書士確認済み",
  final: "最終版",
  archived: "保管",
};

export const NOTICES = [
  "内部確認用の資料です。公式の申請様式ではありません。",
  "申請の可否、許可の見込み、必要書類の最終判断を示すものではありません。",
];

/** 生成時点の案件情報の写し。生成後に案件が変わっても、この内容は変わらない */
export interface ContentJson {
  schemaVersion: 1;
  template: string;
  generatedAt: string;
  source: { caseId: string; caseUpdatedAt: string };
  case: {
    caseName: string;
    procedureType: ProcedureType;
    procedureLabel: string;
    currentStatus: string;
    targetStatus: string;
    workflowStatus: string;
    workflowLabel: string;
  };
  applicant?: {
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
  };
  employment?: {
    companyName: string;
    companyAddress: string;
    industry: string;
    capital: string;
    employeeCount: string;
    category: string;
    jobDescription: string;
    employmentType: string;
    monthlySalary: string;
    employmentStartDate: string;
    contractPeriod: string;
  };
  requirements?: {
    items: SnapshotRequirement[];
    requiredCount: number;
    receivedCount: number;
  };
  preApplicationChecks?: {
    available: boolean;
    plannedApplicationDate: string;
    memo: string;
    items: {
      key: string;
      type: CheckType;
      name: string;
      status: CheckStatus;
      note: string;
      checkedAt?: string;
    }[];
  };
  memo: string;
  notices: string[];
}

export interface SnapshotRequirement {
  id: string;
  name: string;
  party: "applicant" | "organization";
  /** 管理上の区分（行政書士の上書きを反映）。法的な適否の判断ではない */
  category: "required" | "not_required" | "check";
  overridden: boolean;
  custom: boolean;
  status: RequirementStatus;
  dueDate?: string;
  note?: string;
}

export interface GeneratedDocument {
  id: string;
  caseId: string;
  documentType: GeneratedDocumentType;
  title: string;
  version: number;
  content: ContentJson;
  status: GeneratedDocumentStatus;
  createdAt: string;
  createdBy?: string;
  reviewedAt?: string;
  reviewedByName?: string;
}
