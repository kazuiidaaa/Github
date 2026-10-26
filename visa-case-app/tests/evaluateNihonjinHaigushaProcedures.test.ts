import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type ApplicantIdentity } from "../lib/formDetails";
import { identityNotice } from "../lib/i18n/caseRequirements";
import { RULE_TEXT_TRANSLATIONS, ruleDocumentName, ruleText } from "../lib/i18n/ruleTexts";
import { evaluate, ruleSetOfCase } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type ProcedureType } from "../lib/types";

// Issue #420：日本人の配偶者等の認定・変更・更新。照合表 coe-change-renewal-nihonjinhaigusha-2026-10-24.md。提出書類一覧（チェックシート）の項目数・条件を固定する。
type Proc = "coe" | "change" | "renewal";
const STATUS = "日本人の配偶者等";

function make(procedureType: ProcedureType, status: string, applicantIdentity: ApplicantIdentity | "" = "", cause: "" | "birth" = ""): CaseRecord {
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
    formDetails: { ...EMPTY_FORM_DETAILS, applicantIdentity, acquisitionCause: cause },
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
  coe: RULE_SETS.find((r) => r.id === "nihonjin_haigusha_coe")!,
  change: RULE_SETS.find((r) => r.id === "nihonjin_haigusha_change")!,
  renewal: RULE_SETS.find((r) => r.id === "nihonjin_haigusha_renewal")!,
};
const applicable = (proc: Proc, identity: ApplicantIdentity | "") => evaluate(make(proc, STATUS, identity)).items.filter((i) => i.effective !== "not_required");
const idsOf = (proc: Proc, identity: ApplicantIdentity | "") => applicable(proc, identity).map((i) => i.rule.id);

/** チェックシートの項目数（No. の最大値）。身分 × 手続 */
const SHEET_COUNTS: Record<ApplicantIdentity, Record<Proc, number>> = {
  spouse: { coe: 10, change: 9, renewal: 6 },
  child: { coe: 8, change: 7, renewal: 5 },
};
// 旅券は、シートの末尾の注記（変更・更新）か、シートに無い任意の行（認定）。番号のある項目ではない
const NOT_NUMBERED = ["passport_card", "passport_copy"];

describe("日本人の配偶者等の認定・変更・更新（coe-change-renewal-nihonjinhaigusha-2026-10-24.md）", () => {
  it("規則集合：申請人の身分だけで判定する（basis: identity）。手続ごとに引かれる", () => {
    for (const [proc, rs] of Object.entries(SETS) as [Proc, RuleSet][]) {
      expect(rs.procedureType).toBe(proc);
      expect(rs.basis).toBe("identity");
      expect(rs.alsoBasis).toBeUndefined();
      expect(ruleSetOfCase(make(proc as ProcedureType, STATUS))?.id).toBe(rs.id);
      expect(ruleSetComparedAt(rs)).toBe("2026-10-24");
      expect(rs.sources).toHaveLength(2);
    }
  });

  it("書類の内訳：身分 × 手続の項目数が、シートの No. の最大値と一致する", () => {
    for (const identity of ["spouse", "child"] as const) {
      for (const proc of ["coe", "change", "renewal"] as const) {
        const got = applicable(proc, identity).filter((i) => !NOT_NUMBERED.includes(i.rule.id));
        expect(got.length, `${identity}:${proc}`).toBe(SHEET_COUNTS[identity][proc]);
      }
    }
  });

  it("配偶者：認定は10項目、変更は9項目（返信用封筒なし）、更新は6項目（結婚証明書・質問書・夫婦間の交流なし）", () => {
    expect(idsOf("coe", "spouse")).toEqual([
      "application_form",
      "photo",
      "passport_copy",
      "nihonjin_spouse_family_register",
      "nihonjin_marriage_certificate",
      "nihonjin_stay_expense",
      "nihonjin_guarantee_letter",
      "household_residence_certificate",
      "parents_questionnaire",
      "nihonjin_spouse_exchange",
      "return_envelope",
    ]);
    expect(idsOf("change", "spouse")).toEqual([
      "application_form",
      "photo",
      "passport_card",
      "nihonjin_spouse_family_register",
      "nihonjin_marriage_certificate",
      "nihonjin_stay_expense",
      "nihonjin_guarantee_letter",
      "household_residence_certificate",
      "parents_questionnaire",
      "nihonjin_spouse_exchange",
    ]);
    expect(idsOf("renewal", "spouse")).toEqual([
      "application_form",
      "photo",
      "passport_card",
      "nihonjin_spouse_family_register",
      "nihonjin_stay_expense",
      "nihonjin_guarantee_letter",
      "household_residence_certificate",
    ]);
  });

  it("実子・特別養子：認定は8項目（扶養者／同居者の住民票・返信用封筒）、変更は7項目（申請人の住民票）、更新は5項目（戸籍謄本・身分関係の文書なし）", () => {
    expect(idsOf("coe", "child")).toEqual([
      "application_form",
      "photo",
      "passport_copy",
      "nihonjin_child_family_register",
      "nihonjin_child_birth_or_adoption",
      "nihonjin_stay_expense",
      "nihonjin_guarantee_letter",
      "nihonjin_child_supporter_residence_certificate",
      "return_envelope",
    ]);
    expect(idsOf("change", "child")).toEqual([
      "application_form",
      "photo",
      "passport_card",
      "nihonjin_child_family_register",
      "nihonjin_child_birth_or_adoption",
      "nihonjin_stay_expense",
      "nihonjin_guarantee_letter",
      "nihonjin_applicant_residence_certificate",
    ]);
    expect(idsOf("renewal", "child")).toEqual([
      "application_form",
      "photo",
      "passport_card",
      "nihonjin_stay_expense",
      "nihonjin_guarantee_letter",
      "nihonjin_applicant_residence_certificate",
    ]);
  });

  it("身分が未選択の間は、身分に共通の書類だけを出し、選択の案内を出す", () => {
    for (const proc of ["coe", "change", "renewal"] as const) {
      const e = evaluate(make(proc, STATUS, ""));
      expect(e.needsIdentity, proc).toBe(true);
      expect(identityNotice(e), proc).toBeTruthy();
      const got = e.items.map((i) => i.rule.id);
      expect(got, proc).toContain("nihonjin_stay_expense");
      expect(got, proc).toContain("nihonjin_guarantee_letter");
      expect(got, proc).not.toContain("nihonjin_spouse_family_register");
      expect(got, proc).not.toContain("nihonjin_child_family_register");
      expect(got, proc).not.toContain("household_residence_certificate");
    }
    expect(evaluate(make("coe", STATUS, "spouse")).needsIdentity).toBe(false);
  });

  it("条件の扱い：シートの項目はすべて必須（質問書は様式の内容が未確認のため要確認の旗つき）。返信用封筒は認定のみ", () => {
    for (const identity of ["spouse", "child"] as const) {
      for (const proc of ["coe", "change", "renewal"] as const) {
        for (const i of applicable(proc, identity)) {
          expect(i.effective, `${identity}:${proc}:${i.rule.id}`).toBe(i.rule.id === "passport_copy" ? "optional" : "required");
        }
      }
    }
    expect(SETS.coe.rules.find((r) => r.id === "parents_questionnaire")?.verify).toBe(true);
    expect(SETS.change.rules.some((r) => r.id === "return_envelope")).toBe(false);
    expect(SETS.renewal.rules.some((r) => r.id === "return_envelope")).toBe(false);
  });

  it("写真・申請書・パスポートの扱いは、手続ごとの共通の書類。写真の名称はシートと同じ「縦4cm×横3cm」", () => {
    for (const [proc, rs] of Object.entries(SETS) as [Proc, RuleSet][]) {
      expect(rs.rules.find((r) => r.id === "photo")?.name).toBe("写真（縦4cm×横3cm）");
      expect(rs.rules.some((r) => r.id === "passport_card"), proc).toBe(proc !== "coe");
      expect(rs.rules.find((r) => r.id === "passport_copy")?.level ?? null, proc).toBe(proc === "coe" ? "optional" : null);
    }
  });

  it("同一書類は、取得と同じ id・書類名を共有する", () => {
    const acq = RULE_SETS.find((r) => r.id === "nihonjin_haigusha_acquisition")!;
    const shared = [
      "nihonjin_spouse_family_register",
      "nihonjin_child_family_register",
      "nihonjin_marriage_certificate",
      "nihonjin_child_birth_or_adoption",
      "nihonjin_stay_expense",
      "nihonjin_guarantee_letter",
      "household_residence_certificate",
      "parents_questionnaire",
      "nihonjin_spouse_exchange",
    ];
    for (const id of shared) {
      const a = acq.rules.find((r) => r.id === id)!;
      const used = Object.values(SETS).flatMap((rs) => rs.rules.filter((r) => r.id === id));
      expect(used.length, id).toBeGreaterThan(0);
      // 実子の戸籍謄本は、認定・変更でシートの書類名が違うため別名（Issue #452 C-6。下のテスト）
      if (id === "nihonjin_child_family_register") continue;
      for (const r of used) expect(r.name, id).toBe(a.name);
    }
  });

  it("実子の戸籍謄本の書類名は、シートのとおり認定と変更で別。取得の名称は変えない（Issue #452 C-6）", () => {
    const nameOf = (rs: RuleSet) => rs.rules.find((r) => r.id === "nihonjin_child_family_register")?.name;
    expect(nameOf(SETS.coe)).toBe("申請人の親の戸籍謄本又は除籍謄本（全部事項証明書）");
    expect(nameOf(SETS.change)).toBe("日本人（申請人の親又は養親）の戸籍謄本又は除籍謄本（全部事項証明書）");
    expect(nameOf(RULE_SETS.find((r) => r.id === "nihonjin_haigusha_acquisition")!)).toBe("日本人の方（申請人の親又は養親）の戸籍謄本又は除籍謄本（全部事項証明書）");
    for (const name of [nameOf(SETS.coe)!, nameOf(SETS.change)!]) {
      expect(RULE_TEXT_TRANSLATIONS[name], name).toBeTruthy();
    }
  });

  it("取得（NIHONJIN_HAIGUSHA_ACQUISITION）の規則は変えない：基準・軸・規則の数", () => {
    const acq = RULE_SETS.find((r) => r.id === "nihonjin_haigusha_acquisition")!;
    expect(acq.basis).toBe("acquisitionCause");
    expect(acq.alsoBasis).toEqual(["identity"]);
    expect(acq.rules).toHaveLength(17);
    // 取得は、身分と事由で引き続き判定する
    const ids = evaluate(make("acquisition", STATUS, "spouse", "birth")).items.filter((i) => i.effective !== "not_required").map((i) => i.rule.id);
    expect(ids).toContain("nihonjin_marriage_certificate");
    expect(ids).toContain("passport_presentation");
    expect(ruleSetOfCase(make("acquisition", STATUS))?.id).toBe("nihonjin_haigusha_acquisition");
  });

  it("他の在留資格には影響しない：認定・変更・更新で別の在留資格は、別の規則集合を引く", () => {
    for (const proc of ["coe", "change", "renewal"] as const) {
      const own = ruleSetOfCase(make(proc, "技術・人文知識・国際業務"));
      expect(own?.id).not.toMatch(/^nihonjin_haigusha/);
      expect(own?.residenceStatus).toBe("技術・人文知識・国際業務");
      // 永住者の配偶者等・定住者に、日本人の配偶者等の規則は出ない
      for (const status of ["永住者の配偶者等", "定住者"]) {
        expect(ruleSetOfCase(make(proc, status))?.id ?? "").not.toMatch(/^nihonjin_haigusha/);
      }
    }
    // 日本人の配偶者等の規則集合は、日本人の配偶者等だけ
    for (const rs of Object.values(SETS)) expect(rs.residenceStatus).toBe(STATUS);
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
