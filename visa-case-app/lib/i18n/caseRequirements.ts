import type { Lang } from "@/lib/documents/lang";
import type { AcquisitionCause, Category, RequirementRule } from "@/lib/requirements/rules";
import { HSP_EVIDENCE_RULE_PREFIX } from "@/lib/requirements/rules";
import { HSP_EVIDENCE } from "@/lib/hspPoints";
import type { MessageKey } from "./messages";
import { ruleDocumentName, ruleText } from "./ruleTexts";
import { translate, type MessageParams } from "./translate";

/**
 * 案件詳細「必要書類」タブで、規則（lib/requirements/rules.ts）と判定（lib/requirements/evaluate.ts）の文言を、
 * 言語に合わせて引く関数。規則・判定の日本語の定数は、書類の出力・案内書類の訳表・試験が使うため変更しない。
 * evaluate の reason（日本語）も、ここの reasonText に日本語の翻訳関数を渡して作るため、日本語の出力は変わらない。
 */
export type T = (key: MessageKey, params?: MessageParams) => string;

/** 日本語（原文）の翻訳関数。lib/ の関数が、日本語の文言を作るときに使う */
export const jaT: T = (key, params) => translate("ja", key, params);

/** 判定の理由。evaluate が、reason（日本語）とあわせて持つ */
export type ReasonCode =
  | { kind: "hspMark"; mark: string }
  | { kind: "causeNotRequired"; cause: AcquisitionCause }
  | { kind: "causeCommon" }
  | { kind: "causeLevel"; cause: AcquisitionCause; level: "required" | "check" }
  | { kind: "categoryNotRequired"; category: Category }
  | { kind: "conditionNotMet"; note?: string }
  | { kind: "categoryCommon" }
  | { kind: "categoryLevel"; category: Category; level: "required" | "check" };

const CAUSE_KEYS: Record<AcquisitionCause, MessageKey> = {
  nationalityLoss: "caseRequirements.cause_nationalityLoss",
  birth: "caseRequirements.cause_birth",
  other: "caseRequirements.cause_other",
};

/** 判定の理由の文。noteText は、条件に該当しない理由に含める規則の注記の訳（日本語は原文のまま） */
export function reasonText(t: T, code: ReasonCode, noteText: (note: string) => string = (n) => n): string {
  switch (code.kind) {
    case "hspMark":
      return t("caseRequirements.reasonHspMark", { mark: code.mark });
    case "causeNotRequired":
      return t("caseRequirements.reasonCauseNotRequired", { cause: t(CAUSE_KEYS[code.cause]) });
    case "causeCommon":
      return t("caseRequirements.reasonCauseCommon");
    case "causeLevel":
      return t(code.level === "required" ? "caseRequirements.reasonCauseRequired" : "caseRequirements.reasonCauseCheck", {
        cause: t(CAUSE_KEYS[code.cause]),
      });
    case "categoryNotRequired":
      return t("caseRequirements.reasonCategoryNotRequired", { category: code.category });
    case "conditionNotMet":
      return code.note
        ? t("caseRequirements.reasonConditionNotMetNote", { note: noteText(code.note) })
        : t("caseRequirements.reasonConditionNotMet");
    case "categoryCommon":
      return t("caseRequirements.reasonCategoryCommon");
    case "categoryLevel":
      return t(code.level === "required" ? "caseRequirements.reasonCategoryRequired" : "caseRequirements.reasonCategoryCheck", {
        category: code.category,
      });
  }
}

/** 規則の書類名の表示。高度専門職の疎明資料（番号ごとに生成）は、枠の文言のみ訳し、項目名・資料名は日本語のまま */
export function requirementName(t: T, lang: Lang, rule: RequirementRule): string {
  if (rule.id.startsWith(HSP_EVIDENCE_RULE_PREFIX)) {
    const mark = rule.id.slice(HSP_EVIDENCE_RULE_PREFIX.length);
    const e = HSP_EVIDENCE[mark];
    if (e) return t("caseRequirements.hspEvidenceName", { mark, item: e.item, document: e.document });
  }
  return ruleDocumentName(lang, rule.name);
}

/** 規則の注記の表示 */
export function requirementNote(lang: Lang, note: string): string {
  return ruleText(lang, note);
}
