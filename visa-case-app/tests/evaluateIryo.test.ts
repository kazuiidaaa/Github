import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { IRYO_CHANGE, IRYO_COE, IRYO_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「医療」（Issue #302）。案内ページの「カテゴリー1・2」は申請人の区分（医師・歯科医師／それ以外）で、所属機関のカテゴリー（1〜4）ではない。
function make(procedureType: string, category: OrgCategory = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus: "医療",
    targetStatus: "医療",
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

describe("医療の規則集合", () => {
  it("認定・変更・更新が登録され、在留資格「医療」で引ける", () => {
    for (const [rs, type] of [
      [IRYO_RENEWAL, "renewal"],
      [IRYO_CHANGE, "change"],
      [IRYO_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
  });

  it("所属機関のカテゴリーでは分けない（全書類が全カテゴリー共通）", () => {
    for (const rs of [IRYO_RENEWAL, IRYO_CHANGE, IRYO_COE]) {
      expect(rs.rules.every((r) => r.categories?.length === 4), rs.id).toBe(true);
      const all = evaluate(make(rs.procedureType)).items.map((i) => i.rule.id);
      for (const c of ["1", "2", "3", "4"] as const) {
        expect(evaluate(make(rs.procedureType, c)).items.map((i) => i.rule.id), `${rs.id}:${c}`).toEqual(all);
      }
    }
  });

  it("医師・歯科医師かどうかで要否が分かれる書類は、要確認とし、注記に申請人の区分を示す", () => {
    for (const rs of [IRYO_COE, IRYO_CHANGE]) {
      for (const id of ["medical_license_doctor", "medical_license_other", "facility_overview"]) {
        const r = rs.rules.find((x) => x.id === id)!;
        expect(r.level, `${rs.id}:${id}`).toBe("check");
        expect(r.note, `${rs.id}:${id}`).toContain("医師・歯科医師");
      }
    }
  });

  it("認定：申請書・写真・返信用封筒が必要。旅券・在留カードの提示は不要", () => {
    const e = evaluate(make("coe"));
    expect(ids(e, "required")).toEqual(expect.arrayContaining(["application_form", "photo", "return_envelope"]));
    expect(e.items.some((i) => i.rule.id === "passport_card")).toBe(false);
  });

  it("変更：在留カードの提示が加わり、返信用封筒は不要", () => {
    const e = evaluate(make("change"));
    expect(ids(e, "required")).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card"]));
    expect(e.items.some((i) => i.rule.id === "return_envelope")).toBe(false);
  });

  it("更新：住民税の証明書が必要。在職証明書・資格の証明・機関の概要は、医師・歯科医師以外の場合の要確認", () => {
    const e = evaluate(make("renewal"));
    expect(ids(e, "required")).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card", "resident_tax_certificates"]));
    expect(ids(e, "check")).toEqual(expect.arrayContaining(["employment_certificate", "medical_license_other", "facility_overview"]));
    expect(e.items.some((i) => i.rule.id === "medical_license_doctor")).toBe(false);
  });

  it("出典は入管庁の医療の案内ページで、規則の識別子が各集合内で重複しない", () => {
    for (const rs of [IRYO_RENEWAL, IRYO_CHANGE, IRYO_COE]) {
      expect(rs.sources.map((s) => s.url)).toContain("https://www.moj.go.jp/isa/applications/status/medicalservices.html");
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });
});
