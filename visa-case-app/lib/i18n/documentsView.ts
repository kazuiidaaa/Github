import { officialFormScopeWarnings, officialFormSpecFor, type OfficialFormScope } from "@/lib/documents/officialForms";
import { precheckRows, type PrecheckInput, type PrecheckRow } from "@/lib/documents/precheck";
import type { GeneratedDocumentStatus, GeneratedDocumentType, OutputFormat } from "@/lib/documents/types";
import type { ProcedureType } from "@/lib/types";
import { useT } from "./LanguageProvider";
import type { MessageKey } from "./messages";
import type { MessageParams } from "./translate";

/**
 * 書類の生成と履歴の画面（/cases/[id]/documents）の、表示用の対応。
 * 元の日本語の定数・関数（lib/documents/types.ts、precheck.ts、officialForms.ts、lib/errors.ts）は、
 * 書類の出力・監査記録・試験が使うため変更しない。ここは、画面の表示のときだけ、言語に合わせて引く。
 */

type DocKey = Extract<MessageKey, `documents.${string}`>;
type T = (key: MessageKey, params?: MessageParams) => string;

export const DOCUMENT_TYPE_KEYS: Record<GeneratedDocumentType, DocKey> = {
  case_summary: "documents.docType_case_summary",
  applicant_summary: "documents.docType_applicant_summary",
  application_checklist: "documents.docType_application_checklist",
  reason_statement: "documents.docType_reason_statement",
  official_application_form: "documents.docType_official_application_form",
  transcription_aid: "documents.docType_transcription_aid",
  hsp_point_sheet: "documents.docType_hsp_point_sheet",
  client_guide: "documents.docType_client_guide",
};

export const GENERATED_STATUS_KEYS: Record<GeneratedDocumentStatus, DocKey> = {
  draft: "documents.genStatus_draft",
  reviewed: "documents.genStatus_reviewed",
  submitted: "documents.genStatus_submitted",
  archived: "documents.genStatus_archived",
};

export const OUTPUT_FORMAT_KEYS: Record<OutputFormat, DocKey> = {
  html: "documents.format_html",
  docx: "documents.format_docx",
  pdf: "documents.format_pdf",
  xlsx: "documents.format_xlsx",
};

export const OFFICIAL_NOTICE_KEYS: DocKey[] = ["documents.officialNotice1", "documents.officialNotice2", "documents.officialNotice3"];

export function makeDocumentLabels(t: T) {
  return {
    documentType: (v: GeneratedDocumentType) => t(DOCUMENT_TYPE_KEYS[v]),
    status: (v: GeneratedDocumentStatus) => t(GENERATED_STATUS_KEYS[v]),
    outputFormat: (v: OutputFormat) => t(OUTPUT_FORMAT_KEYS[v]),
  };
}

/** 書類の種類・状態・出力形式の表示名（現在の表示言語）。クライアントの部品で使う */
export function useDocumentLabels() {
  return makeDocumentLabels(useT());
}

/** 更新の様式が対象とする在留資格（法令用語のため訳さない。lib/documents/officialForms.ts と同じ値。試験で一致を確認） */
export const RENEWAL_TARGET_STATUS = "技術・人文知識・国際業務";

const SCOPE_KEYS: Partial<Record<ProcedureType, DocKey>> = {
  renewal: "documents.scopeRenewal",
  coe: "documents.scopeCoe",
  change: "documents.scopeChange",
  acquisition: "documents.scopeAcquisition",
};

/** 公式様式の対象外の注意（officialFormScopeWarnings と同じ判定。文面だけを言語別に引く） */
export function scopeWarningsText(t: T, s: OfficialFormScope): string[] {
  if (officialFormScopeWarnings(s).length === 0) return [];
  const key = SCOPE_KEYS[officialFormSpecFor(s.procedureType).procedureType];
  return key ? [t(key, { status: RENEWAL_TARGET_STATUS })] : officialFormScopeWarnings(s);
}

/**
 * 事前チェック（データ状態）の行。判定は、元の precheckRows の返り値（key・tone・unresolved・tab）を使い、
 * 文面は、入力（PrecheckInput）から決まる種別で、言語別に引く。日本語の出力は、元の関数と一致する（試験で確認）。
 */
export function precheckRowsText(t: T, i: PrecheckInput): PrecheckRow[] {
  const lacking = Math.max(i.requiredCount - i.receivedCount, 0);
  const counts = { required: i.requiredCount, received: i.receivedCount, lacking, unresolved: i.checksUnresolved };
  return precheckRows(i).map((row) => {
    if (row.key === "applicant") {
      const label = t("documents.precheck_applicantLabel");
      return i.applicantConfirmed
        ? { ...row, label, status: t("documents.precheck_applicantDone") }
        : {
            ...row,
            label,
            status: t("documents.precheck_applicantNone"),
            detail: t("documents.precheck_applicantDetail"),
            warning: t("documents.precheck_applicantWarn"),
          };
    }
    if (row.key === "requirements") {
      const label = t("documents.precheck_reqLabel");
      if (!i.hasRuleSet) {
        return { ...row, label, status: t("documents.precheck_reqNA"), detail: t("documents.precheck_reqNADetail") };
      }
      const detail = t("documents.precheck_reqDetail", counts);
      return lacking > 0
        ? { ...row, label, status: t("documents.precheck_reqLack"), detail, warning: t("documents.precheck_reqLackWarn", counts) }
        : { ...row, label, status: t("documents.precheck_reqDone"), detail };
    }
    const label = t("documents.precheck_chkLabel");
    if (i.checksTotal === 0) {
      return { ...row, label, status: t("documents.precheck_chkNone"), warning: t("documents.precheck_chkNoneWarn") };
    }
    return i.checksUnresolved > 0
      ? {
          ...row,
          label,
          status: t("documents.precheck_chkOpen"),
          detail: t("documents.precheck_chkOpenDetail", counts),
          warning: t("documents.precheck_chkOpenWarn", counts),
        }
      : { ...row, label, status: t("documents.precheck_chkDone") };
  });
}

/** 元のエラー文（日本語）から、訳表のキーへの対応。lib/errors.ts・store・API の文言と一致させる（試験で確認） */
export const ERROR_TEXT_KEYS: Record<string, DocKey> = {
  "処理に失敗しました。時間をおいて再度お試しください。": "documents.err_generic",
  "不明なエラーが発生しました。": "documents.err_unknown",
  "この操作を行う権限がありません。": "documents.err_forbidden",
  "ログインの有効期限が切れました。再度ログインしてください。": "documents.err_sessionExpired",
  "同じ内容がすでに登録されています。": "documents.err_duplicate",
  "ファイルサイズが上限を超えています。": "documents.err_tooLarge",
  "確認前の版のみ更新できます。": "documents.err_draftOnly",
  "接続情報が設定されていません。管理者にご確認ください。": "documents.err_noConnection",
  "文書の情報が不足しています。画面を読み込み直してください。": "documents.err_docInfoMissing",
  "エクセルの生成に接続できませんでした。通信状況をご確認ください。": "documents.err_xlsxNetwork",
  "エクセルの生成に失敗しました。": "documents.err_xlsxFailed",
  "エクセルの生成に失敗しました。時間をおいて、もう一度お試しください。": "documents.err_xlsxFailedRetry",
  "公式様式（エクセル）の生成には、ログインが必要です。デモモードでは利用できません。": "documents.officialLoginRequired",
  "ログインが必要です。": "documents.err_loginRequired",
  "短時間に呼び出しが集中しています。しばらくしてから、もう一度お試しください。": "documents.err_rateLimited",
  "入力が大きすぎます。": "documents.err_inputTooLarge",
  "入力の形式が正しくありません。": "documents.err_inputInvalid",
  "このブラウザの保存容量が不足しています。": "documents.err_storageFull",
};

const LOAD_FAILED_PREFIX = "生成文書の読み込みに失敗しました：";

/**
 * この画面に出るエラー文（日本語）を、表示言語へ引き直す。
 * エラーが種別・コードを持たず、文字列でしか区別できないため、既知の文言の完全一致で引く。
 * 一致しない文言は、そのまま（日本語のまま）返す。
 */
export function errorText(t: T, text: string): string {
  const key = ERROR_TEXT_KEYS[text];
  if (key) return t(key);
  if (text.startsWith(LOAD_FAILED_PREFIX)) return t("documents.err_loadFailed", { reason: errorText(t, text.slice(LOAD_FAILED_PREFIX.length)) });
  return text;
}
