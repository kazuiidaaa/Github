import { describe, expect, it } from "vitest";
import { OFFICIAL_FORM_SPECS, officialFormScopeWarnings, type OfficialFormScope } from "../lib/documents/officialForms";
import { scopeWarningsText } from "../lib/i18n/documentsView";
import type { MessageKey } from "../lib/i18n/messages";
import { translate, type MessageParams } from "../lib/i18n/translate";
import { FORM_STATUSES, formCodeOfStatus, isFormNTokuteiCase, isStatusInFormScope } from "../lib/hspForm";
import { caseNew } from "../lib/i18n/messages/caseNew";
import { noRuleGuideText } from "../lib/i18n/caseNew";
import { evaluate, shouldShowNoRuleGuide } from "../lib/requirements/evaluate";
import { RULE_SETS, TOKUTEI_KENKYU_CHANGE, TOKUTEI_KENKYU_COE, TOKUTEI_KENKYU_RENEWAL, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

// 特定活動（研究活動等。告示36号。種別 tokuteiKenkyu）の対応（Issue #299）

const tFor = (lang: "ja" | "en" | "ko") => (key: MessageKey, params?: MessageParams) => translate(lang, key, params);

type Subtype = FormDetails["tokuteiKatsudoType"];
const TYPES: Subtype[] = ["", "tokuteiKenkyu", "tokuteiJoho", "daigakuSotsugyo", "other"];

describe("様式Nの対象範囲：特定活動は種別が tokuteiKenkyu・daigakuSotsugyo のときだけ", () => {
  it("在留資格の一覧（FORM_STATUSES）は変えない：特定活動は一覧に入らず、在留資格の文字列だけでは範囲外", () => {
    expect(Object.values(FORM_STATUSES).flat()).not.toContain("特定活動");
    expect(formCodeOfStatus("特定活動")).toBeUndefined();
    expect(isStatusInFormScope("特定活動")).toBe(false);
  });

  it.each(TYPES)("種別「%s」：特定活動の範囲判定", (type) => {
    const expected = type === "tokuteiKenkyu" || type === "daigakuSotsugyo";
    expect(isStatusInFormScope("特定活動", type)).toBe(expected);
    expect(isStatusInFormScope("特定活動（告示36号）", type)).toBe(expected);
    expect(isFormNTokuteiCase("特定活動", type)).toBe(expected);
  });

  it("特定活動ではない在留資格は、種別が残っていても範囲を変えない", () => {
    expect(isStatusInFormScope("留学", "tokuteiKenkyu")).toBe(false);
    expect(isStatusInFormScope("研究", "tokuteiKenkyu")).toBe(false);
    expect(isStatusInFormScope("介護", "tokuteiKenkyu")).toBe(true);
    expect(isFormNTokuteiCase("技術・人文知識・国際業務", "tokuteiKenkyu")).toBe(false);
  });

  const scope = (over: Partial<OfficialFormScope>): OfficialFormScope => ({ procedureType: "renewal", currentStatus: "", residenceStatus: "", ...over });

  it.each(TYPES)("更新・変更：種別「%s」のとき、様式の警告が出るのは tokuteiKenkyu・daigakuSotsugyo 以外", (type) => {
    const warn = type === "tokuteiKenkyu" || type === "daigakuSotsugyo" ? 0 : 1;
    expect(officialFormScopeWarnings(scope({ procedureType: "renewal", currentStatus: "特定活動", residenceStatus: "特定活動", tokuteiKatsudoType: type }))).toHaveLength(warn);
    expect(officialFormScopeWarnings(scope({ procedureType: "change", currentStatus: "留学", targetStatus: "特定活動", tokuteiKatsudoType: type }))).toHaveLength(warn);
  });

  it("種別を渡さない（省略）ときは、未選択と同じく警告が出る", () => {
    expect(officialFormScopeWarnings(scope({ currentStatus: "特定活動", residenceStatus: "特定活動" }))).toEqual([OFFICIAL_FORM_SPECS.renewal?.outOfScopeWarning]);
  });

  it("家事使用人などの特定活動（種別 other）の警告は、今までと同じ文面のまま", () => {
    const w = officialFormScopeWarnings(scope({ currentStatus: "特定活動", residenceStatus: "特定活動", tokuteiKatsudoType: "other" }));
    expect(w).toEqual([OFFICIAL_FORM_SPECS.renewal?.outOfScopeWarning]);
    expect(scopeWarningsText(tFor("ja"), scope({ currentStatus: "特定活動", residenceStatus: "特定活動", tokuteiKatsudoType: "other" }))).toEqual(w);
  });

  it("画面の言語別の警告も、tokuteiKenkyu のときは出ない", () => {
    for (const lang of ["ja", "en", "ko"] as const) {
      expect(scopeWarningsText(tFor(lang), scope({ currentStatus: "特定活動", residenceStatus: "特定活動", tokuteiKatsudoType: "tokuteiKenkyu" }))).toEqual([]);
    }
  });
});

describe("特定研究等活動の規則集合", () => {
  const make = (procedureType: string, subtype: Subtype): CaseRecord =>
    ({
      id: "c1", caseName: "試験", procedureType, currentStatus: "特定活動", targetStatus: "特定活動", memo: "", workflowStatus: "preparing",
      createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
      formDetails: { ...EMPTY_FORM_DETAILS, tokuteiKatsudoType: subtype }, requirementStates: {}, customRequirements: [],
      acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
    }) as CaseRecord;
  const ids = (s: RuleSet) => s.rules.map((r) => r.id);
  const levelOf = (s: RuleSet, id: string) => s.rules.find((r) => r.id === id)?.level;

  it("手続ごとに、対応する規則集合が選ばれる", () => {
    expect(evaluate(make("coe", "tokuteiKenkyu")).ruleSet).toBe(TOKUTEI_KENKYU_COE);
    expect(evaluate(make("change", "tokuteiKenkyu")).ruleSet).toBe(TOKUTEI_KENKYU_CHANGE);
    expect(evaluate(make("renewal", "tokuteiKenkyu")).ruleSet).toBe(TOKUTEI_KENKYU_RENEWAL);
  });

  it("取得（acquisition）は、事由別の規則集合のまま：種別 tokuteiKenkyu でも変わらない", () => {
    expect(evaluate(make("acquisition", "tokuteiKenkyu")).ruleSet?.id).toBe(evaluate(make("acquisition", "")).ruleSet?.id);
    expect(RULE_SETS.some((r) => r.subtype === "tokuteiKenkyu" && r.procedureType === "acquisition")).toBe(false);
  });

  it("種別が未選択・ほかの種別のときは、規則集合に当たらず、未選択のときだけ種別の注意（needsSubtype）が出る", () => {
    for (const proc of ["coe", "change", "renewal"]) {
      expect(evaluate(make(proc, "")).ruleSet).toBeNull();
      expect(evaluate(make(proc, "")).needsSubtype).toBe(true);
      for (const type of ["tokuteiJoho", "other"] as const) {
        expect(evaluate(make(proc, type)).ruleSet, `${proc}/${type}`).toBeNull();
        expect(evaluate(make(proc, type)).needsSubtype).toBe(false);
      }
    }
  });

  it("3件とも、種別 tokuteiKenkyu・在留資格「特定活動」で、出典に入管庁の案内ページを持つ", () => {
    for (const s of [TOKUTEI_KENKYU_COE, TOKUTEI_KENKYU_CHANGE, TOKUTEI_KENKYU_RENEWAL]) {
      expect(s.subtype).toBe("tokuteiKenkyu");
      expect(s.residenceStatus).toBe("特定活動");
      expect(s.sources.map((x) => x.url)).toContain("https://www.moj.go.jp/isa/applications/status/designatedactivities07.html");
      expect(new Set(ids(s)).size, s.id).toBe(ids(s).length);
    }
  });

  it("認定：申請書・写真・返信用封筒・機関の資料・活動内容の文書・経歴の文書が必須。旅券の写しは任意で、在留カードの提示は含まない", () => {
    for (const id of ["application_form", "photo", "return_envelope", "organization_brochure", "registry_certificate", "foreign_staff_list", "consent_form", "activity_documents", "career_documents"]) {
      expect(levelOf(TOKUTEI_KENKYU_COE, id), id).toBe("required");
    }
    expect(levelOf(TOKUTEI_KENKYU_COE, "passport_copy")).toBe("optional");
    expect(ids(TOKUTEI_KENKYU_COE)).not.toContain("passport_card");
  });

  it("変更：旅券・在留カードの提示が必須。退職証明書と住民税の証明書は、転職した場合のみの確認事項", () => {
    expect(levelOf(TOKUTEI_KENKYU_CHANGE, "passport_card")).toBe("required");
    expect(levelOf(TOKUTEI_KENKYU_CHANGE, "activity_documents")).toBe("required");
    expect(levelOf(TOKUTEI_KENKYU_CHANGE, "resignation_certificate")).toBe("check");
    expect(levelOf(TOKUTEI_KENKYU_CHANGE, "resident_tax_certificates")).toBe("check");
    expect(ids(TOKUTEI_KENKYU_CHANGE)).not.toContain("return_envelope");
  });

  it("更新：機関の資料は不要。住民税の証明書は必須、事業の損益計算書は事業を経営する場合のみの確認事項", () => {
    expect(levelOf(TOKUTEI_KENKYU_RENEWAL, "resident_tax_certificates")).toBe("required");
    expect(levelOf(TOKUTEI_KENKYU_RENEWAL, "activity_documents")).toBe("required");
    expect(levelOf(TOKUTEI_KENKYU_RENEWAL, "profit_loss_statement")).toBe("check");
    expect(ids(TOKUTEI_KENKYU_RENEWAL)).not.toContain("organization_brochure");
    expect(ids(TOKUTEI_KENKYU_RENEWAL)).not.toContain("career_documents");
  });

  it("カテゴリーによらず、判定結果は同じ（区分がない）", () => {
    const base = evaluate(make("renewal", "tokuteiKenkyu"));
    for (const category of ["1", "2", "3", "4"] as const) {
      const c = make("renewal", "tokuteiKenkyu");
      c.employment = { ...EMPTY_EMPLOYMENT, category };
      expect(evaluate(c).items.map((i) => i.result)).toEqual(base.items.map((i) => i.result));
    }
  });
});

describe("案件作成画面：特定活動の案内", () => {
  it("特定活動は、規則集合を足しても、作成画面の判定では「未整備」の案内の対象のまま（種別は作成後に選ぶため）", () => {
    for (const p of ["coe", "change", "renewal"]) expect(shouldShowNoRuleGuide(p, "特定活動", "特定活動")).toBe(true);
  });

  it("特定活動のときは、種別を選ぶと判定する旨の案内に切り替わる（ja・en・ko）", () => {
    for (const lang of ["ja", "en", "ko"] as const) {
      const t = tFor(lang);
      const text = noRuleGuideText(t, "特定活動");
      expect(text).toBe(caseNew[lang].tokuteiGuide);
      expect(text).not.toContain("{");
      expect(noRuleGuideText(t, "特定活動（告示36号）")).toBe(text);
    }
    expect(caseNew.ja.tokuteiGuide).toContain("特定活動の種別を選ぶと判定");
  });

  it("特定活動以外は、今までの「未整備」の案内のまま", () => {
    for (const lang of ["ja", "en", "ko"] as const) {
      const t = tFor(lang);
      expect(noRuleGuideText(t, "留学")).not.toBe(caseNew[lang].tokuteiGuide);
      expect(noRuleGuideText(t, "留学")).toContain("特定活動");
    }
  });
});

describe("ほかの特定活動（家事使用人など）の結果は変わらない", () => {
  it("種別 other の特定活動は、規則集合に当たらない", () => {
    const c = {
      id: "c1", caseName: "試験", procedureType: "renewal", currentStatus: "特定活動", targetStatus: "", memo: "", workflowStatus: "preparing",
      createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
      formDetails: { ...EMPTY_FORM_DETAILS, tokuteiKatsudoType: "other" }, requirementStates: {}, customRequirements: [],
      acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
    } as unknown as CaseRecord;
    expect(evaluate(c).ruleSet).toBeNull();
  });
});
