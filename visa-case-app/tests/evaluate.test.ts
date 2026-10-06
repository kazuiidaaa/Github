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
    acceptedDate: "",
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

describe("高度専門職の規則（Issue #186）", () => {
  const find = (procedureType: "coe" | "change" | "renewal", status: string) => {
    const field = procedureType === "renewal" ? "currentStatus" : "targetStatus";
    return evaluate(make({ procedureType, [field]: status } as Partial<CaseRecord>));
  };

  it("認定・変更・更新で、ポイント計算表とその疎明資料を、必要書類として出す", () => {
    for (const [procedureType, status] of [
      ["coe", "高度専門職（1号ロ）"],
      ["change", "高度専門職（1号イ）"],
      ["change", "高度専門職（2号）"],
      ["renewal", "高度専門職"],
    ] as const) {
      const ev = find(procedureType, status);
      expect(ev.ruleSet?.id, `${procedureType}:${status}`).toMatch(/^hsp_/);
      const ids = ev.items.map((i) => i.rule.id);
      expect(ids.slice(0, 2)).toEqual(["hsp_point_table", "hsp_point_evidence"]);
      expect(ev.items.slice(0, 2).every((i) => i.effective === "required")).toBe(true);
      expect(ev.ruleSet?.title).toContain("ポイント計算表・疎明資料");
      // 2号の変更だけ、所得・納税・社会保険の書類（hsp2_）が加わる
      expect(ids.some((id) => id.startsWith("hsp2_")), `${procedureType}:${status}`).toBe(status === "高度専門職（2号）");
    }
  });

  it("高度専門職2号の変更は2号の規則、1号の変更は1号の規則で引く（2号を先に照合する）", () => {
    expect(find("change", "高度専門職（2号）").ruleSet?.id).toBe("hsp_change_2");
    expect(find("change", "高度専門職（1号ハ）").ruleSet?.id).toBe("hsp_change");
    expect(find("change", "高度専門職").ruleSet?.id).toBe("hsp_change");
  });

  it("高度専門職2号の更新は、手続がないため、規則に載せない（2号の変更・1号の規則のみ）", () => {
    expect(RULE_SETS.some((r) => r.procedureType === "renewal" && r.residenceStatus.includes("2号"))).toBe(false);
  });

  it("他の在留資格の規則は、従来どおり（誤一致しない）", () => {
    expect(find("coe", "技術・人文知識・国際業務").ruleSet?.id).toBe("gijinkoku_coe");
    expect(find("change", "経営・管理").ruleSet?.id).toBe("keiei_kanri_change");
    expect(find("renewal", "経営・管理").ruleSet?.id).toBe("keiei_kanri_renewal");
  });

  it("取得許可申請には、高度専門職の規則を足さない（取得の事由で判定する規則集合のまま）", () => {
    expect(RULE_SETS.some((r) => r.procedureType === "acquisition" && r.id.startsWith("hsp_"))).toBe(false);
  });
});

describe("高度専門職：選んだ項目から導く疎明資料の番号ごとの必要書類（Issue #186）", () => {
  const withChecks = (over: Partial<CaseRecord>, details: Partial<CaseRecord["formDetails"]>) =>
    evaluate(make({ ...over, formDetails: { ...EMPTY_FORM_DETAILS, ...details } }));
  const change1 = { procedureType: "change", targetStatus: "高度専門職（1号ロ）" } as const;

  it("項目を選んでいない間は、親の疎明資料1件のみ（従来と同じ）", () => {
    const ids = withChecks(change1, {}).items.map((i) => i.rule.id);
    expect(ids).toEqual(["hsp_point_table", "hsp_point_evidence"]);
  });

  it("資格（⑧）・投資運用業等（㉑）を選ぶと、番号ごとの疎明資料を「必要」で出す。必要書類の件数に数える", () => {
    // B：修士(①)・資格 複数(⑧)・投資運用業等(㉑)
    const ev = withChecks(change1, { hspPointChecks: ["B:15", "B:48", "B:95"] });
    expect(ev.items.map((i) => i.rule.id)).toEqual(["hsp_point_table", "hsp_point_evidence_①", "hsp_point_evidence_⑧", "hsp_point_evidence_㉑"]);
    const by = (id: string) => ev.items.find((i) => i.rule.id === id)!;
    expect(by("hsp_point_evidence_①").effective).toBe("check");
    expect(by("hsp_point_evidence_⑧").effective).toBe("required");
    expect(by("hsp_point_evidence_㉑").effective).toBe("required");
    expect(ev.requiredCount).toBe(3); // ポイント計算表 + ⑧ + ㉑
    expect(ev.missing.map((i) => i.rule.id)).toEqual(["hsp_point_table", "hsp_point_evidence_⑧", "hsp_point_evidence_㉑"]);
    // 選ばなければ、出さない
    expect(withChecks(change1, { hspPointChecks: ["B:15"] }).items.some((i) => i.rule.id === "hsp_point_evidence_⑧")).toBe(false);
  });

  it("選んだ項目の番号ごとに、親の疎明資料の直後へ「要確認」で出す。必要書類の件数には数えない", () => {
    // B：修士(①)・職歴(②)・年収(③)・日本語能力Ⅰ(⑮)
    const ev = withChecks(change1, { hspPointChecks: ["B:15", "B:20", "B:27", "B:72"] });
    expect(ev.items.map((i) => i.rule.id)).toEqual([
      "hsp_point_table",
      "hsp_point_evidence_①",
      "hsp_point_evidence_②",
      "hsp_point_evidence_③",
      "hsp_point_evidence_⑮",
    ]);
    const children = ev.items.slice(1);
    expect(children.every((i) => i.effective === "check" && i.rule.level === "check")).toBe(true);
    expect(children[3].rule.name).toContain("日本語能力");
    expect(ev.requiredCount).toBe(1);
    // 未受領の「要確認」は、確認が必要な書類に出る
    expect(ev.toCheck.map((i) => i.rule.id)).toEqual(["hsp_point_evidence_①", "hsp_point_evidence_②", "hsp_point_evidence_③", "hsp_point_evidence_⑮"]);
  });

  it("収集状況と、行政書士の判断（必要への切り替え）は、番号ごとに持つ", () => {
    const ev = withChecks(
      { ...change1, requirementStates: { "hsp_point_evidence_①": { status: "received" }, "hsp_point_evidence_③": { status: "requested", override: "required" } } },
      { hspPointChecks: ["B:15", "B:27"] },
    );
    const one = ev.items.find((i) => i.rule.id === "hsp_point_evidence_①")!;
    const three = ev.items.find((i) => i.rule.id === "hsp_point_evidence_③")!;
    expect(one.state.status).toBe("received");
    expect(three.effective).toBe("required");
    expect(ev.requiredCount).toBe(2);
    // 未受領の必要書類：計算表と、必要に切り替えた③（受領済みの①は含まない）
    expect(ev.missing.map((i) => i.rule.id)).toEqual(["hsp_point_table", "hsp_point_evidence_③"]);
    expect(ev.toCheck).toEqual([]);
  });

  it("親の疎明資料に入力済みの状態があれば、番号ごとの行と並べて残す", () => {
    const ev = withChecks(
      { ...change1, requirementStates: { hsp_point_evidence: { status: "requested" } } },
      { hspPointChecks: ["B:15"] },
    );
    expect(ev.items.map((i) => i.rule.id).slice(0, 3)).toEqual(["hsp_point_table", "hsp_point_evidence", "hsp_point_evidence_①"]);
  });

  it("使うシートが決まらない間（2号・号未選択）は出さない。シートを選ぶと出る", () => {
    const grade2 = { procedureType: "change", targetStatus: "高度専門職（2号）" } as const;
    const hasChild = (e: ReturnType<typeof evaluate>) => e.items.some((i) => i.rule.id.startsWith("hsp_point_evidence_"));
    expect(hasChild(withChecks(grade2, { hspPointChecks: ["B:15"] }))).toBe(false);
    expect(hasChild(withChecks(grade2, { hspPointChecks: ["B:15"], hspPointSheet: "B" }))).toBe(true);
  });

  it("更新は、現在の在留資格でシートを決める。他の在留資格の案件には出ない", () => {
    expect(withChecks({ procedureType: "renewal", currentStatus: "高度専門職（1号ロ）" }, { hspPointChecks: ["B:15"] }).items.map((i) => i.rule.id)).toContain("hsp_point_evidence_①");
    const other = evaluate(make({ procedureType: "renewal", currentStatus: "技術・人文知識・国際業務", formDetails: { ...EMPTY_FORM_DETAILS, hspPointChecks: ["B:15"] } }, "1"));
    expect(other.items.some((i) => i.rule.id.startsWith("hsp_point_evidence_"))).toBe(false);
  });
});

describe("高度専門職2号の変更の所得・納税・社会保険の書類（Issue #188）", () => {
  const ev = evaluate(make({ procedureType: "change", targetStatus: "高度専門職（2号）" }));
  const level = (id: string) => ev.items.find((i) => i.rule.id === id)?.effective;

  it("住民税・国税・所得・公的年金・公的医療保険の書類を、必要書類として出す", () => {
    for (const id of [
      "hsp2_resident_tax_certificates",
      "hsp2_national_tax_certificates",
      "hsp2_income_proof",
      "hsp2_public_pension",
      "hsp2_public_health_insurance",
    ]) {
      expect(level(id), id).toBe("required");
    }
  });

  it("申請人の状況で要否が変わる書類は、推測せず「要確認」にする", () => {
    for (const id of ["hsp2_resident_tax_payment", "hsp2_resident_tax_reason", "hsp2_employer_insurance", "hsp2_80points_evidence"]) {
      expect(level(id), id).toBe("check");
    }
  });

  it("書類の名称・注記に、3か月以内・対象期間（5年・3年・2年・1年）を示す", () => {
    const note = (id: string) => ev.items.find((i) => i.rule.id === id)?.rule.note ?? "";
    expect(note("hsp2_resident_tax_certificates")).toContain("3か月以内");
    expect(note("hsp2_resident_tax_certificates")).toContain("直近5年分");
    expect(note("hsp2_resident_tax_certificates")).toContain("直近3年分");
    expect(note("hsp2_resident_tax_certificates")).toContain("直近1年分");
    expect(note("hsp2_public_pension")).toContain("直近2年間");
    expect(note("hsp2_resident_tax_payment")).toContain("特別徴収");
  });

  it("書類は、ポイント計算表と合わせて11件。要確認の4件は、必要書類の件数に数えない", () => {
    expect(ev.items).toHaveLength(11);
    expect(ev.requiredCount).toBe(7);
  });

  it("高度専門職（1号）の変更・認定・更新には、所得・納税・社会保険の書類を出さない", () => {
    const hsp1 = evaluate(make({ procedureType: "change", targetStatus: "高度専門職（1号ロ）" }));
    expect(hsp1.items.some((i) => i.rule.id.startsWith("hsp2_"))).toBe(false);
  });
});

describe("号つきの高度専門職（Issue #181）", () => {
  it("高度専門職の保存値は、高度専門職の規則にだけ一致し、他の在留資格の規則には誤一致しない", () => {
    for (const procedureType of ["coe", "change", "renewal"] as const) {
      const hasHspRules = RULE_SETS.some((r) => r.procedureType === procedureType && r.residenceStatus.startsWith("高度専門職"));
      for (const grade of ["高度専門職", "高度専門職（1号イ）", "高度専門職（1号ロ）", "高度専門職（1号ハ）"]) {
        expect(hasRuleSetFor(procedureType, grade), `${procedureType}:${grade}`).toBe(hasHspRules);
      }
    }
  });
});
