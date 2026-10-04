import { PROCEDURE_TYPES, type CaseRecord, type RequirementState } from "../types";
import { isCollected } from "./progress";
import { ACQUISITION_CAUSE_LABELS, RULE_SETS, type RequirementRule, type RuleSet } from "./rules";

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
  /** 取得の事由が未選択のため、全事由に共通の書類のみを判定している（取得許可申請のみ） */
  needsCause: boolean;
  items: EvaluatedItem[];
  /** 必要だが未受領（未受領・依頼済み）の書類 */
  missing: EvaluatedItem[];
  /** 提出要否の確認が必要な書類（未受領のもの） */
  toCheck: EvaluatedItem[];
  requiredCount: number;
  receivedCount: number;
}

const NO_STATE: RequirementState = { status: "not_received" };

function normalize(s: string): string {
  return s.replace(/[\s・･]/g, "");
}

function matchRuleSet(procedureType: string, residenceStatus: string, ruleSets: RuleSet[]): RuleSet | null {
  // 在留資格によらず手続種別だけで適用する規則（取得許可申請）。在留資格が空でも一致する
  const anyStatus = ruleSets.find((r) => r.procedureType === procedureType && r.anyResidenceStatus);
  if (anyStatus) return anyStatus;
  const status = normalize(residenceStatus);
  if (status === "") return null;
  return ruleSets.find((r) => r.procedureType === procedureType && status.includes(normalize(r.residenceStatus))) ?? null;
}

/** 変更後（希望）の在留資格で規則を引く手続種別。規則の residenceStatus は申請後に持つ在留資格を意味するため */
const TARGET_STATUS_PROCEDURES: readonly string[] = ["change", "coe", "acquisition"];

/**
 * 規則を引くための在留資格を決める。
 * - 変更・認定・取得：変更後（希望）の在留資格（空なら一致なし）。現在の在留資格では引かない
 * - 更新・その他：確認済みの申請人情報の在留資格があればそれ、なければ現在の在留資格
 */
export function statusForRules(
  procedureType: string,
  input: { currentStatus: string; targetStatus: string; confirmedResidenceStatus?: string },
): string {
  if (TARGET_STATUS_PROCEDURES.includes(procedureType)) return input.targetStatus;
  return input.confirmedResidenceStatus || input.currentStatus;
}

function findRuleSet(c: CaseRecord, ruleSets: RuleSet[]): RuleSet | null {
  // 下書きの入力は正式なデータではないため、確認済みの場合のみ優先する
  const confirmed = c.applicant.confirmationStatus === "confirmed";
  const status = statusForRules(c.procedureType, {
    currentStatus: c.currentStatus,
    targetStatus: c.targetStatus,
    confirmedResidenceStatus: confirmed ? c.applicant.residenceStatus : "",
  });
  return matchRuleSet(c.procedureType, status, ruleSets);
}

/** 手続種別と在留資格（文字列）だけから、対応する規則があるかを判定する（案件作成画面の案内用） */
export function hasRuleSetFor(procedureType: string, residenceStatus: string, ruleSets: RuleSet[] = RULE_SETS): boolean {
  return matchRuleSet(procedureType, residenceStatus, ruleSets) !== null;
}

/**
 * 案件作成画面で「規則が未整備」の案内を出すか。evaluate と同じ在留資格の決め方（statusForRules）を使う。
 * 手続種別が未選択、または判定に使う在留資格が未入力の間は出さない（入力途中の表示を避ける）。
 */
export function shouldShowNoRuleGuide(
  procedureType: string,
  currentStatus: string,
  targetStatus: string,
  ruleSets: RuleSet[] = RULE_SETS,
): boolean {
  if (procedureType === "") return false;
  const status = statusForRules(procedureType, { currentStatus, targetStatus });
  if (status.trim() === "") return false;
  return !hasRuleSetFor(procedureType, status, ruleSets);
}

/** 規則が未整備の手続・在留資格に対する案内文。対応する組み合わせは RULE_SETS から生成する */
export function notApplicableMessage(): string {
  const supported = RULE_SETS.map((r) => {
    const label = PROCEDURE_TYPES.find((p) => p.value === r.procedureType)?.label ?? r.procedureType;
    return r.anyResidenceStatus ? `在留資格を問わない「${label}」` : `「${r.residenceStatus}」の「${label}」`;
  }).join("、");
  return `この手続・在留資格の規則は未整備です。現在は${supported}のみ対応しています。`;
}

/**
 * 案件の入力内容と規則から、必要書類を判定する。
 * 判定は「候補」であり、法的な適否の最終判断は行わない。
 */
export function evaluate(c: CaseRecord, ruleSets: RuleSet[] = RULE_SETS): Evaluation {
  const empty: Evaluation = {
    ruleSet: null,
    needsCategory: false,
    needsCause: false,
    items: [],
    missing: [],
    toCheck: [],
    requiredCount: 0,
    receivedCount: 0,
  };
  const ruleSet = findRuleSet(c, ruleSets);
  if (!ruleSet) {
    return {
      ...empty,
      notApplicableReason: notApplicableMessage(),
    };
  }

  const items: EvaluatedItem[] = [];

  // 取得の事由で判定する規則集合は、所属機関のカテゴリーに依存しない
  if (ruleSet.basis === "acquisitionCause") {
    const cause = c.formDetails.acquisitionCause;
    const needsCause = cause === "";
    for (const rule of ruleSet.rules) {
      const causes = rule.causes ?? [];
      // 事由が未選択の間は、全事由に共通の書類のみ判定する
      if (needsCause && causes.length < Object.keys(ACQUISITION_CAUSE_LABELS).length) continue;
      const label = needsCause ? "" : ACQUISITION_CAUSE_LABELS[cause];
      let result: Result;
      let reason: string;
      if (!needsCause && !causes.includes(cause)) {
        result = "not_required";
        reason = `取得の事由「${label}」では原則不要`;
      } else {
        result = rule.level;
        reason = needsCause ? "全事由共通" : `取得の事由「${label}」で${rule.level === "required" ? "必要" : "要確認"}`;
      }
      const state = c.requirementStates[rule.id] ?? NO_STATE;
      items.push({ rule, result, effective: state.override ?? result, reason, state });
    }
    return summarize(ruleSet, false, needsCause, items);
  }

  const { category } = c.employment;
  const needsCategory = category === "";

  for (const rule of ruleSet.rules) {
    // カテゴリー未入力の間は、全カテゴリーに共通の書類のみ判定する
    const categories = rule.categories ?? [];
    if (needsCategory && categories.length < 4) continue;

    let result: Result;
    let reason: string;
    if (!needsCategory && !categories.includes(category)) {
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

  return summarize(ruleSet, needsCategory, false, items);
}

function summarize(ruleSet: RuleSet, needsCategory: boolean, needsCause: boolean, items: EvaluatedItem[]): Evaluation {
  const required = items.filter((i) => i.effective === "required");
  return {
    ruleSet,
    needsCategory,
    needsCause,
    items,
    missing: required.filter((i) => !isCollected(i.state.status)),
    toCheck: items.filter((i) => i.effective === "check" && !isCollected(i.state.status)),
    requiredCount: required.length,
    receivedCount: required.filter((i) => isCollected(i.state.status)).length,
  };
}
