import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/requirements/evaluate";
import { HSP_EVIDENCE_REQUIRED_MARKS, RULE_SETS, hspEvidenceRule } from "@/lib/requirements/rules";
import { HSP_EVIDENCE } from "@/lib/hspPoints";
import { CHECK_DEFINITIONS } from "@/lib/checks/definitions";
import { CHECK_NAME_KEYS, checkDisplayName } from "@/lib/i18n/caseChecks";
import { jaT, reasonText, requirementName } from "@/lib/i18n/caseRequirements";
import { RULE_TEXT_TRANSLATIONS, ruleDocumentName, ruleText } from "@/lib/i18n/ruleTexts";
import { CATALOG } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/translate";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "@/lib/types";
import { EMPTY_FORM_DETAILS } from "@/lib/formDetails";

function makeCase(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType: "renewal", currentStatus: "技術・人文知識・国際業務", targetStatus: "", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS }, requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "",
    checkMemo: "", checks: [], documents: [], ...over,
  };
}

/** 規則に載る、画面に出る文言（書類名・注記・題名・出典名）の一覧 */
function ruleStrings() {
  const names = new Set<string>();
  const others = new Set<string>();
  const rules = [...RULE_SETS.flatMap((s) => s.rules), ...Object.keys(HSP_EVIDENCE).map(hspEvidenceRule)];
  for (const s of RULE_SETS) {
    others.add(s.title);
    s.sources.forEach((x) => others.add(x.title));
    // 区分の意味（選択肢に出る）
    Object.values(s.categoryDefinition ?? {}).forEach((x) => others.add(x));
  }
  for (const r of rules) {
    if (!r.id.startsWith("hsp_point_evidence_")) names.add(r.name);
    if (r.note) others.add(r.note);
  }
  return { names, others };
}

describe("規則の文言の訳表", () => {
  it("すべての書類名・注記・題名・出典名に、英語・韓国語の訳がある", () => {
    const { names, others } = ruleStrings();
    for (const lang of ["en", "ko"] as const) {
      for (const n of names) expect(ruleDocumentName(lang, n), n).not.toBe(n);
      for (const o of others) expect(ruleText(lang, o), o).not.toBe(o);
    }
  });

  it("訳表のキーは、規則に載る文言のいずれかと一致する（使われない訳がない）", () => {
    const { names, others } = ruleStrings();
    const used = new Set([...names, ...others]);
    for (const k of Object.keys(RULE_TEXT_TRANSLATIONS)) expect(used.has(k), k).toBe(true);
  });

  it("日本語は、原文のまま返す", () => {
    for (const k of Object.keys(RULE_TEXT_TRANSLATIONS)) expect(ruleText("ja", k)).toBe(k);
  });

  it("疎明資料の名称は、日本語で、元の名称と一致する", () => {
    for (const mark of Object.keys(HSP_EVIDENCE)) {
      const rule = hspEvidenceRule(mark);
      expect(requirementName(jaT, "ja", rule)).toBe(rule.name);
    }
    expect(HSP_EVIDENCE_REQUIRED_MARKS.length).toBeGreaterThan(0);
  });
});

describe("判定の理由の日本語", () => {
  it("evaluate の reason は、reasonCode から組み立てた日本語と一致する", () => {
    for (const category of ["", "1", "2", "3", "4"] as const) {
      const c = makeCase({ employment: { ...EMPTY_EMPLOYMENT, category, withholdingSpecial: false } });
      for (const i of evaluate(c).items) expect(i.reason).toBe(reasonText(jaT, i.reasonCode));
    }
    // 取得許可申請（取得の事由）
    for (const cause of ["", "birth", "other"] as const) {
      const c = makeCase({ procedureType: "acquisition", formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause } });
      const items = evaluate(c).items;
      expect(items.length).toBeGreaterThan(0);
      for (const i of items) expect(i.reason).toBe(reasonText(jaT, i.reasonCode));
    }
  });

  it("英語・韓国語の理由は、日本語と同じ種類の文になる（差し込みが残らない）", () => {
    for (const lang of ["en", "ko"] as const) {
      const t = (k: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate(lang, k, p);
      const text = reasonText(t, { kind: "conditionNotMet", note: "n" });
      expect(text).not.toMatch(/\{\w+\}/);
      expect(reasonText(t, { kind: "categoryLevel", category: "3", level: "check" })).toContain("3");
    }
  });
});

describe("申請前チェックの項目名", () => {
  it("内蔵の全項目に訳があり、日本語の訳は定義の名前と一致する", () => {
    for (const d of CHECK_DEFINITIONS) {
      const key = CHECK_NAME_KEYS[d.key];
      expect(key, d.key).toBeDefined();
      expect(translate("ja", key)).toBe(d.name);
      expect(translate("en", key)).not.toBe(d.name);
    }
  });

  it("手動項目の名前は、訳さない", () => {
    const t = (k: Parameters<typeof translate>[1]) => translate("en", k);
    expect(checkDisplayName(t, "en", { key: "manual.1", type: "manual", name: "自由記述" })).toBe("自由記述");
  });
});

describe("区分の登録", () => {
  it("新しい区分が、訳表の一覧にある", () => {
    for (const ns of ["casePage", "caseRequirements", "caseChecks"]) expect(Object.keys(CATALOG)).toContain(ns);
  });
});
