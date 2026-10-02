export const AUDIT_LABELS: Record<string, string> = {
  case_created: "案件を作成",
  case_deleted: "案件を削除",
  document_uploaded: "書類を登録",
  applicant_saved: "申請人情報を下書き保存",
  applicant_confirmed: "申請人情報を確認済みに変更",
  applicant_reopened: "申請人情報を再編集（下書きへ戻す）",
  employment_saved: "雇用・会社情報を保存",
  requirement_submitted: "必要書類の提出状況を変更",
  requirement_overridden: "必要書類の判定を上書き",
  requirement_note: "必要書類の理由を記録",
  organization_renamed: "事務所名を変更",
  password_changed: "パスワードを変更",
};

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action;
}
