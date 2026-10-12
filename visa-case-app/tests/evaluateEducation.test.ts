import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { categoryOptions } from "../lib/i18n/caseNew";
import { evaluate } from "../lib/requirements/evaluate";
import { EDUCATION_CHANGE, EDUCATION_COE, EDUCATION_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「教育」（Issue #293）。区分は 1＝小学校〜特別支援学校に常勤・2＝左記以外の教育機関に常勤・3＝非常勤。提出書類は、入管庁のチェックシートの表（○・△の位置）による。
function make(procedureType: string, category: OrgCategory = "", status = "教育"): CaseRecord {
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
const allIds = (e: ReturnType<typeof evaluate>) => e.items.map((i) => i.rule.id);

describe("教育の規則集合", () => {
  it("認定・変更・更新が登録され、在留資格「教育」で引ける", () => {
    for (const [rs, type] of [
      [EDUCATION_RENEWAL, "renewal"],
      [EDUCATION_CHANGE, "change"],
      [EDUCATION_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
  });

  it("区分は 1・2・3 の3つで、選択肢の文言もそれに従う（会社の区分 4 は出ない）", () => {
    for (const rs of [EDUCATION_RENEWAL, EDUCATION_CHANGE, EDUCATION_COE]) {
      expect(Object.keys(rs.categoryDefinition ?? {})).toEqual(["1", "2", "3"]);
    }
    const t = ((k: string) => k) as never;
    expect(categoryOptions(t, "ja", EDUCATION_COE).map((o) => o.label)).toEqual([
      "カテゴリー1（小学校・中学校・高等学校・中等教育学校・特別支援学校に常勤）",
      "カテゴリー2（上記以外の教育機関に常勤）",
      "カテゴリー3（非常勤）",
    ]);
    expect(categoryOptions(t, "en", EDUCATION_COE).map((o) => o.label)[2]).toBe("Category 3 (part-time)");
  });

  it("共通の書類（申請書・写真・パスポート及び在留カード）は、手続別の共通ルールから来る", () => {
    expect(allIds(evaluate(make("coe", "1")))).toEqual(expect.arrayContaining(["application_form", "photo"]));
    expect(allIds(evaluate(make("coe", "1")))).not.toContain("passport_card");
    expect(allIds(evaluate(make("change", "1")))).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card"]));
    expect(allIds(evaluate(make("renewal", "1")))).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card"]));
  });

  describe("認定", () => {
    it("カテゴリー1：申請書・写真・返信用封筒のみ", () => {
      expect(ids(evaluate(make("coe", "1")), "required")).toEqual(["application_form", "photo", "return_envelope"]);
    });
    it("カテゴリー2：上記に加え、活動内容・履歴・事業内容の資料（決算文書は不要）", () => {
      expect(ids(evaluate(make("coe", "2")), "required")).toEqual([
        "application_form",
        "photo",
        "return_envelope",
        "activity_content_documents",
        "career_documents",
        "business_content_documents",
      ]);
    });
    it("カテゴリー3：カテゴリー2に加え、直近の年度の決算文書の写し", () => {
      expect(ids(evaluate(make("coe", "3")), "required")).toEqual([
        "application_form",
        "photo",
        "return_envelope",
        "activity_content_documents",
        "career_documents",
        "business_content_documents",
        "financial_statements",
      ]);
    });
  });

  describe("変更", () => {
    it("カテゴリー1：申請書・写真・パスポート及び在留カードのみ（返信用封筒は不要）", () => {
      expect(ids(evaluate(make("change", "1")), "required")).toEqual(["application_form", "photo", "passport_card"]);
    });
    it("カテゴリー2：上記に加え、活動内容・履歴・事業内容の資料", () => {
      expect(ids(evaluate(make("change", "2")), "required")).toEqual([
        "application_form",
        "photo",
        "passport_card",
        "activity_content_documents",
        "career_documents",
        "business_content_documents",
      ]);
    });
    it("カテゴリー3：カテゴリー2に加え、決算文書", () => {
      expect(ids(evaluate(make("change", "3")), "required")).toEqual([
        "application_form",
        "photo",
        "passport_card",
        "activity_content_documents",
        "career_documents",
        "business_content_documents",
        "financial_statements",
      ]);
    });
  });

  describe("更新", () => {
    it("カテゴリー1：申請書・写真・パスポート及び在留カードのみ（住民税の証明書は不要）", () => {
      const e = evaluate(make("renewal", "1"));
      expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
      expect(ids(e, "check")).toEqual([]);
    });
    it("カテゴリー2：住民税の証明書・納税証明書が必要。雇用以外の契約書と、転職後初回の資料（活動内容・事業内容）は確認。決算文書は不要", () => {
      const e = evaluate(make("renewal", "2"));
      expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card", "resident_tax_certificates"]);
      expect(ids(e, "check")).toEqual(["non_employment_contract_copy", "activity_content_documents", "business_content_documents"]);
      expect([...ids(e, "required"), ...ids(e, "check")]).not.toContain("financial_statements");
    });
    it("カテゴリー3：カテゴリー2に加え、転職後初回の決算文書も確認", () => {
      const e = evaluate(make("renewal", "3"));
      expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card", "resident_tax_certificates"]);
      expect(ids(e, "check")).toEqual(["non_employment_contract_copy", "activity_content_documents", "business_content_documents", "financial_statements"]);
    });
  });

  it("カテゴリー未入力でも、全区分共通の書類は判定する。区分が必要な書類は、区分の入力を促す", () => {
    const e = evaluate(make("coe"));
    expect(ids(e, "required")).toEqual(["application_form", "photo", "return_envelope"]);
    expect(e.needsCategory).toBe(true);
  });

  it("会社の区分 4 は範囲外で、未入力と同じに扱い、範囲外である旨を示す", () => {
    const e = evaluate(make("change", "4"));
    expect(e.needsCategory).toBe(true);
    expect(e.categoryOutOfRange).toBe(true);
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
  });

  it("要確認（verify）は、更新の△（雇用以外の契約書の写し。凡例が確認できない）のみ。出典は案内ページとチェックシート", () => {
    expect(EDUCATION_RENEWAL.rules.filter((r) => r.verify).map((r) => r.id)).toEqual(["non_employment_contract_copy"]);
    for (const [rs, pdf] of [
      [EDUCATION_COE, "001404130"],
      [EDUCATION_CHANGE, "001367667"],
      [EDUCATION_RENEWAL, "001367669"],
    ] as const) {
      if (rs !== EDUCATION_RENEWAL) expect(rs.rules.some((r) => r.verify)).toBe(false);
      expect(rs.sources.map((s) => s.url)).toEqual(["https://www.moj.go.jp/isa/applications/status/instructor.html", `https://www.moj.go.jp/isa/content/${pdf}.pdf`]);
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });

  it("教授や高度専門職など、教育以外の在留資格は、教育の規則に当たらない", () => {
    expect(evaluate(make("renewal", "1", "教授")).ruleSet?.id).toBe("professor_renewal");
    expect(evaluate(make("renewal", "1", "高度専門職（1号イ）")).ruleSet?.id).not.toBe("education_renewal");
  });
});
