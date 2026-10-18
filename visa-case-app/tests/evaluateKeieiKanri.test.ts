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

  it("案内ページとチェックシートが一致した書類は verify を付けず、食い違う書類だけに付ける（照合済み 2026-10-18）", () => {
    const verified = (rs: typeof KEIEI_KANRI_RENEWAL) => rs.rules.filter((r) => r.verify).map((r) => r.id);
    // 更新: カテゴリー1の証明（JETROは更新のチェックシートのみ）、事務所用施設（更新の案内ページ・チェックシートにない）
    expect(verified(KEIEI_KANRI_RENEWAL)).toEqual(["category_proof", "office_facility_documents"]);
    // 認定: 本邦事業所の設置の委託（案内ページのみ）
    expect(verified(KEIEI_KANRI_COE)).toEqual(["office_commission_documents"]);
    expect(verified(KEIEI_KANRI_CHANGE)).toEqual([]);
  });

  it("「暫定」「未提供」の注記は残っていない", () => {
    for (const rs of [KEIEI_KANRI_RENEWAL, KEIEI_KANRI_COE, KEIEI_KANRI_CHANGE]) {
      for (const r of rs.rules) expect(r.note ?? "", r.id).not.toMatch(/暫定|未提供|提供された一覧/);
    }
  });

  it("出典のURLは businessmanager.html（ハイフンなし）", () => {
    for (const rs of [KEIEI_KANRI_RENEWAL, KEIEI_KANRI_COE, KEIEI_KANRI_CHANGE]) {
      expect(rs.sources[0].url).toBe("https://www.moj.go.jp/isa/applications/status/businessmanager.html");
    }
  });

  it("名称は案内ページ・チェックシートの原文に合わせている", () => {
    const name = (rs: typeof KEIEI_KANRI_COE, id: string) => rs.rules.find((r) => r.id === id)?.name;
    for (const rs of [KEIEI_KANRI_COE, KEIEI_KANRI_CHANGE]) {
      expect(name(rs, "category_proof")).toBe("所属機関がいずれのカテゴリーに該当するかを証明する文書");
      expect(name(rs, "business_plan")).toBe("経営・管理に関する専門的な知識を有する者による評価を受けた事業計画書の写し");
      expect(name(rs, "office_facility_documents")).toContain("事務所用施設");
      expect(name(rs, "representative_declaration")).toBe("所属機関の代表者に関する申告書（参考様式）");
      expect(name(rs, "activity_documents")).toContain("活動の内容等");
      expect(name(rs, "statutory_report_unavailable_reason")).toContain("給与所得の源泉徴収票等の法定調書合計表");
    }
    expect(name(KEIEI_KANRI_RENEWAL, "statutory_report_total")).not.toContain("受付印");
    expect(KEIEI_KANRI_COE.rules.find((r) => r.id === "representative_declaration")?.note).toContain("チェックシートで△");
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

  it("カテゴリー1・2は共通書類とカテゴリー証明のみ（本邦事業所の設置の委託は、要確認で全カテゴリーに出る）", () => {
    for (const c of ["1", "2"] as const) {
      const e = evaluate(make("coe", c));
      expect(ids(e, "required")).toEqual(["application_form", "photo", "return_envelope", "category_proof"]);
      expect(ids(e, "check")).toEqual(["office_commission_documents"]);
    }
  });

  it("カテゴリー3は、カテゴリー証明と9書類が必要で、代表者申告書と設置の委託は要確認、法定調書不提出の理由は不要", () => {
    const e = evaluate(make("coe", "3"));
    expect(ids(e, "required")).toEqual([...COMMON, "category_proof", ...C34_REQUIRED].sort((a, b) => ruleOrder(a) - ruleOrder(b)));
    expect(ids(e, "check")).toEqual(["representative_declaration", "office_commission_documents"]);
    expect(ids(e, "not_required")).toContain("statutory_report_unavailable_reason");
  });

  it("カテゴリー4は、法定調書不提出の理由の資料も必要で、カテゴリー証明は不要", () => {
    const e = evaluate(make("coe", "4"));
    expect(ids(e, "required")).toContain("statutory_report_unavailable_reason");
    expect(ids(e, "required")).not.toContain("category_proof");
    expect(ids(e, "required")).toHaveLength(COMMON.length + C34_REQUIRED.length + 1);
    expect(ids(e, "check")).toEqual(["representative_declaration", "office_commission_documents"]);
  });

  it("カテゴリー証明の注記は「カテゴリー1：…／カテゴリー2・3：…」", () => {
    const r = KEIEI_KANRI_COE.rules.find((x) => x.id === "category_proof");
    expect(r?.categories).toEqual(["1", "2", "3"]);
    expect(r?.note).toContain("カテゴリー1：");
    expect(r?.note).toContain("カテゴリー2・3：");
  });

  it("事業規模の資料に、事業内容を明らかにする資料（1）で登記事項証明書を提出済みなら不要の備考がある（認定・変更とも）", () => {
    for (const rs of [KEIEI_KANRI_COE, KEIEI_KANRI_CHANGE]) {
      const r = rs.rules.find((x) => x.id === "business_scale_documents");
      expect(r?.note).toBe("事業内容を明らかにする資料（1）として登記事項証明書を提出済みの場合は不要");
    }
  });
});

function ruleOrder(id: string): number {
  return KEIEI_KANRI_COE.rules.findIndex((r) => r.id === id);
}

describe("経営・管理 更新・変更のカテゴリー別判定", () => {
  it("更新：カテゴリー3・4で決算文書・登記事項証明書が必要、カテゴリー1は共通とカテゴリー証明のみ", () => {
    const c1 = evaluate(make("renewal", "1"));
    expect(ids(c1, "required")).toEqual(["application_form", "photo", "passport_card", "category_proof"]);
    expect(ids(c1, "check")).toEqual([]);
    expect(ids(evaluate(make("renewal", "4")), "required")).toEqual(expect.arrayContaining(["financial_statements", "registry_certificate"]));
    expect(ids(evaluate(make("renewal", "2")), "required")).toContain("statutory_report_total");
  });

  it("更新：許認可・常勤職員・日本語能力・活動内容の説明・公租公課はカテゴリー3・4、源泉徴収の免除はカテゴリー4のみ", () => {
    const same = ["business_licenses", "full_time_staff_documents", "japanese_ability", "activity_summary_document", "resident_tax_certificates", "public_dues_documents"];
    for (const c of ["3", "4"] as const) expect(ids(evaluate(make("renewal", c)), "required")).toEqual(expect.arrayContaining(same));
    for (const c of ["1", "2"] as const) expect(ids(evaluate(make("renewal", c)), "required").filter((i) => same.includes(i))).toEqual([]);
    expect(ids(evaluate(make("renewal", "4")), "required")).toContain("withholding_exemption_documents");
    expect(ids(evaluate(make("renewal", "3")), "required")).not.toContain("withholding_exemption_documents");
  });

  it("更新：公租公課は1規則で、法人・個人の別は注記で案内する（入力項目に依らない）", () => {
    const rules = KEIEI_KANRI_RENEWAL.rules.filter((r) => r.id.includes("public_dues"));
    expect(rules).toHaveLength(1);
    expect(rules[0].when).toBeUndefined();
    expect(rules[0].note).toContain("法人");
    expect(rules[0].note).toContain("個人");
  });

  it("更新：事務所用施設は要確認で、更新の案内ページ・チェックシートにないと注記する。登記事項証明書は法人の場合のみ", () => {
    const e = evaluate(make("renewal", "4"));
    expect(ids(e, "check")).toContain("office_facility_documents");
    expect(ids(e, "required")).not.toContain("office_facility_documents");
    expect(KEIEI_KANRI_RENEWAL.rules.find((r) => r.id === "office_facility_documents")?.note).toBe("更新の案内ページ・チェックシートには記載なし");
    expect(KEIEI_KANRI_RENEWAL.rules.find((r) => r.id === "registry_certificate")?.note).toBe("事業を法人において行う場合のみ");
  });

  it("更新：カテゴリー1の証明の注記に、JETROは更新のチェックシートのみと明記する", () => {
    const r = KEIEI_KANRI_RENEWAL.rules.find((x) => x.id === "category_proof");
    expect(r?.categories).toEqual(["1"]);
    expect(r?.verify).toBe(true);
    expect(r?.note).toContain("JETRO");
    expect(r?.note).toContain("更新のチェックシートのみ");
  });

  it("認定：本邦事業所の設置の委託は要確認で、条件を注記する。ページのみの書類", () => {
    const r = KEIEI_KANRI_COE.rules.find((x) => x.id === "office_commission_documents");
    expect(r?.level).toBe("check");
    expect(r?.verify).toBe(true);
    expect(r?.note).toContain("不在の間");
    expect(KEIEI_KANRI_CHANGE.rules.some((x) => x.id === "office_commission_documents")).toBe(false);
  });

  it("変更：カテゴリー3の証明が必要（法定調書合計表）", () => {
    expect(ids(evaluate(make("change", "3")), "required")).toContain("category_proof");
    expect(ids(evaluate(make("change", "4")), "required")).not.toContain("category_proof");
  });

  it("変更：カテゴリー4のみ法定調書不提出の理由の資料が必要", () => {
    expect(ids(evaluate(make("change", "3")), "required")).not.toContain("statutory_report_unavailable_reason");
    expect(ids(evaluate(make("change", "4")), "required")).toContain("statutory_report_unavailable_reason");
    expect(ids(evaluate(make("change", "1")), "required")).toContain("category_proof");
  });
});
