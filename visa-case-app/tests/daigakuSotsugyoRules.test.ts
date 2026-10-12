import { describe, expect, it } from "vitest";
import { noRuleMessage } from "../lib/i18n/caseNew";
import type { MessageKey } from "../lib/i18n/messages";
import { ruleText } from "../lib/i18n/ruleTexts";
import { translate, type MessageParams } from "../lib/i18n/translate";
import { evaluate, notApplicableMessage, supportedEntries } from "../lib/requirements/evaluate";
import { DAIGAKU_SOTSUGYO_CHANGE, DAIGAKU_SOTSUGYO_COE, DAIGAKU_SOTSUGYO_RENEWAL, RULE_SETS, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

// 特定活動（本邦大学等卒業者。告示46号。種別 daigakuSotsugyo）の規則集合（Issue #300）

const tFor = (lang: "ja" | "en" | "ko") => (key: MessageKey, params?: MessageParams) => translate(lang, key, params);
const ids = (s: RuleSet) => s.rules.map((r) => r.id);
const levelOf = (s: RuleSet, id: string) => s.rules.find((r) => r.id === id)?.level;

function make(procedureType: string, type: "tokuteiKenkyu" | "daigakuSotsugyo" | "tokuteiJoho" | ""): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType, currentStatus: procedureType === "coe" ? "" : "特定活動", targetStatus: procedureType === "renewal" ? "" : "特定活動", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS, tokuteiKatsudoType: type }, requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "",
    checkMemo: "", checks: [], documents: [],
  } as CaseRecord;
}

describe("本邦大学等卒業者の規則集合", () => {
  const sets = [DAIGAKU_SOTSUGYO_COE, DAIGAKU_SOTSUGYO_CHANGE, DAIGAKU_SOTSUGYO_RENEWAL];

  it("認定・変更・更新の3件が、RULE_SETS の末尾（特定研究等活動のあと）にある", () => {
    expect(RULE_SETS.slice(-3)).toEqual([DAIGAKU_SOTSUGYO_RENEWAL, DAIGAKU_SOTSUGYO_CHANGE, DAIGAKU_SOTSUGYO_COE]);
    expect(sets.map((s) => s.procedureType)).toEqual(["coe", "change", "renewal"]);
  });

  it("種別 daigakuSotsugyo・在留資格「特定活動」で、出典に入管庁の案内ページを持ち、規則の id に重複がない", () => {
    for (const s of sets) {
      expect(s.subtype).toBe("daigakuSotsugyo");
      expect(s.residenceStatus).toBe("特定活動");
      expect(s.sources.map((x) => x.url)).toEqual(["https://www.moj.go.jp/isa/applications/status/designatedactivities11.html"]);
      expect(new Set(ids(s)).size, s.id).toBe(ids(s).length);
    }
  });

  it("認定：本人の書類（申請書・写真・返信用封筒・労働条件の文書・学歴・日本語能力・事業内容・代表者の申告書）が必須。旅券の写しは任意で、在留カードの提示は含まない", () => {
    for (const id of ["application_form", "photo", "return_envelope", "labor_conditions_document", "education_documents", "japanese_ability", "business_description", "representative_declaration"]) {
      expect(levelOf(DAIGAKU_SOTSUGYO_COE, id), id).toBe("required");
    }
    expect(levelOf(DAIGAKU_SOTSUGYO_COE, "employment_reason")).toBe("check");
    expect(levelOf(DAIGAKU_SOTSUGYO_COE, "passport_copy")).toBe("optional");
    expect(ids(DAIGAKU_SOTSUGYO_COE)).not.toContain("passport_card");
  });

  it("変更：認定と同じ本人の書類に加え、旅券・在留カードの提示が必須。返信用封筒は含まない", () => {
    expect(levelOf(DAIGAKU_SOTSUGYO_CHANGE, "passport_card")).toBe("required");
    for (const id of ["labor_conditions_document", "education_documents", "japanese_ability", "business_description", "representative_declaration"]) {
      expect(levelOf(DAIGAKU_SOTSUGYO_CHANGE, id), id).toBe("required");
    }
    expect(ids(DAIGAKU_SOTSUGYO_CHANGE)).not.toContain("return_envelope");
  });

  it("更新：代表者の申告書と住民税の証明書が必須。学歴・日本語能力・労働条件の文書は含まない", () => {
    expect(levelOf(DAIGAKU_SOTSUGYO_RENEWAL, "representative_declaration")).toBe("required");
    expect(levelOf(DAIGAKU_SOTSUGYO_RENEWAL, "resident_tax_certificates")).toBe("required");
    for (const id of ["education_documents", "japanese_ability", "labor_conditions_document", "business_description"]) {
      expect(ids(DAIGAKU_SOTSUGYO_RENEWAL), id).not.toContain(id);
    }
  });

  it("家族の書類（扶養者との身分関係・扶養者の在職・収入）は含まない（家族は種別「その他」）", () => {
    for (const s of sets) {
      for (const r of s.rules) expect(r.name, `${s.id}/${r.id}`).not.toMatch(/扶養者/);
    }
  });

  it("案件の判定：種別 daigakuSotsugyo は本規則集合に当たり、tokuteiJoho・未選択は当たらない", () => {
    expect(evaluate(make("coe", "daigakuSotsugyo")).ruleSet).toBe(DAIGAKU_SOTSUGYO_COE);
    expect(evaluate(make("change", "daigakuSotsugyo")).ruleSet).toBe(DAIGAKU_SOTSUGYO_CHANGE);
    expect(evaluate(make("renewal", "daigakuSotsugyo")).ruleSet).toBe(DAIGAKU_SOTSUGYO_RENEWAL);
    for (const p of ["coe", "change", "renewal"]) {
      expect(evaluate(make(p, "tokuteiJoho")).ruleSet).toBeNull();
      expect(evaluate(make(p, "")).ruleSet).toBeNull();
    }
  });

  it("書類名と注記に、英語・韓国語の訳がある", () => {
    for (const s of [...sets, ...RULE_SETS.filter((x) => x.subtype === "tokuteiKenkyu")]) {
      for (const text of [s.title, ...s.sources.map((x) => x.title)]) {
        expect(ruleText("en", text), text).not.toBe(text);
        expect(ruleText("ko", text), text).not.toBe(text);
      }
    }
  });
});

describe("案件作成画面の「未整備」案内：特定活動は1件にまとめ、対応済みの種別だけを示す", () => {
  it("同じ手続・在留資格の組み合わせは1件にまとまり、特定活動は手続ごとに1回だけ出る", () => {
    const entries = supportedEntries().filter((e) => e.status === "特定活動");
    expect(entries.map((e) => e.procedureLabel)).toHaveLength(3);
    for (const e of entries) expect(e.subtypes).toEqual(["tokuteiKenkyu", "daigakuSotsugyo"]);
  });

  it("日本語：「特定活動（特定研究等活動・本邦大学等卒業者）」で示し、未対応の種別（特定情報処理活動・その他）は出さない", () => {
    const msg = notApplicableMessage();
    expect(msg).toContain("「特定活動（特定研究等活動・本邦大学等卒業者）」の「在留資格認定証明書交付申請」");
    expect(msg.match(/「特定活動/g)).toHaveLength(3);
    expect(msg).not.toContain("特定情報処理活動");
    expect(msg).not.toContain("その他");
  });

  it("英語・韓国語でも、特定活動は手続ごとに1回で、対応済みの種別だけを括弧内に示す", () => {
    for (const lang of ["en", "ko"] as const) {
      const msg = noRuleMessage(tFor(lang));
      expect(msg.match(/特定活動/g), lang).toHaveLength(3);
      expect(msg, lang).not.toContain("{");
    }
    expect(noRuleMessage(tFor("en"))).toContain("特定活動 (Designated research activities, Graduates of Japanese universities, etc.)");
    expect(noRuleMessage(tFor("ko"))).toContain("特定活動 (특정 연구 등 활동, 본방 대학 등 졸업자)");
  });

  it("日本語の出力は、画面側（noRuleMessage）と一致する", () => {
    expect(noRuleMessage(tFor("ja"))).toBe(notApplicableMessage());
  });
});
