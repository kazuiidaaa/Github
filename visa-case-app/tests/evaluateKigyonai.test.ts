import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate, ruleSetFor } from "../lib/requirements/evaluate";
import { KIGYONAI_CHANGE, KIGYONAI_COE, KIGYONAI_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { isFormIStatus, isFormLStatus, isFormUStatus } from "../lib/hspForm";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, RESIDENCE_STATUSES, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「企業内転勤」（Issue #295）。所属機関のカテゴリーは、技術・人文知識・国際業務と同じ1〜4区分。
function make(procedureType: string, category: OrgCategory = "", status = "企業内転勤"): CaseRecord {
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
const CATEGORY_3_4_DOCS = [
  "activity_documents",
  "workplace_relation_documents",
  "previous_workplace_existence",
  "career_documents",
  "business_description",
  "registry_certificate",
  "workplace_existence",
  "financial_statements",
];

describe("企業内転勤の規則集合", () => {
  it("認定・変更・更新が、在留資格「企業内転勤」で引ける。申請書は様式L（様式I・Uの対象ではない）", () => {
    for (const [rs, type] of [
      [KIGYONAI_RENEWAL, "renewal"],
      [KIGYONAI_CHANGE, "change"],
      [KIGYONAI_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
    // 並び順や件数は決め打ちしない。3件が連続して登録されていることだけを確かめる
    const at = RULE_SETS.indexOf(KIGYONAI_RENEWAL);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(RULE_SETS.slice(at, at + 3)).toEqual([KIGYONAI_RENEWAL, KIGYONAI_CHANGE, KIGYONAI_COE]);
    expect(isFormLStatus("企業内転勤")).toBe(true);
    expect(isFormIStatus("企業内転勤") || isFormUStatus("企業内転勤")).toBe(false);
  });

  it("出典は入管庁の企業内転勤の案内ページとチェックシートで、規則の識別子が各集合内で重複しない", () => {
    for (const rs of [KIGYONAI_RENEWAL, KIGYONAI_CHANGE, KIGYONAI_COE]) {
      expect(rs.sources.map((s) => s.url)).toContain("https://www.moj.go.jp/isa/applications/status/intracompanytransfee.html");
      expect(rs.sources.length).toBeGreaterThanOrEqual(2);
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });

  it("案内ページとチェックシートに食い違いがなく、要確認（verify）の項目はない", () => {
    for (const rs of [KIGYONAI_RENEWAL, KIGYONAI_CHANGE, KIGYONAI_COE]) expect(rs.rules.some((r) => r.verify)).toBe(false);
  });

  it("出典に、提出書類の変更の案内（001457117）が入っている（#373 E-6）", () => {
    for (const rs of [KIGYONAI_RENEWAL, KIGYONAI_CHANGE, KIGYONAI_COE]) {
      expect(rs.sources.map((s) => s.url)).toContain("https://www.moj.go.jp/isa/content/001457117.pdf");
    }
  });

  it("書類の名称は、案内ページ・チェックシートの原文に合わせてある（#373 E-1〜E-3）。id は変えない", () => {
    const name = (rs: typeof KIGYONAI_COE, id: string) => rs.rules.find((r) => r.id === id);
    for (const rs of [KIGYONAI_RENEWAL, KIGYONAI_CHANGE, KIGYONAI_COE]) {
      const proof = name(rs, "category_proof");
      expect(proof?.name).toBe("所属機関がいずれのカテゴリーに該当するかを証明する文書");
      for (const kind of ["四季報の写し又は日本の証券取引所に上場している", "主務官庁から設立の許可を受けた", "イノベーション創出企業", "「一定の条件を満たす企業等」"]) {
        expect(proof?.note, kind).toContain(kind);
      }
    }
    for (const rs of [KIGYONAI_CHANGE, KIGYONAI_COE]) {
      expect(name(rs, "withholding_special_approval")?.name).toBe("源泉所得税の納期の特例の承認を受けていることを明らかにする資料");
      expect(name(rs, "withholding_tax_receipts")?.name).toBe("直近3か月分の所得税徴収高計算書の写し（領収日付印のあるもの）");
    }
  });

  it("カテゴリーは会社の1〜4区分（独自の区分定義を持たない）", () => {
    for (const rs of [KIGYONAI_RENEWAL, KIGYONAI_CHANGE, KIGYONAI_COE]) expect(rs.categoryDefinition).toBeUndefined();
    expect(evaluate(make("coe", "4")).categoryOutOfRange).toBe(false);
  });

  it("認定：共通書類と返信用封筒に加え、カテゴリー1・2は所属機関の証明、3・4は活動・経歴・事業所等の資料", () => {
    const base = ["application_form", "photo", "return_envelope"];
    const e1 = evaluate(make("coe", "1"));
    expect(ids(e1, "required")).toEqual([...base, "category_proof"]);
    expect(ids(e1, "check")).toEqual([]);
    expect(ids(e1, "optional")).toEqual(["passport_copy"]);
    const e2 = evaluate(make("coe", "2"));
    expect(ids(e2, "required")).toEqual([...base, "category_proof"]);
    expect(ids(e2, "check")).toEqual(["online_approval_proof"]);
    const e3 = evaluate(make("coe", "3"));
    expect(ids(e3, "required")).toEqual([...base, "category_proof", ...CATEGORY_3_4_DOCS]);
    const e4 = evaluate(make("coe", "4"));
    expect(ids(e4, "required")).toEqual([...base, ...CATEGORY_3_4_DOCS, "payroll_office_notification", "withholding_tax_receipts"]);
    expect(ids(e4, "check")).toEqual(["withholding_exemption_certificate"]);
  });

  it("変更：返信用封筒と旅券の写しは不要で、在留カードの提示が加わる。カテゴリーごとの書類は認定と同じ", () => {
    const base = ["application_form", "photo", "passport_card"];
    expect(ids(evaluate(make("change", "1")), "required")).toEqual([...base, "category_proof"]);
    expect(ids(evaluate(make("change", "3")), "required")).toEqual([...base, "category_proof", ...CATEGORY_3_4_DOCS]);
    const e4 = evaluate(make("change", "4"));
    expect(ids(e4, "required")).toEqual([...base, ...CATEGORY_3_4_DOCS, "payroll_office_notification", "withholding_tax_receipts"]);
    expect(e4.items.map((i) => i.rule.id)).not.toContain("passport_copy");
  });

  it("カテゴリー4は、納期の特例を受けている場合に限り、その承認の資料が加わる", () => {
    const c = make("coe", "4");
    expect(ids(evaluate(c), "required")).not.toContain("withholding_special_approval");
    c.employment = { ...c.employment, withholdingSpecial: true };
    expect(ids(evaluate(c), "required")).toContain("withholding_special_approval");
  });

  it("更新：カテゴリー1・2は共通書類と所属機関の証明のみ、3・4は住民税の証明書が加わる（転職後の初回の資料はない）", () => {
    const base = ["application_form", "photo", "passport_card"];
    expect(ids(evaluate(make("renewal", "1")), "required")).toEqual([...base, "category_proof"]);
    const e2 = evaluate(make("renewal", "2"));
    expect(ids(e2, "required")).toEqual([...base, "category_proof"]);
    expect(ids(e2, "check")).toEqual(["online_approval_proof"]);
    expect(ids(evaluate(make("renewal", "3")), "required")).toEqual([...base, "category_proof", "resident_tax_certificates"]);
    const e4 = evaluate(make("renewal", "4"));
    expect(ids(e4, "required")).toEqual([...base, "resident_tax_certificates"]);
    expect(ids(e4, "check")).toEqual([]);
  });

  it("カテゴリー未選択のときは、カテゴリーを選ぶよう案内し、カテゴリーを問わない共通書類だけを出す", () => {
    const e = evaluate(make("coe"));
    expect(e.needsCategory).toBe(true);
    expect(e.items.map((i) => i.rule.id)).toEqual(["application_form", "photo", "passport_copy", "return_envelope"]);
  });
});

describe("部分一致の照合で、ほかの在留資格に誤って当たらない", () => {
  it("在留資格のプルダウンの中で、企業内転勤の規則に当たるのは「企業内転勤」だけ", () => {
    for (const type of ["coe", "change", "renewal"]) {
      for (const status of RESIDENCE_STATUSES) {
        const hit = ruleSetFor(type, status);
        expect(hit?.id.startsWith("kigyonai_") ?? false, `${type} / ${status}`).toBe(status === "企業内転勤");
      }
    }
  });

  it("「研究（転勤）」は企業内転勤の規則ではなく、様式Lの対象にもならない（#296の範囲）", () => {
    for (const type of ["coe", "change", "renewal"]) expect(ruleSetFor(type, "研究（転勤）")?.id ?? "").not.toMatch(/^kigyonai_/);
    expect(isFormLStatus("研究（転勤）")).toBe(false);
  });

  it("「企業内転勤」を含む別の表記は、様式Lの完全一致に当たらない", () => {
    expect(isFormLStatus("企業内転勤２号")).toBe(false);
    expect(isFormLStatus("企業内転勤（特例）")).toBe(false);
    expect(isFormLStatus("")).toBe(false);
  });
});
