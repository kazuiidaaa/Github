import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, normalizeFormDetails, type FormDetails } from "../lib/formDetails";
import { evaluate, hasRuleSetFor, ruleSetFor } from "../lib/requirements/evaluate";
import { KENKYU_CHANGE, RULE_SETS, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

// 特定活動の種別（Issue #305）。種別ごとの規則集合そのものは #299・#300 で作るため、ここでは試験用の規則集合で選択の仕組みを確かめる。
function make(status: string, tokuteiKatsudoType: FormDetails["tokuteiKatsudoType"] = "", procedureType = "change", currentStatus = status): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus,
    targetStatus: status,
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS, tokuteiKatsudoType },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  } as CaseRecord;
}

function testSet(subtype: NonNullable<RuleSet["subtype"]>): RuleSet {
  return {
    id: `test_${subtype}`,
    title: "試験用",
    procedureType: "change",
    residenceStatus: "特定活動",
    subtype,
    sources: [],
    checkedAt: "2026-01-01",
    rules: [{ id: `test_${subtype}_doc`, name: "試験書類", party: "applicant", categories: ["1", "2", "3", "4"], level: "required" }],
  };
}

describe("特定活動の種別：注意（needsSubtype）", () => {
  it("特定活動で種別が未選択なら true。規則集合がなくても出る", () => {
    const e = evaluate(make("特定活動"));
    expect(e.ruleSet).toBeNull();
    expect(e.needsSubtype).toBe(true);
  });

  it("種別が選択済みなら false（4種別とも）", () => {
    for (const v of ["tokuteiKenkyu", "tokuteiJoho", "daigakuSotsugyo", "other"] as const) {
      expect(evaluate(make("特定活動", v)).needsSubtype).toBe(false);
    }
  });

  it("特定活動以外の在留資格では、未選択でも false", () => {
    expect(evaluate(make("技能")).needsSubtype).toBe(false);
    expect(evaluate(make("研究")).needsSubtype).toBe(false);
    expect(evaluate(make("")).needsSubtype).toBe(false);
  });

  it("「特定活動（告示○号）」のような表記でも特定活動として扱う", () => {
    expect(evaluate(make("特定活動（告示46号）")).needsSubtype).toBe(true);
  });

  it("更新・その他は現在の在留資格、変更・認定・取得は変更後の在留資格で見る", () => {
    // 更新：現在の在留資格が特定活動
    expect(evaluate(make("技能", "", "renewal", "特定活動")).needsSubtype).toBe(true);
    // 変更：現在が特定活動でも、変更後が技能なら出さない
    expect(evaluate(make("技能", "", "change", "特定活動")).needsSubtype).toBe(false);
    // 変更：変更後が特定活動なら出す
    expect(evaluate(make("特定活動", "", "change", "留学")).needsSubtype).toBe(true);
  });

  it("特定活動から別の在留資格に変えた案件に残った種別は、判定にも注意にも使わない（値は消さない）", () => {
    const c = make("技能", "tokuteiKenkyu", "change", "特定活動");
    expect(evaluate(c).needsSubtype).toBe(false);
    expect(c.formDetails.tokuteiKatsudoType).toBe("tokuteiKenkyu");
    // 種別つきの規則集合が、残った種別で選ばれることもない
    expect(evaluate(make("技能", "tokuteiKenkyu"), [testSet("tokuteiKenkyu")]).ruleSet).toBeNull();
  });
});

describe("特定活動の種別：規則集合の選択", () => {
  const sets = [testSet("tokuteiKenkyu"), testSet("tokuteiJoho")];

  it("在留資格と種別の両方が合うときだけ選ばれる", () => {
    expect(evaluate(make("特定活動", "tokuteiKenkyu"), sets).ruleSet?.id).toBe("test_tokuteiKenkyu");
    expect(evaluate(make("特定活動", "tokuteiJoho"), sets).ruleSet?.id).toBe("test_tokuteiJoho");
    // 手続種別が違えば選ばれない
    expect(evaluate(make("特定活動", "tokuteiKenkyu", "renewal"), sets).ruleSet).toBeNull();
    // 在留資格が違えば選ばれない
    expect(evaluate(make("技能", "tokuteiKenkyu"), sets).ruleSet).toBeNull();
  });

  it("種別が未選択・その他・規則集合のない種別のときは、規則は未整備の案内になる", () => {
    for (const v of ["", "other", "daigakuSotsugyo"] as const) {
      const e = evaluate(make("特定活動", v), sets);
      expect(e.ruleSet).toBeNull();
      expect(e.notApplicableReason).toContain("規則は未整備");
    }
  });

  it("needsSubtype は種別が未選択のときだけ true（規則集合が選ばれていても）", () => {
    expect(evaluate(make("特定活動", ""), sets).needsSubtype).toBe(true);
    expect(evaluate(make("特定活動", "other"), sets).needsSubtype).toBe(false);
    const matched = evaluate(make("特定活動", "tokuteiKenkyu"), sets);
    expect(matched.ruleSet).not.toBeNull();
    expect(matched.needsSubtype).toBe(false);
  });

  it("ruleSetFor は種別を渡したときだけ種別の規則集合を返す。hasRuleSetFor は種別を見ない", () => {
    expect(ruleSetFor("change", "特定活動", sets, "tokuteiJoho")?.id).toBe("test_tokuteiJoho");
    expect(ruleSetFor("change", "特定活動", sets)).toBeNull();
    expect(ruleSetFor("change", "技能", sets, "tokuteiJoho")).toBeNull();
    expect(hasRuleSetFor("change", "特定活動", sets)).toBe(false);
  });
});

describe("既存の規則集合への影響がない", () => {
  it("RULE_SETS の種別つきの規則集合は、特定研究等活動（tokuteiKenkyu）・本邦大学卒業者（daigakuSotsugyo）・特定情報処理活動（tokuteiJoho）の認定・変更・更新・取得だけ（取得は Issue #420）", () => {
    const typed = RULE_SETS.filter((r) => r.subtype !== undefined);
    expect(typed.map((r) => `${r.subtype}:${r.procedureType}:${r.residenceStatus}`).sort()).toEqual([
      "daigakuSotsugyo:acquisition:特定活動",
      "daigakuSotsugyo:change:特定活動",
      "daigakuSotsugyo:coe:特定活動",
      "daigakuSotsugyo:renewal:特定活動",
      "tokuteiJoho:acquisition:特定活動",
      "tokuteiJoho:change:特定活動",
      "tokuteiJoho:coe:特定活動",
      "tokuteiJoho:renewal:特定活動",
      "tokuteiKenkyu:acquisition:特定活動",
      "tokuteiKenkyu:change:特定活動",
      "tokuteiKenkyu:coe:特定活動",
      "tokuteiKenkyu:renewal:特定活動",
    ]);
    // 種別つきの規則集合は、RULE_SETS の末尾にまとめる（ほかの規則集合の並びを変えない）
    const firstTyped = RULE_SETS.findIndex((r) => r.subtype !== undefined);
    expect(RULE_SETS.slice(firstTyped).every((r) => r.subtype !== undefined)).toBe(true);
  });

  it("本番の規則では、特定活動の案件は tokuteiKenkyu・daigakuSotsugyo・tokuteiJoho のときだけ規則集合に当たる。未選択・ほかの種別は当たらず、研究にも当たらない", () => {
    for (const v of ["", "other"] as const) {
      for (const proc of ["coe", "change", "renewal"]) {
        expect(evaluate(make("特定活動", v, proc)).ruleSet, `${v}/${proc}`).toBeNull();
      }
    }
    for (const type of ["tokuteiKenkyu", "daigakuSotsugyo", "tokuteiJoho"] as const) {
      for (const proc of ["coe", "change", "renewal"]) {
        const set = evaluate(make("特定活動", type, proc)).ruleSet;
        expect(set?.subtype, `${type}/${proc}`).toBe(type);
        expect(set?.procedureType, `${type}/${proc}`).toBe(proc);
      }
    }
  });

  it("研究の除外（特定活動）は変わらない：研究は研究のまま選ばれ、特定活動は特定研究等活動の規則集合に当たる", () => {
    expect(KENKYU_CHANGE.excludeStatuses).toContain("特定活動");
    expect(evaluate(make("研究")).ruleSet?.id).toBe(KENKYU_CHANGE.id);
    expect(evaluate(make("特定活動（研究活動等）", "tokuteiKenkyu")).ruleSet?.id).toBe("tokutei_kenkyu_change");
  });

  it("種別を持たない既存の規則集合は、種別の値に影響されない", () => {
    for (const v of ["", "tokuteiKenkyu", "other"] as const) {
      expect(evaluate(make("技能", v)).ruleSet?.id).toBe(evaluate(make("技能")).ruleSet?.id);
    }
  });
});

describe("normalizeFormDetails：特定活動の種別", () => {
  it("種別のない既存データは未選択（空）で読み込まれ、エラーにならない", () => {
    expect(normalizeFormDetails({}).tokuteiKatsudoType).toBe("");
    expect(normalizeFormDetails(null).tokuteiKatsudoType).toBe("");
    expect(normalizeFormDetails({ placeOfBirth: "x" }).tokuteiKatsudoType).toBe("");
  });

  it("正しい値は保たれ、不正な値は未選択に直す", () => {
    expect(normalizeFormDetails({ tokuteiKatsudoType: "tokuteiJoho" }).tokuteiKatsudoType).toBe("tokuteiJoho");
    expect(normalizeFormDetails({ tokuteiKatsudoType: "bogus" }).tokuteiKatsudoType).toBe("");
    expect(normalizeFormDetails({ tokuteiKatsudoType: 3 }).tokuteiKatsudoType).toBe("");
  });
});
