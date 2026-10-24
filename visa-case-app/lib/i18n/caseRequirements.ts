import type { ApplicantIdentity, EijuuType, MedicalApplicantType, RenewalTimes, SchoolType, TeijushaType } from "@/lib/formDetails";
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
  | { kind: "identityNotRequired"; identity: ApplicantIdentity }
  | { kind: "teijushaTypeNotRequired"; type: TeijushaType }
  | { kind: "schoolTypeNotRequired"; schoolType: SchoolType }
  | { kind: "eijuuTypeNotRequired"; type: EijuuType }
  | { kind: "renewalTimesNotRequired"; times: RenewalTimes }
  /** 判定の軸を複数持つ規則集合（RuleSet.alsoBasis。Issue #402）。選択済みの軸の値だけを持つ。どれも持たなければ「全事由・全区分に共通」 */
  | { kind: "axesLevel"; level: RequirementRule["level"]; cause?: AcquisitionCause; category?: Category; type?: MedicalApplicantType; identity?: ApplicantIdentity; teijushaType?: TeijushaType; eijuuType?: EijuuType; renewalTimes?: RenewalTimes; schoolType?: SchoolType };

const APPLICANT_TYPE_KEYS: Record<MedicalApplicantType, MessageKey> = {
  doctor: "caseRequirements.applicantType_doctor",
  other: "caseRequirements.applicantType_other",
};

const IDENTITY_KEYS: Record<ApplicantIdentity, MessageKey> = {
  spouse: "caseRequirements.identity_spouse",
  child: "caseRequirements.identity_child",
};

const TEIJUSHA_TYPE_KEYS: Record<TeijushaType, MessageKey> = {
  nikkei3: "caseRequirements.teijushaType_nikkei3",
  nikkei2Spouse: "caseRequirements.teijushaType_nikkei2Spouse",
  nikkei3Spouse: "caseRequirements.teijushaType_nikkei3Spouse",
  childPermanent: "caseRequirements.teijushaType_childPermanent",
  childJapaneseSpouse: "caseRequirements.teijushaType_childJapaneseSpouse",
  childPermanentSpouse: "caseRequirements.teijushaType_childPermanentSpouse",
  adoptedJapanese: "caseRequirements.teijushaType_adoptedJapanese",
  adoptedPermanent: "caseRequirements.teijushaType_adoptedPermanent",
};

export const SCHOOL_TYPE_KEYS: Record<SchoolType, MessageKey> = {
  "univ-approved": "caseRequirements.schoolType_univApproved",
  "univ-nonapproved": "caseRequirements.schoolType_univNonapproved",
  "vocational-class1": "caseRequirements.schoolType_vocationalClass1",
  "vocational-class2": "caseRequirements.schoolType_vocationalClass2",
  "vocational-nonapproved": "caseRequirements.schoolType_vocationalNonapproved",
  "japanese-nonapproved": "caseRequirements.schoolType_japaneseNonapproved",
  "japanese-class1": "caseRequirements.schoolType_japaneseClass1",
  "japanese-class2": "caseRequirements.schoolType_japaneseClass2",
  "highschool-below": "caseRequirements.schoolType_highschoolBelow",
};

const EIJUU_TYPE_KEYS: Record<EijuuType, MessageKey> = {
  nihonjinSpouse: "caseRequirements.eijuuType_nihonjinSpouse",
  nihonjinChild: "caseRequirements.eijuuType_nihonjinChild",
  eijushaSpouse: "caseRequirements.eijuuType_eijushaSpouse",
  eijushaChild: "caseRequirements.eijuuType_eijushaChild",
};

const RENEWAL_TIMES_KEYS: Record<RenewalTimes, MessageKey> = {
  first: "caseRequirements.renewalTimes_first",
  second: "caseRequirements.renewalTimes_second",
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

/** 複数の軸の理由の文で、選択済みの軸の値を並べる（取得の事由・カテゴリー・申請人の区分・申請人の身分の順） */
function axesConditions(t: T, code: Extract<ReasonCode, { kind: "axesLevel" }>): string[] {
  const parts: string[] = [];
  if (code.cause) parts.push(t("caseRequirements.axisCause", { cause: t(CAUSE_KEYS[code.cause]) }));
  if (code.category) parts.push(t("caseRequirements.axisCategory", { category: code.category }));
  if (code.type) parts.push(t("caseRequirements.axisApplicantType", { type: t(APPLICANT_TYPE_KEYS[code.type]) }));
  if (code.identity) parts.push(t("caseRequirements.axisIdentity", { identity: t(IDENTITY_KEYS[code.identity]) }));
  if (code.teijushaType) parts.push(t("caseRequirements.axisTeijushaType", { type: t(TEIJUSHA_TYPE_KEYS[code.teijushaType]) }));
  if (code.schoolType) parts.push(t("caseRequirements.axisSchoolType", { type: t(SCHOOL_TYPE_KEYS[code.schoolType]) }));
  if (code.eijuuType) parts.push(t("caseRequirements.axisEijuuType", { type: t(EIJUU_TYPE_KEYS[code.eijuuType]) }));
  if (code.renewalTimes) parts.push(t("caseRequirements.axisRenewalTimes", { times: t(RENEWAL_TIMES_KEYS[code.renewalTimes]) }));
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
    case "identityNotRequired":
      return t("caseRequirements.reasonIdentityNotRequired", { identity: t(IDENTITY_KEYS[code.identity]) });
    case "teijushaTypeNotRequired":
      return t("caseRequirements.reasonTeijushaTypeNotRequired", { type: t(TEIJUSHA_TYPE_KEYS[code.type]) });
    case "schoolTypeNotRequired":
      return t("caseRequirements.reasonSchoolTypeNotRequired", { type: t(SCHOOL_TYPE_KEYS[code.schoolType]) });
    case "eijuuTypeNotRequired":
      return t("caseRequirements.reasonEijuuTypeNotRequired", { type: t(EIJUU_TYPE_KEYS[code.type]) });
    case "renewalTimesNotRequired":
      return t("caseRequirements.reasonRenewalTimesNotRequired", { times: t(RENEWAL_TIMES_KEYS[code.times]) });
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

/**
 * 医療の申請人の区分が未選択のときに出す案内の文。出さないときは null。
 * 区分を alsoBasis に持つ規則集合（医療の取得。acquisition-iryou-2026-10-19.md の R-1）では、未選択の間は区分に共通の書類だけを出すため、その旨の文にする。
 * basis が区分の規則集合（医療の認定・変更・更新）は、従来の文（区分で分かれる書類を要確認で出す）のまま。
 */
export function applicantTypeNotice(ev: { ruleSet: { alsoBasis?: readonly string[] } | null; needsApplicantType: boolean }): MessageKey | null {
  if (!ev.ruleSet || !ev.needsApplicantType) return null;
  return ev.ruleSet.alsoBasis?.includes("applicantType") ? "caseRequirements.needsApplicantTypeAxes" : "caseRequirements.needsApplicantType";
}

/** 日本人の配偶者等の申請人の身分が未選択のときに出す案内の文。出さないときは null（身分は alsoBasis の軸のため、未選択の間は身分に共通の書類だけを出す） */
export function identityNotice(ev: { ruleSet: { alsoBasis?: readonly string[] } | null; needsIdentity: boolean }): MessageKey | null {
  if (!ev.ruleSet || !ev.needsIdentity) return null;
  return "caseRequirements.needsIdentityAxes";
}

/**
 * 定住者の区分が未選択のときに出す案内の文。出さないときは null。
 * 区分を alsoBasis に持つ規則集合（定住者の取得。acquisition-teijusha-2026-10-24.md の TJ-1）では、未選択の間は区分に共通の書類だけを出す。
 */
export function teijushaTypeNotice(ev: { ruleSet: { alsoBasis?: readonly string[] } | null; needsTeijushaType: boolean }): MessageKey | null {
  if (!ev.ruleSet || !ev.needsTeijushaType) return null;
  return "caseRequirements.needsTeijushaTypeAxes";
}

/** 留学の入学先の種類が未選択のときに出す案内の文。出さないときは null */
export function schoolTypeNotice(ev: { ruleSet: unknown; needsSchoolType: boolean }): MessageKey | null {
  if (!ev.ruleSet || !ev.needsSchoolType) return null;
  return "caseRequirements.needsSchoolTypeAxes";
}

/**
 * 永住許可申請の提出書類一覧表の区分が未選択のときに出す案内の文。出さないときは null。
 * 区分は basis の軸のため、未選択の間は、区分に共通の書類だけを出す。
 */
export function eijuuTypeNotice(ev: { ruleSet: { basis?: string } | null; needsEijuuType: boolean }): MessageKey | null {
  if (!ev.ruleSet || !ev.needsEijuuType) return null;
  return "caseRequirements.needsEijuuTypeAxes";
}

/**
 * 定住者（日系3世）の更新が、初めてか2回目以降かが未選択のときに出す案内の文。出さないときは null。
 * 回数は alsoBasis の軸のため、未選択の間は、初めてと2回目以降に共通の書類だけを出す（Issue #420）。
 */
export function renewalTimesNotice(ev: { ruleSet: { alsoBasis?: readonly string[] } | null; needsRenewalTimes: boolean }): MessageKey | null {
  if (!ev.ruleSet || !ev.needsRenewalTimes) return null;
  return "caseRequirements.needsRenewalTimesAxes";
}
