import type { FormDetails } from "../formDetails";
import type { Applicant, CheckStatus, CheckType, EmploymentInfo, ProcedureType, RequirementStatus } from "../types";

/** 生成文書の種類（DBの document_type 制約と一致させる。過去の版のため、廃止した種類も残す） */
export type GeneratedDocumentType =
  | "case_summary"
  | "applicant_summary"
  | "application_checklist"
  | "reason_statement"
  | "official_application_form"
  | "transcription_aid";

/**
 * 「申請書類作成」画面で新規に生成できる文書。
 * 転記補助シート（transcription_aid）は新規生成の対象から外した（docs/phase11-excel-fill-decision.md）。
 * 型・DBの制約・過去の版は、後方互換のため残す（LegacyDocumentType）。
 */
export const INTERNAL_DOCUMENT_TYPES = [
  "case_summary",
  "applicant_summary",
  "application_checklist",
  "official_application_form",
] as const;
export type InternalDocumentType = (typeof INTERNAL_DOCUMENT_TYPES)[number];

/** 新規生成はできないが、過去の版の閲覧・出力のために内容を組み立てられる種類 */
export type LegacyDocumentType = "transcription_aid";
/** content_json を組み立てられる種類 */
export type BuildableDocumentType = InternalDocumentType | LegacyDocumentType;

/** 差し込み済みの公式様式（Excel）の種類。手続種別ごとに lib/documents/officialForms.ts へ追加する */
export function isOfficialForm(type: GeneratedDocumentType): boolean {
  return type === "official_application_form";
}

export const DOCUMENT_TYPE_LABELS: Record<GeneratedDocumentType, string> = {
  case_summary: "案件確認シート",
  applicant_summary: "申請人情報一覧",
  application_checklist: "必要書類チェックリスト",
  reason_statement: "理由書ドラフト",
  official_application_form: "公式申請様式",
  transcription_aid: "転記補助シート",
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

export type TranscriptionMode = "auto" | "confirm" | "missing";

export const TRANSCRIPTION_MODE_LABELS: Record<TranscriptionMode, string> = {
  auto: "差し込み",
  confirm: "要確認",
  missing: "手入力",
};

export interface TranscriptionItem {
  /** 公式様式の項目番号 */
  no: string;
  /** 公式様式の項目名 */
  label: string;
  value: string;
  mode: TranscriptionMode;
  note: string;
}

/** 公式様式の項目順に並べた転記補助の内容。公式の申請書そのものではない */
export interface TranscriptionContent {
  form: { formName: string; fileId: string; sourceUrl: string; confirmedOn: string; mappingVersion: number };
  applicantConfirmed: boolean;
  warnings: string[];
  sheets: { title: string; items: TranscriptionItem[] }[];
}

/** 転記補助シートに付ける注意書き。公式様式を利用する際の出典の記載を含む */
export const TRANSCRIPTION_NOTICES = [
  "転記補助用の資料です。公式の申請書ではありません。公式の申請書は、行政書士が最新の様式で作成します。",
  "出典：出入国在留管理庁ホームページ（https://www.moj.go.jp/isa/content/930004094.pdf）の項目名をもとに作成",
];

/** 公式様式（Excel）に付ける注意書き。出典の記載は、公式様式の利用条件（docs/official/README.md） */
export const OFFICIAL_FORM_NOTICES = [
  "出典：出入国在留管理庁ホームページ掲載の申請書様式（Excel）に、案件情報を差し込んで作成した下書きです。",
  "下書きです。提出前に、行政書士が原本・最新の公式様式と照合してください。",
  "A4での提出が必要な場合は、ダウンロード後に Excel・LibreOffice 等から印刷して PDF 化してください。",
];

/**
 * 公式様式（Excel）の差し込みに使った入力値の写し。生成後に案件が変わっても、
 * この内容から同じファイルを再生成できる（ファイル本体は content_json から作る）。
 */
export interface OfficialFormContent {
  form: { formName: string; fileId: string; sourceUrl: string; confirmedOn: string };
  applicantConfirmed: boolean;
  /** 差し込みエンジンの warnings と、対象外の案件の注意 */
  warnings: string[];
  input: { applicant: Applicant; employment: EmploymentInfo; formDetails: FormDetails; currentStatus: string; targetStatus?: string };
}

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
  transcription?: TranscriptionContent;
  officialForm?: OfficialFormContent;
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

export type OutputFormat = "html" | "docx" | "pdf" | "xlsx";

export const OUTPUT_FORMAT_LABELS: Record<OutputFormat, string> = { html: "画面", docx: "Word", pdf: "PDF", xlsx: "エクセル" };

export interface GeneratedDocument {
  id: string;
  caseId: string;
  /** Supabase 利用時のみ。Wordの保存先の組み立てに使う */
  organizationId?: string;
  outputFormat: OutputFormat;
  /** 非公開ストレージ上の保存先（Word・PDF・エクセルの出力時のみ） */
  storagePath?: string;
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
