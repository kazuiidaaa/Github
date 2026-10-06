import { unresolvedCount } from "@/lib/checks/definitions";
import { decideNextAction } from "@/lib/nextAction";
import { evaluate } from "@/lib/requirements/evaluate";
import type { CaseRecord } from "@/lib/types";
import type { MessageKey } from "./messages";
import type { MessageParams } from "./translate";

type T = (key: MessageKey, params?: MessageParams) => string;

/**
 * 「次に行うこと」の案内文（言語別）。段階の判定は lib/nextAction.ts の decideNextAction に任せ、
 * 文だけを訳表から引く。日本語の出力は、元の message と一致する（試験で確認）。
 */
export function nextActionMessage(t: T, c: CaseRecord): string {
  const { step } = decideNextAction(c);
  switch (step) {
    case 1:
      return t("home.next_step1");
    case 2:
      return t("home.next_step2");
    case 3:
      return t("home.next_step3", { count: evaluate(c).missing.length });
    case 4:
      return c.checks.length === 0
        ? t("home.next_step4none")
        : t("home.next_step4unresolved", { count: unresolvedCount(c.checks) });
    case 5:
      return t("home.next_step5");
  }
}
