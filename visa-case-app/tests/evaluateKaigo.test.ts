import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { KAIGO_CHANGE, KAIGO_COE, KAIGO_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「介護」（Issue #297）。入管庁の案内ページに所属機関のカテゴリー区分がないため、全書類が全カテゴリー共通。
function make(procedureType: string, status = "介護", category: OrgCategory = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus: status,
    targetStatus: status,
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

describe("介護の規則集合", () => {
  it("認定・変更・更新が登録され、在留資格「介護」で引ける", () => {
    for (const [rs, type] of [
      [KAIGO_RENEWAL, "renewal"],
      [KAIGO_CHANGE, "change"],
      [KAIGO_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
  });

  it("特定技能は、介護の規則に当たらない", () => {
    expect(evaluate(make("coe", "特定技能")).ruleSet?.id).not.toBe("kaigo_coe");
  });

  it("全書類が全カテゴリー共通で、カテゴリー未入力でも、カテゴリー1〜4でも同じ書類を判定する", () => {
    for (const rs of [KAIGO_RENEWAL, KAIGO_CHANGE, KAIGO_COE]) {
      expect(rs.rules.every((r) => r.categories?.length === 4), rs.id).toBe(true);
      const all = evaluate(make(rs.procedureType)).items.map((i) => i.rule.id);
      expect(all, rs.id).toHaveLength(rs.rules.length);
      for (const c of ["1", "2", "3", "4"] as const) {
        expect(evaluate(make(rs.procedureType, "介護", c)).items.map((i) => i.rule.id), `${rs.id}:${c}`).toEqual(all);
      }
    }
  });

  it("認定：介護福祉士登録証・労働条件の文書・所属機関の概要・代表者申告書・返信用封筒が必要", () => {
    const e = evaluate(make("coe"));
    expect(ids(e, "required")).toEqual(
      expect.arrayContaining([
        "application_form", "photo", "return_envelope", "care_worker_registration", "working_conditions_document",
        "organization_overview", "representative_declaration",
      ]),
    );
    expect(ids(e, "check")).toEqual(expect.arrayContaining(["dispatch_documents", "skill_transfer_declaration"]));
    expect(e.items.some((i) => i.rule.id === "passport_card")).toBe(false);
  });

  it("変更：認定と同じ書類のうち、返信用封筒を除き、在留カードの提示が加わる", () => {
    const e = evaluate(make("change"));
    expect(ids(e, "required")).toEqual(expect.arrayContaining(["passport_card", "care_worker_registration", "working_conditions_document"]));
    expect(e.items.some((i) => i.rule.id === "return_envelope")).toBe(false);
  });

  it("更新：代表者申告書と住民税の証明書が必要。労働条件の文書・機関の概要は、転職後の初回のみ（要確認）", () => {
    const e = evaluate(make("renewal"));
    expect(ids(e, "required")).toEqual(
      expect.arrayContaining(["application_form", "photo", "passport_card", "representative_declaration", "resident_tax_certificates"]),
    );
    expect(ids(e, "check")).toEqual(expect.arrayContaining(["working_conditions_document", "organization_overview"]));
    expect(e.items.some((i) => i.rule.id === "care_worker_registration")).toBe(false);
  });

  it("出典は入管庁の介護の案内ページで、規則の識別子が各集合内で重複しない", () => {
    for (const rs of [KAIGO_RENEWAL, KAIGO_CHANGE, KAIGO_COE]) {
      expect(rs.sources.map((s) => s.url)).toContain("https://www.moj.go.jp/isa/applications/status/nursingcare.html");
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });
});
