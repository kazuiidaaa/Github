import { isRole, type Role } from "@/lib/permissions";
import { useT } from "./LanguageProvider";
import type { MessageKey } from "./messages";
import type { MessageParams } from "./translate";

type T = (key: MessageKey, params?: MessageParams) => string;

/** 操作履歴の操作名 → 訳表のキー。lib/auditLabels.ts の AUDIT_LABELS と同じ操作名を持つ（試験で確認） */
export const AUDIT_KEYS: Record<string, MessageKey> = {
  case_created: "account.audit_case_created",
  case_info_saved: "account.audit_case_info_saved",
  case_deleted: "account.audit_case_deleted",
  document_uploaded: "account.audit_document_uploaded",
  document_upload_failed: "account.audit_document_upload_failed",
  document_deleted: "account.audit_document_deleted",
  document_replaced: "account.audit_document_replaced",
  applicant_saved: "account.audit_applicant_saved",
  applicant_confirmed: "account.audit_applicant_confirmed",
  applicant_reopened: "account.audit_applicant_reopened",
  employment_saved: "account.audit_employment_saved",
  form_details_saved: "account.audit_form_details_saved",
  requirement_submitted: "account.audit_requirement_submitted",
  requirement_status_changed: "account.audit_requirement_status_changed",
  requirement_due_changed: "account.audit_requirement_due_changed",
  custom_requirement_added: "account.audit_custom_requirement_added",
  custom_requirement_updated: "account.audit_custom_requirement_updated",
  custom_requirement_deleted: "account.audit_custom_requirement_deleted",
  requirement_overridden: "account.audit_requirement_overridden",
  requirement_note: "account.audit_requirement_note",
  check_updated: "account.audit_check_updated",
  check_added: "account.audit_check_added",
  check_removed: "account.audit_check_removed",
  application_ready_marked: "account.audit_application_ready_marked",
  application_ready_reset: "account.audit_application_ready_reset",
  document_generated: "account.audit_document_generated",
  document_updated: "account.audit_document_updated",
  document_docx_exported: "account.audit_document_docx_exported",
  document_docx_downloaded: "account.audit_document_docx_downloaded",
  document_pdf_exported: "account.audit_document_pdf_exported",
  document_pdf_downloaded: "account.audit_document_pdf_downloaded",
  document_reviewed: "account.audit_document_reviewed",
  document_submitted: "account.audit_document_submitted",
  document_final: "account.audit_document_final",
  document_archived: "account.audit_document_archived",
  member_added: "account.audit_member_added",
  member_role_changed: "account.audit_member_role_changed",
  member_removed: "account.audit_member_removed",
  organization_renamed: "account.audit_organization_renamed",
  password_changed: "account.audit_password_changed",
};

export const ROLE_KEYS: Record<Role, MessageKey> = {
  owner: "account.role_owner",
  admin: "account.role_admin",
  staff: "account.role_staff",
  viewer: "account.role_viewer",
};

/** 日本語のエラー文 → 訳表のキー。lib のエラー文は、元の日本語のまま保つ（画面に出すときだけ引く） */
export const ERROR_KEYS: Record<string, MessageKey> = {
  "不明なエラーが発生しました。": "account.err_unknown",
  "処理に失敗しました。時間をおいて再度お試しください。": "account.err_generic",
  "この操作を行う権限がありません。": "account.err_forbidden",
  "ログインの有効期限が切れました。再度ログインしてください。": "account.err_sessionExpired",
  "同じ内容がすでに登録されています。": "account.err_duplicate",
  "ファイルサイズが上限を超えています。": "account.err_tooLarge",
  "接続情報が設定されていません。管理者にご確認ください。": "account.err_notConfigured",
  "ログインしていません。": "account.err_notSignedIn",
  "事務所名を変更する権限がありません。": "account.err_renameForbidden",
  "最後の所有者は、降格または削除できません。": "account.err_lastOwner",
  "追加できません。メールアドレスと、相手のアカウントの状態をご確認ください。": "account.err_cannotAdd",
  "対象のメンバーが見つかりません。": "account.err_memberNotFound",
  "Supabase の接続情報が設定されていません。": "account.err_noSupabase",
  "新しいパスワードは8文字以上で入力してください。": "account.err_pwShort",
  "新しいパスワードは、現在のパスワードと異なるものにしてください。": "account.err_pwSame",
  "現在のパスワードが正しくありません。": "account.err_pwWrong",
  "パスワードを変更できませんでした。条件を満たしているかご確認ください。": "account.err_pwFailed",
  "サーバーに接続できません。時間をおいて再度お試しください。": "account.err_noConnection",
};

export function makeAccountText(t: T) {
  return {
    /** 操作名。未知の操作は、元の auditLabel と同じく、操作名そのまま */
    audit: (action: string) => (AUDIT_KEYS[action] ? t(AUDIT_KEYS[action]) : action),
    /** 役割名。未知の値は、そのまま */
    role: (role: string) => (isRole(role) ? t(ROLE_KEYS[role]) : role),
    /** 日本語のエラー文を、表示言語へ。表にない文は、そのまま（日本語の原文） */
    error: (message: string) => (ERROR_KEYS[message] ? t(ERROR_KEYS[message]) : message),
  };
}

/** 画面の表示用（現在の表示言語）。lib/auditLabels.ts・lib/permissions.ts の日本語は、変更しない */
export function useAccountText() {
  const t = useT();
  return makeAccountText(t);
}
