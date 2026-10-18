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

  // 研究の定義を共用している行。研究側の定義が変わっても、技能が意図しない形に変わらないよう、技能の内容を固定する（#333 G-1〜G-4）
  describe("研究と共用している行の内容（研究側が変わっても技能は変わらない）", () => {
    const row = (rs: typeof GINO_CHANGE, id: string) => rs.rules.find((r) => r.id === id);

    it("オンライン承認・派遣・事業内容・代表者申告書は、認定・変更・更新とも、技能のPDF・ページのとおり", () => {
      for (const rs of [GINO_COE, GINO_CHANGE, GINO_RENEWAL]) {
        expect(row(rs, "online_approval_proof"), rs.id).toMatchObject({
          name: "在留申請オンラインシステムの利用申出の承認を証明する文書（承認のお知らせメール等）",
          party: "organization",
          categories: ["2"],
          level: "check",
          note: "カテゴリー2と同様の添付資料での申請を希望し、利用申出が承認された機関の場合のみ",
        });
        expect(row(rs, "dispatch_documents"), rs.id).toMatchObject({
          name: "派遣先での活動内容を明らかにする資料（労働条件通知書（雇用契約書）等）",
          party: "organization",
          categories: ["1", "2", "3", "4"],
          level: "check",
          note: "派遣契約に基づいて就労する場合（申請人が被派遣者の場合）のみ",
        });
        expect(row(rs, "representative_declaration"), rs.id).toMatchObject({
          name: "所属機関の代表者に関する申告書（参考様式）",
          party: "organization",
          categories: ["3", "4"],
          level: "required",
          note: "2026年4月15日以降の申請で提出する",
        });
        expect(row(rs, "business_description"), rs.id).toMatchObject({
          name: "事業内容を明らかにする資料（会社案内等）",
          party: "organization",
          categories: ["3", "4"],
        });
      }
      for (const rs of [GINO_COE, GINO_CHANGE]) {
        expect(row(rs, "business_description")?.note, rs.id).toContain("沿革、役員、組織、事業内容");
      }
      expect(row(GINO_RENEWAL, "business_description")).toMatchObject({ level: "check", note: "転職後、初回の更新許可申請の場合のみ" });
      expect(row(GINO_COE, "business_description")?.level).toBe("required");
      expect(row(GINO_CHANGE, "business_description")?.level).toBe("required");
    });

    it("決算文書は、カテゴリー3・4とも必須（「転勤の場合に限る」「要確認」は付かない）。カテゴリーの証明に受付印の注記は無い", () => {
      for (const rs of [GINO_COE, GINO_CHANGE]) {
        const f = row(rs, "financial_statements");
        expect(f, rs.id).toMatchObject({ categories: ["3", "4"], level: "required", note: "新規事業の場合は事業計画書" });
        expect(f?.verify, rs.id).toBeUndefined();
        expect(row(rs, "category_proof")?.note, rs.id).not.toContain("受付印");
        expect(row(rs, "category_proof")?.categories, rs.id).toEqual(["1", "2", "3"]);
      }
      for (const c of ["3", "4"] as const) {
        expect(ids(evaluate(make("change", c)), "required"), c).toContain("financial_statements");
      }
    });

    it("納期の特例の資料の名称は、ページ・PDFの原文に合わせ、認定・変更・更新の3つとも同じ（G-1）。構成は変えない", () => {
      for (const rs of [GINO_COE, GINO_CHANGE, GINO_RENEWAL]) {
        const r = row(rs, "withholding_special_approval");
        expect(r?.name, rs.id).toBe("源泉所得税の納期の特例の承認を受けていることを明らかにする資料");
        expect(r?.categories, rs.id).toEqual(["4"]);
        expect(r?.when, rs.id).toBe("withholdingSpecial");
        expect(rs.rules.some((x) => x.id === "withholding_tax_receipts"), rs.id).toBe(true);
      }
      // 徴収高計算書の名称は今のまま（G-2②）
      expect(row(GINO_CHANGE, "withholding_tax_receipts")?.name).toBe("直近3か月分の所得税徴収高計算書の写し");
    });

    it("タイ料理人の職歴の注記に、ページの括弧書き（教育を受けた期間を含む）がある（G-2①）。区分は要確認のまま", () => {
      for (const rs of [GINO_COE, GINO_CHANGE]) {
        const r = row(rs, "career_thai_cook");
        expect(r?.level, rs.id).toBe("check");
        expect(r?.note, rs.id).toContain("教育機関において教育を受けた期間を含む");
      }
    });
  });
});
