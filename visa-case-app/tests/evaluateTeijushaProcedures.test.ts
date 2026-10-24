import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, TEIJUSHA_TYPES, type TeijushaType } from "../lib/formDetails";
import { ruleDocumentName, ruleText } from "../lib/i18n/ruleTexts";
import { evaluate, ruleSetOfCase } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type ProcedureType } from "../lib/types";

// Issue #420：定住者の認定・変更・更新。照合表 coe-change-renewal-teijusha-2026-10-24.md。提出書類一覧（チェックシート）の項目数・条件を固定する。
type Proc = "coe" | "change" | "renewal";

function make(procedureType: ProcedureType, status: string, teijushaType: TeijushaType | "" = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus: procedureType === "renewal" ? status : "",
    targetStatus: procedureType === "renewal" ? "" : status,
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS, teijushaType },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}

const SETS: Record<Proc, RuleSet> = {
  coe: RULE_SETS.find((r) => r.id === "teijusha_coe")!,
  change: RULE_SETS.find((r) => r.id === "teijusha_change")!,
  renewal: RULE_SETS.find((r) => r.id === "teijusha_renewal")!,
};
const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
/** 区分で出る行（not_required でないもの） */
const applicable = (proc: Proc, type: TeijushaType) => evaluate(make(proc, "定住者", type)).items.filter((i) => i.effective !== "not_required");

/** チェックシートの項目数（No. の最大値）。区分 × 手続。renewal の nikkei3 は、シートが無い（TJ-CR-1） */
const SHEET_COUNTS: Record<Proc, Partial<Record<TeijushaType, number>>> = {
  coe: { nikkei3: 17, nikkei2Spouse: 12, nikkei3Spouse: 15, childPermanent: 14, childJapaneseSpouse: 11, childPermanentSpouse: 11, adoptedJapanese: 10, adoptedPermanent: 11 },
  change: { nikkei3: 16, nikkei2Spouse: 11, nikkei3Spouse: 14, childPermanent: 13, childJapaneseSpouse: 10, childPermanentSpouse: 10, adoptedJapanese: 9, adoptedPermanent: 11 },
  renewal: { nikkei2Spouse: 8, nikkei3Spouse: 9, childPermanent: 7, childJapaneseSpouse: 7, childPermanentSpouse: 6, adoptedJapanese: 7, adoptedPermanent: 6 },
};
// 共通の書類（procedureCommonRules）のうち、シートに番号のある行は申請書・写真だけ。旅券は末尾の注記（変更・更新）か、シートに無い任意の行（認定）
const NOT_NUMBERED = ["passport_card", "passport_copy", "teijusha_renewal_nikkei3_no_checksheet"];

describe("定住者の認定・変更・更新（coe-change-renewal-teijusha-2026-10-24.md）", () => {
  it("規則集合：定住者の区分だけで判定する（basis: teijushaType）。手続ごとに引かれ、取得とは別", () => {
    for (const [proc, rs] of Object.entries(SETS) as [Proc, RuleSet][]) {
      expect(rs.procedureType).toBe(proc);
      expect(rs.basis).toBe("teijushaType");
      expect(rs.alsoBasis).toBeUndefined();
      expect(rs.checkedAt).toBe("2026-10-24");
      expect(rs.sources).toHaveLength(1);
      expect(rs.sources[0]).toMatchObject({ kind: "pdf", comparedAt: "2026-10-24" });
      expect(ruleSetComparedAt(rs)).toBe("2026-10-24");
      expect(ruleSetOfCase(make(proc, "定住者"))?.id).toBe(rs.id);
    }
    expect(ruleSetOfCase(make("acquisition", "定住者"))?.id).toBe("teijusha_acquisition");
    // ほかの在留資格は引かない（永住者・永住者の配偶者等・日本人の配偶者等）
    for (const status of ["永住者", "永住者の配偶者等", "日本人の配偶者等"]) {
      for (const proc of ["coe", "change", "renewal"] as const) expect(ruleSetOfCase(make(proc, status))?.id?.startsWith("teijusha_") ?? false, `${proc}:${status}`).toBe(false);
    }
  });

  it("シートの項目数：区分 × 手続の全組み合わせで、シートの No. の数と一致する（旅券の行・更新の日系3世の知らせの行を除く）", () => {
    for (const proc of ["coe", "change", "renewal"] as const) {
      for (const [type, count] of Object.entries(SHEET_COUNTS[proc]) as [TeijushaType, number][]) {
        const rows = applicable(proc, type).filter((i) => !NOT_NUMBERED.includes(i.rule.id));
        expect(rows.length, `${proc}:${type}`).toBe(count);
      }
    }
  });

  it("区分は取得と同じ8つ。規則の teijushaTypes は、その8つだけ", () => {
    expect(TEIJUSHA_TYPES).toHaveLength(8);
    for (const rs of Object.values(SETS)) for (const r of rs.rules) for (const t of r.teijushaTypes ?? []) expect(TEIJUSHA_TYPES).toContain(t);
  });

  it("区分が未選択の間は、全区分に共通の書類（申請書・写真・パスポート及び在留カードの提示）だけを出す。認定は旅券の写し（任意）", () => {
    const coe = evaluate(make("coe", "定住者"));
    expect(coe.ruleSet?.id).toBe("teijusha_coe");
    expect(coe.needsTeijushaType).toBe(true);
    expect(coe.items.map((i) => i.rule.id)).toEqual(["application_form", "photo", "passport_copy", "return_envelope", "teijusha_identity_guarantee"]);
    expect(ids(coe, "required")).toEqual(["application_form", "photo", "return_envelope", "teijusha_identity_guarantee"]);
    const change = evaluate(make("change", "定住者"));
    expect(change.needsTeijushaType).toBe(true);
    expect(ids(change, "required")).toEqual(["application_form", "photo", "passport_card", "teijusha_identity_guarantee"]);
    // 更新は日系3世の身元保証書が無いため、身元保証書は共通でなくなる
    const renewal = evaluate(make("renewal", "定住者"));
    expect(renewal.needsTeijushaType).toBe(true);
    expect(ids(renewal, "required")).toEqual(["application_form", "photo", "passport_card"]);
    expect(ids(renewal, "check")).toEqual([]);
  });

  it("日系3世（認定・変更）：身分関係の書類・本国の証明書・本人確認の書類を出す。滞在費用の書類は必須の1行。5年を希望するときの日本語能力は要確認", () => {
    const coe = evaluate(make("coe", "定住者", "nikkei3"));
    expect(ids(coe, "required")).toEqual([
      "application_form",
      "photo",
      "return_envelope",
      "teijusha_grandparent_family_register",
      "teijusha_foreign_marriage_certificates",
      "teijusha_foreign_birth_certificates_family",
      "teijusha_stay_cost_documents",
      "teijusha_identity_guarantee",
      "teijusha_criminal_record",
      "teijusha_ancestors_existence",
      "teijusha_identity_proof",
    ]);
    expect(ids(coe, "check")).toEqual([
      "teijusha_marriage_notification_grandparents",
      "teijusha_birth_notification_applicant",
      "teijusha_death_notification",
      "teijusha_cohabitant_residence_certificate",
      "teijusha_recognition_certificate",
      "teijusha_japanese_proficiency",
    ]);
    const change = evaluate(make("change", "定住者", "nikkei3"));
    // 認定の「本邦における同居者の住民票」は、変更では「申請人の住民票」（必須）に代わる
    expect(ids(change, "required")).toContain("teijusha_residence_certificate");
    expect(ids(change, "check")).not.toContain("teijusha_cohabitant_residence_certificate");
    expect(ids(change, "required")).not.toContain("return_envelope");
    expect(ids(coe, "required")).not.toContain("teijusha_residence_certificate");
  });

  it("日系3世の更新：シートが無い（TJ-CR-1）。要確認の行を1行だけ出し、日系3世以外の更新の書類は出さない", () => {
    const e = evaluate(make("renewal", "定住者", "nikkei3"));
    expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
    expect(ids(e, "check")).toEqual(["teijusha_renewal_nikkei3_no_checksheet"]);
    const row = SETS.renewal.rules.find((r) => r.id === "teijusha_renewal_nikkei3_no_checksheet")!;
    expect(row.verify).toBe(true);
    expect(row.teijushaTypes).toEqual(["nikkei3"]);
    // 日系3世以外では出ない
    for (const type of TEIJUSHA_TYPES.filter((t) => t !== "nikkei3")) {
      expect(applicable("renewal", type).map((i) => i.rule.id), type).not.toContain("teijusha_renewal_nikkei3_no_checksheet");
    }
  });

  it("日系2世・3世の配偶者：認定は2世・3世の方の書類、変更・更新は「2世・3世の方又は申請人（収入の多い方）」の書類。3枚のシートは同じ内容", () => {
    for (const [type, who] of [["nikkei2Spouse", "2世の方"], ["nikkei3Spouse", "3世の方"]] as const) {
      const coeTax = applicable("coe", type).find((i) => i.rule.id.startsWith("teijusha_tax_certificates_"))!.rule;
      expect(coeTax.name, type).toBe(`${who}の直近1年分の住民税の課税（又は非課税）証明書及び納税証明書`);
      for (const proc of ["change", "renewal"] as const) {
        const tax = applicable(proc, type).find((i) => i.rule.id.startsWith("teijusha_tax_certificates_"))!.rule;
        expect(tax.name, `${proc}:${type}`).toBe(`${who}又は申請人（収入の多い方）の直近1年分の住民税の課税（又は非課税）証明書及び納税証明書`);
      }
      const coeResidence = applicable("coe", type).find((i) => i.rule.id.startsWith("teijusha_residence_certificate"))!.rule;
      expect(coeResidence.name, type).toBe(`${who}の住民票（世帯全員の記載があるもの）`);
      expect(applicable("change", type).find((i) => i.rule.id === "teijusha_residence_certificate")!.rule.name).toBe("申請人の住民票（世帯全員の記載があるもの）");
    }
    // 認定・変更：質問書・結婚証明書・夫婦間の交流。更新：婚姻の継続を証明する資料（質問書・結婚証明書・夫婦間の交流は無い）
    for (const type of ["nikkei2Spouse", "nikkei3Spouse"] as const) {
      for (const proc of ["coe", "change"] as const) {
        const got = applicable(proc, type).map((i) => i.rule.id);
        expect(got, `${proc}:${type}`).toEqual(expect.arrayContaining(["teijusha_questionnaire", "teijusha_applicant_marriage_certificate", "teijusha_marital_exchange_materials"]));
        expect(got).not.toContain("teijusha_marriage_continuation");
      }
      const renewal = applicable("renewal", type).map((i) => i.rule.id);
      expect(renewal).toContain("teijusha_marriage_continuation");
      for (const id of ["teijusha_questionnaire", "teijusha_applicant_marriage_certificate", "teijusha_marital_exchange_materials"]) expect(renewal).not.toContain(id);
    }
    // 日系3世の配偶者は犯罪経歴証明書と本人確認の書類があり、日系2世の配偶者には無い（認定・変更）
    expect(applicable("coe", "nikkei3Spouse").map((i) => i.rule.id)).toEqual(expect.arrayContaining(["teijusha_criminal_record", "teijusha_identity_proof", "teijusha_foreign_birth_certificate"]));
    expect(applicable("coe", "nikkei2Spouse").map((i) => i.rule.id)).not.toContain("teijusha_criminal_record");
  });

  it("更新の犯罪経歴証明書：日系3世の配偶者と日系人の扶養を受ける実子は、一度も入管当局へ提出したことがない場合だけ（要確認）。認定・変更では前者は必須、後者は日系人のときだけ（要確認）", () => {
    expect(evaluate(make("renewal", "定住者", "nikkei3Spouse")).items.find((i) => i.rule.id === "teijusha_criminal_record_renewal")).toMatchObject({ effective: "check" });
    expect(evaluate(make("renewal", "定住者", "childPermanent")).items.find((i) => i.rule.id === "teijusha_criminal_record_nikkei_supported_renewal")).toMatchObject({ effective: "check" });
    expect(evaluate(make("coe", "定住者", "nikkei3Spouse")).items.find((i) => i.rule.id === "teijusha_criminal_record")).toMatchObject({ effective: "required" });
    for (const proc of ["coe", "change"] as const) {
      const e = evaluate(make(proc, "定住者", "childPermanent"));
      for (const id of ["teijusha_criminal_record_nikkei_supported", "teijusha_ancestors_existence_nikkei_supported", "teijusha_identity_proof_nikkei_supported"]) {
        expect(e.items.find((i) => i.rule.id === id), `${proc}:${id}`).toMatchObject({ effective: "check" });
      }
    }
    // 更新の実子（扶養者が永住者の配偶者）には犯罪経歴証明書が無い
    expect(applicable("renewal", "childPermanentSpouse").map((i) => i.rule.id).some((id) => id.startsWith("teijusha_criminal_record"))).toBe(false);
  });

  it("実子・養子：扶養者別に住民票・住民税・職業収入の対象者が違う。職業収入は必須の1行で、会社勤務・自営業等・無職の内訳を注記に書く", () => {
    const expectWho: [TeijushaType, string][] = [
      ["childPermanent", "扶養者"],
      ["childJapaneseSpouse", "日本人又は日本人の配偶者の方（収入の多い方）"],
      ["childPermanentSpouse", "永住者又は永住者の配偶者の方（収入の多い方）"],
      ["adoptedJapanese", "日本人の方"],
      ["adoptedPermanent", "扶養者"],
    ];
    for (const proc of ["coe", "change", "renewal"] as const) {
      for (const [type, who] of expectWho) {
        const income = applicable(proc, type).filter((i) => i.rule.id.startsWith("teijusha_income_documents_"));
        expect(income, `${proc}:${type}`).toHaveLength(1);
        expect(income[0].effective).toBe("required");
        expect(income[0].rule.name).toBe("職業・収入を証明するもの");
        expect(income[0].rule.note).toContain(`${who}の在職証明書`);
        expect(income[0].rule.note).toContain("預貯金通帳の写し");
        const tax = applicable(proc, type).filter((i) => i.rule.id.startsWith("teijusha_tax_certificates_"));
        expect(tax, `${proc}:${type}`).toHaveLength(1);
        expect(tax[0].rule.name).toBe(`${who}の直近1年分の住民税の課税（又は非課税）証明書及び納税証明書`);
      }
    }
    // 日本人の配偶者が扶養する実子：認定・変更は日本人の住民票、更新は申請人の住民票。永住者の配偶者が扶養する実子：認定・変更は永住者等の住民票、更新は申請人の住民票
    const residence = (proc: Proc, type: TeijushaType) => applicable(proc, type).find((i) => i.rule.id.startsWith("teijusha_residence_certificate"))!.rule.name;
    expect(residence("coe", "childJapaneseSpouse")).toBe("日本人の方の住民票（世帯全員の記載があるもの）");
    expect(residence("change", "childJapaneseSpouse")).toBe("日本人の方の住民票（世帯全員の記載があるもの）");
    expect(residence("renewal", "childJapaneseSpouse")).toBe("申請人の住民票（世帯全員の記載があるもの）");
    expect(residence("change", "childPermanentSpouse")).toBe("永住者又は永住者の配偶者の方の住民票（世帯全員の記載があるもの）");
    expect(residence("renewal", "childPermanentSpouse")).toBe("申請人の住民票（世帯全員の記載があるもの）");
    expect(residence("coe", "childPermanent")).toBe("扶養者の住民票（世帯全員の記載があるもの）");
    expect(residence("change", "childPermanent")).toBe("申請人の住民票（世帯全員の記載があるもの）");
  });

  it("実子・養子（認定・変更）：理由書・出生証明書。養子（日本人）は理由書が無い。認知の証明書は日系3世と実子だけ（要確認）", () => {
    for (const proc of ["coe", "change"] as const) {
      for (const type of ["childPermanent", "childJapaneseSpouse", "childPermanentSpouse", "adoptedPermanent"] as const) {
        expect(applicable(proc, type).map((i) => i.rule.id), `${proc}:${type}`).toContain("teijusha_support_reason_statement");
      }
      expect(applicable(proc, "adoptedJapanese").map((i) => i.rule.id)).not.toContain("teijusha_support_reason_statement");
      for (const type of ["childPermanent", "childJapaneseSpouse", "childPermanentSpouse", "nikkei3"] as const) {
        expect(evaluate(make(proc, "定住者", type)).items.find((i) => i.rule.id === "teijusha_recognition_certificate"), `${proc}:${type}`).toMatchObject({ effective: "check" });
      }
      for (const type of ["adoptedJapanese", "adoptedPermanent", "nikkei2Spouse", "nikkei3Spouse"] as const) {
        expect(applicable(proc, type).map((i) => i.rule.id), `${proc}:${type}`).not.toContain("teijusha_recognition_certificate");
      }
    }
    // 更新には理由書・出生証明書は無い
    for (const type of TEIJUSHA_TYPES) {
      const got = applicable("renewal", type).map((i) => i.rule.id);
      expect(got, type).not.toContain("teijusha_support_reason_statement");
      expect(got, type).not.toContain("teijusha_foreign_birth_certificate");
    }
  });

  it("養子：養子縁組届出受理証明書は、日本人が扶養する養子は戸籍謄本に記載がないときだけ（要確認）、永住者等が扶養する養子は認定・変更で必須。家庭裁判所の許可書謄本は変更だけ（要確認）", () => {
    for (const proc of ["coe", "change"] as const) {
      expect(evaluate(make(proc, "定住者", "adoptedJapanese")).items.find((i) => i.rule.id === "teijusha_adoption_notification_adopted_japanese")).toMatchObject({ effective: "check" });
      expect(evaluate(make(proc, "定住者", "adoptedPermanent")).items.find((i) => i.rule.id === "teijusha_adoption_notification")).toMatchObject({ effective: "required" });
      expect(evaluate(make(proc, "定住者", "adoptedPermanent")).items.find((i) => i.rule.id === "teijusha_adoption_foreign_certificate")).toMatchObject({ effective: "required" });
    }
    expect(evaluate(make("change", "定住者", "adoptedPermanent")).items.find((i) => i.rule.id === "teijusha_adoption_court_permission")).toMatchObject({ effective: "check" });
    expect(SETS.coe.rules.some((r) => r.id === "teijusha_adoption_court_permission")).toBe(false);
    expect(SETS.renewal.rules.some((r) => r.id.startsWith("teijusha_adoption"))).toBe(false);
  });

  it("実子（扶養者が永住者等・永住者の配偶者）の出生届出受理証明書は、認定・変更で必須（シートに条件の記載が無い）。取得は要確認のまま", () => {
    for (const proc of ["coe", "change"] as const) {
      for (const type of ["childPermanent", "childPermanentSpouse"] as const) {
        expect(evaluate(make(proc, "定住者", type)).items.find((i) => i.rule.id === "teijusha_birth_notification_child"), `${proc}:${type}`).toMatchObject({ effective: "required" });
      }
    }
    const acq = RULE_SETS.find((r) => r.id === "teijusha_acquisition")!.rules.find((r) => r.id === "teijusha_birth_notification_child")!;
    expect(acq.level).toBe("check");
  });

  it("写真・申請書・パスポートの扱いは、手続ごとの共通の書類（procedureCommonRules）。写真の名称はシートと同じ「縦4cm×横3cm」", () => {
    for (const [proc, rs] of Object.entries(SETS) as [Proc, RuleSet][]) {
      expect(rs.rules.find((r) => r.id === "photo")?.name).toBe("写真（縦4cm×横3cm）");
      expect(rs.rules.some((r) => r.id === "passport_card"), proc).toBe(proc !== "coe");
      expect(rs.rules.find((r) => r.id === "passport_copy")?.level ?? null, proc).toBe(proc === "coe" ? "optional" : null);
    }
  });

  it("取得の既存の規則（TEIJUSHA_ACQUISITION）は変えない：規則の数・id・区分", () => {
    const acq = RULE_SETS.find((r) => r.id === "teijusha_acquisition")!;
    expect(acq.basis).toBe("acquisitionCause");
    expect(acq.alsoBasis).toEqual(["teijushaType"]);
    expect(acq.rules.some((r) => r.id === "teijusha_residence_certificate_japanese")).toBe(true);
    expect(acq.rules.some((r) => r.id === "teijusha_tax_certificates")).toBe(true);
  });

  it("訳：規則集合の題名・書類名・注記・出典名に、英語・韓国語の訳がある", () => {
    for (const rs of Object.values(SETS)) {
      for (const lang of ["en", "ko"] as const) {
        expect(ruleText(lang, rs.title), rs.title).not.toBe(rs.title);
        for (const s of rs.sources) expect(ruleText(lang, s.title), s.title).not.toBe(s.title);
        for (const r of rs.rules) {
          expect(ruleDocumentName(lang, r.name), r.name).not.toBe(r.name);
          if (r.note) expect(ruleText(lang, r.note), r.note).not.toBe(r.note);
        }
      }
    }
  });
});
