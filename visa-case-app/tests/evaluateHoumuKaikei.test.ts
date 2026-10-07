import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { HOUMU_KAIKEI_CHANGE, HOUMU_KAIKEI_COE, HOUMU_KAIKEI_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「法律・会計業務」（Issue #301）。入管庁の案内ページに所属機関のカテゴリー区分がないため、全書類が全カテゴリー共通。
function make(procedureType: string, category: OrgCategory = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus: "法律・会計業務",
    targetStatus: "法律・会計業務",
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

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);

describe("法律・会計業務の規則集合", () => {
  it("認定・変更・更新が登録され、在留資格「法律・会計業務」で引ける", () => {
    for (const [rs, type] of [
      [HOUMU_KAIKEI_RENEWAL, "renewal"],
      [HOUMU_KAIKEI_CHANGE, "change"],
      [HOUMU_KAIKEI_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
  });

  it("全書類が全カテゴリー共通で、カテゴリー未入力でも1〜4でも同じ書類を判定する", () => {
    for (const rs of [HOUMU_KAIKEI_RENEWAL, HOUMU_KAIKEI_CHANGE, HOUMU_KAIKEI_COE]) {
      expect(rs.rules.every((r) => r.categories?.length === 4), rs.id).toBe(true);
      const all = evaluate(make(rs.procedureType)).items.map((i) => i.rule.id);
      expect(all, rs.id).toHaveLength(rs.rules.length);
      for (const c of ["1", "2", "3", "4"] as const) {
        expect(evaluate(make(rs.procedureType, c)).items.map((i) => i.rule.id), `${rs.id}:${c}`).toEqual(all);
      }
    }
  });

  it("認定：申請書・写真・返信用封筒・日本の資格の証明が必要。旅券・在留カードの提示は不要", () => {
    const e = evaluate(make("coe"));
    expect(ids(e, "required")).toEqual(expect.arrayContaining(["application_form", "photo", "return_envelope", "legal_accounting_license"]));
    expect(e.items.some((i) => i.rule.id === "passport_card")).toBe(false);
  });

  it("変更：日本の資格の証明が必要で、返信用封筒は不要。在留カードの提示が加わる", () => {
    const e = evaluate(make("change"));
    expect(ids(e, "required")).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card", "legal_accounting_license"]));
    expect(e.items.some((i) => i.rule.id === "return_envelope")).toBe(false);
  });

  it("更新：共通書類のみ（日本の資格の証明は、案内ページに記載がない）", () => {
    expect(evaluate(make("renewal")).items.map((i) => i.rule.id)).toEqual(["application_form", "photo", "passport_card"]);
  });

  it("出典は入管庁の法律・会計業務の案内ページ", () => {
    for (const rs of [HOUMU_KAIKEI_RENEWAL, HOUMU_KAIKEI_CHANGE, HOUMU_KAIKEI_COE]) {
      expect(rs.sources.map((s) => s.url)).toContain("https://www.moj.go.jp/isa/applications/status/legalaccountingservices.html");
    }
  });
});
