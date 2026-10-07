import { unresolvedCount } from "./checks/definitions";
import { hasResidenceCard } from "./documentKinds";
import { jaT, type T } from "./i18n/jaT";
import { evaluate } from "./requirements/evaluate";
import type { CaseRecord } from "./types";

// 案件詳細の概要タブに表示する「次に行うこと」を決める。判定は上から順に行い、最初に該当する段階を返す。

export type NextActionStep = 1 | 2 | 3 | 4 | 5;
export type NextActionTarget = "documents" | "applicant" | "requirements" | "checks" | "generate";

export const NEXT_ACTION_TOTAL_STEPS = 5;

export interface NextAction {
  step: NextActionStep;
  total: number;
  target: NextActionTarget;
  /** 案内文（個人情報を含まない） */
  message: string;
  /** 移動ボタンの文言 */
  buttonLabel: string;
}

/** 次に行うことを決める。文言は、翻訳関数 t で引く（省略時は日本語。lib の呼び出し・試験は、日本語の出力を使う） */
export function decideNextAction(c: CaseRecord, t: T = jaT): NextAction {
  const total = NEXT_ACTION_TOTAL_STEPS;
  if (!hasResidenceCard(c)) {
    return {
      step: 1,
      total,
      target: "documents",
      message: t("caseInfo.na_documentsMessage"),
      buttonLabel: t("caseInfo.na_documentsButton"),
    };
  }
  if (c.applicant.confirmationStatus !== "confirmed") {
    return {
      step: 2,
      total,
      target: "applicant",
      message: t("caseInfo.na_applicantMessage"),
      buttonLabel: t("caseInfo.na_applicantButton"),
    };
  }
  // 規則の対象でない手続は ruleSet が null となり、missing は空になる
  const missing = evaluate(c).missing.length;
  if (missing > 0) {
    return {
      step: 3,
      total,
      target: "requirements",
      message: t("caseInfo.na_requirementsMessage", { count: missing }),
      buttonLabel: t("caseInfo.na_requirementsButton"),
    };
  }
  if (c.checks.length === 0) {
    return {
      step: 4,
      total,
      target: "checks",
      message: t("caseInfo.na_checksMessage"),
      buttonLabel: t("caseInfo.na_checksButton"),
    };
  }
  const unresolved = unresolvedCount(c.checks);
  if (unresolved > 0) {
    return {
      step: 4,
      total,
      target: "checks",
      message: t("caseInfo.na_checksUnresolvedMessage", { count: unresolved }),
      buttonLabel: t("caseInfo.na_checksButton"),
    };
  }
  return {
    step: 5,
    total,
    target: "generate",
    message: t("caseInfo.na_generateMessage"),
    buttonLabel: t("caseInfo.na_generateButton"),
  };
}
