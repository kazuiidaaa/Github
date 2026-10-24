import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails, type MedicalApplicantType } from "../lib/formDetails";
import { applicantTypeNotice } from "../lib/i18n/caseRequirements";
import { translate } from "../lib/i18n/translate";
import { evaluate } from "../lib/requirements/evaluate";
import { GINO_CHANGE, IRYO_CHANGE, KAIGO_CHANGE, RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// Issue #420：照合表 acquisition-iryou-2026-10-19.md（#425）・acquisition-ginou-chouri-2026-10-19.md／acquisition-gino-sonota-2026-10-19.md（#430）・
// acquisition-kaigo-2026-10-19.md（#428）の、人の判断「推奨のとおり」（2026-10-19）
type Cause = FormDetails["acquisitionCause"];

function make(status: string, cause: Cause, category: OrgCategory = "", type: MedicalApplicantType | "" = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "acquisition",
    currentStatus: "",
    targetStatus: status,
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category },
    formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause, medicalApplicantType: type },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
const ALL: Cause[] = ["", "nationalityLoss", "birth", "other"];
const set = (id: string) => RULE_SETS.find((r) => r.id === id)!;
const iryo = set("iryo_acquisition");
const gino = set("gino_acquisition");
const kaigo = set("kaigo_acquisition");
const gij = set("gijinkoku_acquisition");
const base = set("acquisition_by_cause");
const REMOVED = ["birth_certificate", "parents_questionnaire", "household_residence_certificate", "activity_materials", "passport_reason_statement"];
const CAUSE_RULE_IDS = ["application_form", "photo", "passport_presentation", "agent_identity_document", "nationality_proof", "cause_proof"];

describe("医療・技能・介護の取得：事由別の書類は技人国の取得と同じ（医療 R-4〜R-9・技能 R-2〜R-7・介護 R-2〜R-7）", () => {
  it("出生の3書類・活動に応じた資料・旅券の理由書を外し、残る事由別の書類は技人国の取得と同じ定義", () => {
    for (const rs of [iryo, gino, kaigo]) {
      for (const id of REMOVED) expect(rs.rules.some((r) => r.id === id), `${rs.id}:${id}`).toBe(false);
      for (const id of CAUSE_RULE_IDS) expect(rs.rules.find((r) => r.id === id), `${rs.id}:${id}`).toEqual(gij.rules.find((r) => r.id === id));
    }
  });

  it("写真は「写真（40mm×30mm）」で全事由の必須。注記は年齢のみ。事由を証する書類は出生も含み、日米地位協定の例は無い", () => {
    for (const rs of [iryo, gino, kaigo]) {
      const photo = rs.rules.find((r) => r.id === "photo")!;
      expect(photo.name).toBe("写真（40mm×30mm）");
      expect(photo.causes).toEqual(["nationalityLoss", "birth", "other"]);
      expect(photo.note).not.toContain("中長期在留者");
      const cause = rs.rules.find((r) => r.id === "cause_proof")!;
      expect(cause.causes).toEqual(["birth", "other"]);
      expect(cause.note).not.toContain("日米地位協定");
      expect(rs.rules.find((r) => r.id === "agent_identity_document")!.note).toContain("申請人本人以外の方が提出する場合");
    }
    for (const status of ["医療", "技能", "介護"]) {
      for (const cause of ALL) expect(ids(evaluate(make(status, cause)), "required"), `${status}:${cause}`).toContain("photo");
    }
  });

  it("ACQUISITION_BY_CAUSE は変えない", () => {
    expect(base.rules.find((r) => r.id === "photo")!.name).toBe("写真（縦4cm×横3cm）");
    expect(base.rules.some((r) => r.id === "activity_materials")).toBe(true);
    expect(base.checkedAt).toBe("2026-10-04");
  });
});

describe("医療の取得（acquisition-iryou-2026-10-19.md R-1〜R-3・R-10）", () => {
  it("R-1：iryo_acquisition が引かれ、取得の事由と申請人の区分の2つで判定する（所属機関のカテゴリーは使わない）", () => {
    expect(evaluate(make("医療", "other")).ruleSet?.id).toBe("iryo_acquisition");
    expect(iryo.basis).toBe("acquisitionCause");
    expect(iryo.alsoBasis).toEqual(["applicantType"]);
    expect(iryo.title).toContain("（一部のみ整備）");
  });

  it("R-1：区分が未選択の間は、区分に共通の書類だけを出し、needsApplicantType を立てる", () => {
    const e = evaluate(make("医療", ""));
    expect(e.needsApplicantType).toBe(true);
    expect(e.needsCause).toBe(true);
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_presentation"]);
    expect(ids(e, "check")).toEqual(["agent_identity_document", "facility_overview"]);
  });

  it("R-2・R-3：資格の文書は区分別の必須、勤務する機関の概要は両区分の要確認（認定・変更と同じ定義）", () => {
    expect(ids(evaluate(make("医療", "birth", "", "doctor")), "required")).toEqual(["application_form", "photo", "passport_presentation", "cause_proof", "medical_license_doctor"]);
    expect(ids(evaluate(make("医療", "other", "", "other")), "required")).toEqual(["application_form", "photo", "passport_presentation", "cause_proof", "medical_license_other"]);
    for (const type of ["doctor", "other"] as const) expect(ids(evaluate(make("医療", "other", "", type)), "check")).toEqual(["agent_identity_document", "facility_overview"]);
    for (const id of ["medical_license_doctor", "medical_license_other", "facility_overview"]) {
      expect(iryo.rules.find((r) => r.id === id), id).toBe(IRYO_CHANGE.rules.find((r) => r.id === id));
    }
  });

  it("区分を alsoBasis に持つ取得では、未選択の案内を「共通の書類だけ」の文にする（認定・変更・更新は従来の文）", () => {
    expect(applicantTypeNotice({ ruleSet: iryo, needsApplicantType: true })).toBe("caseRequirements.needsApplicantTypeAxes");
    expect(applicantTypeNotice({ ruleSet: IRYO_CHANGE, needsApplicantType: true })).toBe("caseRequirements.needsApplicantType");
    expect(applicantTypeNotice({ ruleSet: iryo, needsApplicantType: false })).toBeNull();
    expect(applicantTypeNotice({ ruleSet: null, needsApplicantType: true })).toBeNull();
    expect(translate("ja", "caseRequirements.needsApplicantTypeAxes")).toContain("共通の書類だけ");
  });

  it("R-10：出典は医療のページ（2026-10-19）・手続案内・申請書様式。認定・変更・更新の出典の日付は変えない", () => {
    expect(iryo.sources.find((s) => s.url.endsWith("medicalservices.html"))).toMatchObject({ kind: "page", comparedAt: "2026-10-19" });
    expect(iryo.sources.find((s) => s.url.endsWith("procedures/16-10.html"))).toMatchObject({ kind: "page" });
    expect(iryo.sources.find((s) => s.url.endsWith("930004121.xlsx"))?.comparedAt).toBeUndefined();
    expect(ruleSetComparedAt(iryo)).toBe("2026-10-19");
    expect(ruleSetComparedAt(IRYO_CHANGE)).toBe("2026-10-18");
  });
});

describe("技能の取得（acquisition-ginou-chouri・gino-sonota-2026-10-19.md R-1・R-8・R-9）", () => {
  it("R-1：gino_acquisition が引かれ、取得の事由と所属機関のカテゴリーで判定する。特定技能・技能実習は除く", () => {
    expect(evaluate(make("技能", "other")).ruleSet?.id).toBe("gino_acquisition");
    expect(gino.basis).toBe("acquisitionCause");
    expect(gino.alsoBasis).toEqual(["category"]);
    expect(evaluate(make("特定技能", "other")).ruleSet?.id).toBe("acquisition_by_cause");
    // 技能実習は専用の規則集合（#420。acquisition-ginoujisshu-2026-10-24.md）
    expect(evaluate(make("技能実習", "other")).ruleSet?.id).toBe("ginou_jisshu_acquisition");
  });

  it("R-1：カテゴリー別の書類は、変更（GINO_CHANGE）の手続共通の書類を除いた規則を、同じ定義で写す", () => {
    const changeCommonIds = ["application_form", "photo", "passport_card"];
    const fromChange = GINO_CHANGE.rules.filter((r) => !changeCommonIds.includes(r.id));
    expect(gino.rules.slice(-fromChange.length)).toEqual(fromChange);
    expect(gino.rules.some((r) => r.id === "return_envelope")).toBe(false);
  });

  it("R-5：カテゴリー・事由が未選択の間は、共通の書類（申請書・写真・旅券・業務内容・履歴書・派遣など）だけを出す", () => {
    const e = evaluate(make("技能", ""));
    expect(e.needsCategory).toBe(true);
    expect(e.needsCause).toBe(true);
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_presentation", "work_content_document", "skill_resume"]);
    expect(ids(e, "check")).toEqual(["agent_identity_document", "dispatch_documents"]);
  });

  it("R-8：カテゴリー3・4では、職歴を証明する文書を職種ごとの6行の要確認で出す", () => {
    const check = ids(evaluate(make("技能", "other", "4")), "check");
    for (const id of ["career_cook", "career_thai_cook", "career_special_skill", "career_pilot", "career_sports_instructor", "career_sommelier"]) expect(check, id).toContain(id);
    expect(ids(evaluate(make("技能", "birth", "1")), "required")).toEqual(["application_form", "photo", "passport_presentation", "cause_proof", "category_proof", "work_content_document", "skill_resume"]);
  });

  it("出典：調理師・調理師以外のページは 2026-10-19。総合のページは日付なし。変更の出典の日付は変えない", () => {
    expect(gino.sources.find((s) => s.url.endsWith("skilledlabor01.html"))).toMatchObject({ kind: "page", comparedAt: "2026-10-19" });
    expect(gino.sources.find((s) => s.url.endsWith("skilledlabor02.html"))).toMatchObject({ kind: "page", comparedAt: "2026-10-19" });
    expect(gino.sources.find((s) => s.url.endsWith("skilledlabor.html"))?.comparedAt).toBeUndefined();
    expect(ruleSetComparedAt(GINO_CHANGE)).toBe("2026-10-18");
    expect(new Set(gino.sources.map((s) => s.url)).size).toBe(gino.sources.length);
  });
});

describe("介護の取得（acquisition-kaigo-2026-10-19.md R-1・R-8）", () => {
  it("kaigo_acquisition が引かれ、取得の事由だけで判定する（alsoBasis なし）。特定技能（介護）は除く", () => {
    expect(evaluate(make("介護", "other")).ruleSet?.id).toBe("kaigo_acquisition");
    expect(kaigo.basis).toBe("acquisitionCause");
    expect(kaigo.alsoBasis).toBeUndefined();
    expect(evaluate(make("特定技能（介護）", "other")).ruleSet?.id).toBe("acquisition_by_cause");
  });

  it("R-1：KAIGO_CHANGE の6書類を、同じ名称・区分・注記で全事由に載せる（事由が未選択でも出る）", () => {
    const six = ["care_worker_registration", "working_conditions_document", "dispatch_documents", "organization_overview", "representative_declaration", "skill_transfer_declaration"];
    for (const id of six) {
      const r = kaigo.rules.find((x) => x.id === id)!;
      const c = KAIGO_CHANGE.rules.find((x) => x.id === id)!;
      expect([r.name, r.level, r.note, r.party], id).toEqual([c.name, c.level, c.note, c.party]);
      expect(r.causes, id).toEqual(["nationalityLoss", "birth", "other"]);
      expect(r.categories, id).toBeUndefined();
    }
    for (const cause of ALL) {
      const e = evaluate(make("介護", cause));
      expect(ids(e, "required"), cause).toEqual(expect.arrayContaining(["care_worker_registration", "working_conditions_document", "organization_overview", "representative_declaration"]));
      expect(ids(e, "check"), cause).toEqual(["agent_identity_document", "dispatch_documents", "skill_transfer_declaration"]);
    }
  });

  it("R-8：出典は介護のページ（2026-10-19）・手続案内・申請書様式。認定・変更・更新の出典の日付は変えない", () => {
    expect(kaigo.sources.find((s) => s.url.endsWith("nursingcare.html"))).toMatchObject({ kind: "page", comparedAt: "2026-10-19" });
    expect(ruleSetComparedAt(KAIGO_CHANGE)).toBe("2026-10-18");
  });
});

describe("照合の順序", () => {
  it("医療・技能・介護の取得は、ACQUISITION_BY_CAUSE より先に照合する", () => {
    const at = (id: string) => RULE_SETS.findIndex((r) => r.id === id);
    for (const id of ["iryo_acquisition", "gino_acquisition", "kaigo_acquisition"]) expect(at(id), id).toBeLessThan(at("acquisition_by_cause"));
  });
});
