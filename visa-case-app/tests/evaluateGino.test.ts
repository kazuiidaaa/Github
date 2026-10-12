import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { GINO_CHANGE, GINO_COE, GINO_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「技能」（Issue #298）。所属機関のカテゴリー（1〜4）で書類が分かれ、職歴の証明は職種（調理師など）で分かれる。
function make(procedureType: string, category: OrgCategory = "", status = "技能"): CaseRecord {
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
// 求められる書類（不要と判定されたものは除く）
const all = (e: ReturnType<typeof evaluate>) => e.items.filter((i) => i.effective !== "not_required").map((i) => i.rule.id);
const CAREER = ["career_cook", "career_thai_cook", "career_special_skill", "career_pilot", "career_sports_instructor", "career_sommelier"];

describe("技能の規則集合", () => {
  it("認定・変更・更新が登録され、在留資格「技能」で引ける", () => {
    for (const [rs, type] of [
      [GINO_RENEWAL, "renewal"],
      [GINO_CHANGE, "change"],
      [GINO_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
  });

  it("「特定技能」「技能実習」には、技能の規則を当てない", () => {
    for (const status of ["特定技能", "特定技能（1号）", "技能実習", "技能実習（2号）"]) {
      for (const type of ["coe", "change", "renewal"]) {
        expect(evaluate(make(type, "", status)).ruleSet?.id ?? "", `${status}:${type}`).not.toMatch(/^gino_/);
      }
    }
  });

  it("出典は入管庁の技能の案内ページ（調理師・調理師以外）で、規則の識別子が各集合内で重複しない", () => {
    for (const rs of [GINO_RENEWAL, GINO_CHANGE, GINO_COE]) {
      const urls = rs.sources.map((s) => s.url);
      expect(urls).toEqual(
        expect.arrayContaining([
          "https://www.moj.go.jp/isa/applications/status/skilledlabor.html",
          "https://www.moj.go.jp/isa/applications/status/skilledlabor01.html",
          "https://www.moj.go.jp/isa/applications/status/skilledlabor02.html",
        ]),
      );
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });

  it("職歴の証明は、職種で分かれるため、すべて要確認とし、注記に職種を示す（認定・変更）", () => {
    for (const rs of [GINO_COE, GINO_CHANGE]) {
      for (const id of CAREER) {
        const r = rs.rules.find((x) => x.id === id)!;
        expect(r.level, `${rs.id}:${id}`).toBe("check");
        expect(r.categories, `${rs.id}:${id}`).toEqual(["3", "4"]);
        expect(r.note, `${rs.id}:${id}`).toContain("職種");
      }
    }
    expect(GINO_RENEWAL.rules.some((r) => CAREER.includes(r.id))).toBe(false);
  });
});

describe("技能：認定", () => {
  it("カテゴリー1・2：申請書・写真・返信用封筒・カテゴリーの証明・業務内容の文書・履歴書のみ。その他の資料は不要", () => {
    for (const c of ["1", "2"] as const) {
      const e = evaluate(make("coe", c));
      expect(ids(e, "required"), c).toEqual(
        expect.arrayContaining(["application_form", "photo", "return_envelope", "category_proof", "work_content_document", "skill_resume"]),
      );
      for (const id of ["activity_documents", "business_description", "financial_statements", "representative_declaration", ...CAREER]) {
        expect(all(e), `${c}:${id}`).not.toContain(id);
      }
    }
  });

  it("カテゴリー3：活動内容・事業内容・決算文書・代表者申告書が加わる。源泉徴収の理由書類は不要", () => {
    const e = evaluate(make("coe", "3"));
    expect(ids(e, "required")).toEqual(
      expect.arrayContaining(["activity_documents", "business_description", "financial_statements", "representative_declaration"]),
    );
    expect(all(e)).not.toContain("payroll_office_notification");
    expect(ids(e, "check")).toEqual(expect.arrayContaining(CAREER));
  });

  it("カテゴリー4：源泉徴収の理由書類が加わる", () => {
    const e = evaluate(make("coe", "4"));
    expect(ids(e, "required")).toEqual(
      expect.arrayContaining(["activity_documents", "business_description", "financial_statements", "representative_declaration", "payroll_office_notification", "withholding_tax_receipts"]),
    );
  });

  it("旅券・在留カードの提示は不要", () => {
    expect(all(evaluate(make("coe", "4")))).not.toContain("passport_card");
  });
});

describe("技能：変更", () => {
  it("在留カードの提示が加わり、返信用封筒は不要", () => {
    const e = evaluate(make("change", "2"));
    expect(ids(e, "required")).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card", "category_proof"]));
    expect(all(e)).not.toContain("return_envelope");
  });

  it("カテゴリー1・2は追加の資料が不要。カテゴリー4は決算文書・源泉徴収の理由書類が必要", () => {
    expect(all(evaluate(make("change", "1")))).not.toContain("financial_statements");
    expect(ids(evaluate(make("change", "4")), "required")).toEqual(expect.arrayContaining(["financial_statements", "payroll_office_notification"]));
  });
});

describe("技能：更新", () => {
  it("カテゴリー1・2：申請書・写真・旅券及び在留カードとカテゴリーの証明のみ", () => {
    for (const c of ["1", "2"] as const) {
      const e = evaluate(make("renewal", c));
      expect(ids(e, "required"), c).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card", "category_proof"]));
      for (const id of ["resident_tax_certificates", "representative_declaration", "activity_documents", "financial_statements"]) {
        expect(all(e), `${c}:${id}`).not.toContain(id);
      }
    }
  });

  it("カテゴリー3・4：代表者申告書と住民税の証明書が必要。活動内容・事業内容・決算文書は転職後の初回のみ（要確認）", () => {
    for (const c of ["3", "4"] as const) {
      const e = evaluate(make("renewal", c));
      expect(ids(e, "required"), c).toEqual(expect.arrayContaining(["representative_declaration", "resident_tax_certificates"]));
      expect(ids(e, "check"), c).toEqual(expect.arrayContaining(["activity_documents", "business_description", "financial_statements"]));
    }
  });

  it("源泉徴収の理由書類は、カテゴリー4の転職後の初回のみ（要確認）。カテゴリー3は不要", () => {
    expect(ids(evaluate(make("renewal", "4")), "check")).toEqual(expect.arrayContaining(["payroll_office_notification", "withholding_tax_receipts"]));
    expect(all(evaluate(make("renewal", "3")))).not.toContain("payroll_office_notification");
  });

  it("更新では、職歴の証明（職種別）は求めない", () => {
    expect(all(evaluate(make("renewal", "4"))).filter((id) => CAREER.includes(id))).toEqual([]);
  });
});
