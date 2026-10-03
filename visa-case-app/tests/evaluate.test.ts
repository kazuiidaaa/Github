import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { evaluate } from "../lib/requirements/evaluate";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

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
    // 規則がない手続の検証には、規則が追加される予定のない other を使う（coe は規則が追加され得る）
    expect(evaluate(make({ procedureType: "other" })).ruleSet).toBeNull();
    // 変更の必要書類の判定基準は currentStatus から targetStatus へ移り得るため、両方に設定する
    expect(
      evaluate(make({ procedureType: "change", currentStatus: "留学", targetStatus: "留学" })).ruleSet,
    ).toBeNull();
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

describe("在留資格変更許可申請（技術・人文知識・国際業務）の規則", () => {
  // 判定基準の在留資格が currentStatus でも targetStatus でも通るよう、両方に設定する
  const change = (category: OrgCategory = "", withholdingSpecial = false) =>
    evaluate(
      make(
        { procedureType: "change", currentStatus: "技術・人文知識・国際業務", targetStatus: "技術・人文知識・国際業務" },
        category,
        withholdingSpecial,
      ),
    );

  const COMMON = ["application_form", "photo", "passport_card"];
  const TABLE2 = [
    "activity_documents",
    "career_documents",
    "registry_certificate",
    "business_overview",
    "financial_statements",
    "representative_declaration",
  ];
  const ALWAYS_CHECK = ["vocational_school_certificate", "dispatch_pledge", "dispatch_contract_documents"];

  // docs/phase12-change-requirements-research.md の4章の表と照合した期待値（カテゴリー × 納期の特例）
  const EXPECTED: Record<string, { required: string[]; check: string[]; special?: string[] }> = {
    "": { required: COMMON, check: ALWAYS_CHECK },
    "1": { required: [...COMMON, "category1_proof"], check: ALWAYS_CHECK },
    "2": {
      required: [...COMMON, "statutory_report_total"],
      check: ["online_approval_proof", "omission_statement", ...ALWAYS_CHECK],
    },
    "3": {
      required: [...COMMON, "statutory_report_total", ...TABLE2],
      check: [...ALWAYS_CHECK, "language_ability"],
    },
    "4": {
      required: [...COMMON, ...TABLE2, "payroll_office_notification"],
      check: [...ALWAYS_CHECK, "language_ability", "withholding_tax_receipts"],
      special: ["withholding_special_approval"],
    },
  };

  it.each(["", "1", "2", "3", "4"] as const)("カテゴリー「%s」の必要書類と確認対象が、表と完全に一致する", (cat) => {
    for (const special of [false, true]) {
      const e = change(cat, special);
      const x = EXPECTED[cat];
      // 納期の特例は、カテゴリー4のみ承認申請書の分だけ必要書類が増える（他のカテゴリーでは影響しない）
      expect(ids(e, "required")).toEqual([...x.required, ...(special ? (x.special ?? []) : [])]);
      expect(ids(e, "check")).toEqual(x.check);
    }
  });

  it("変更許可申請では、規則が見つかり、更新の規則とは別である", () => {
    expect(change().ruleSet?.id).toBe("gijinkoku_change");
    expect(evaluate(make()).ruleSet?.id).toBe("gijinkoku_renewal");
  });

  it("カテゴリー未入力の間は、共通の書類のみ判定する", () => {
    const e = change();
    expect(e.needsCategory).toBe(true);
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
  });

  it("カテゴリー1は、共通の書類とカテゴリーを証明する文書が必要", () => {
    expect(ids(change("1"), "required")).toEqual(["application_form", "photo", "passport_card", "category1_proof"]);
  });

  it("カテゴリー2は、法定調書合計表が必要で、承認文書・省略説明書は確認対象", () => {
    const e = change("2");
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card", "statutory_report_total"]);
    expect(ids(e, "check")).toEqual(expect.arrayContaining(["online_approval_proof", "omission_statement"]));
  });

  it("カテゴリー3・4は、活動内容・経歴・登記事項証明書・事業内容・決算・代表者申告書が必要", () => {
    for (const cat of ["3", "4"] as const) {
      expect(ids(change(cat), "required")).toEqual(
        expect.arrayContaining([
          "activity_documents",
          "career_documents",
          "registry_certificate",
          "business_overview",
          "financial_statements",
          "representative_declaration",
        ]),
      );
      expect(ids(change(cat), "check")).toEqual(expect.arrayContaining(["language_ability", "dispatch_pledge"]));
    }
  });

  it("カテゴリー4のみ、法定調書合計表を提出できない理由の資料が必要で、納期の特例は条件付き", () => {
    expect(ids(change("3"), "required")).not.toContain("payroll_office_notification");
    expect(ids(change("4"), "required")).toContain("payroll_office_notification");
    expect(ids(change("4", false), "required")).not.toContain("withholding_special_approval");
    expect(ids(change("4", true), "required")).toContain("withholding_special_approval");
  });

  // 暫定のガード: 行政書士の確認（docs の6章）が済み、要確認の表示を外す際は、このテストも合わせて外す・更新する
  it("追加した規則は、共通の3件を除き、すべて要確認として表示する（確認前の暫定のガード）", () => {
    const rules = change("4").ruleSet?.rules ?? [];
    for (const r of rules) {
      if (!["application_form", "photo", "passport_card"].includes(r.id)) expect(r.verify).toBe(true);
    }
  });

  it("規則の識別子は重複しない", () => {
    const rules = change("4").ruleSet?.rules ?? [];
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
  });
});
