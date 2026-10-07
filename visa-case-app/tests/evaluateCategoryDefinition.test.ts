import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { categoryOptions } from "../lib/i18n/caseNew";
import { jaT } from "../lib/i18n/jaT";
import { evaluate } from "../lib/requirements/evaluate";
import { CATEGORY_LABELS, categoryLabelsOf, categoryRangeOf, procedureCommonRules, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 区分が1〜2だけの規則集合（教授のように、在留資格によって区分の範囲・意味が違う場合）の試験用
const TWO: RuleSet = {
  id: "test_two",
  title: "試験用",
  procedureType: "change",
  residenceStatus: "試験在留資格",
  checkedAt: "2026-10-07",
  sources: [],
  categoryDefinition: { "1": "常勤", "2": "非常勤" },
  rules: [
    ...procedureCommonRules("change"),
    { id: "part_time_proof", name: "非常勤の証明", party: "organization", categories: ["2"], level: "required" },
    { id: "all_range", name: "1〜2の共通書類", party: "organization", categories: ["1", "2"], level: "required" },
  ],
};

function make(category: OrgCategory): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "change",
    currentStatus: "",
    targetStatus: "試験在留資格",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  } as CaseRecord;
}

const ev = (c: CaseRecord) => evaluate(c, [TWO]);
const effective = (e: ReturnType<typeof evaluate>, id: string) => e.items.find((i) => i.rule.id === id)?.effective;

describe("規則集合のカテゴリー区分の定義", () => {
  it("定義がなければ、既定の1〜4", () => {
    expect(categoryLabelsOf(null)).toBe(CATEGORY_LABELS);
    expect(categoryRangeOf({})).toEqual(["1", "2", "3", "4"]);
  });

  it("定義があれば、その範囲と意味になる", () => {
    expect(categoryRangeOf(TWO)).toEqual(["1", "2"]);
    expect(categoryLabelsOf(TWO)["2"]).toBe("非常勤");
  });

  it("範囲内のカテゴリーで判定する", () => {
    const e1 = ev(make("1"));
    expect(effective(e1, "part_time_proof")).toBe("not_required");
    expect(effective(e1, "all_range")).toBe("required");
    expect(e1.needsCategory).toBe(false);
    expect(effective(ev(make("2")), "part_time_proof")).toBe("required");
  });

  it("未入力のときは、範囲（1〜2）の全区分に共通の書類だけを出す（4区分でなくても共通とみなす）", () => {
    const e = ev(make(""));
    expect(e.needsCategory).toBe(true);
    expect(e.categoryOutOfRange).toBe(false);
    expect(e.items.map((i) => i.rule.id)).toContain("all_range");
    expect(e.items.map((i) => i.rule.id)).not.toContain("part_time_proof");
  });

  it("範囲外のカテゴリー（3・4）は、未入力と同じに扱い、範囲外であることを示す", () => {
    for (const c of ["3", "4"] as const) {
      const e = ev(make(c));
      expect(e.needsCategory).toBe(true);
      expect(e.categoryOutOfRange).toBe(true);
      expect(e.items.map((i) => i.rule.id)).not.toContain("part_time_proof");
    }
  });

  it("定義のない既存の規則集合は、これまでどおり1〜4で判定する", () => {
    const e = evaluate({ ...make("4"), currentStatus: "技術・人文知識・国際業務", targetStatus: "技術・人文知識・国際業務" });
    expect(e.categoryOutOfRange).toBe(false);
    expect(e.needsCategory).toBe(false);
  });

  it("選択肢は、定義があればその範囲・意味、なければ既定の1〜4", () => {
    expect(categoryOptions(jaT, "ja", TWO)).toEqual([
      { value: "1", label: "常勤" },
      { value: "2", label: "非常勤" },
    ]);
    expect(categoryOptions(jaT, "ja", null).map((o) => o.value)).toEqual(["1", "2", "3", "4"]);
    expect(categoryOptions(jaT, "ja", null)[0].label).toBe(CATEGORY_LABELS["1"]);
  });
});
