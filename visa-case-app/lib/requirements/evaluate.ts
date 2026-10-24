import { APPLICANT_IDENTITIES, MEDICAL_APPLICANT_TYPES, TEIJUSHA_TYPES, type FormDetails } from "../formDetails";
import { PROCEDURE_TYPES, type CaseRecord, type RequirementState } from "../types";
import { evidenceNumbers, resolveHspPointSheet } from "../hspPoints";
import { jaT, reasonText, type ReasonCode } from "../i18n/caseRequirements";
import { isCollected } from "./progress";
import {
  ACQUISITION_CAUSE_LABELS,
  RULE_SETS,
  categoryRangeOf,
  hspEvidenceRule,
  type AcquisitionCause,
  type ApplicantIdentity,
  type Category,
  type MedicalApplicantType,
  type RequirementRule,
  type RuleAxis,
  type RuleSet,
  type TeijushaType,
} from "./rules";

/** required：必要、not_required：不要、check：要確認、optional：任意（不足にも要確認にも数えない） */
export type Result = "required" | "not_required" | "check" | "optional";

export interface EvaluatedItem {
  rule: RequirementRule;
  /** 規則による判定 */
  result: Result;
  /** 行政書士の上書きを反映した判定 */
  effective: Result;
  reason: string;
  /** reason の元。画面で、表示言語に合わせて組み立て直すために持つ */
  reasonCode: ReasonCode;
  state: RequirementState;
}

export interface Evaluation {
  ruleSet: RuleSet | null;
  notApplicableReason?: string;
  /** カテゴリー未入力のため、共通の書類のみを判定している */
  needsCategory: boolean;
  /** 入力済みのカテゴリーが、この規則集合の区分の範囲にない（needsCategory も true になる）。範囲内の区分を、画面に案内する */
  categoryOutOfRange: boolean;
  /** 取得の事由が未選択のため、全事由に共通の書類のみを判定している（取得許可申請のみ） */
  needsCause: boolean;
  /** 在留資格が特定活動で、種別が未選択（種別ごとの書類は判定できない）。特定活動以外の在留資格では常に false */
  needsSubtype: boolean;
  /** 在留資格「医療」の申請人の区分が未選択のため、区分で要否が分かれる書類を要確認で表示している（basis が applicantType の規則集合のみ） */
  needsApplicantType: boolean;
  /** 在留資格「日本人の配偶者等」の申請人の身分が未選択のため、身分に共通の書類だけを判定している（alsoBasis に identity を持つ規則集合のみ） */
  needsIdentity: boolean;
  /** 在留資格「定住者」の区分が未選択のため、区分に共通の書類だけを表示している（alsoBasis に teijushaType を持つ規則集合のみ） */
  needsTeijushaType: boolean;
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

/** 在留資格が特定活動か（「特定活動（告示○号）」などの表記を含む） */
export function isTokuteiKatsudo(residenceStatus: string): boolean {
  return normalize(residenceStatus).includes("特定活動");
}

/**
 * 規則を引くための特定活動の種別。在留資格が特定活動のときだけ保存済みの値を使う。
 * 特定活動から別の在留資格に変えた案件に値が残っていても、判定にも画面にも使わない（値は消さずに無視する）
 */
export function tokuteiSubtypeOf(residenceStatus: string, stored: FormDetails["tokuteiKatsudoType"]): FormDetails["tokuteiKatsudoType"] {
  return isTokuteiKatsudo(residenceStatus) ? stored : "";
}

function matchRuleSet(procedureType: string, residenceStatus: string, ruleSets: RuleSet[], subtype: FormDetails["tokuteiKatsudoType"] = ""): RuleSet | null {
  const status = normalize(residenceStatus);
  // 在留資格に固有の規則を先に引く（取得許可申請の高度専門職。号による除外は excludeStatuses）
  const specific =
    status === ""
      ? undefined
      : ruleSets.find(
          (r) =>
            r.procedureType === procedureType &&
            !r.anyResidenceStatus &&
            // 種別を持つ規則集合は、在留資格と種別の両方が合うときだけ選ぶ（持たない規則集合は種別を見ない）
            (r.subtype === undefined || (subtype !== "" && r.subtype === subtype)) &&
            status.includes(normalize(r.residenceStatus)) &&
            !r.excludeStatuses?.some((x) => status.includes(normalize(x))),
        );
  if (specific) return specific;
  // 在留資格によらず手続種別だけで適用する規則（取得許可申請）。在留資格が空でも一致する
  return ruleSets.find((r) => r.procedureType === procedureType && r.anyResidenceStatus) ?? null;
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

/** 案件から、規則を引くための在留資格を決める */
function statusOfCase(c: CaseRecord): string {
  // 下書きの入力は正式なデータではないため、確認済みの場合のみ優先する
  const confirmed = c.applicant.confirmationStatus === "confirmed";
  return statusForRules(c.procedureType, {
    currentStatus: c.currentStatus,
    targetStatus: c.targetStatus,
    confirmedResidenceStatus: confirmed ? c.applicant.residenceStatus : "",
  });
}

function findRuleSet(c: CaseRecord, ruleSets: RuleSet[]): RuleSet | null {
  const status = statusOfCase(c);
  return matchRuleSet(c.procedureType, status, ruleSets, tokuteiSubtypeOf(status, c.formDetails.tokuteiKatsudoType));
}

/**
 * 高度専門職：ポイント計算表で選んだ項目から導く、疎明資料の番号ごとの必要書類（Issue #186）。
 * 使うシートが決まらない間、または項目を選んでいない間は、出さない（親の「疎明資料」1件のみ）。
 */
function hspEvidenceItems(c: CaseRecord, ruleSet: RuleSet): EvaluatedItem[] {
  if (!ruleSet.id.startsWith("hsp_")) return [];
  const resolution = resolveHspPointSheet(statusOfCase(c), c.formDetails.hspPointSheet);
  if (resolution.kind !== "resolved") return [];
  return evidenceNumbers(resolution.sheet, c.formDetails.hspPointChecks).map((mark) => {
    const rule = hspEvidenceRule(mark);
    const state = c.requirementStates[rule.id] ?? NO_STATE;
    const reasonCode: ReasonCode = { kind: "hspMark", mark };
    return { rule, result: rule.level, effective: state.override ?? rule.level, reason: reasonText(jaT, reasonCode), reasonCode, state };
  });
}

/** 規則の1件を、判定結果に足す。疎明資料の親は、番号ごとの項目が出ているとき、入力済みの状態がなければ隠す（重複するため） */
function pushItem(items: EvaluatedItem[], c: CaseRecord, ruleSet: RuleSet, item: EvaluatedItem): void {
  const evidence = item.rule.id === "hsp_point_evidence" ? hspEvidenceItems(c, ruleSet) : [];
  const { state } = item;
  // 親に入力済みの状態（受領・期限・判断・メモ）があれば残す
  const untouched = state.status === "not_received" && !state.override && !state.dueDate && !state.note;
  if (!(evidence.length > 0 && untouched)) items.push(item);
  items.push(...evidence);
}

/** 手続種別と在留資格（文字列）から、対応する規則集合を返す（なければ null）。カテゴリー区分の定義を引くために使う */
export function ruleSetFor(procedureType: string, residenceStatus: string, ruleSets: RuleSet[] = RULE_SETS, subtype: FormDetails["tokuteiKatsudoType"] = ""): RuleSet | null {
  return matchRuleSet(procedureType, residenceStatus, ruleSets, tokuteiSubtypeOf(residenceStatus, subtype));
}

/** 案件に対応する規則集合を返す（なければ null） */
export function ruleSetOfCase(c: CaseRecord, ruleSets: RuleSet[] = RULE_SETS): RuleSet | null {
  return findRuleSet(c, ruleSets);
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

/** 案内文に並べる、対応済みの手続と在留資格の組み合わせ。特定活動のように種別ごとに規則集合がある在留資格は、種別を1件にまとめる */
export interface SupportedEntry {
  procedureLabel: string;
  /** 在留資格を問わない規則集合は null */
  status: string | null;
  /** 種別つきの規則集合の種別（RULE_SETS の並び順）。種別を持たない組み合わせは空 */
  subtypes: NonNullable<RuleSet["subtype"]>[];
}

export function supportedEntries(ruleSets: RuleSet[] = RULE_SETS): SupportedEntry[] {
  const entries: SupportedEntry[] = [];
  for (const r of ruleSets) {
    const procedureLabel = PROCEDURE_TYPES.find((p) => p.value === r.procedureType)?.label ?? r.procedureType;
    const status = r.anyResidenceStatus ? null : r.residenceStatus;
    const found = r.subtype ? entries.find((e) => e.status === status && e.procedureLabel === procedureLabel && e.subtypes.length > 0) : undefined;
    if (found) {
      if (r.subtype && !found.subtypes.includes(r.subtype)) found.subtypes.push(r.subtype);
    } else {
      entries.push({ procedureLabel, status, subtypes: r.subtype ? [r.subtype] : [] });
    }
  }
  return entries;
}

/** 規則が未整備の手続・在留資格に対する案内文。対応する組み合わせは RULE_SETS から生成する（特定活動は、対応済みの種別を括弧内に示す） */
export function notApplicableMessage(): string {
  const supported = supportedEntries()
    .map((e) => {
      if (e.status === null) return `在留資格を問わない「${e.procedureLabel}」`;
      const subtypes = e.subtypes.map((s) => jaT(`caseRequirements.subtype_${s}`)).join("・");
      return `「${subtypes ? `${e.status}（${subtypes}）` : e.status}」の「${e.procedureLabel}」`;
    })
    .join("、");
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
    categoryOutOfRange: false,
    needsCause: false,
    needsSubtype: false,
    needsApplicantType: false,
    needsIdentity: false,
    needsTeijushaType: false,
    items: [],
    missing: [],
    toCheck: [],
    requiredCount: 0,
    receivedCount: 0,
  };
  const ruleSet = findRuleSet(c, ruleSets);
  // 特定活動で種別が未選択のとき、要確認の注意を出す（規則集合の有無によらない）
  const status = statusOfCase(c);
  const needsSubtype = isTokuteiKatsudo(status) && tokuteiSubtypeOf(status, c.formDetails.tokuteiKatsudoType) === "";
  if (!ruleSet) {
    return {
      ...empty,
      needsSubtype,
      notApplicableReason: notApplicableMessage(),
    };
  }

  // 判定の軸を複数持つ規則集合（Issue #402）。alsoBasis を持たない規則集合は、下の従来の分岐で判定する（結果を変えない）
  // 日本人の配偶者等の認定・変更・更新は基準が申請人の身分だけ（basis: identity）。同じ仕組みで判定する
  if ((ruleSet.alsoBasis && ruleSet.alsoBasis.length > 0) || ruleSet.basis === "identity") {
    return { ...evaluateByAxes(c, ruleSet), needsSubtype };
  }

  const items: EvaluatedItem[] = [];

  // 申請人の区分（医療）で判定する規則集合は、所属機関のカテゴリーに依存しない（「カテゴリー未入力」の注意も出さない）
  if (ruleSet.basis === "applicantType") {
    const type = c.formDetails.medicalApplicantType;
    const needsApplicantType = type === "";
    for (const rule of ruleSet.rules) {
      const types = rule.applicantTypes ?? MEDICAL_APPLICANT_TYPES;
      const common = types.length === MEDICAL_APPLICANT_TYPES.length;
      let result: Result;
      let reasonCode: ReasonCode;
      if (needsApplicantType) {
        // 区分が未選択の間は、全区分に共通の書類は規則どおり、区分で分かれる書類は要確認（これまでと同じ表示）
        result = common ? rule.level : "check";
        reasonCode = common ? { kind: "applicantTypeCommon" } : { kind: "applicantTypeUnknown" };
      } else if (!types.includes(type)) {
        result = "not_required";
        reasonCode = { kind: "applicantTypeNotRequired", type };
      } else {
        result = rule.level;
        reasonCode = common ? { kind: "applicantTypeCommon" } : { kind: "applicantTypeLevel", type, level: rule.level };
      }
      const state = c.requirementStates[rule.id] ?? NO_STATE;
      pushItem(items, c, ruleSet, { rule, result, effective: state.override ?? result, reason: reasonText(jaT, reasonCode), reasonCode, state });
    }
    return { ...summarize(ruleSet, false, false, false, items), needsSubtype, needsApplicantType };
  }

  // 取得の事由で判定する規則集合は、所属機関のカテゴリーに依存しない
  if (ruleSet.basis === "acquisitionCause") {
    const cause = c.formDetails.acquisitionCause;
    const needsCause = cause === "";
    for (const rule of ruleSet.rules) {
      const causes = rule.causes ?? [];
      // 事由が未選択の間は、全事由に共通の書類のみ判定する
      if (needsCause && causes.length < Object.keys(ACQUISITION_CAUSE_LABELS).length) continue;
      let result: Result;
      let reasonCode: ReasonCode;
      if (!needsCause && !causes.includes(cause)) {
        result = "not_required";
        reasonCode = { kind: "causeNotRequired", cause };
      } else {
        result = rule.level;
        reasonCode = needsCause ? { kind: "causeCommon" } : { kind: "causeLevel", cause, level: rule.level };
      }
      const state = c.requirementStates[rule.id] ?? NO_STATE;
      pushItem(items, c, ruleSet, { rule, result, effective: state.override ?? result, reason: reasonText(jaT, reasonCode), reasonCode, state });
    }
    return { ...summarize(ruleSet, false, false, needsCause, items), needsSubtype };
  }

  // 入力済みのカテゴリーが、この規則集合の区分の範囲にない（別の在留資格のときに選んだ値など）ときは、未入力と同じに扱う
  const range = categoryRangeOf(ruleSet);
  const entered = c.employment.category;
  const category: Category | "" = entered !== "" && range.includes(entered) ? entered : "";
  const categoryOutOfRange = entered !== "" && category === "";
  const needsCategory = category === "";

  for (const rule of ruleSet.rules) {
    // カテゴリー未入力の間は、全カテゴリーに共通の書類のみ判定する
    const categories = rule.categories ?? [];
    if (needsCategory && !range.every((k) => categories.includes(k))) continue;

    let result: Result;
    let reasonCode: ReasonCode;
    if (!needsCategory && !categories.includes(category)) {
      result = "not_required";
      reasonCode = { kind: "categoryNotRequired", category };
    } else if (rule.when && !c.employment[rule.when]) {
      result = "not_required";
      reasonCode = { kind: "conditionNotMet", note: rule.note };
    } else {
      result = rule.level;
      reasonCode = needsCategory ? { kind: "categoryCommon" } : { kind: "categoryLevel", category, level: rule.level };
    }
    const reason = reasonText(jaT, reasonCode);

    const state = c.requirementStates[rule.id] ?? NO_STATE;
    pushItem(items, c, ruleSet, { rule, result, effective: state.override ?? result, reason, reasonCode, state });
  }

  return { ...summarize(ruleSet, needsCategory, categoryOutOfRange, false, items), needsSubtype };
}

const ALL_CAUSES = Object.keys(ACQUISITION_CAUSE_LABELS) as AcquisitionCause[];

/**
 * 判定の軸を複数持つ規則集合（basis ＋ alsoBasis）の判定（Issue #402）。
 * - 規則は、宣言した全ての軸で案件の値と一致したときだけ適用する。規則が軸の項目を省略したら、その軸の全ての値で適用する。
 * - 未選択の軸があるときは、その軸の全ての値に共通の規則だけを出し、軸ごとの注意（needsCategory・needsCause・needsApplicantType・needsIdentity）を立てる。
 * - 一致しない軸があれば「不要」。理由は、軸の並び（basis が先）で最初に一致しなかった軸の文にする（従来の文を使う）。
 */
function evaluateByAxes(c: CaseRecord, ruleSet: RuleSet): Evaluation {
  const axes = [ruleSet.basis ?? "category", ...(ruleSet.alsoBasis ?? [])].filter((a, i, all) => all.indexOf(a) === i) as RuleAxis[];
  const has = (axis: RuleAxis) => axes.includes(axis);

  // 入力済みのカテゴリーが、この規則集合の区分の範囲にないときは、未入力と同じに扱う（従来のカテゴリーの判定と同じ）
  const range = categoryRangeOf(ruleSet);
  const entered = c.employment.category;
  const category: Category | "" = entered !== "" && range.includes(entered) ? entered : "";
  const cause: AcquisitionCause | "" = c.formDetails.acquisitionCause;
  const type: MedicalApplicantType | "" = c.formDetails.medicalApplicantType;
  const identity: ApplicantIdentity | "" = c.formDetails.applicantIdentity;
  const teijushaType: TeijushaType | "" = c.formDetails.teijushaType;

  const needsCategory = has("category") && category === "";
  const categoryOutOfRange = has("category") && entered !== "" && category === "";
  const needsCause = has("acquisitionCause") && cause === "";
  const needsApplicantType = has("applicantType") && type === "";
  const needsIdentity = has("identity") && identity === "";
  const needsTeijushaType = has("teijushaType") && teijushaType === "";

  const items: EvaluatedItem[] = [];
  for (const rule of ruleSet.rules) {
    const categories = rule.categories ?? range;
    const causes = rule.causes ?? ALL_CAUSES;
    const types = rule.applicantTypes ?? MEDICAL_APPLICANT_TYPES;
    const identities = rule.identities ?? APPLICANT_IDENTITIES;
    const teijushaTypes = rule.teijushaTypes ?? TEIJUSHA_TYPES;
    // 未選択の軸では、全ての値に共通の規則だけを出す
    if (needsCategory && !range.every((k) => categories.includes(k))) continue;
    if (needsCause && !ALL_CAUSES.every((k) => causes.includes(k))) continue;
    if (needsApplicantType && !MEDICAL_APPLICANT_TYPES.every((k) => types.includes(k))) continue;
    if (needsIdentity && !APPLICANT_IDENTITIES.every((k) => identities.includes(k))) continue;
    if (needsTeijushaType && !TEIJUSHA_TYPES.every((k) => teijushaTypes.includes(k))) continue;

    // 軸の並びで、最初に一致しない軸の「原則不要」の理由
    let notRequired: ReasonCode | undefined;
    for (const axis of axes) {
      if (axis === "category" && category !== "" && !categories.includes(category)) notRequired = { kind: "categoryNotRequired", category };
      else if (axis === "acquisitionCause" && cause !== "" && !causes.includes(cause)) notRequired = { kind: "causeNotRequired", cause };
      else if (axis === "applicantType" && type !== "" && !types.includes(type)) notRequired = { kind: "applicantTypeNotRequired", type };
      else if (axis === "identity" && identity !== "" && !identities.includes(identity)) notRequired = { kind: "identityNotRequired", identity };
      else if (axis === "teijushaType" && teijushaType !== "" && !teijushaTypes.includes(teijushaType)) notRequired = { kind: "teijushaTypeNotRequired", type: teijushaType };
      if (notRequired) break;
    }

    let result: Result;
    let reasonCode: ReasonCode;
    if (notRequired) {
      result = "not_required";
      reasonCode = notRequired;
    } else if (rule.when && !c.employment[rule.when]) {
      result = "not_required";
      reasonCode = { kind: "conditionNotMet", note: rule.note };
    } else {
      result = rule.level;
      // 選択済みの軸の値だけを、理由の文に入れる（全て未選択なら「共通」）
      reasonCode = {
        kind: "axesLevel",
        level: rule.level,
        ...(has("acquisitionCause") && cause !== "" ? { cause } : {}),
        ...(has("category") && category !== "" ? { category } : {}),
        ...(has("applicantType") && type !== "" ? { type } : {}),
        ...(has("identity") && identity !== "" ? { identity } : {}),
        ...(has("teijushaType") && teijushaType !== "" ? { teijushaType } : {}),
      };
    }
    const state = c.requirementStates[rule.id] ?? NO_STATE;
    pushItem(items, c, ruleSet, { rule, result, effective: state.override ?? result, reason: reasonText(jaT, reasonCode), reasonCode, state });
  }
  return { ...summarize(ruleSet, needsCategory, categoryOutOfRange, needsCause, items), needsApplicantType, needsIdentity, needsTeijushaType };
}

function summarize(ruleSet: RuleSet, needsCategory: boolean, categoryOutOfRange: boolean, needsCause: boolean, items: EvaluatedItem[]): Evaluation {
  const required = items.filter((i) => i.effective === "required");
  return {
    ruleSet,
    needsCategory,
    categoryOutOfRange,
    needsCause,
    needsSubtype: false,
    needsApplicantType: false,
    needsIdentity: false,
    needsTeijushaType: false,
    items,
    missing: required.filter((i) => !isCollected(i.state.status)),
    toCheck: items.filter((i) => i.effective === "check" && !isCollected(i.state.status)),
    requiredCount: required.length,
    receivedCount: required.filter((i) => isCollected(i.state.status)).length,
  };
}
