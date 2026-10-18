import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { GIJINKOKU_ACQUISITION, GIJINKOKU_COE, type RuleSet } from "../lib/requirements/rules";
import { jaT, reasonText, selectionNotices, type T } from "../lib/i18n/caseRequirements";
import { translate } from "../lib/i18n/translate";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// Issue #402：判定の軸を複数持つ規則集合（RuleSet.alsoBasis）と、技人国の取得のカテゴリー別の書類（照合表 R-1）
type Cause = FormDetails["acquisitionCause"];

function make(cause: Cause, category: OrgCategory = "", over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType: "acquisition", currentStatus: "", targetStatus: "技術・人文知識・国際業務", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category }, formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause },
    requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [], ...over,
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
const shown = (e: ReturnType<typeof evaluate>) => e.items.map((i) => i.rule.id);

/** 試験用の小さな規則集合（取得の事由 × カテゴリー） */
const TOY: RuleSet = {
  id: "toy",
  title: "試験",
  procedureType: "acquisition",
  residenceStatus: "試験資格",
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  checkedAt: "2026-10-18",
  sources: [],
  rules: [
    { id: "both_all", name: "共通", party: "applicant", level: "required" },
    { id: "cause_other", name: "事由その他", party: "applicant", causes: ["other"], level: "required" },
    { id: "cat_34", name: "カテゴリー3・4", party: "organization", categories: ["3", "4"], level: "required" },
    { id: "other_and_4", name: "その他かつカテゴリー4", party: "organization", causes: ["other"], categories: ["4"], level: "check" },
    { id: "when_special", name: "納期の特例", party: "organization", categories: ["4"], level: "required", when: "withholdingSpecial" },
  ],
};
const toy = (cause: Cause, category: OrgCategory = "", withholdingSpecial = false) =>
  evaluate(make(cause, category, { targetStatus: "試験資格", employment: { ...EMPTY_EMPLOYMENT, category, withholdingSpecial } }), [TOY]);

describe("evaluate: 判定の軸を複数持つ規則集合（alsoBasis。Issue #402）", () => {
  it("全ての軸を選んだとき：宣言した全ての軸で一致した規則だけを適用し、他は不要", () => {
    const e = toy("other", "4", true);
    expect(e.needsCause).toBe(false);
    expect(e.needsCategory).toBe(false);
    expect(ids(e, "required")).toEqual(["both_all", "cause_other", "cat_34", "when_special"]);
    expect(ids(e, "check")).toEqual(["other_and_4"]);
    const e2 = toy("birth", "3");
    expect(ids(e2, "required")).toEqual(["both_all", "cat_34"]);
    expect(ids(e2, "not_required")).toEqual(["cause_other", "other_and_4", "when_special"]);
  });

  it("規則が軸の項目を省略したら、その軸の全ての値で適用する", () => {
    for (const cause of ["nationalityLoss", "birth", "other"] as const) {
      for (const category of ["1", "2", "3", "4"] as const) expect(ids(toy(cause, category), "required"), `${cause}/${category}`).toContain("both_all");
    }
  });

  it("不要の理由は、軸の並び（basis が先）で最初に一致しない軸の文。when の条件は従来の文", () => {
    const e = toy("birth", "1");
    const reason = (id: string) => e.items.find((i) => i.rule.id === id)!.reasonCode;
    expect(reason("cause_other")).toEqual({ kind: "causeNotRequired", cause: "birth" });
    expect(reason("cat_34")).toEqual({ kind: "categoryNotRequired", category: "1" });
    expect(reason("other_and_4")).toEqual({ kind: "causeNotRequired", cause: "birth" });
    expect(toy("other", "4", false).items.find((i) => i.rule.id === "when_special")!.reasonCode.kind).toBe("conditionNotMet");
  });

  it("カテゴリーが未選択：全カテゴリーに共通の規則だけを出し、needsCategory を立てる", () => {
    const e = toy("other");
    expect(e.needsCategory).toBe(true);
    expect(e.needsCause).toBe(false);
    expect(shown(e)).toEqual(["both_all", "cause_other"]);
  });

  it("事由が未選択：全事由に共通の規則だけを出し、needsCause を立てる", () => {
    const e = toy("", "4", true);
    expect(e.needsCause).toBe(true);
    expect(e.needsCategory).toBe(false);
    expect(shown(e)).toEqual(["both_all", "cat_34", "when_special"]);
  });

  it("両方が未選択：両方の旗を立て、どちらにも共通の規則だけを出す。理由は「全事由・全区分共通」", () => {
    const e = toy("");
    expect(e.needsCause).toBe(true);
    expect(e.needsCategory).toBe(true);
    expect(shown(e)).toEqual(["both_all"]);
    expect(e.items[0].reasonCode).toEqual({ kind: "axesLevel", level: "required" });
    expect(e.items[0].reason).toBe("全事由・全区分共通");
  });

  it("理由の文：選択済みの軸の値だけを並べる（日本語は reasonCode から組み立てたものと一致）", () => {
    const e = toy("other", "4", true);
    const r = (id: string) => e.items.find((i) => i.rule.id === id)!;
    expect(r("other_and_4").reason).toBe("取得の事由「その他」・カテゴリー4で要確認");
    expect(r("both_all").reason).toBe("取得の事由「その他」・カテゴリー4で必要");
    expect(toy("other").items[0].reason).toBe("取得の事由「その他」で必要");
    expect(toy("", "3").items[0].reason).toBe("カテゴリー3で必要");
    for (const cause of ["", "nationalityLoss", "birth", "other"] as const) {
      for (const category of ["", "1", "2", "3", "4"] as const) {
        for (const i of toy(cause, category, true).items) expect(i.reason).toBe(reasonText(jaT, i.reasonCode));
      }
    }
  });

  it("理由の文は、英語・韓国語でも組み立てられる（日本語のまま残らない）", () => {
    for (const lang of ["en", "ko"] as const) {
      const t: T = (key, params) => translate(lang, key, params);
      for (const code of toy("other", "4", true).items.map((i) => i.reasonCode).concat(toy("").items.map((i) => i.reasonCode))) {
        const text = reasonText(t, code);
        expect(text, JSON.stringify(code)).not.toMatch(/[ぁ-んァ-ン]/);
        expect(text).not.toContain("{");
      }
    }
  });

  it("入力済みのカテゴリーが区分の範囲にないときは、未入力と同じに扱う（categoryOutOfRange）", () => {
    const narrow: RuleSet = { ...TOY, categoryDefinition: { "1": "常勤", "2": "非常勤" } };
    const e = evaluate(make("other", "4", { targetStatus: "試験資格" }), [narrow]);
    expect(e.needsCategory).toBe(true);
    expect(e.categoryOutOfRange).toBe(true);
  });
});

describe("evaluate: 技人国の取得のカテゴリー別の書類（R-1。Issue #402）", () => {
  const gij = (cause: Cause, category: OrgCategory = "", over: Partial<CaseRecord> = {}) => evaluate(make(cause, category, over));
  const COMMON_REQUIRED_OTHER = ["application_form", "photo", "passport_presentation", "cause_proof", "activity_materials"];
  const COMMON_CHECK = ["passport_reason_statement", "agent_identity_document"];
  const C34_REQUIRED = ["activity_documents", "career_documents", "registry_certificate", "business_description", "financial_statements", "representative_declaration"];

  it("規則集合：basis は取得の事由、alsoBasis はカテゴリー。区分の定義は所属機関の区分（1〜4）", () => {
    expect(GIJINKOKU_ACQUISITION.basis).toBe("acquisitionCause");
    expect(GIJINKOKU_ACQUISITION.alsoBasis).toEqual(["category"]);
    expect(GIJINKOKU_ACQUISITION.categoryDefinition).toBeUndefined();
  });

  it("カテゴリー別の書類は、認定（GIJINKOKU_COE）と同じ割り当て（カテゴリー・区分・名称）。返信用封筒は写さない", () => {
    const coe = new Map(GIJINKOKU_COE.rules.map((r) => [r.id, r]));
    const categoryRules = GIJINKOKU_ACQUISITION.rules.filter((r) => r.categories !== undefined);
    expect(categoryRules.map((r) => r.id)).toEqual([
      "category_proof", "online_approval_proof", "vocational_school_certificate", "dispatch_documents", "activity_documents", "career_documents",
      "registry_certificate", "business_description", "financial_statements", "representative_declaration", "language_ability",
      "withholding_exemption", "payroll_office_notification", "withholding_tax_receipts", "withholding_special_approval",
    ]);
    for (const r of categoryRules) {
      const c = coe.get(r.id)!;
      expect(r.categories, r.id).toEqual(c.categories);
      expect(r.level, r.id).toBe(c.level);
      expect(r.name, r.id).toBe(c.name);
      expect(r.when, r.id).toBe(c.when);
      // カテゴリー別の書類は、事由を問わない
      expect(r.causes, r.id).toBeUndefined();
    }
    expect(GIJINKOKU_ACQUISITION.rules.some((r) => r.id === "return_envelope")).toBe(false);
    const rids = GIJINKOKU_ACQUISITION.rules.map((r) => r.id);
    expect(new Set(rids).size).toBe(rids.length);
  });

  it("【共通】６は未確認：学歴・職歴の書類の注記に「未確認」と書き、要確認の印（verify）を付ける", () => {
    const career = GIJINKOKU_ACQUISITION.rules.find((r) => r.id === "career_documents")!;
    expect(career.note).toContain("【共通】６");
    expect(career.note).toContain("未確認");
    expect(career.verify).toBe(true);
    // 専門士：認定のチェックシートとの食い違いの説明は、取得には合わないため外す
    const voc = GIJINKOKU_ACQUISITION.rules.find((r) => r.id === "vocational_school_certificate")!;
    expect(voc.note).not.toContain("チェックシート");
    expect(voc.verify).toBeUndefined();
  });

  it("カテゴリーが未選択の間は、従来どおり共通の書類だけ（カテゴリー別の書類のうち全カテゴリー共通の、専門士・派遣の要確認は出る）", () => {
    const e = gij("other");
    expect(e.needsCategory).toBe(true);
    expect(e.needsCause).toBe(false);
    expect(ids(e, "required")).toEqual(COMMON_REQUIRED_OTHER);
    expect(ids(e, "check")).toEqual([...COMMON_CHECK, "vocational_school_certificate", "dispatch_documents"]);
    expect(ids(e, "not_required")).toEqual(["nationality_proof"]);
  });

  it("カテゴリー1：カテゴリーの証明だけを足す。その他の資料は不要", () => {
    const e = gij("other", "1");
    expect(e.needsCategory).toBe(false);
    expect(ids(e, "required")).toEqual([...COMMON_REQUIRED_OTHER, "category_proof"]);
    expect(ids(e, "required")).not.toContain("registry_certificate");
  });

  it("カテゴリー2：カテゴリーの証明と、オンラインの承認（要確認）", () => {
    const e = gij("other", "2");
    expect(ids(e, "required")).toEqual([...COMMON_REQUIRED_OTHER, "category_proof"]);
    expect(ids(e, "check")).toEqual([...COMMON_CHECK, "online_approval_proof", "vocational_school_certificate", "dispatch_documents"]);
  });

  it("カテゴリー3：カテゴリーの証明と、カテゴリー3・4の資料。法定調書を出せない理由の資料は不要", () => {
    const e = gij("other", "3");
    expect(ids(e, "required")).toEqual([...COMMON_REQUIRED_OTHER, "category_proof", ...C34_REQUIRED]);
    expect(ids(e, "check")).toContain("language_ability");
    expect(ids(e, "not_required")).toEqual(expect.arrayContaining(["withholding_exemption", "payroll_office_notification", "withholding_tax_receipts"]));
  });

  it("カテゴリー4：カテゴリーの証明は出さず、法定調書を出せない理由の資料を出す。納期の特例は入力があるときだけ", () => {
    const e = gij("other", "4");
    expect(ids(e, "required")).toEqual([...COMMON_REQUIRED_OTHER, ...C34_REQUIRED, "payroll_office_notification", "withholding_tax_receipts"]);
    expect(ids(e, "not_required")).toEqual(["nationality_proof", "category_proof", "online_approval_proof", "withholding_special_approval"]);
    const special = gij("other", "4", { employment: { ...EMPTY_EMPLOYMENT, category: "4", withholdingSpecial: true } });
    expect(ids(special, "required")).toContain("withholding_special_approval");
  });

  it("事由も未選択：両方の旗を立て、事由・カテゴリーのどちらにも共通の書類だけ", () => {
    const e = gij("");
    expect(e.needsCause).toBe(true);
    expect(e.needsCategory).toBe(true);
    expect(ids(e, "required")).toEqual(["application_form", "passport_presentation"]);
    expect(ids(e, "check")).toEqual([...COMMON_CHECK, "vocational_school_certificate", "dispatch_documents"]);
  });

  it("事由は未選択でカテゴリーを選んだとき：カテゴリー別の書類は出る（事由を問わないため）", () => {
    const e = gij("", "3");
    expect(e.needsCause).toBe(true);
    expect(e.needsCategory).toBe(false);
    expect(ids(e, "required")).toEqual(["application_form", "passport_presentation", "category_proof", ...C34_REQUIRED]);
  });

  it("事由別の書類は、カテゴリーを選んでも従来どおり（出生は「その事由を証する書類」）", () => {
    expect(ids(gij("birth", "1"), "required")).toEqual(["application_form", "passport_presentation", "cause_proof", "category_proof"]);
    expect(ids(gij("nationalityLoss", "1"), "required")).toEqual(["application_form", "photo", "passport_presentation", "nationality_proof", "activity_materials", "category_proof"]);
  });
});

describe("必要書類タブの案内（selectionNotices。Issue #402）", () => {
  const gij = (cause: Cause, category: OrgCategory = "") => selectionNotices(evaluate(make(cause, category)));

  it("技人国の取得：カテゴリーだけ未選択なら、所属機関の区分であることを補足した文", () => {
    expect(gij("other")).toEqual({ category: "caseRequirements.needsCategoryAxes", cause: false });
  });

  it("技人国の取得：事由も未選択なら、案内を2つ並べず1つの文にまとめる", () => {
    expect(gij("")).toEqual({ category: "caseRequirements.needsCategoryAndCause", cause: false });
  });

  it("技人国の取得：カテゴリーを選び、事由だけ未選択なら、従来の事由の案内", () => {
    expect(gij("", "2")).toEqual({ category: null, cause: true });
    expect(gij("other", "2")).toEqual({ category: null, cause: false });
  });

  it("alsoBasis を持たない規則集合は従来どおり（カテゴリーの文・事由の文を別々に出す）", () => {
    expect(selectionNotices(evaluate(make("", "", { targetStatus: "留学" })))).toEqual({ category: null, cause: true });
    expect(selectionNotices(evaluate(make("", "", { procedureType: "renewal", currentStatus: "技術・人文知識・国際業務" })))).toEqual({
      category: "caseRequirements.needsCategory",
      cause: false,
    });
    expect(selectionNotices({ ruleSet: null, needsCategory: true, categoryOutOfRange: false, needsCause: true })).toEqual({ category: null, cause: false });
  });

  it("文言：区分は申請人ではなく所属機関の区分であることを書く（3言語）", () => {
    expect(translate("ja", "caseRequirements.needsCategoryAxes")).toContain("申請人ではなく所属機関");
    expect(translate("ja", "caseRequirements.needsCategoryAndCause")).toContain("申請人ではなく所属機関");
    expect(translate("en", "caseRequirements.needsCategoryAxes")).toContain("not of the applicant");
    expect(translate("ko", "caseRequirements.needsCategoryAxes")).toContain("신청인이 아니라");
  });
});
