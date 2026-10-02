import type { CaseRecord, RequirementState } from "../types";
import { RULE_SETS, type RequirementRule, type RuleSet } from "./rules";

export type Result = "required" | "not_required" | "check";

export interface EvaluatedItem {
  rule: RequirementRule;
  /** 規則による判定 */
  result: Result;
  /** 行政書士の上書きを反映した判定 */
  effective: Result;
  reason: string;
  state: RequirementState;
}

export interface Evaluation {
  ruleSet: RuleSet | null;
  notApplicableReason?: string;
  /** カテゴリー未入力のため、共通の書類のみを判定している */
  needsCategory: boolean;
  items: EvaluatedItem[];
  /** 必要だが未提出の書類 */
  missing: EvaluatedItem[];
  /** 提出要否の確認が必要な書類（未提出のもの） */
  toCheck: EvaluatedItem[];
  requiredCount: number;
  submittedCount: number;
}

const NO_STATE: RequirementState = { submitted: false };

function normalize(s: string): string {
  return s.replace(/[\s・･]/g, "");
}

function findRuleSet(c: CaseRecord): RuleSet | null {
  // 下書きの入力は正式なデータではないため、確認済みの場合のみ優先する
  const confirmed = c.applicant.confirmationStatus === "confirmed";
  const status = normalize((confirmed && c.applicant.residenceStatus) || c.currentStatus);
  return (
    RULE_SETS.find((r) => r.procedureType === c.procedureType && status.includes(normalize(r.residenceStatus))) ?? null
  );
}

/**
 * 案件の入力内容と規則から、必要書類を判定する。
 * 判定は「候補」であり、法的な適否の最終判断は行わない。
 */
export function evaluate(c: CaseRecord): Evaluation {
  const empty: Evaluation = {
    ruleSet: null,
    needsCategory: false,
    items: [],
    missing: [],
    toCheck: [],
    requiredCount: 0,
    submittedCount: 0,
  };
  const ruleSet = findRuleSet(c);
  if (!ruleSet) {
    return {
      ...empty,
      notApplicableReason:
        "この手続・在留資格の規則は未整備です。現在は「技術・人文知識・国際業務」の「在留期間更新許可申請」のみ対応しています。",
    };
  }

  const { category } = c.employment;
  const needsCategory = category === "";
  const items: EvaluatedItem[] = [];

  for (const rule of ruleSet.rules) {
    // カテゴリー未入力の間は、全カテゴリーに共通の書類のみ判定する
    if (needsCategory && rule.categories.length < 4) continue;

    let result: Result;
    let reason: string;
    if (!needsCategory && !rule.categories.includes(category)) {
      result = "not_required";
      reason = `カテゴリー${category}では原則不要`;
    } else if (rule.when && !c.employment[rule.when]) {
      result = "not_required";
      reason = rule.note ? `条件に該当しないため不要（${rule.note}）` : "条件に該当しないため不要";
    } else {
      result = rule.level;
      reason = needsCategory ? "全カテゴリー共通" : `カテゴリー${category}で${rule.level === "required" ? "必要" : "要確認"}`;
    }

    const state = c.requirementStates[rule.id] ?? NO_STATE;
    items.push({ rule, result, effective: state.override ?? result, reason, state });
  }

  const required = items.filter((i) => i.effective === "required");
  return {
    ruleSet,
    needsCategory,
    items,
    missing: required.filter((i) => !i.state.submitted),
    toCheck: items.filter((i) => i.effective === "check" && !i.state.submitted),
    requiredCount: required.length,
    submittedCount: required.filter((i) => i.state.submitted).length,
  };
}
