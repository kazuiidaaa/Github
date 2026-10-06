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
    // #95 の判定基準（認定は targetStatus）の前後どちらでも通るよう、両方に設定する
    targetStatus: "技術・人文知識・国際業務",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category, withholdingSpecial },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

const ruleIds = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);

describe("evaluate: 在留資格認定証明書交付申請（技術・人文知識・国際業務）", () => {
  it("規則が適用され、未整備の案内にならない", () => {
    const e = evaluate(make());
    expect(e.ruleSet?.procedureType).toBe("coe");
    expect(e.notApplicableReason).toBeUndefined();
  });

  it("他の手続・在留資格には適用しない", () => {
    expect(evaluate(make({ currentStatus: "留学", targetStatus: "留学" })).ruleSet).toBeNull();
    // 規則のない手続（other）で確認する。change は別PRで規則が追加されうるため使わない
    expect(evaluate(make({ procedureType: "other" })).ruleSet).toBeNull();
  });

  it("カテゴリー未入力の間は、共通の書類のみ判定する（旅券の提示は含まない）", () => {
    const e = evaluate(make());
    expect(e.needsCategory).toBe(true);
    expect(ruleIds(e, "required")).toEqual(["application_form", "photo", "return_envelope"]);
    expect(e.items.map((i) => i.rule.id)).not.toContain("passport_card");
  });

  const COMMON = ["application_form", "photo", "return_envelope"];
  const CAT34 = ["activity_documents", "career_documents", "registry_certificate", "business_description", "financial_statements", "representative_declaration"];
  const BASE_CHECK = ["vocational_school_certificate", "dispatch_documents", "passport_copy"];
  const CAT_CHECK = ["vocational_school_certificate", "dispatch_documents", "language_ability", "passport_copy"];
  const CAT4_CHECK = ["vocational_school_certificate", "dispatch_documents", "language_ability", "withholding_exemption", "passport_copy"];
  const MATRIX: { category: OrgCategory; required: string[]; check: string[] }[] = [
    { category: "", required: COMMON, check: BASE_CHECK },
    { category: "1", required: [...COMMON, "category_proof"], check: BASE_CHECK },
    { category: "2", required: [...COMMON, "category_proof"], check: BASE_CHECK },
    { category: "3", required: [...COMMON, "category_proof", ...CAT34], check: CAT_CHECK },
    { category: "4", required: [...COMMON, ...CAT34, "payroll_office_notification", "withholding_tax_receipts"], check: CAT4_CHECK },
  ];

  for (const row of MATRIX) {
    for (const special of [false, true]) {
      const label = `カテゴリー${row.category || "未入力"}・納期の特例${special ? "あり" : "なし"}`;
      // 納期の特例の資料は、カテゴリー4で承認がある場合のみ必要
      const required = row.category === "4" && special ? [...row.required, "withholding_special_approval"] : row.required;

      it(`${label}: 必要書類と確認対象が過不足なく判定される`, () => {
        const e = evaluate(make({}, row.category, special));
        expect(ruleIds(e, "required")).toEqual(required);
        expect(ruleIds(e, "check")).toEqual(row.check);
      });

      it(`${label}: 判定対象のうち、共通の3書類以外は要確認（verify）である`, () => {
        const e = evaluate(make({}, row.category, special));
        const applicable = e.items.filter((i) => i.effective === "required" || i.effective === "check");
        expect(applicable.filter((i) => i.rule.verify).map((i) => i.rule.id)).toEqual(
          applicable.map((i) => i.rule.id).filter((id) => !COMMON.includes(id)),
        );
        expect(applicable.filter((i) => COMMON.includes(i.rule.id)).some((i) => i.rule.verify)).toBe(false);
      });
    }
  }

  it("カテゴリー4以外では、開設届出書・徴収高計算書は判定対象にならない", () => {
    for (const category of ["", "1", "2", "3"] as OrgCategory[]) {
      const all = [...ruleIds(evaluate(make({}, category, true)), "required"), ...ruleIds(evaluate(make({}, category, true)), "check")];
      expect(all).not.toContain("payroll_office_notification");
      expect(all).not.toContain("withholding_tax_receipts");
    }
  });

  it("追加した規則は、出典・確認日を持ち、内容が未確認の項目は要確認とする", () => {
    const set = RULE_SETS.find((r) => r.procedureType === "coe");
    expect(set?.checkedAt).toBe("2026-10-03");
    expect(set?.sources.length).toBeGreaterThan(0);
    const setRuleIds = set!.rules.map((r) => r.id);
    expect(new Set(setRuleIds).size).toBe(setRuleIds.length);
  });
});
