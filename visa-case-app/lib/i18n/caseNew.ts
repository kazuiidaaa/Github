import type { MessageKey } from "./messages";
import type { MessageParams } from "./translate";
import type { Lang } from "@/lib/documents/lang";
import { RULE_SETS, categoryLabelsOf, categoryRangeOf, type Category, type RuleSet } from "@/lib/requirements/rules";
import { ruleText } from "./ruleTexts";
import { PROCEDURE_TYPES, type ProcedureType } from "@/lib/types";

/**
 * 案件の新規登録の画面で、言語に合わせて文言を引く薄い関数。
 * lib/types.ts・lib/requirements/evaluate.ts の日本語の関数・定数は、書類の出力・テストが使うため変更しない。
 * 日本語の出力は、元の関数と一致する（tests/caseNewMessages.test.ts で確認）。
 */
type T = (key: MessageKey, params?: MessageParams) => string;

const DESCRIPTION_KEYS: Record<ProcedureType, MessageKey> = {
  renewal: "caseNew.procedure_renewal_desc",
  change: "caseNew.procedure_change_desc",
  coe: "caseNew.procedure_coe_desc",
  acquisition: "caseNew.procedure_acquisition_desc",
  other: "caseNew.procedure_other_desc",
};

/** 手続種別の説明文。未選択は undefined（手続名そのものは訳さない） */
export function procedureDescriptionText(t: T, value: ProcedureType | ""): string | undefined {
  return value === "" ? undefined : t(DESCRIPTION_KEYS[value]);
}

/** targetStatusLabel（lib/types.ts）の、言語別の表示 */
export function targetStatusLegend(t: T, type: ProcedureType | ""): string {
  return t(type === "change" ? "caseNew.targetLegendChange" : "caseNew.targetLegendOther");
}

/** notApplicableMessage（lib/requirements/evaluate.ts）の、言語別の表示。手続名・在留資格名は日本語のまま */
export function noRuleMessage(t: T): string {
  const supported = RULE_SETS.map((r) => {
    const label = PROCEDURE_TYPES.find((p) => p.value === r.procedureType)?.label ?? r.procedureType;
    return r.anyResidenceStatus ? t("caseNew.noRuleItemAny", { label }) : t("caseNew.noRuleItemStatus", { status: r.residenceStatus, label });
  }).join(t("caseNew.noRuleSeparator"));
  return t("caseNew.noRuleMessage", { supported });
}

/** 所属機関のカテゴリーの表示名（CATEGORY_LABELS の言語別） */
export const CATEGORY_KEYS: Record<Category, MessageKey> = {
  "1": "employment.category1",
  "2": "employment.category2",
  "3": "employment.category3",
  "4": "employment.category4",
};

/**
 * 所属機関のカテゴリーの選択肢。規則集合に区分の定義があれば、その範囲・意味（ruleText の訳）を使い、なければ既定の1〜4。
 * 規則集合が決まらない間（在留資格が未入力など）も、既定の1〜4。
 */
export function categoryOptions(t: T, lang: Lang, ruleSet: Pick<RuleSet, "categoryDefinition"> | null): { value: Category; label: string }[] {
  const labels = categoryLabelsOf(ruleSet);
  return categoryRangeOf(ruleSet).map((value) => ({
    value,
    label: ruleSet?.categoryDefinition ? ruleText(lang, labels[value] ?? "") : t(CATEGORY_KEYS[value]),
  }));
}
