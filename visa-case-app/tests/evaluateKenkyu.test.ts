import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { KENKYU_CHANGE, KENKYU_COE, KENKYU_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { isFormIStatus, isFormUStatus } from "../lib/hspForm";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「研究」（Issue #296）。所属機関のカテゴリー（1〜4）ごとに、案内ページの書類が異なる。
function make(procedureType: string, category: OrgCategory = "", status = "研究", withholdingSpecial = false): CaseRecord {
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
    employment: { ...EMPTY_EMPLOYMENT, category, withholdingSpecial },
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
// 判定の対象になる書類（必要・要確認）。対象外のカテゴリーの書類は含めない
const all = (e: ReturnType<typeof evaluate>) => e.items.filter((i) => i.effective === "required" || i.effective === "check").map((i) => i.rule.id);

describe("研究の規則集合", () => {
  it("認定・変更・更新が末尾に登録され、在留資格「研究」で引ける。申請書は様式N（様式I・Uの対象ではない）", () => {
    for (const [rs, type] of [
      [KENKYU_RENEWAL, "renewal"],
      [KENKYU_CHANGE, "change"],
      [KENKYU_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
    expect(RULE_SETS.slice(-3)).toEqual([KENKYU_RENEWAL, KENKYU_CHANGE, KENKYU_COE]);
    expect(isFormIStatus("研究") || isFormUStatus("研究")).toBe(false);
  });

  it("「特定活動（研究活動等）」は、研究の規則に当たらない", () => {
    expect(evaluate(make("coe", "", "特定活動（研究活動等）")).ruleSet?.id).not.toBe("kenkyu_coe");
  });

  it("出典は入管庁の研究の案内ページで、規則の識別子が各集合内で重複しない", () => {
    for (const rs of [KENKYU_RENEWAL, KENKYU_CHANGE, KENKYU_COE]) {
      expect(rs.sources.map((s) => s.url)).toContain("https://www.moj.go.jp/isa/applications/status/researcher.html");
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });

  it("認定：カテゴリー1・2は、共通書類とカテゴリーを証明する文書だけ（その他は原則不要）", () => {
    for (const c of ["1", "2"] as const) {
      expect(ids(evaluate(make("coe", c)), "required"), c).toEqual(["application_form", "photo", "return_envelope", "category_proof"]);
    }
    expect(ids(evaluate(make("coe", "1")), "check")).toEqual(["dispatch_documents"]);
    expect(ids(evaluate(make("coe", "2")), "check")).toEqual(["online_approval_proof", "dispatch_documents"]);
  });

  it("認定：カテゴリー3は、活動内容・経歴・事業内容・代表者申告書が加わる。決算文書は転勤の場合のみ（確認）、源泉徴収の資料は不要", () => {
    const e = evaluate(make("coe", "3"));
    expect(ids(e, "required")).toEqual(
      expect.arrayContaining(["category_proof", "activity_documents", "career_documents", "business_description", "representative_declaration"]),
    );
    expect(ids(e, "check")).toEqual(expect.arrayContaining(["financial_statements_transfer", "transfer_documents"]));
    expect(ids(e, "required")).not.toContain("financial_statements");
    expect(all(e)).not.toContain("payroll_office_notification");
  });

  it("認定：カテゴリー4は、カテゴリーを証明する文書の代わりに、決算文書と、源泉徴収の資料が必要", () => {
    const e = evaluate(make("coe", "4"));
    expect(all(e)).not.toContain("category_proof");
    expect(ids(e, "required")).toEqual(
      expect.arrayContaining(["financial_statements", "representative_declaration", "payroll_office_notification", "withholding_tax_receipts"]),
    );
    expect(ids(e, "check")).toContain("withholding_exemption_certificate");
  });

  it("納期の特例の承認の書類は、案件の「納期の特例」が真のときだけ判定する（カテゴリー4）", () => {
    const off = evaluate(make("coe", "4")).items.find((i) => i.rule.id === "withholding_special_approval");
    const on = evaluate(make("coe", "4", "研究", true)).items.find((i) => i.rule.id === "withholding_special_approval");
    expect(off?.effective).not.toBe("required");
    expect(on?.effective).toBe("required");
  });

  it("更新：源泉徴収の資料は、チェックシートでは転職後の初回の枠内でカテゴリー4のみ。必須ではなく確認として案内する", () => {
    const e = evaluate(make("renewal", "4", "研究", true));
    expect(ids(e, "check")).toEqual(
      expect.arrayContaining(["withholding_exemption_certificate", "payroll_office_notification", "withholding_tax_receipts", "withholding_special_approval"]),
    );
    expect(ids(e, "required")).not.toContain("payroll_office_notification");
    expect(all(evaluate(make("renewal", "3")))).not.toContain("payroll_office_notification");
  });

  it("変更：返信用封筒は不要で在留カードの提示が加わる。カテゴリー2には、留学からの変更の省略説明書を確認として案内する", () => {
    const e = evaluate(make("change", "2"));
    expect(all(e)).not.toContain("return_envelope");
    expect(ids(e, "required")).toEqual(expect.arrayContaining(["passport_card", "category_proof"]));
    expect(ids(e, "check")).toContain("omission_statement");
    expect(all(evaluate(make("change", "4")))).not.toContain("omission_statement");
  });

  it("更新：カテゴリー3・4は住民税の証明書が必要。事業内容・決算文書・代表者申告書は、転職後の初回のみ（確認）", () => {
    for (const c of ["3", "4"] as const) {
      const e = evaluate(make("renewal", c));
      expect(ids(e, "required"), c).toEqual(expect.arrayContaining(["passport_card", "resident_tax_certificates"]));
      expect(ids(e, "check"), c).toEqual(expect.arrayContaining(["activity_documents", "business_description", "representative_declaration"]));
      expect(ids(e, "required"), c).not.toContain("career_documents");
    }
    expect(all(evaluate(make("renewal", "1")))).not.toContain("resident_tax_certificates");
  });

  it("読み取りに幅のある書類は、要確認（verify）である", () => {
    const find = (rs: typeof KENKYU_RENEWAL, id: string, cats: string) => rs.rules.find((r) => r.id === id && r.categories?.join() === cats);
    expect(find(KENKYU_RENEWAL, "financial_statements", "4")?.verify).toBe(true);
    expect(find(KENKYU_RENEWAL, "financial_statements_transfer", "3")?.verify).toBe(true);
    expect(find(KENKYU_RENEWAL, "representative_declaration", "3,4")?.verify).toBe(true);
    // 変更の決算文書（カテゴリー4）は、案内ページは必要、チェックシート（変更）は△のため要確認
    expect(find(KENKYU_CHANGE, "financial_statements", "4")?.verify).toBe(true);
    // 転勤の書類は、チェックシートの「学歴及び職歴等」の(3)（基準省令ただし書）で確認できたため、要確認にしない
    expect(find(KENKYU_COE, "transfer_documents", "3,4")?.verify).toBeUndefined();
    expect(find(KENKYU_RENEWAL, "financial_statements_transfer", "3")?.note).toContain("「転勤の場合に限る」と「提出書類10は不要」の2つの文言");
  });
});
