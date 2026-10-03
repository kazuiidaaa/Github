import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { evaluate, hasRuleSetFor, notApplicableMessage, shouldShowNoRuleGuide, statusForRules } from "../lib/requirements/evaluate";
import { RULE_SETS, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, PROCEDURE_TYPES, type CaseRecord, type OrgCategory } from "../lib/types";

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

  it("カテゴリー1は、共通の書類のみ必要", () => {
    const e = evaluate(make({}, "1"));
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
    expect(e.items.find((i) => i.rule.id === "employment_contract")?.effective).toBe("not_required");
  });

  it("カテゴリー2は、共通の書類と法定調書合計表が必要", () => {
    expect(ids(evaluate(make({}, "2")), "required")).toEqual([
      "application_form",
      "photo",
      "passport_card",
      "statutory_report_total",
    ]);
  });

  it("カテゴリー3・4は代表者の申告書が必要で、言語能力と派遣の資料は確認対象", () => {
    for (const cat of ["3", "4"] as const) {
      const e = evaluate(make({}, cat));
      expect(ids(e, "required")).toContain("representative_declaration");
      expect(ids(e, "check")).toEqual(expect.arrayContaining(["language_ability", "dispatch_documents"]));
    }
    expect(ids(evaluate(make({}, "1")), "check")).toEqual(["dispatch_documents"]);
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

describe("証明写真の登録と写真の行の状態（#52）", () => {
  const photoDoc = {
    id: "p1",
    documentType: "photo" as const,
    fileName: "photo.jpg",
    mimeType: "image/jpeg",
    status: "uploaded" as const,
    uploadedAt: "2026-01-01T00:00:00Z",
  };
  const stateOf = (c: CaseRecord) => evaluate(c).items.find((i) => i.rule.id === "photo")?.state.status;

  it("証明写真が登録されても、写真の行の状態は自動で変わらない", () => {
    expect(stateOf(make())).toBe("not_received");
    expect(stateOf(make({ documents: [photoDoc] }))).toBe("not_received");
  });

  it("手動で選んだ状態は、写真の登録有無にかかわらず保たれる", () => {
    const states = { photo: { status: "received" as const } };
    expect(stateOf(make({ requirementStates: states }))).toBe("received");
    expect(stateOf(make({ requirementStates: states, documents: [photoDoc] }))).toBe("received");
  });
});

const CHANGE_RULE_SET = { ...RULE_SETS[0], id: "test-change", procedureType: "change", residenceStatus: "技術・人文知識・国際業務" } as unknown as RuleSet;
// 実際の RULE_SETS は手続種別の規則が増えるため、判定基準のテストは「更新の実規則＋テスト用の変更規則」だけに固定する
const TEST_SETS = [...RULE_SETS.filter((r) => r.procedureType === "renewal"), CHANGE_RULE_SET];

describe("案件作成画面向けの規則判定", () => {
  it("対応する手続・在留資格の組み合わせでは true", () => {
    expect(hasRuleSetFor("renewal", "技術・人文知識・国際業務")).toBe(true);
  });

  it("未整備の組み合わせでは false（規則が増えない other を使う）", () => {
    expect(hasRuleSetFor("other", "技術・人文知識・国際業務")).toBe(false);
    expect(hasRuleSetFor("other", "")).toBe(false);
    expect(hasRuleSetFor("renewal", "留学")).toBe(false);
    expect(hasRuleSetFor("renewal", "")).toBe(false);
  });

  it("案内文は必要書類タブの未整備の案内と同一で、対応する組み合わせを示す", () => {
    const reason = evaluate(make({ procedureType: "other", currentStatus: "留学" })).notApplicableReason;
    expect(reason).toBe(notApplicableMessage());
    expect(reason).toContain("「技術・人文知識・国際業務」の「在留期間更新許可申請」");
  });

  it("RULE_SETS の全要素が、判定と案内文の両方に反映される", () => {
    for (const r of RULE_SETS) {
      expect(hasRuleSetFor(r.procedureType, r.residenceStatus)).toBe(true);
      const label = PROCEDURE_TYPES.find((p) => p.value === r.procedureType)?.label;
      expect(label).toBeTruthy();
      expect(notApplicableMessage()).toContain(label as string);
      expect(notApplicableMessage()).toContain(r.residenceStatus);
    }
  });
});

describe("規則を引く在留資格の決め方", () => {
  it("変更では、現在=留学・変更後=技人国の案件が一致する", () => {
    const c = make({ procedureType: "change", currentStatus: "留学", targetStatus: "技術・人文知識・国際業務" });
    expect(evaluate(c, TEST_SETS).ruleSet?.id).toBe("test-change");
  });

  it("変更では、現在=技人国・変更後=空だと一致しない", () => {
    const c = make({ procedureType: "change", currentStatus: "技術・人文知識・国際業務", targetStatus: "" });
    expect(evaluate(c, TEST_SETS).ruleSet).toBeNull();
  });

  it("変更では、確認済みの申請人情報の在留資格（現在）でも引かない", () => {
    const applicant = { ...EMPTY_APPLICANT, confirmationStatus: "confirmed" as const, residenceStatus: "技術・人文知識・国際業務" };
    const c = make({ procedureType: "change", currentStatus: "留学", targetStatus: "", applicant });
    expect(evaluate(c, TEST_SETS).ruleSet).toBeNull();
  });

  it("更新では、確認済みの申請人情報があればそれを、なければ現在の在留資格を使う", () => {
    const applicant = { ...EMPTY_APPLICANT, confirmationStatus: "confirmed" as const, residenceStatus: "技術・人文知識・国際業務" };
    expect(evaluate(make({ currentStatus: "留学", applicant })).ruleSet).not.toBeNull();
    expect(evaluate(make({ currentStatus: "留学" })).ruleSet).toBeNull();
  });

  it("statusForRules は手続種別ごとに基準を切り替える", () => {
    const i = { currentStatus: "留学", targetStatus: "教授", confirmedResidenceStatus: "芸術" };
    expect(statusForRules("change", i)).toBe("教授");
    expect(statusForRules("coe", i)).toBe("教授");
    expect(statusForRules("acquisition", i)).toBe("教授");
    expect(statusForRules("renewal", i)).toBe("芸術");
    expect(statusForRules("other", i)).toBe("芸術");
    expect(statusForRules("other", { ...i, confirmedResidenceStatus: "" })).toBe("留学");
    expect(statusForRules("change", { ...i, targetStatus: "" })).toBe("");
  });

  const T = "技術・人文知識・国際業務";
  const table: [string, string, string, boolean][] = [
    // 手続種別, 現在, 変更後, 規則が一致するか
    ["renewal", T, "", true],
    ["renewal", "留学", "", false],
    ["renewal", "", "", false],
    ["other", T, "", false],
    ["other", "", T, false],
    ["change", "留学", T, true],
    ["change", T, "", false],
    ["change", T, "留学", false],
    ["coe", "", T, false],
  ];
  it.each(table)("案内と evaluate が一致する: %s / 現在=%s / 変更後=%s", (procedureType, currentStatus, targetStatus, matched) => {
    const c = make({ procedureType: procedureType as CaseRecord["procedureType"], currentStatus, targetStatus });
    expect(evaluate(c, TEST_SETS).ruleSet !== null).toBe(matched);
    const status = statusForRules(procedureType, { currentStatus, targetStatus });
    expect(hasRuleSetFor(procedureType, status, TEST_SETS)).toBe(evaluate(c, TEST_SETS).ruleSet !== null);
    // 案内は、手続種別と判定用の在留資格が入力済みで、規則がない場合のみ出る
    expect(shouldShowNoRuleGuide(procedureType, currentStatus, targetStatus, TEST_SETS)).toBe(status.trim() !== "" && !matched);
  });

  it("手続種別が未選択のときは案内を出さない", () => {
    expect(shouldShowNoRuleGuide("", "留学", "", TEST_SETS)).toBe(false);
  });
});
