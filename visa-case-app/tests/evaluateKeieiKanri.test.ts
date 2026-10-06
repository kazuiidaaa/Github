import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate, notApplicableMessage } from "../lib/requirements/evaluate";
import { KEIEI_KANRI_CHANGE, KEIEI_KANRI_COE, KEIEI_KANRI_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

function make(procedureType: string, category: OrgCategory = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus: "経営・管理",
    targetStatus: "経営・管理",
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

describe("経営・管理の規則集合", () => {
  it("3手続が登録され、技術・人文知識・国際業務の規則と衝突しない", () => {
    for (const [rs, type] of [
      [KEIEI_KANRI_RENEWAL, "renewal"],
      [KEIEI_KANRI_COE, "coe"],
      [KEIEI_KANRI_CHANGE, "change"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.residenceStatus).toBe("経営・管理");
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
    expect(evaluate({ ...make("coe"), currentStatus: "技術・人文知識・国際業務", targetStatus: "技術・人文知識・国際業務" }).ruleSet?.id).toBe("gijinkoku_coe");
  });

  it("規則の識別子が各集合内で重複しない", () => {
    for (const rs of [KEIEI_KANRI_RENEWAL, KEIEI_KANRI_COE, KEIEI_KANRI_CHANGE]) {
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });

  it("未整備の案内に「経営・管理」が含まれる", () => {
    expect(notApplicableMessage()).toContain("「経営・管理」の「在留資格認定証明書交付申請」");
  });

  it("更新・変更の規則はすべて要確認とする（認定の共通書類を除く）", () => {
    const unverified = (rs: typeof KEIEI_KANRI_RENEWAL) => rs.rules.filter((r) => !r.verify).map((r) => r.id);
    expect(unverified(KEIEI_KANRI_RENEWAL)).toEqual(["application_form", "photo", "passport_card"]);
    expect(unverified(KEIEI_KANRI_CHANGE)).toEqual(["application_form", "photo", "passport_card"]);
  });
});

describe("経営・管理 認定証明書交付申請のカテゴリー別判定", () => {
  const COMMON = ["application_form", "photo", "return_envelope"];
  const C34_REQUIRED = [
    "activity_documents",
    "business_plan",
    "business_description",
    "financial_statements",
    "business_licenses",
    "office_facility_documents",
    "business_scale_documents",
    "japanese_ability",
    "career_documents",
  ];

  it("カテゴリー未入力の間は共通の書類のみ", () => {
    const e = evaluate(make("coe"));
    expect(e.needsCategory).toBe(true);
    expect(ids(e, "required")).toEqual(COMMON);
  });

  it("カテゴリー1・2は共通書類とカテゴリー証明のみ", () => {
    for (const c of ["1", "2"] as const) {
      const e = evaluate(make("coe", c));
      expect(ids(e, "required")).toEqual(["application_form", "photo", "return_envelope", "category_proof"]);
      expect(ids(e, "check")).toEqual([]);
    }
  });

  it("カテゴリー3は9書類が必要で、代表者申告書は要確認、法定調書不提出の理由は不要", () => {
    const e = evaluate(make("coe", "3"));
    expect(ids(e, "required")).toEqual([...COMMON, ...C34_REQUIRED].sort((a, b) => ruleOrder(a) - ruleOrder(b)));
    expect(ids(e, "check")).toEqual(["representative_declaration"]);
    expect(ids(e, "not_required")).toContain("statutory_report_unavailable_reason");
  });

  it("カテゴリー4は、法定調書不提出の理由の資料も必要", () => {
    const e = evaluate(make("coe", "4"));
    expect(ids(e, "required")).toContain("statutory_report_unavailable_reason");
    expect(ids(e, "required")).toHaveLength(COMMON.length + C34_REQUIRED.length + 1);
    expect(ids(e, "check")).toEqual(["representative_declaration"]);
  });

  it("事業規模の資料に、登記事項証明書提出済みなら不要の備考がある", () => {
    const r = KEIEI_KANRI_COE.rules.find((x) => x.id === "business_scale_documents");
    expect(r?.note).toContain("登記事項証明書を提出済み");
  });
});

function ruleOrder(id: string): number {
  return KEIEI_KANRI_COE.rules.findIndex((r) => r.id === id);
}

describe("経営・管理 更新・変更のカテゴリー別判定", () => {
  it("更新：カテゴリー3・4で決算文書・登記事項証明書が必要、カテゴリー1は共通のみ", () => {
    expect(ids(evaluate(make("renewal", "1")), "required")).toEqual(["application_form", "photo", "passport_card"]);
    expect(ids(evaluate(make("renewal", "4")), "required")).toEqual(
      expect.arrayContaining(["financial_statements", "registry_certificate", "office_facility_documents"]),
    );
    expect(ids(evaluate(make("renewal", "2")), "required")).toContain("statutory_report_total");
  });

  it("変更：カテゴリー4のみ法定調書不提出の理由の資料が必要", () => {
    expect(ids(evaluate(make("change", "3")), "required")).not.toContain("statutory_report_unavailable_reason");
    expect(ids(evaluate(make("change", "4")), "required")).toContain("statutory_report_unavailable_reason");
    expect(ids(evaluate(make("change", "1")), "required")).toContain("category_proof");
  });
});
