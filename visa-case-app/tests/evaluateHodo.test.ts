import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { HODO_CHANGE, HODO_COE, HODO_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { isFormIStatus, isFormLStatus, isFormUStatus } from "../lib/hspForm";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「報道」（Issue #294）。所属機関のカテゴリーは、1＝外国記者登録証を発行された者を雇用する外国の報道機関／2＝それ以外の団体・個人の2区分。
function make(procedureType: string, category: OrgCategory = "", status = "報道"): CaseRecord {
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

describe("報道の規則集合", () => {
  it("認定・変更・更新が、在留資格「報道」で引ける。申請書は様式L（様式I・Uの対象ではない）", () => {
    for (const [rs, type] of [
      [HODO_RENEWAL, "renewal"],
      [HODO_CHANGE, "change"],
      [HODO_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
    // 並び順や件数は決め打ちしない（後から足される在留資格が続く）。3件が連続して登録されていることだけを確かめる
    const at = RULE_SETS.indexOf(HODO_RENEWAL);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(RULE_SETS.slice(at, at + 3)).toEqual([HODO_RENEWAL, HODO_CHANGE, HODO_COE]);
    expect(isFormLStatus("報道")).toBe(true);
    expect(isFormIStatus("報道") || isFormUStatus("報道")).toBe(false);
  });

  it("出典は入管庁の報道の案内ページとチェックシートで、規則の識別子が各集合内で重複しない", () => {
    for (const rs of [HODO_RENEWAL, HODO_CHANGE, HODO_COE]) {
      expect(rs.sources.map((s) => s.url)).toContain("https://www.moj.go.jp/isa/applications/status/journalist.html");
      expect(rs.sources.length).toBeGreaterThanOrEqual(2);
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });

  it("カテゴリーは1〜2の2区分で、3・4は範囲外", () => {
    expect(Object.keys(HODO_COE.categoryDefinition ?? {}).sort()).toEqual(["1", "2"]);
    expect(evaluate(make("coe", "3")).categoryOutOfRange).toBe(true);
    expect(evaluate(make("coe", "2")).categoryOutOfRange).toBe(false);
  });

  it("認定：共通書類と返信用封筒に加え、カテゴリー1は外国記者登録証の雇用証明、カテゴリー2は活動内容と機関の概要", () => {
    expect(ids(evaluate(make("coe", "1")), "required")).toEqual(["application_form", "photo", "return_envelope", "registered_employer_proof"]);
    expect(ids(evaluate(make("coe", "2")), "required")).toEqual(["application_form", "photo", "return_envelope", "activity_documents", "organization_overview"]);
  });

  it("変更：返信用封筒は不要で、在留カードの提示が加わる。カテゴリーごとの書類は認定と同じ", () => {
    expect(ids(evaluate(make("change", "1")), "required")).toEqual(["application_form", "photo", "passport_card", "registered_employer_proof"]);
    expect(ids(evaluate(make("change", "2")), "required")).toEqual(["application_form", "photo", "passport_card", "activity_documents", "organization_overview"]);
  });

  it("更新：カテゴリー1は外国記者登録証の写し、カテゴリー2は在職証明書等と住民税の証明書。転職後の初回の資料は確認として案内する", () => {
    const e1 = evaluate(make("renewal", "1"));
    expect(ids(e1, "required")).toEqual(["application_form", "photo", "passport_card", "press_registration_copy"]);
    expect(ids(e1, "check")).toEqual(["registered_employer_proof"]);
    const e2 = evaluate(make("renewal", "2"));
    expect(ids(e2, "required")).toEqual(["application_form", "photo", "passport_card", "employment_certificate", "resident_tax_certificates"]);
    expect(ids(e2, "check")).toEqual(["activity_documents", "organization_overview"]);
  });

  it("更新：案内ページとチェックシートで食い違う「機関の概要」だけを、要確認（verify）にする", () => {
    const verifyIds = HODO_RENEWAL.rules.filter((r) => r.verify).map((r) => r.id);
    expect(verifyIds).toEqual(["organization_overview"]);
    expect(HODO_COE.rules.some((r) => r.verify)).toBe(false);
    expect(HODO_CHANGE.rules.some((r) => r.verify)).toBe(false);
  });

  it("カテゴリー未選択のときは、カテゴリーを選ぶよう案内し、カテゴリーを問わない共通書類だけを出す", () => {
    const e = evaluate(make("coe"));
    expect(e.needsCategory).toBe(true);
    expect(e.items.map((i) => i.rule.id)).toEqual(["application_form", "photo", "passport_copy", "return_envelope"]);
  });
});
