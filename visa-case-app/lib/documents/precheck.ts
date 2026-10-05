/** 申請書類の作成前に確認する項目の状態（Issue #151）。判定は既存の evaluate・unresolvedCount の結果を受け取って行う。 */

export type PrecheckTone = "done" | "warn" | "pending";

export interface PrecheckRow {
  key: "applicant" | "requirements" | "checks";
  label: string;
  /** 状態を表す短い語（「確認済み」「未確認」「不足あり」「未実施」など） */
  status: string;
  detail: string;
  tone: PrecheckTone;
  /** 未解決の事項があるか */
  unresolved: boolean;
  /** 注意書きに使う文（未解決のときのみ） */
  warning?: string;
  /** 案件ページのタブ */
  tab: "applicant" | "requirements" | "checks";
}

export interface PrecheckInput {
  applicantConfirmed: boolean;
  /** 規則の対象となる手続か（ruleSet がある） */
  hasRuleSet: boolean;
  requiredCount: number;
  receivedCount: number;
  checksTotal: number;
  checksUnresolved: number;
}

export function precheckRows(i: PrecheckInput): PrecheckRow[] {
  const applicant: PrecheckRow = i.applicantConfirmed
    ? { key: "applicant", label: "申請人情報", status: "確認済み", detail: "", tone: "done", unresolved: false, tab: "applicant" }
    : {
        key: "applicant",
        label: "申請人情報",
        status: "未確認",
        detail: "下書きのままです",
        tone: "warn",
        unresolved: true,
        warning: "申請人情報が未確認です",
        tab: "applicant",
      };

  const lacking = Math.max(i.requiredCount - i.receivedCount, 0);
  let requirements: PrecheckRow;
  if (!i.hasRuleSet) {
    requirements = {
      key: "requirements",
      label: "必要書類",
      status: "対象外",
      detail: "規則の対象外（追加した書類のみ）",
      tone: "done",
      unresolved: false,
      tab: "requirements",
    };
  } else if (lacking > 0) {
    requirements = {
      key: "requirements",
      label: "必要書類",
      status: "不足あり",
      detail: `必要 ${i.requiredCount} 件中 ${i.receivedCount} 件が収集済み`,
      tone: "warn",
      unresolved: true,
      warning: `必要書類に未収集があります（${lacking}件）`,
      tab: "requirements",
    };
  } else {
    requirements = {
      key: "requirements",
      label: "必要書類",
      status: "収集済み",
      detail: `必要 ${i.requiredCount} 件中 ${i.receivedCount} 件が収集済み`,
      tone: "done",
      unresolved: false,
      tab: "requirements",
    };
  }

  let checks: PrecheckRow;
  if (i.checksTotal === 0) {
    checks = {
      key: "checks",
      label: "申請前チェック",
      status: "未実施",
      detail: "",
      tone: "pending",
      unresolved: true,
      warning: "申請前チェックが未実施です",
      tab: "checks",
    };
  } else if (i.checksUnresolved > 0) {
    checks = {
      key: "checks",
      label: "申請前チェック",
      status: "未解決あり",
      detail: `${i.checksUnresolved}件が未解決`,
      tone: "warn",
      unresolved: true,
      warning: `申請前チェックに未解決があります（${i.checksUnresolved}件）`,
      tab: "checks",
    };
  } else {
    checks = { key: "checks", label: "申請前チェック", status: "解決済み", detail: "", tone: "done", unresolved: false, tab: "checks" };
  }

  return [applicant, requirements, checks];
}

/** 生成ボタンの直前に出す注意書き。整っていれば空配列。 */
export function precheckWarnings(rows: PrecheckRow[]): string[] {
  return rows.flatMap((r) => (r.warning ? [r.warning] : []));
}
