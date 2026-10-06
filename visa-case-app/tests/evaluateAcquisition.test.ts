import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { evaluate, hasRuleSetFor, notApplicableMessage, shouldShowNoRuleGuide } from "../lib/requirements/evaluate";
import { RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

type Cause = FormDetails["acquisitionCause"];

function make(cause: Cause, over: Partial<CaseRecord> = {}, category: OrgCategory = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "acquisition",
    currentStatus: "",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category },
    formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause },
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

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);

// 行政書士提供の実務資料（解説記事に基づく）の一覧を、そのまま期待値として固定する。
const COMMON_CHECK = ["passport_reason_statement", "agent_identity_document"];
const EXPECTED: { cause: Cause; required: string[]; check: string[] }[] = [
  // 未選択：全事由に共通の書類のみ
  { cause: "", required: ["application_form", "passport_presentation"], check: COMMON_CHECK },
  {
    cause: "nationalityLoss",
    required: ["application_form", "photo", "passport_presentation", "nationality_proof", "activity_materials"],
    check: COMMON_CHECK,
  },
  {
    cause: "birth",
    required: ["application_form", "passport_presentation", "birth_certificate", "parents_questionnaire", "household_residence_certificate"],
    check: COMMON_CHECK,
  },
  {
    cause: "other",
    required: ["application_form", "photo", "passport_presentation", "cause_proof", "activity_materials"],
    check: COMMON_CHECK,
  },
];

describe("evaluate: 在留資格取得許可申請（取得の事由別）", () => {
  for (const row of EXPECTED) {
    const label = row.cause || "未選択";
    it(`事由=${label}: 必要書類と確認対象が過不足なく判定される`, () => {
      const e = evaluate(make(row.cause));
      expect(e.ruleSet?.id).toBe("acquisition_by_cause");
      expect(e.needsCause).toBe(row.cause === "");
      expect(e.needsCategory).toBe(false);
      expect(ids(e, "required")).toEqual(row.required);
      expect(ids(e, "check")).toEqual(row.check);
    });
  }

  it("出生では写真を必要書類に含めない（提供の一覧に記載がないため）", () => {
    const e = evaluate(make("birth"));
    expect(ids(e, "required")).not.toContain("photo");
    expect(ids(e, "check")).not.toContain("photo");
    expect(e.items.find((i) => i.rule.id === "photo")?.effective).toBe("not_required");
  });

  it("事由未選択では、事由別の書類は判定対象に含まれない", () => {
    const e = evaluate(make(""));
    expect(e.items.map((i) => i.rule.id)).toEqual(["application_form", "passport_presentation", ...COMMON_CHECK]);
  });

  it("所属機関のカテゴリーに依存しない（雇用・会社情報は未入力でも、どのカテゴリーでも同じ）", () => {
    for (const cause of ["", "birth", "nationalityLoss", "other"] as Cause[]) {
      const base = evaluate(make(cause));
      for (const category of ["1", "2", "3", "4"] as OrgCategory[]) {
        const e = evaluate(make(cause, {}, category));
        expect(e.items.map((i) => [i.rule.id, i.effective])).toEqual(base.items.map((i) => [i.rule.id, i.effective]));
        expect(e.needsCategory).toBe(false);
      }
    }
  });

  it("希望する在留資格が空でも何であっても同じ規則が適用される", () => {
    for (const cause of ["", "birth", "other"] as Cause[]) {
      const base = ids(evaluate(make(cause)), "required");
      for (const targetStatus of ["", "技術・人文知識・国際業務", "留学", "永住者"]) {
        const e = evaluate(make(cause, { targetStatus, currentStatus: "留学" }));
        expect(e.ruleSet?.id).toBe("acquisition_by_cause");
        expect(e.notApplicableReason).toBeUndefined();
        expect(ids(e, "required")).toEqual(base);
      }
    }
  });

  it("案件作成画面の案内は、evaluate の判定と一致する（取得では出さない）", () => {
    for (const targetStatus of ["", "技術・人文知識・国際業務", "留学", "永住者"]) {
      const c = make("", { targetStatus });
      expect(shouldShowNoRuleGuide("acquisition", c.currentStatus, targetStatus)).toBe(false);
      expect(evaluate(c).ruleSet !== null).toBe(true);
      expect(hasRuleSetFor("acquisition", targetStatus)).toBe(true);
    }
    // 規則のない手続（other）では、案内が出て、evaluate は規則なしとなる
    expect(shouldShowNoRuleGuide("other", "技術・人文知識・国際業務", "")).toBe(true);
    expect(evaluate(make("", { procedureType: "other", currentStatus: "技術・人文知識・国際業務" })).ruleSet).toBeNull();
  });

  it("案内文に、在留資格を問わない取得許可申請が含まれる", () => {
    expect(notApplicableMessage()).toContain("在留資格を問わない「在留資格取得許可申請」");
  });

  it("行政書士の上書きが判定に反映される", () => {
    const e = evaluate(make("birth", { requirementStates: { birth_certificate: { status: "not_received", override: "not_required" } } }));
    expect(ids(e, "required")).not.toContain("birth_certificate");
  });

  it("提出済みの書類は不足に数えない", () => {
    const e = evaluate(make("birth", { requirementStates: { birth_certificate: { status: "received" } } }));
    expect(e.requiredCount).toBe(5);
    expect(e.receivedCount).toBe(1);
    expect(e.missing.map((i) => i.rule.id)).toEqual(["application_form", "passport_presentation", "parents_questionnaire", "household_residence_certificate"]);
  });

  it("すべての規則が verify: true（出典が解説記事のため、行政書士の確認後に外す）", () => {
    const set = RULE_SETS.find((r) => r.procedureType === "acquisition");
    expect(set?.rules.every((r) => r.verify === true)).toBe(true);
  });

  it("規則は出典・確認日を持ち、IDが重複せず、旅券は提示と明記される", () => {
    const set = RULE_SETS.find((r) => r.procedureType === "acquisition")!;
    expect(set.checkedAt).toBe("2026-10-04");
    expect(set.sources.length).toBeGreaterThan(0);
    const rids = set.rules.map((r) => r.id);
    expect(new Set(rids).size).toBe(rids.length);
    expect(set.rules.find((r) => r.id === "passport_presentation")?.name).toContain("提示");
  });
});
