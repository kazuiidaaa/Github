import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, TEIJUSHA_TYPES, normalizeFormDetails, type FormDetails, type TeijushaType } from "../lib/formDetails";
import { teijushaTypeNotice } from "../lib/i18n/caseRequirements";
import { ruleText } from "../lib/i18n/ruleTexts";
import { translate } from "../lib/i18n/translate";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

// Issue #420：照合表 acquisition-eijushahaigusha-2026-10-24.md・acquisition-teijusha-2026-10-24.md の、人の判断（2026-10-24。推奨のとおり、全件）
type Cause = FormDetails["acquisitionCause"];

function make(status: string, cause: Cause, teijushaType: TeijushaType | "" = ""): CaseRecord {
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
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause, teijushaType },
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
const set = (id: string) => RULE_SETS.find((r) => r.id === id)!;
const eh = set("eijusha_haigusha_acquisition");
const tj = set("teijusha_acquisition");
const base = set("acquisition_by_cause");
const COMMON_REQUIRED = ["application_form", "photo", "passport_presentation"];

describe("永住者の配偶者等の取得（acquisition-eijushahaigusha-2026-10-24.md EH-1〜EH-14）", () => {
  it("EH-14：eijusha_haigusha_acquisition が引かれ、取得の事由だけで判定する（alsoBasis なし）。ほかの在留資格と取り違えない", () => {
    expect(evaluate(make("永住者の配偶者等", "other")).ruleSet?.id).toBe("eijusha_haigusha_acquisition");
    expect(eh.basis).toBe("acquisitionCause");
    expect(eh.alsoBasis).toBeUndefined();
    expect(eh.title).toBe("永住者の配偶者等 在留資格取得許可申請（一部のみ整備）");
    for (const status of ["永住者", "特別永住者"]) expect(evaluate(make(status, "other")).ruleSet?.id, status).toBe("acquisition_by_cause");
  });

  it("EH-14：出典は「URL 未記録」のページ（2026-10-24）・手続案内・申請書様式。checkedAt は作成日", () => {
    expect(eh.sources[0]).toMatchObject({ kind: "page", comparedAt: "2026-10-24" });
    expect(eh.sources[0].title).toContain("URL 未記録");
    expect(eh.sources.find((s) => s.url.endsWith("procedures/16-10.html"))).toMatchObject({ kind: "page" });
    expect(eh.sources.find((s) => s.url.endsWith("930004121.xlsx"))).toMatchObject({ kind: "form" });
    expect(ruleSetComparedAt(eh)).toBe("2026-10-24");
    expect(eh.checkedAt).toBe("2026-10-24");
    expect(base.checkedAt).toBe("2026-10-04");
  });

  it("EH-2・EH-3・EH-10〜EH-12：写真は全事由の必須（40mm×30mm）、事由を証する書類は注記なし、活動に応じた資料・旅券の理由書は無い", () => {
    const photo = eh.rules.find((r) => r.id === "photo")!;
    expect(photo.name).toBe("写真（40mm×30mm）");
    expect(photo.causes).toEqual(["nationalityLoss", "birth", "other"]);
    expect(photo.note).not.toContain("中長期在留者とならない");
    const cause = eh.rules.find((r) => r.id === "cause_proof")!;
    expect(cause.causes).toEqual(["other"]);
    expect(cause.note).toBeUndefined();
    expect(eh.rules.find((r) => r.id === "agent_identity_document")!.note).toContain("申請人本人以外の方が提出する場合");
    for (const id of ["activity_materials", "passport_reason_statement", "parents_questionnaire"]) expect(eh.rules.some((r) => r.id === id), id).toBe(false);
    expect(eh.rules.find((r) => r.id === "birth_certificate")!.causes).toEqual(["birth"]);
    expect(base.rules.find((r) => r.id === "photo")!.name).toBe("写真（縦4cm×横3cm）");
  });

  it("EH-1：出生では、結婚証明書と夫婦間の交流の資料を出さない。身元保証書・住民票・質問書は要確認で、注記に「行政書士が確認」と書く", () => {
    const e = evaluate(make("永住者の配偶者等", "birth"));
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_presentation", "birth_certificate", "stay_cost_documents"]);
    expect(ids(e, "check")).toEqual(["agent_identity_document", "identity_guarantee_birth", "household_residence_certificate_birth", "questionnaire_birth"]);
    expect(e.items.some((i) => ["marriage_certificate", "marital_exchange_materials"].includes(i.rule.id) && i.effective !== "not_required")).toBe(false);
    for (const id of ["identity_guarantee_birth", "household_residence_certificate_birth", "questionnaire_birth"]) {
      expect(eh.rules.find((r) => r.id === id)!.note, id).toContain("行政書士が確認");
    }
  });

  it("EH-4〜EH-9：国籍離脱・その他では、結婚証明書・身元保証書・住民票・質問書・夫婦間の交流を必須で出す", () => {
    const matrix: [Cause, string][] = [
      ["nationalityLoss", "nationality_proof"],
      ["other", "cause_proof"],
    ];
    for (const [cause, causeDoc] of matrix) {
      const e = evaluate(make("永住者の配偶者等", cause));
      expect(ids(e, "required"), cause).toEqual([
        "application_form",
        "photo",
        "passport_presentation",
        causeDoc,
        "marriage_certificate",
        "stay_cost_documents",
        "identity_guarantee",
        "household_residence_certificate",
        "questionnaire",
        "marital_exchange_materials",
      ]);
      expect(ids(e, "check"), cause).toEqual(["agent_identity_document"]);
    }
    expect(eh.rules.find((r) => r.id === "household_residence_certificate")!.name).toBe("配偶者（永住者）の世帯全員の記載のある住民票");
    expect(eh.rules.find((r) => r.id === "questionnaire")!.name).toBe("質問書");
  });

  it("EH-5：滞在費用の書類は全事由の必須の1行で、中身は注記に書く。事由が未選択でも出る", () => {
    const stay = eh.rules.filter((r) => r.id === "stay_cost_documents");
    expect(stay).toHaveLength(1);
    expect(stay[0].level).toBe("required");
    expect(stay[0].note).toContain("(1)");
    expect(stay[0].note).toContain("(2)");
    const e = evaluate(make("永住者の配偶者等", ""));
    expect(e.needsCause).toBe(true);
    expect(ids(e, "required")).toEqual([...COMMON_REQUIRED, "stay_cost_documents"]);
  });
});

describe("定住者の取得（acquisition-teijusha-2026-10-24.md TJ-1〜TJ-32）", () => {
  it("TJ-32：teijusha_acquisition が引かれ、取得の事由と定住者の区分で判定する。出典は「URL 未記録」（2026-10-24）", () => {
    expect(evaluate(make("定住者", "other")).ruleSet?.id).toBe("teijusha_acquisition");
    expect(tj.basis).toBe("acquisitionCause");
    expect(tj.alsoBasis).toEqual(["teijushaType"]);
    expect(tj.title).toBe("定住者 在留資格取得許可申請（一部のみ整備）");
    expect(tj.sources[0]).toMatchObject({ kind: "page", comparedAt: "2026-10-24" });
    expect(ruleSetComparedAt(tj)).toBe("2026-10-24");
    expect(tj.checkedAt).toBe("2026-10-24");
  });

  it("TJ-1・TJ-3：定住者の区分は8つ。仕事（会社勤め・自営業・無職）を選ぶ欄は無い", () => {
    expect(TEIJUSHA_TYPES).toHaveLength(8);
    expect(Object.keys(EMPTY_FORM_DETAILS).filter((k) => /jobType|workType|spouseOccupation/i.test(k))).toEqual([]);
    expect(normalizeFormDetails({ teijushaType: "nikkei3" }).teijushaType).toBe("nikkei3");
    expect(normalizeFormDetails({ teijushaType: "bogus" }).teijushaType).toBe("");
    expect(normalizeFormDetails(null).teijushaType).toBe("");
    for (const lang of ["ja", "en", "ko"] as const) {
      const labels = TEIJUSHA_TYPES.map((v) => translate(lang, `caseRequirements.teijushaType_${v}`));
      expect(new Set(labels).size, lang).toBe(8);
      for (const v of TEIJUSHA_TYPES) expect(translate(lang, `caseRequirements.teijushaType_${v}`), `${lang}:${v}`).not.toContain("teijushaType_");
    }
    expect(translate("ja", "caseRequirements.teijushaType_adoptedPermanent")).toBe("養子（永住者・定住者・特別永住者が扶養）");
  });

  it("TJ-1：区分が未選択の間は、共通の書類（申請書・写真・旅券・申請取次者・身元保証書）だけを出し、needsTeijushaType を立てる", () => {
    const e = evaluate(make("定住者", ""));
    expect(e.needsTeijushaType).toBe(true);
    expect(e.needsCause).toBe(true);
    expect(ids(e, "required")).toEqual([...COMMON_REQUIRED, "teijusha_identity_guarantee"]);
    expect(ids(e, "check")).toEqual(["agent_identity_document"]);
    const withCause = evaluate(make("定住者", "other"));
    expect(withCause.needsTeijushaType).toBe(true);
    expect(ids(withCause, "required")).toEqual([...COMMON_REQUIRED, "teijusha_identity_guarantee"]);
    expect(evaluate(make("定住者", "other", "nikkei3")).needsTeijushaType).toBe(false);
    expect(teijushaTypeNotice({ ruleSet: tj, needsTeijushaType: true })).toBe("caseRequirements.needsTeijushaTypeAxes");
    expect(teijushaTypeNotice({ ruleSet: tj, needsTeijushaType: false })).toBeNull();
    expect(teijushaTypeNotice({ ruleSet: null, needsTeijushaType: true })).toBeNull();
    expect(translate("ja", "caseRequirements.needsTeijushaTypeAxes")).toContain("共通の書類だけ");
  });

  it("日系3世：身分関係・滞在費用・本国の証明書・犯罪経歴などを出し、収入の書類・夫婦間の交流は出さない。日本語能力は要確認", () => {
    const e = evaluate(make("定住者", "other", "nikkei3"));
    expect(ids(e, "required")).toEqual([
      "application_form",
      "photo",
      "passport_presentation",
      "cause_proof",
      "teijusha_identity_guarantee",
      "teijusha_questionnaire",
      "teijusha_residence_certificate",
      "teijusha_stay_cost_documents",
      "teijusha_grandparent_family_register",
      "teijusha_foreign_marriage_certificates",
      "teijusha_foreign_birth_certificates_family",
      "teijusha_criminal_record",
      "teijusha_ancestors_existence",
      "teijusha_identity_proof",
    ]);
    expect(ids(e, "check")).toEqual([
      "agent_identity_document",
      "teijusha_marriage_notification_grandparents",
      "teijusha_birth_notification_applicant",
      "teijusha_death_notification",
      "teijusha_recognition_certificate",
      "teijusha_japanese_proficiency",
    ]);
  });

  it("TJ-2・TJ-15：日系2世・3世の配偶者は、収入の書類を必須の1行（仕事ごとの違いは注記）にまとめる。夫婦間の交流・結婚証明書は必須", () => {
    const income = tj.rules.filter((r) => r.id === "teijusha_income_documents");
    expect(income).toHaveLength(1);
    expect(income[0].note).toContain("在職証明書");
    expect(income[0].note).toContain("確定申告書の控えの写し");
    expect(income[0].note).toContain("預貯金通帳の写し");
    const n2 = evaluate(make("定住者", "other", "nikkei2Spouse"));
    expect(ids(n2, "required")).toEqual([
      "application_form",
      "photo",
      "passport_presentation",
      "cause_proof",
      "teijusha_identity_guarantee",
      "teijusha_questionnaire",
      "teijusha_residence_certificate",
      "teijusha_tax_certificates",
      "teijusha_income_documents",
      "teijusha_applicant_marriage_certificate",
      "teijusha_marital_exchange_materials",
    ]);
    expect(ids(n2, "check")).toEqual(["agent_identity_document", "teijusha_marriage_notification", "teijusha_japanese_proficiency"]);
    const n3 = evaluate(make("定住者", "other", "nikkei3Spouse"));
    for (const id of ["teijusha_foreign_birth_certificate", "teijusha_criminal_record", "teijusha_identity_proof"]) expect(ids(n3, "required"), id).toContain(id);
    for (const id of ["teijusha_foreign_birth_certificate", "teijusha_criminal_record", "teijusha_identity_proof"]) expect(ids(n2, "required"), id).not.toContain(id);
  });

  it("TJ-20：日本語能力の証明書は、5年を希望する場合だけ必要なので要確認にし、条件を注記に書く。日系3世・2世の配偶者・3世の配偶者だけ", () => {
    const rule = tj.rules.find((r) => r.id === "teijusha_japanese_proficiency")!;
    expect(rule.level).toBe("check");
    expect(rule.note).toContain("「5年」を希望する場合");
    for (const type of TEIJUSHA_TYPES) {
      const expected = ["nikkei3", "nikkei2Spouse", "nikkei3Spouse"].includes(type);
      expect(ids(evaluate(make("定住者", "other", type)), "check").includes("teijusha_japanese_proficiency"), type).toBe(expected);
    }
  });

  it("TJ-25：実子（永住者・定住者・特別永住者が扶養）の日系人のときだけの3書類は要確認で、条件を注記に書く。日系3世・3世の配偶者では必須", () => {
    const c1 = evaluate(make("定住者", "other", "childPermanent"));
    const nikkeiOnly = ["teijusha_criminal_record_nikkei_supported", "teijusha_ancestors_existence_nikkei_supported", "teijusha_identity_proof_nikkei_supported"];
    for (const id of nikkeiOnly) {
      expect(ids(c1, "check"), id).toContain(id);
      expect(tj.rules.find((r) => r.id === id)!.note, id).toContain("「定住者」の方の扶養を受ける日系人である場合のみ");
    }
    expect(ids(c1, "required")).toEqual([
      "application_form",
      "photo",
      "passport_presentation",
      "cause_proof",
      "teijusha_identity_guarantee",
      "teijusha_questionnaire",
      "teijusha_residence_certificate",
      "teijusha_tax_certificates",
      "teijusha_income_documents",
      "teijusha_support_reason_statement",
      "teijusha_foreign_birth_certificate",
    ]);
    for (const type of ["childJapaneseSpouse", "childPermanentSpouse", "adoptedJapanese", "adoptedPermanent"] as const) {
      for (const id of nikkeiOnly) expect(ids(evaluate(make("定住者", "other", type)), "check"), `${type}:${id}`).not.toContain(id);
    }
  });

  it("TJ-4：養子（日本人が扶養）では、事由別の3書類は要確認にし、注記に「このページには記載が無い」と書く", () => {
    for (const [cause, id] of [
      ["nationalityLoss", "nationality_proof_adopted_japanese"],
      ["birth", "birth_certificate_adopted_japanese"],
      ["other", "cause_proof_adopted_japanese"],
    ] as const) {
      const e = evaluate(make("定住者", cause, "adoptedJapanese"));
      expect(ids(e, "check"), id).toContain(id);
      expect(tj.rules.find((r) => r.id === id)!.note, id).toContain("このページには記載が無い");
      expect(e.items.find((i) => i.rule.id === id.replace("_adopted_japanese", ""))?.effective).toBe("not_required");
    }
    // 他の区分では、原文どおりの必須
    expect(ids(evaluate(make("定住者", "birth", "nikkei3")), "required")).toContain("birth_certificate");
    expect(ids(evaluate(make("定住者", "nationalityLoss", "childJapaneseSpouse")), "required")).toContain("nationality_proof");
  });

  it("TJ-29：養子（永住者・定住者・特別永住者が扶養）では、住民税の証明書・住民票・質問書は要確認で「このページには記載が無い」。ほかの書類は原文のとおり", () => {
    const e = evaluate(make("定住者", "other", "adoptedPermanent"));
    for (const id of ["teijusha_tax_certificates_adopted_permanent", "teijusha_residence_certificate_adopted_permanent", "teijusha_questionnaire_adopted_permanent"]) {
      expect(ids(e, "check"), id).toContain(id);
      expect(tj.rules.find((r) => r.id === id)!.note, id).toContain("このページには記載が無い");
    }
    expect(ids(e, "required")).toEqual([
      "application_form",
      "photo",
      "passport_presentation",
      "cause_proof",
      "teijusha_identity_guarantee",
      "teijusha_income_documents",
      "teijusha_support_reason_statement",
      "teijusha_foreign_birth_certificate",
      "teijusha_adoption_foreign_certificate",
    ]);
    expect(ids(e, "check")).toContain("teijusha_adoption_court_permission");
  });

  it("TJ-12・TJ-24・TJ-27：住民票の対象者・戸籍謄本は区分で変わる", () => {
    const name = (type: TeijushaType, ruleIdPrefix: string) => evaluate(make("定住者", "other", type)).items.find((i) => i.rule.id.startsWith(ruleIdPrefix) && i.effective === "required")?.rule.name;
    expect(name("childJapaneseSpouse", "teijusha_residence_certificate")).toBe("日本人の方の住民票（世帯全員の記載があるもの）");
    expect(name("childPermanentSpouse", "teijusha_residence_certificate")).toBe("永住者又は永住者の配偶者の方の住民票（世帯全員の記載があるもの）");
    expect(name("adoptedJapanese", "teijusha_residence_certificate")).toBe("申請人の住民票（世帯全員の記載があるもの）");
    expect(ids(evaluate(make("定住者", "other", "childJapaneseSpouse")), "required")).toContain("teijusha_japanese_family_register");
    expect(ids(evaluate(make("定住者", "other", "adoptedJapanese")), "required")).toContain("teijusha_japanese_family_register");
    expect(ids(evaluate(make("定住者", "other", "childPermanent")), "required")).not.toContain("teijusha_japanese_family_register");
    // 出生届出受理証明書は実子（永住者等・永住者の配偶者）だけ。要確認
    for (const type of ["childPermanent", "childPermanentSpouse"] as const) expect(ids(evaluate(make("定住者", "other", type)), "check")).toContain("teijusha_birth_notification_child");
    expect(ids(evaluate(make("定住者", "other", "childJapaneseSpouse")), "check")).not.toContain("teijusha_birth_notification_child");
  });

  it("原文の区分と無関係な書類を出さない：日系3世に実子・養子の書類は無く、実子・養子に日系3世の書類は無い", () => {
    const n3 = evaluate(make("定住者", "other", "nikkei3"));
    expect(n3.items.filter((i) => i.rule.id.startsWith("teijusha_support") || i.rule.id.startsWith("teijusha_adoption")).every((i) => i.effective === "not_required")).toBe(true);
    const c3 = evaluate(make("定住者", "other", "childPermanentSpouse"));
    expect(c3.items.find((i) => i.rule.id === "teijusha_grandparent_family_register")?.effective).toBe("not_required");
    expect(c3.items.find((i) => i.rule.id === "teijusha_grandparent_family_register")?.reason).toContain("定住者の区分「実子（永住者の配偶者が扶養）」では原則不要");
  });

  it("定住者の取得は、永住者の配偶者等・日本人の配偶者等の取得とは別の規則集合（共有しない）", () => {
    expect(evaluate(make("永住者の配偶者等", "other", "nikkei3")).ruleSet?.id).toBe("eijusha_haigusha_acquisition");
    expect(evaluate(make("永住者の配偶者等", "other", "nikkei3")).needsTeijushaType).toBe(false);
  });

  it("訳表：新しい注記に英語・韓国語の訳がある", () => {
    for (const rs of [eh, tj]) {
      for (const r of rs.rules) {
        if (r.note) {
          expect(ruleText("en", r.note), r.id).not.toBe(r.note);
          expect(ruleText("ko", r.note), r.id).not.toBe(r.note);
        }
      }
    }
  });
});

describe("照合の順序", () => {
  it("永住者の配偶者等・定住者の取得は、RULE_SETS に登録され、ACQUISITION_BY_CAUSE を使う他の在留資格の取得に影響しない", () => {
    expect(RULE_SETS.map((r) => r.id)).toEqual(expect.arrayContaining(["eijusha_haigusha_acquisition", "teijusha_acquisition"]));
    expect(evaluate(make("経営・管理", "other")).ruleSet?.id).not.toBe("teijusha_acquisition");
    expect(evaluate(make("", "other")).ruleSet?.id).toBe("acquisition_by_cause");
  });
});
