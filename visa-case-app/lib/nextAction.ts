import { unresolvedCount } from "./checks/definitions";
import { hasResidenceCard } from "./documentKinds";
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

export function decideNextAction(c: CaseRecord): NextAction {
  const total = NEXT_ACTION_TOTAL_STEPS;
  if (!hasResidenceCard(c)) {
    return {
      step: 1,
      total,
      target: "documents",
      message: "「書類」タブから在留カードを登録し、「申請人情報」タブで内容を入力してください。",
      buttonLabel: "書類を登録する",
    };
  }
  if (c.applicant.confirmationStatus !== "confirmed") {
    return {
      step: 2,
      total,
      target: "applicant",
      message: "「申請人情報」タブで、内容を入力し、確認してください。",
      buttonLabel: "申請人情報を開く",
    };
  }
  // 規則の対象でない手続は ruleSet が null となり、missing は空になる
  const missing = evaluate(c).missing.length;
  if (missing > 0) {
    return {
      step: 3,
      total,
      target: "requirements",
      message: `「必要書類」タブで、不足している書類（${missing}件）を確認してください。`,
      buttonLabel: "必要書類を開く",
    };
  }
  if (c.checks.length === 0) {
    return {
      step: 4,
      total,
      target: "checks",
      message: "「申請前チェック」タブで、申請前のチェックを行ってください。",
      buttonLabel: "申請前チェックを開く",
    };
  }
  const unresolved = unresolvedCount(c.checks);
  if (unresolved > 0) {
    return {
      step: 4,
      total,
      target: "checks",
      message: `「申請前チェック」タブで、未解決の項目（${unresolved}件）を確認してください。`,
      buttonLabel: "申請前チェックを開く",
    };
  }
  return {
    step: 5,
    total,
    target: "generate",
    message: "準備が整いました。「申請書類作成」画面で、書類を生成してください。",
    buttonLabel: "申請書類を作成する",
  };
}
