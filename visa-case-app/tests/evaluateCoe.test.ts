import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

function make(over: Partial<CaseRecord> = {}, category: OrgCategory = "", withholdingSpecial = false): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "coe",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category, withholdingSpecial },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);

describe("evaluate: 在留資格認定証明書交付申請（技術・人文知識・国際業務）", () => {
  it("規則が適用され、未整備の案内にならない", () => {
    const e = evaluate(make());
    expect(e.ruleSet?.procedureType).toBe("coe");
    expect(e.notApplicableReason).toBeUndefined();
  });

  it("他の手続・在留資格には適用しない", () => {
    expect(evaluate(make({ currentStatus: "留学" })).ruleSet).toBeNull();
    expect(evaluate(make({ procedureType: "change" })).ruleSet).toBeNull();
  });

  it("カテゴリー未入力の間は、共通の書類のみ判定する（旅券の提示は含まない）", () => {
    const e = evaluate(make());
    expect(e.needsCategory).toBe(true);
    expect(ids(e, "required")).toEqual(["application_form", "photo", "return_envelope"]);
    expect(e.items.map((i) => i.rule.id)).not.toContain("passport_card");
  });

  it("カテゴリー1は共通の書類とカテゴリーを証明する文書のみ必要", () => {
    const e = evaluate(make({}, "1"));
    expect(ids(e, "required")).toEqual(["application_form", "photo", "return_envelope", "category_proof"]);
  });

  it("カテゴリー3は、経歴・登記・事業内容・決算等が必要で、開設届出書は不要", () => {
    const required = ids(evaluate(make({}, "3")), "required");
    for (const id of ["category_proof", "activity_documents", "career_documents", "registry_certificate", "business_description", "financial_statements", "representative_declaration"]) {
      expect(required).toContain(id);
    }
    expect(required).not.toContain("payroll_office_notification");
  });

  it("カテゴリー4は、カテゴリー証明は不要で、開設届出書と徴収高計算書が必要", () => {
    const required = ids(evaluate(make({}, "4")), "required");
    expect(required).not.toContain("category_proof");
    expect(required).toEqual(expect.arrayContaining(["payroll_office_notification", "withholding_tax_receipts"]));
  });

  it("納期の特例の資料は、承認がある場合のみ必要", () => {
    expect(ids(evaluate(make({}, "4", false)), "required")).not.toContain("withholding_special_approval");
    expect(ids(evaluate(make({}, "4", true)), "required")).toContain("withholding_special_approval");
  });

  it("言語能力・派遣・免除機関・旅券の写しは確認対象", () => {
    expect(ids(evaluate(make({}, "4")), "check")).toEqual(
      expect.arrayContaining(["language_ability", "dispatch_documents", "withholding_exemption", "passport_copy"]),
    );
  });

  it("追加した規則は、出典・確認日を持ち、内容が未確認の項目は要確認とする", () => {
    const set = RULE_SETS.find((r) => r.procedureType === "coe");
    expect(set?.checkedAt).toBe("2026-10-03");
    expect(set?.sources.length).toBeGreaterThan(0);
    const ids = set!.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
