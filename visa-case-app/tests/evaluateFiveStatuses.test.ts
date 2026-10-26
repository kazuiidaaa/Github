import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 教授・芸術・宗教・報道・教育の認定・変更・更新（Issue #420）。入管庁の提出書類一覧（チェックシート）の○・△の位置どおりに書類を判定する。
function make(status: string, procedureType: string, category: OrgCategory = ""): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType, currentStatus: status, targetStatus: status, memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category }, formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
  } as CaseRecord;
}
const ids = (status: string, proc: string, cat: OrgCategory, level: "required" | "check" | "optional") =>
  evaluate(make(status, proc, cat)).items.filter((i) => i.effective === level).map((i) => i.rule.id);
const allIds = (status: string, proc: string, cat: OrgCategory = "") => evaluate(make(status, proc, cat)).items.map((i) => i.rule.id);

const COMMON = { coe: ["application_form", "photo", "return_envelope"], change: ["application_form", "photo", "passport_card"], renewal: ["application_form", "photo", "passport_card"] } as const;

describe("15手続（5資格×認定・変更・更新）が登録され、在留資格で引ける", () => {
  const sheets: Record<string, Record<string, string>> = {
    教授: { coe: "001404120", change: "001368410", renewal: "001368411" },
    芸術: { coe: "001404121", change: "001365828", renewal: "001365832" },
    宗教: { coe: "001404122", change: "001365798", renewal: "001365799" },
    報道: { coe: "001404123", change: "001365757", renewal: "001365760" },
    教育: { coe: "001404130", change: "001367667", renewal: "001367669" },
  };
  for (const [status, byProc] of Object.entries(sheets)) {
    for (const [proc, no] of Object.entries(byProc)) {
      it(`${status} ${proc}：規則集合があり、出典にチェックシート ${no} がある（comparedAt 2026-10-24）`, () => {
        const rs = evaluate(make(status, proc)).ruleSet;
        expect(rs?.residenceStatus).toBe(status);
        expect(rs?.procedureType).toBe(proc);
        expect(RULE_SETS).toContain(rs);
        const pdf = rs!.sources.find((s) => s.url === `https://www.moj.go.jp/isa/content/${no}.pdf`);
        expect(pdf?.kind).toBe("pdf");
        expect(pdf?.comparedAt).toBe("2026-10-24");
      });
    }
  }
});

describe("芸術（カテゴリー区分なし）", () => {
  it("認定：共通＋返信用封筒＋活動の資料・履歴書・業績の資料がすべて必須", () => {
    expect(ids("芸術", "coe", "", "required")).toEqual([...COMMON.coe, "activity_documents", "artistic_career_resume", "artistic_achievements"]);
  });
  it("変更：返信用封筒は無く、パスポート及び在留カードの提示が加わる", () => {
    expect(ids("芸術", "change", "", "required")).toEqual([...COMMON.change, "activity_documents", "artistic_career_resume", "artistic_achievements"]);
  });
  it("更新：活動の資料と住民税の証明書が必須。履歴書・業績の資料は無い", () => {
    expect(ids("芸術", "renewal", "", "required")).toEqual([...COMMON.renewal, "activity_documents", "resident_tax_certificates"]);
  });
  it("カテゴリーが未入力でも1〜4でも同じ書類", () => {
    for (const proc of ["coe", "change", "renewal"]) {
      for (const c of ["1", "2", "3", "4"] as const) expect(allIds("芸術", proc, c)).toEqual(allIds("芸術", proc));
    }
  });
});

describe("宗教（カテゴリー区分なし）", () => {
  it("認定：派遣状・概要が必須、地位及び職歴の文書は要確認（△）", () => {
    expect(ids("宗教", "coe", "", "required")).toEqual([...COMMON.coe, "dispatch_letter", "organization_overview"]);
    expect(ids("宗教", "coe", "", "check")).toEqual(["religious_status_career"]);
  });
  it("変更：認定と同じ書類（返信用封筒は無し）", () => {
    expect(ids("宗教", "change", "", "required")).toEqual([...COMMON.change, "dispatch_letter", "organization_overview"]);
    expect(ids("宗教", "change", "", "check")).toEqual(["religious_status_career"]);
  });
  it("更新：概要が必須、住民税の証明書は要確認（△）。派遣状は無い", () => {
    expect(ids("宗教", "renewal", "", "required")).toEqual([...COMMON.renewal, "organization_overview", "resident_tax_certificates"]);
    expect(ids("宗教", "renewal", "", "check")).toEqual([]);
    expect(allIds("宗教", "renewal")).not.toContain("dispatch_letter");
  });
});

describe("教授（1＝常勤・2＝非常勤）", () => {
  it("認定：区分1は共通のみ、区分2は活動の文書が加わる", () => {
    expect(ids("教授", "coe", "1", "required")).toEqual([...COMMON.coe]);
    expect(ids("教授", "coe", "2", "required")).toEqual([...COMMON.coe, "activity_proof_document"]);
  });
  it("変更：区分2のみ活動の文書", () => {
    expect(ids("教授", "change", "1", "required")).toEqual([...COMMON.change]);
    expect(ids("教授", "change", "2", "required")).toEqual([...COMMON.change, "activity_proof_document"]);
  });
  it("更新：区分2は住民税の証明書が必須、転職後の活動の文書は要確認", () => {
    expect(ids("教授", "renewal", "1", "required")).toEqual([...COMMON.renewal]);
    expect(ids("教授", "renewal", "2", "required")).toEqual([...COMMON.renewal, "resident_tax_certificates"]);
    expect(ids("教授", "renewal", "2", "check")).toEqual(["activity_proof_document"]);
  });
});

describe("報道（1＝外国記者登録証あり・2＝それ以外）", () => {
  it("認定：区分1は登録証の証明、区分2は活動の資料と報道機関の概要", () => {
    expect(ids("報道", "coe", "1", "required")).toEqual([...COMMON.coe, "registered_employer_proof"]);
    expect(ids("報道", "coe", "2", "required")).toEqual([...COMMON.coe, "activity_documents", "organization_overview"]);
  });
  it("変更：返信用封筒は無く、区分ごとの書類は認定と同じ", () => {
    expect(ids("報道", "change", "1", "required")).toEqual([...COMMON.change, "registered_employer_proof"]);
    expect(ids("報道", "change", "2", "required")).toEqual([...COMMON.change, "activity_documents", "organization_overview"]);
  });
  it("更新：区分1は登録証の写し、区分2は在職証明書と住民税の証明書。転職後の初回の資料は要確認", () => {
    expect(ids("報道", "renewal", "1", "required")).toEqual([...COMMON.renewal, "press_registration_copy"]);
    expect(ids("報道", "renewal", "1", "check")).toEqual(["registered_employer_proof"]);
    expect(ids("報道", "renewal", "2", "required")).toEqual([...COMMON.renewal, "employment_certificate", "resident_tax_certificates"]);
    // activity_documents は転職後初回（シートの No.8）。organization_overview は案内ページにあるがシートにない（照合表 参照）
    expect(ids("報道", "renewal", "2", "check")).toEqual(["activity_documents", "organization_overview"]);
  });
});

describe("教育（1＝小中高等・2＝その他常勤・3＝非常勤）", () => {
  it("認定：区分1は共通のみ、区分2は活動・履歴・事業内容、区分3は決算文書も", () => {
    expect(ids("教育", "coe", "1", "required")).toEqual([...COMMON.coe]);
    expect(ids("教育", "coe", "2", "required")).toEqual([...COMMON.coe, "activity_content_documents", "career_documents", "business_content_documents"]);
    expect(ids("教育", "coe", "3", "required")).toEqual([...COMMON.coe, "activity_content_documents", "career_documents", "business_content_documents", "financial_statements"]);
  });
  it("変更：返信用封筒は無く、区分ごとの書類は認定と同じ", () => {
    expect(ids("教育", "change", "1", "required")).toEqual([...COMMON.change]);
    expect(ids("教育", "change", "2", "required")).toEqual([...COMMON.change, "activity_content_documents", "career_documents", "business_content_documents"]);
    expect(ids("教育", "change", "3", "required")).toContain("financial_statements");
  });
  it("更新：区分2・3は住民税の証明書が必須。契約書は△、転職後の初回の資料は要確認（決算文書は区分3のみ）", () => {
    expect(ids("教育", "renewal", "1", "required")).toEqual([...COMMON.renewal]);
    expect(ids("教育", "renewal", "2", "required")).toEqual([...COMMON.renewal, "resident_tax_certificates"]);
    expect(ids("教育", "renewal", "2", "check")).toEqual(["non_employment_contract_copy", "activity_content_documents", "business_content_documents"]);
    expect(ids("教育", "renewal", "3", "check")).toEqual(["non_employment_contract_copy", "activity_content_documents", "business_content_documents", "financial_statements"]);
  });
});

describe("他の在留資格・手続に影響しない", () => {
  it("芸術・宗教の取得は、従来どおり取得の規則集合", () => {
    expect(evaluate(make("芸術", "acquisition")).ruleSet?.id).toBe("geijutsu_acquisition");
    expect(evaluate(make("宗教", "acquisition")).ruleSet?.id).toBe("shukyo_acquisition");
  });
  it("技術・人文知識・国際業務・文化活動の認定・変更・更新は、芸術・宗教の規則集合を引かない", () => {
    for (const proc of ["coe", "change", "renewal"]) {
      expect(evaluate(make("技術・人文知識・国際業務", proc)).ruleSet?.id).toBe(`gijinkoku_${proc}`);
      expect(evaluate(make("文化活動", proc)).ruleSet).toBeNull();
    }
  });
  it("芸術・宗教の認定・変更・更新の規則集合は6件で、自分の在留資格だけ", () => {
    const own = RULE_SETS.filter((rs) => /^(artist|shukyo)_(coe|change|renewal)$/.test(rs.id));
    expect(own.map((rs) => rs.residenceStatus).sort()).toEqual(["宗教", "宗教", "宗教", "芸術", "芸術", "芸術"]);
  });
});
