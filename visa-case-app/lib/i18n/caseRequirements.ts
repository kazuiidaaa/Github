import type { MedicalApplicantType } from "@/lib/formDetails";
import type { Lang } from "@/lib/documents/lang";
import type { AcquisitionCause, Category, RequirementRule } from "@/lib/requirements/rules";
import { HSP_EVIDENCE_RULE_PREFIX } from "@/lib/requirements/rules";
import { HSP_EVIDENCE } from "@/lib/hspPoints";
import type { MessageKey } from "./messages";
import { ruleDocumentName, ruleText } from "./ruleTexts";
import { jaT, type T } from "./jaT";

/**
 * 案件詳細「必要書類」タブで、規則（lib/requirements/rules.ts）と判定（lib/requirements/evaluate.ts）の文言を、
 * 言語に合わせて引く関数。規則・判定の日本語の定数は、書類の出力・案内書類の訳表・試験が使うため変更しない。
 * evaluate の reason（日本語）も、ここの reasonText に日本語の翻訳関数を渡して作るため、日本語の出力は変わらない。
 */
export { jaT, type T };

/** 判定の理由。evaluate が、reason（日本語）とあわせて持つ */
export type ReasonCode =
  | { kind: "hspMark"; mark: string }
  | { kind: "causeNotRequired"; cause: AcquisitionCause }
  | { kind: "causeCommon" }
  | { kind: "causeLevel"; cause: AcquisitionCause; level: RequirementRule["level"] }
  | { kind: "categoryNotRequired"; category: Category }
  | { kind: "conditionNotMet"; note?: string }
  | { kind: "categoryCommon" }
  | { kind: "categoryLevel"; category: Category; level: RequirementRule["level"] }
  | { kind: "applicantTypeNotRequired"; type: MedicalApplicantType }
  | { kind: "applicantTypeCommon" }
  | { kind: "applicantTypeUnknown" }
  | { kind: "applicantTypeLevel"; type: MedicalApplicantType; level: RequirementRule["level"] }
  /** 判定の軸を複数持つ規則集合（RuleSet.alsoBasis。Issue #402）。選択済みの軸の値だけを持つ。どれも持たなければ「全事由・全区分に共通」 */
  | { kind: "axesLevel"; level: RequirementRule["level"]; cause?: AcquisitionCause; category?: Category; type?: MedicalApplicantType };

const APPLICANT_TYPE_KEYS: Record<MedicalApplicantType, MessageKey> = {
  doctor: "caseRequirements.applicantType_doctor",
  other: "caseRequirements.applicantType_other",
};

const CAUSE_KEYS: Record<AcquisitionCause, MessageKey> = {
  nationalityLoss: "caseRequirements.cause_nationalityLoss",
  birth: "caseRequirements.cause_birth",
  other: "caseRequirements.cause_other",
};

/** 規則の level ごとの、判定の理由の文（任意は、不足にも要確認にも数えない書類） */
const LEVEL_KEYS = {
  cause: { required: "caseRequirements.reasonCauseRequired", check: "caseRequirements.reasonCauseCheck", optional: "caseRequirements.reasonCauseOptional" },
  category: { required: "caseRequirements.reasonCategoryRequired", check: "caseRequirements.reasonCategoryCheck", optional: "caseRequirements.reasonCategoryOptional" },
  applicantType: {
    required: "caseRequirements.reasonApplicantTypeRequired",
    check: "caseRequirements.reasonApplicantTypeCheck",
    optional: "caseRequirements.reasonApplicantTypeOptional",
  },
  axes: { required: "caseRequirements.reasonAxesRequired", check: "caseRequirements.reasonAxesCheck", optional: "caseRequirements.reasonAxesOptional" },
} as const;

/** 複数の軸の理由の文で、選択済みの軸の値を並べる（取得の事由・カテゴリー・申請人の区分の順） */
function axesConditions(t: T, code: Extract<ReasonCode, { kind: "axesLevel" }>): string[] {
  const parts: string[] = [];
  if (code.cause) parts.push(t("caseRequirements.axisCause", { cause: t(CAUSE_KEYS[code.cause]) }));
  if (code.category) parts.push(t("caseRequirements.axisCategory", { category: code.category }));
  if (code.type) parts.push(t("caseRequirements.axisApplicantType", { type: t(APPLICANT_TYPE_KEYS[code.type]) }));
  return parts;
}

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
      return t(LEVEL_KEYS.cause[code.level], {
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
      return t(LEVEL_KEYS.category[code.level], {
        category: code.category,
      });
    case "applicantTypeNotRequired":
      return t("caseRequirements.reasonApplicantTypeNotRequired", { type: t(APPLICANT_TYPE_KEYS[code.type]) });
    case "applicantTypeCommon":
      return t("caseRequirements.reasonApplicantTypeCommon");
    case "applicantTypeUnknown":
      return t("caseRequirements.reasonApplicantTypeUnknown");
    case "applicantTypeLevel":
      return t(LEVEL_KEYS.applicantType[code.level], {
        type: t(APPLICANT_TYPE_KEYS[code.type]),
      });
    case "axesLevel": {
      const conditions = axesConditions(t, code);
      if (conditions.length === 0) return t("caseRequirements.reasonAxesCommon");
      return t(LEVEL_KEYS.axes[code.level], { conditions: conditions.join(t("caseRequirements.axesSeparator")) });
    }
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

/**
 * 必要書類タブで、区分・事由が未選択のときに出す案内（Issue #402）。
 * - category：所属機関のカテゴリーの案内の文（「雇用・会社」タブへ移るボタンと並べる）。出さないときは null
 * - cause：取得の事由の案内（needsCause）を、別の文として出すか
 * 判定の軸を複数持つ規則集合（alsoBasis）では、カテゴリーが申請人ではなく所属機関の区分であることを補足する文にし、
 * 事由も未選択なら、案内を2つ並べずに1つの文にまとめる。alsoBasis を持たない規則集合は、従来の文のまま。
 */
export function selectionNotices(ev: {
  ruleSet: { alsoBasis?: readonly string[] } | null;
  needsCategory: boolean;
  categoryOutOfRange: boolean;
  needsCause: boolean;
}): { category: MessageKey | null; cause: boolean } {
  if (!ev.ruleSet) return { category: null, cause: false };
  const multi = (ev.ruleSet.alsoBasis?.length ?? 0) > 0;
  if (!ev.needsCategory) return { category: null, cause: ev.needsCause };
  if (ev.categoryOutOfRange) return { category: "caseRequirements.categoryOutOfRange", cause: ev.needsCause };
  if (!multi) return { category: "caseRequirements.needsCategory", cause: ev.needsCause };
  if (ev.needsCause) return { category: "caseRequirements.needsCategoryAndCause", cause: false };
  return { category: "caseRequirements.needsCategoryAxes", cause: false };
}
