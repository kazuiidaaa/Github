export const AUDIT_LABELS: Record<string, string> = {
  case_created: "案件を作成",
  case_deleted: "案件を削除",
  document_uploaded: "書類を登録",
  document_deleted: "書類を削除",
  applicant_saved: "申請人情報を下書き保存",
  applicant_confirmed: "申請人情報を確認済みに変更",
  applicant_reopened: "申請人情報を再編集（下書きへ戻す）",
  employment_saved: "雇用・会社情報を保存",
  requirement_submitted: "必要書類の提出状況を変更",
  requirement_status_changed: "必要書類の状態を変更",
  requirement_due_changed: "必要書類の期限を変更",
  custom_requirement_added: "必要書類を追加",
  custom_requirement_updated: "追加した必要書類を変更",
  custom_requirement_deleted: "追加した必要書類を削除",
  requirement_overridden: "必要書類の判定を上書き",
  requirement_note: "必要書類の理由を記録",
  check_updated: "申請前チェックを更新",
  check_added: "申請前チェックの手動項目を追加",
  check_removed: "申請前チェックの手動項目を削除",
  application_ready_marked: "申請準備完了にした",
  application_ready_reset: "申請準備完了を取り消した（チェック変更のため）",
  document_generated: "申請書類（内部確認シート）を生成",
  document_reviewed: "生成文書を行政書士確認済みにした",
  document_final: "生成文書を最終版にした",
  document_archived: "生成文書を保管にした",
  organization_renamed: "事務所名を変更",
  password_changed: "パスワードを変更",
};

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action;
}
