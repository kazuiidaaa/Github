import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, normalizeFormDetails, type FormDetails } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { IRYO_CHANGE, IRYO_COE, IRYO_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「医療」（Issue #302）。案内ページの「カテゴリー1・2」は申請人の区分（医師・歯科医師／それ以外）で、所属機関のカテゴリー（1〜4）ではない。
function make(procedureType: string, category: OrgCategory = "", medicalApplicantType: FormDetails["medicalApplicantType"] = "", status = "医療"): CaseRecord {
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
    formDetails: { ...EMPTY_FORM_DETAILS, medicalApplicantType },
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

  it("医師・歯科医師かどうかで要否が分かれる書類には、対象の申請人の区分と注記を持たせる", () => {
    for (const rs of [IRYO_COE, IRYO_CHANGE, IRYO_RENEWAL]) {
      expect(rs.basis, rs.id).toBe("applicantType");
      for (const id of ["medical_license_doctor", "medical_license_other", "facility_overview", "employment_certificate"]) {
        const r = rs.rules.find((x) => x.id === id);
        if (!r) continue;
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

  it("更新：資格の証明は、案内ページに記載がないため要確認（verify）", () => {
    const r = IRYO_RENEWAL.rules.find((x) => x.id === "medical_license_other")!;
    expect(r.level).toBe("check");
    expect(r.verify).toBe(true);
    expect(r.note).toBe("チェックシートで○（医師・歯科医師以外）。案内ページには記載なし");
  });

  it("認定・変更：機関の概要は両区分に要確認で出し、注記にチェックシートの○の位置を書く", () => {
    for (const rs of [IRYO_COE, IRYO_CHANGE]) {
      const r = rs.rules.find((x) => x.id === "facility_overview")!;
      expect(r.level).toBe("check");
      expect(r.applicantTypes).toBeUndefined();
      expect(r.note).toContain("チェックシートでは医師・歯科医師以外のみ○");
    }
    for (const t of ["doctor", "other"] as const) {
      expect(ids(evaluate(make("coe", "", t)), "check")).toContain("facility_overview");
    }
  });

  it("出典は入管庁の医療の案内ページで、規則の識別子が各集合内で重複しない", () => {
    for (const rs of [IRYO_RENEWAL, IRYO_CHANGE, IRYO_COE]) {
      expect(rs.sources.map((s) => s.url)).toContain("https://www.moj.go.jp/isa/applications/status/medicalservices.html");
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });
});

// 申請人の区分（Issue #310）。formDetails.medicalApplicantType で、区分ごとに書類を必須／該当なしに切り替える。
const level = (e: ReturnType<typeof evaluate>, id: string) => e.items.find((i) => i.rule.id === id)?.effective;

describe("医療の申請人の区分：区分ごとの書類の要否", () => {
  const expected: Record<string, Record<string, Record<string, string | undefined>>> = {
    coe: {
      doctor: { medical_license_doctor: "required", medical_license_other: "not_required", facility_overview: "check", return_envelope: "required", application_form: "required" },
      other: { medical_license_doctor: "not_required", medical_license_other: "required", facility_overview: "check", return_envelope: "required", application_form: "required" },
      "": { medical_license_doctor: "check", medical_license_other: "check", facility_overview: "check", return_envelope: "required", application_form: "required" },
    },
    change: {
      doctor: { medical_license_doctor: "required", medical_license_other: "not_required", facility_overview: "check", application_form: "required", passport_card: "required" },
      other: { medical_license_doctor: "not_required", medical_license_other: "required", facility_overview: "check", application_form: "required", passport_card: "required" },
      "": { medical_license_doctor: "check", medical_license_other: "check", facility_overview: "check", application_form: "required", passport_card: "required" },
    },
    renewal: {
      doctor: { resident_tax_certificates: "required", employment_certificate: "not_required", medical_license_other: "not_required", facility_overview: "not_required" },
      // 更新の資格証明（案内ページに記載なし）は、区分が確定しても要確認のまま。転職後の初回の更新のみの機関概要も、要確認
      other: { resident_tax_certificates: "required", employment_certificate: "required", medical_license_other: "check", facility_overview: "check" },
      "": { resident_tax_certificates: "required", employment_certificate: "check", medical_license_other: "check", facility_overview: "check" },
    },
  };
  for (const [procedure, byType] of Object.entries(expected)) {
    for (const [type, docs] of Object.entries(byType)) {
      it(`${procedure}：区分「${type || "未選択"}」`, () => {
        const e = evaluate(make(procedure, "", type as FormDetails["medicalApplicantType"]));
        for (const [id, want] of Object.entries(docs)) expect(level(e, id), `${procedure}:${type}:${id}`).toBe(want);
      });
    }
  }

  it("更新の医師・歯科医師の規則に、資格証明（医師・歯科医師）は元々含まれない", () => {
    expect(level(evaluate(make("renewal", "", "doctor")), "medical_license_doctor")).toBeUndefined();
  });

  it("区分が確定した後も、書類の一覧（規則の並び）は変わらない", () => {
    for (const procedure of ["coe", "change", "renewal"]) {
      const all = evaluate(make(procedure)).items.map((i) => i.rule.id);
      for (const t of ["doctor", "other"] as const) expect(evaluate(make(procedure, "", t)).items.map((i) => i.rule.id)).toEqual(all);
    }
  });
});

describe("医療の申請人の区分：未選択の注意（needsApplicantType）と所属機関のカテゴリー", () => {
  it("未選択のときは注意を出し、選択済みのときは出さない", () => {
    for (const procedure of ["coe", "change", "renewal"]) {
      expect(evaluate(make(procedure)).needsApplicantType).toBe(true);
      expect(evaluate(make(procedure, "", "doctor")).needsApplicantType).toBe(false);
      expect(evaluate(make(procedure, "", "other")).needsApplicantType).toBe(false);
    }
  });

  it("所属機関のカテゴリーが未入力でも、「カテゴリー未入力」の注意は出さない（区分の有無によらない）", () => {
    for (const procedure of ["coe", "change", "renewal"]) {
      for (const t of ["", "doctor", "other"] as const) {
        const e = evaluate(make(procedure, "", t));
        expect(e.needsCategory, `${procedure}:${t}`).toBe(false);
        expect(e.categoryOutOfRange, `${procedure}:${t}`).toBe(false);
      }
    }
  });

  it("所属機関のカテゴリーは判定に影響しない", () => {
    for (const t of ["", "doctor", "other"] as const) {
      const base = evaluate(make("change", "", t)).items.map((i) => [i.rule.id, i.effective]);
      for (const c of ["1", "2", "3", "4"] as const) {
        expect(evaluate(make("change", c, t)).items.map((i) => [i.rule.id, i.effective])).toEqual(base);
      }
    }
  });

  it("医療以外の在留資格では、保存済みの区分を無視し（値は消さない）、注意も出さない", () => {
    const c = make("change", "", "doctor", "技術・人文知識・国際業務");
    expect(c.formDetails.medicalApplicantType).toBe("doctor");
    const e = evaluate(c);
    expect(e.needsApplicantType).toBe(false);
    expect(e.ruleSet?.basis).not.toBe("applicantType");
    expect(evaluate(make("change", "", "doctor", "")).needsApplicantType).toBe(false);
  });

  it("規則集合の理由は、区分に合わせた文になる", () => {
    const reason = (t: FormDetails["medicalApplicantType"], id: string) => evaluate(make("change", "", t)).items.find((i) => i.rule.id === id)?.reason;
    expect(reason("", "medical_license_doctor")).toBe("申請人の区分が未選択のため要確認");
    expect(reason("doctor", "medical_license_doctor")).toBe("申請人の区分「医師・歯科医師（カテゴリー1）」で必要");
    expect(reason("doctor", "medical_license_other")).toBe("申請人の区分「医師・歯科医師（カテゴリー1）」では原則不要");
    expect(reason("other", "application_form")).toBe("全区分共通");
  });
});

describe("医療の申請人の区分：保存値の読み込み", () => {
  it("項目のない既存の案件は未選択になる", () => {
    expect(normalizeFormDetails({}).medicalApplicantType).toBe("");
    expect(normalizeFormDetails(null).medicalApplicantType).toBe("");
  });
  it("正しい値は保たれ、不正な値は未選択に直る", () => {
    expect(normalizeFormDetails({ medicalApplicantType: "doctor" }).medicalApplicantType).toBe("doctor");
    expect(normalizeFormDetails({ medicalApplicantType: "other" }).medicalApplicantType).toBe("other");
    expect(normalizeFormDetails({ medicalApplicantType: "nurse" }).medicalApplicantType).toBe("");
    expect(normalizeFormDetails({ medicalApplicantType: 1 }).medicalApplicantType).toBe("");
  });
});
