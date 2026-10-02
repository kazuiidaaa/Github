import { describe, expect, it } from "vitest";
import { evaluate } from "../lib/requirements/evaluate";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

function make(over: Partial<CaseRecord> = {}, category: OrgCategory = "", withholdingSpecial = false): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category, withholdingSpecial },
    requirementStates: {},
    customRequirements: [],
    documents: [],
    ...over,
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);

describe("evaluate", () => {
  it("対象外の手続・在留資格では判定しない", () => {
    expect(evaluate(make({ procedureType: "change" })).ruleSet).toBeNull();
    expect(evaluate(make({ currentStatus: "留学" })).notApplicableReason).toBeTruthy();
  });

  it("確認済みの申請人情報の在留資格を、案件の入力より優先する", () => {
    const c = make({ currentStatus: "留学" });
    c.applicant.residenceStatus = "技術・人文知識・国際業務";
    c.applicant.confirmationStatus = "confirmed";
    expect(evaluate(c).ruleSet).not.toBeNull();
  });

  it("下書きの申請人情報は、判定に使わない", () => {
    const c = make({ currentStatus: "留学" });
    c.applicant.residenceStatus = "技術・人文知識・国際業務";
    expect(evaluate(c).ruleSet).toBeNull();
  });

  it("カテゴリー未入力の間は、共通の書類のみ判定する", () => {
    const e = evaluate(make());
    expect(e.needsCategory).toBe(true);
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
  });

  it("カテゴリー1・2は、共通の書類のみ必要", () => {
    for (const cat of ["1", "2"] as const) {
      const e = evaluate(make({}, cat));
      expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
      expect(e.items.find((i) => i.rule.id === "employment_contract")?.effective).toBe("not_required");
    }
  });

  it("カテゴリー3は、法定調書合計表が必要で、開設届出書は不要", () => {
    const required = ids(evaluate(make({}, "3")), "required");
    expect(required).toContain("statutory_report_total");
    expect(required).toContain("employment_contract");
    expect(required).not.toContain("payroll_office_notification");
  });

  it("カテゴリー4は、納期の特例の承認がある場合のみ承認申請書が必要", () => {
    expect(ids(evaluate(make({}, "4", false)), "required")).not.toContain("withholding_special_approval");
    expect(ids(evaluate(make({}, "4", true)), "required")).toContain("withholding_special_approval");
    expect(ids(evaluate(make({}, "4")), "check")).toContain("business_materials");
  });

  it("行政書士の上書きと提出状況を反映して、不足書類を算出する", () => {
    const c = make({}, "3");
    c.requirementStates = {
      photo: { status: "received" },
      employment_contract: { status: "not_received", override: "not_required", note: "別途確認済み" },
    };
    const e = evaluate(c);
    expect(e.missing.map((i) => i.rule.id)).not.toContain("photo");
    expect(e.missing.map((i) => i.rule.id)).not.toContain("employment_contract");
    expect(e.receivedCount).toBe(1);
    expect(e.requiredCount).toBe(e.receivedCount + e.missing.length);
  });
});
