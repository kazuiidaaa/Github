import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, normalizeFormDetails, type FormDetails } from "../lib/formDetails";
import { identityNotice, reasonText, jaT } from "../lib/i18n/caseRequirements";
import { translate } from "../lib/i18n/translate";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, RESIDENCE_STATUSES, type CaseRecord } from "../lib/types";

// 照合表 acquisition-bunkakatsudo-2026-10-24.md・acquisition-nihonjinhaigusha-2026-10-24.md の、人の判断「推奨のとおり」（2026-10-24）。Issue #420
type Cause = FormDetails["acquisitionCause"];
type Identity = FormDetails["applicantIdentity"];

function make(targetStatus: string, cause: Cause, applicantIdentity: Identity = ""): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType: "acquisition", currentStatus: "", targetStatus, memo: "", workflowStatus: "preparing", createdAt: "", updatedAt: "",
    applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT }, formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause, applicantIdentity },
    requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
const ALL: Cause[] = ["", "nationalityLoss", "birth", "other"];
const set = (id: string) => RULE_SETS.find((r) => r.id === id)!;
const base = set("acquisition_by_cause");
const gij = set("gijinkoku_acquisition");
const bunka = set("bunka_katsudo_acquisition");
const nihonjin = set("nihonjin_haigusha_acquisition");
const AGENT_NOTE = "申請人本人以外の方が提出する場合。提出する方の身分を証する文書（申請取次者証明書、戸籍謄本等）の提示";

describe("文化活動の取得（BK-1〜BK-12）", () => {
  it("在留資格が文化活動の取得でこの規則集合が選ばれ、他の在留資格は従来どおり", () => {
    expect(RESIDENCE_STATUSES).toContain("文化活動");
    for (const cause of ALL) expect(evaluate(make("文化活動", cause)).ruleSet?.id).toBe("bunka_katsudo_acquisition");
    expect(evaluate(make("外交", "other")).ruleSet?.id).toBe("acquisition_by_cause");
  });

  it("判定は取得の事由だけ（alsoBasis なし）。見出しは URL 未記録の出典で、照合日は 2026-10-24", () => {
    expect(bunka.basis).toBe("acquisitionCause");
    expect(bunka.alsoBasis).toBeUndefined();
    expect(bunka.title).toBe("文化活動 在留資格取得許可申請（一部のみ整備）");
    expect(bunka.sources[0].title).toContain("URL 未記録");
    expect(bunka.sources[0].comparedAt).toBe("2026-10-24");
    expect(ruleSetComparedAt(bunka)).toBe("2026-10-24");
    expect(bunka.sources.every((s) => s.kind === "page" || s.kind === "form")).toBe(true);
  });

  it("共通の書類は技人国の取得と同じ（出生の3書類・活動に応じた資料・旅券の理由書は無い）", () => {
    for (const id of ["birth_certificate", "parents_questionnaire", "household_residence_certificate", "activity_materials", "passport_reason_statement"]) {
      expect(bunka.rules.some((r) => r.id === id), id).toBe(false);
    }
    for (const id of ["application_form", "photo", "passport_presentation", "agent_identity_document", "nationality_proof", "cause_proof"]) {
      expect(bunka.rules.find((r) => r.id === id), id).toEqual(gij.rules.find((r) => r.id === id));
    }
    expect(bunka.rules.find((r) => r.id === "photo")!.name).toBe("写真（40mm×30mm）");
    expect(bunka.rules.find((r) => r.id === "agent_identity_document")!.note).toBe(AGENT_NOTE);
    // ACQUISITION_BY_CAUSE の文言は変えない
    expect(base.checkedAt).toBe("2026-10-04");
    expect(base.rules.find((r) => r.id === "photo")!.name).toBe("写真（縦4cm×横3cm）");
  });

  it("BK-5・BK-6・BK-7：活動・業績・経費支弁の資料は全事由の必須の1行。経費支弁は(1)(2)と外国にいる場合を注記に書く", () => {
    for (const cause of ALL) {
      const e = evaluate(make("文化活動", cause));
      for (const id of ["bunka_activity_documents", "bunka_achievements", "bunka_expense_capacity"]) expect(ids(e, "required"), `${cause}:${id}`).toContain(id);
    }
    const expense = bunka.rules.find((r) => r.id === "bunka_expense_capacity")!;
    expect(expense.name).toBe("申請人の日本滞在中の経費支弁能力を証する文書");
    expect(expense.note).toContain("申請人本人が経費を支弁する場合");
    expect(expense.note).toContain("申請人本人以外の者が経費を支弁する場合");
    expect(expense.note).toContain("経費支弁者が外国にいる場合");
    expect(bunka.rules.find((r) => r.id === "bunka_achievements")!.note).toContain("次のいずれか");
  });

  it("BK-1・BK-8：専門家の経歴及び業績の資料は、専門家の指導を受ける場合のみの要確認の1行（活動の種類の欄は足さない）", () => {
    for (const cause of ALL) {
      const e = evaluate(make("文化活動", cause));
      expect(ids(e, "check")).toContain("bunka_expert_career");
      expect(ids(e, "required")).not.toContain("bunka_expert_career");
      expect(e.needsCategory).toBe(false);
    }
    const expert = bunka.rules.find((r) => r.id === "bunka_expert_career")!;
    expect(expert.note).toContain("専門家の指導を受けて修得する場合（文化活動２）のみ");
    expect(expert.note).toContain("免許等の写し");
  });

  it("BK-2：出生では、出生の書類は無く、事由を証する書類を求める。国籍離脱は国籍を証する書類", () => {
    const birth = evaluate(make("文化活動", "birth"));
    expect(ids(birth, "required")).toContain("cause_proof");
    expect(ids(birth, "required")).not.toContain("nationality_proof");
    const loss = evaluate(make("文化活動", "nationalityLoss"));
    expect(ids(loss, "required")).toContain("nationality_proof");
    expect(ids(loss, "required")).not.toContain("cause_proof");
  });
});

describe("日本人の配偶者等の取得（NH-1〜NH-20）", () => {
  it("在留資格が日本人の配偶者等の取得でこの規則集合が選ばれる。軸は取得の事由と申請人の身分", () => {
    for (const cause of ALL) expect(evaluate(make("日本人の配偶者等", cause)).ruleSet?.id).toBe("nihonjin_haigusha_acquisition");
    expect(nihonjin.basis).toBe("acquisitionCause");
    expect(nihonjin.alsoBasis).toEqual(["identity"]);
    expect(nihonjin.title).toBe("日本人の配偶者等 在留資格取得許可申請（一部のみ整備）");
    expect(nihonjin.sources[0].comparedAt).toBe("2026-10-24");
    expect(ruleSetComparedAt(nihonjin)).toBe("2026-10-24");
    expect(base.rules.find((r) => r.id === "cause_proof")!.note).toContain("日米地位協定");
  });

  it("NH-2・NH-6・NH-8：出生の書類は残し、旅券の理由書と活動に応じた資料は外す。NH-4：事由を証する書類に注記の例が無い", () => {
    const e = evaluate(make("日本人の配偶者等", "birth", "spouse"));
    expect(ids(e, "required")).toContain("birth_certificate");
    expect(nihonjin.rules.some((r) => r.id === "passport_reason_statement" || r.id === "activity_materials")).toBe(false);
    expect(nihonjin.rules.find((r) => r.id === "cause_proof")!.note).toBeUndefined();
    expect(ids(evaluate(make("日本人の配偶者等", "other", "spouse")), "required")).toContain("cause_proof");
  });

  it("NH-3・NH-7：写真は全事由の必須（名称は申請書のとおり）、申請取次者の注記は原文のとおり", () => {
    for (const cause of ALL) {
      for (const identity of ["", "spouse", "child"] as Identity[]) expect(ids(evaluate(make("日本人の配偶者等", cause, identity)), "required"), `${cause}:${identity}`).toContain("photo");
    }
    expect(nihonjin.rules.find((r) => r.id === "photo")!.name).toBe("写真（40mm×30mm）");
    expect(nihonjin.rules.find((r) => r.id === "agent_identity_document")!.note).toBe(AGENT_NOTE);
  });

  it("NH-1：身分が未選択の間は、身分に共通の書類だけを出し、案内（needsIdentity）を立てる", () => {
    const e = evaluate(make("日本人の配偶者等", "other"));
    expect(e.needsIdentity).toBe(true);
    expect(e.needsApplicantType).toBe(false);
    const shown = e.items.map((i) => i.rule.id);
    for (const id of ["nihonjin_spouse_family_register", "nihonjin_child_family_register", "nihonjin_marriage_certificate", "nihonjin_child_birth_or_adoption", "nihonjin_spouse_exchange", "passport_presentation", "nihonjin_child_passport_presentation"]) {
      expect(shown, id).not.toContain(id);
    }
    for (const id of ["nihonjin_stay_expense", "nihonjin_guarantee_letter", "household_residence_certificate", "parents_questionnaire", "application_form", "photo"]) {
      expect(ids(e, "required"), id).toContain(id);
    }
    expect(identityNotice(e)).toBe("caseRequirements.needsIdentityAxes");
    expect(translate("ja", "caseRequirements.needsIdentityAxes")).toContain("共通の書類だけ");
    expect(translate("en", "caseRequirements.needsIdentityAxes")).toContain("Spouse or Child of Japanese National");
    expect(translate("ko", "caseRequirements.needsIdentityAxes")).toContain("신분");
  });

  it("NH-11・NH-12・NH-16：配偶者を選ぶと、配偶者の戸籍謄本・結婚証明書・夫婦間の交流の資料が必須。実子・特別養子の書類は不要", () => {
    for (const cause of ALL.filter((c) => c !== "")) {
      const e = evaluate(make("日本人の配偶者等", cause, "spouse"));
      expect(e.needsIdentity).toBe(false);
      for (const id of ["nihonjin_spouse_family_register", "nihonjin_marriage_certificate", "nihonjin_spouse_exchange"]) expect(ids(e, "required"), `${cause}:${id}`).toContain(id);
      for (const id of ["nihonjin_child_family_register", "nihonjin_child_birth_or_adoption", "nihonjin_child_passport_presentation"]) expect(ids(e, "not_required"), `${cause}:${id}`).toContain(id);
    }
    const e = evaluate(make("日本人の配偶者等", "other", "spouse"));
    expect(e.items.find((i) => i.rule.id === "nihonjin_child_family_register")!.reason).toBe("申請人の身分「日本人の配偶者」では原則不要");
  });

  it("NH-11・NH-13：実子・特別養子を選ぶと、親又は養親の戸籍謄本と、出生・特別養子縁組の文書（次のいずれか、の1行）が必須。配偶者の書類は不要", () => {
    for (const cause of ALL.filter((c) => c !== "")) {
      const e = evaluate(make("日本人の配偶者等", cause, "child"));
      for (const id of ["nihonjin_child_family_register", "nihonjin_child_birth_or_adoption"]) expect(ids(e, "required"), `${cause}:${id}`).toContain(id);
      for (const id of ["nihonjin_spouse_family_register", "nihonjin_marriage_certificate", "nihonjin_spouse_exchange", "passport_presentation"]) expect(ids(e, "not_required"), `${cause}:${id}`).toContain(id);
    }
    const birthDoc = nihonjin.rules.find((r) => r.id === "nihonjin_child_birth_or_adoption")!;
    expect(birthDoc.note).toContain("次のいずれか");
    for (const word of ["日本で出生した場合", "海外で出生した場合", "特別養子の場合"]) expect(birthDoc.note).toContain(word);
  });

  it("NH-5：旅券の提示は、配偶者は必須（注記に申請人以外が提出する場合でも提示が必要）、実子・特別養子は確認が必要な書類（このページには記載が無い）", () => {
    const spouse = evaluate(make("日本人の配偶者等", "other", "spouse"));
    expect(ids(spouse, "required")).toContain("passport_presentation");
    expect(spouse.items.find((i) => i.rule.id === "passport_presentation")!.rule.note).toContain("申請人以外の方が申請書類を提出する場合であっても、提示が必要");
    const child = evaluate(make("日本人の配偶者等", "other", "child"));
    expect(ids(child, "check")).toContain("nihonjin_child_passport_presentation");
    expect(ids(child, "required")).not.toContain("passport_presentation");
    expect(child.items.find((i) => i.rule.id === "nihonjin_child_passport_presentation")!.rule.note).toContain("このページ");
    expect(child.items.find((i) => i.rule.id === "nihonjin_child_passport_presentation")!.rule.note).toContain("記載が無い");
  });

  it("NH-14・NH-9・NH-10・NH-15：滞在費用・質問書・住民票・身元保証書は、身分に関わらず全事由の必須の1行。違いは注記に書く", () => {
    for (const identity of ["spouse", "child"] as Identity[]) {
      for (const cause of ALL.filter((c) => c !== "")) {
        const e = evaluate(make("日本人の配偶者等", cause, identity));
        for (const id of ["nihonjin_stay_expense", "nihonjin_guarantee_letter", "household_residence_certificate", "parents_questionnaire"]) expect(ids(e, "required"), `${identity}:${cause}:${id}`).toContain(id);
        expect(e.items.filter((i) => i.rule.id === "nihonjin_stay_expense")).toHaveLength(1);
      }
    }
    const note = (id: string) => nihonjin.rules.find((r) => r.id === id)!.note!;
    expect(note("nihonjin_stay_expense")).toContain("(1)を提出する");
    expect(note("nihonjin_stay_expense")).toContain("収入の多い方");
    expect(note("nihonjin_guarantee_letter")).toContain("配偶者(日本人)");
    expect(note("nihonjin_guarantee_letter")).toContain("申請人の親又は養親");
    expect(note("household_residence_certificate")).toContain("3か月以内");
    expect(nihonjin.rules.find((r) => r.id === "parents_questionnaire")!.name).toBe("質問書");
  });

  it("身分の理由の文が、日本語・英語・韓国語で出る", () => {
    const e = evaluate(make("日本人の配偶者等", "other", "child"));
    const item = e.items.find((i) => i.rule.id === "nihonjin_stay_expense")!;
    expect(item.reasonCode).toEqual({ kind: "axesLevel", level: "required", cause: "other", identity: "child" });
    expect(item.reason).toBe(reasonText(jaT, item.reasonCode));
    expect(item.reason).toContain("申請人の身分「日本人の実子・特別養子」");
    expect(translate("en", "caseRequirements.reasonIdentityNotRequired", { identity: "x" })).toContain("applicant's status");
    expect(translate("ko", "caseRequirements.axisIdentity", { identity: "x" })).toContain("신분");
  });

  it("申請人の身分は、保存済みの値を正規化する（不正な値・欠けた値は未選択）", () => {
    expect(normalizeFormDetails({}).applicantIdentity).toBe("");
    expect(normalizeFormDetails(null).applicantIdentity).toBe("");
    expect(normalizeFormDetails({ applicantIdentity: "spouse" }).applicantIdentity).toBe("spouse");
    expect(normalizeFormDetails({ applicantIdentity: "child" }).applicantIdentity).toBe("child");
    expect(normalizeFormDetails({ applicantIdentity: "parent" }).applicantIdentity).toBe("");
    expect(normalizeFormDetails({ applicantIdentity: 1 }).applicantIdentity).toBe("");
  });

  it("医療など他の規則集合では、身分の注意は立たない", () => {
    expect(evaluate(make("医療", "other")).needsIdentity).toBe(false);
    expect(evaluate(make("教育", "other")).needsIdentity).toBe(false);
    expect(identityNotice({ ruleSet: null, needsIdentity: true })).toBeNull();
  });
});
