import { describe, expect, it } from "vitest";
import { buildClientGuide, requirementNameCell } from "../lib/documents/clientGuide";
import { ruleDocumentName, ruleText } from "../lib/i18n/ruleTexts";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS, TOKUTEI_JOHO_CHANGE, TOKUTEI_JOHO_COE, TOKUTEI_JOHO_RENEWAL, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

// 特定活動（特定情報処理活動。告示37号。種別 tokuteiJoho）の規則集合（Issue #334）

const sets = [TOKUTEI_JOHO_COE, TOKUTEI_JOHO_CHANGE, TOKUTEI_JOHO_RENEWAL];
const ids = (s: RuleSet) => s.rules.map((r) => r.id);
const levelOf = (s: RuleSet, id: string) => s.rules.find((r) => r.id === id)?.level;

function make(procedureType: string, type: "tokuteiJoho" | "tokuteiKenkyu" | ""): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType, currentStatus: procedureType === "coe" ? "" : "特定活動", targetStatus: procedureType === "renewal" ? "" : "特定活動", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS, tokuteiKatsudoType: type }, requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "",
    checkMemo: "", checks: [], documents: [],
  } as CaseRecord;
}

describe("特定情報処理活動（告示37号）の規則集合", () => {
  it("認定・変更・更新の3件が RULE_SETS の末尾にあり、種別 tokuteiJoho・在留資格「特定活動」で、出典に入管庁の案内ページを持ち、規則の id に重複がない", () => {
    expect(RULE_SETS.slice(-3)).toEqual([TOKUTEI_JOHO_RENEWAL, TOKUTEI_JOHO_CHANGE, TOKUTEI_JOHO_COE]);
    expect(sets.map((s) => s.procedureType)).toEqual(["coe", "change", "renewal"]);
    for (const s of sets) {
      expect(s.subtype).toBe("tokuteiJoho");
      expect(s.residenceStatus).toBe("特定活動");
      expect(s.checkedAt).toBe("2026-10-17");
      expect(s.sources.map((x) => x.url)).toEqual(["https://www.moj.go.jp/isa/applications/status/designatedactivities08.html"]);
      expect(new Set(ids(s)).size, s.id).toBe(ids(s).length);
    }
  });

  it("認定：申請書・写真・返信用封筒・機関の資料・活動内容の文書・経歴の文書が必須。旅券の写しは任意（共通ルール）で、在留カードの提示は含まない", () => {
    for (const id of ["application_form", "photo", "return_envelope", "organization_brochure", "registry_certificate", "foreign_staff_list", "consent_form", "activity_documents", "career_documents"]) {
      expect(levelOf(TOKUTEI_JOHO_COE, id), id).toBe("required");
    }
    expect(levelOf(TOKUTEI_JOHO_COE, "passport_copy")).toBe("optional");
    expect(levelOf(TOKUTEI_JOHO_COE, "organization_equivalent_documents")).toBe("check");
    expect(levelOf(TOKUTEI_JOHO_COE, "dispatch_documents")).toBe("check");
    expect(ids(TOKUTEI_JOHO_COE)).not.toContain("passport_card");
  });

  it("変更：旅券・在留カードの提示が必須。派遣・契約機関が変更された場合の書類は確認事項。返信用封筒は含まない", () => {
    expect(levelOf(TOKUTEI_JOHO_CHANGE, "passport_card")).toBe("required");
    expect(levelOf(TOKUTEI_JOHO_CHANGE, "activity_documents")).toBe("required");
    for (const id of ["dispatch_documents", "resignation_certificate", "resident_tax_certificates"]) {
      expect(levelOf(TOKUTEI_JOHO_CHANGE, id), id).toBe("check");
    }
    expect(ids(TOKUTEI_JOHO_CHANGE)).not.toContain("return_envelope");
  });

  it("変更：案内ページに記載のない経歴の文書を、独自に足していない", () => {
    expect(ids(TOKUTEI_JOHO_CHANGE)).not.toContain("career_documents");
  });

  it("更新：活動内容の文書と住民税の証明書が必須。機関の資料は不要", () => {
    expect(levelOf(TOKUTEI_JOHO_RENEWAL, "activity_documents")).toBe("required");
    expect(levelOf(TOKUTEI_JOHO_RENEWAL, "resident_tax_certificates")).toBe("required");
    expect(levelOf(TOKUTEI_JOHO_RENEWAL, "passport_card")).toBe("required");
    expect(ids(TOKUTEI_JOHO_RENEWAL)).not.toContain("organization_brochure");
    expect(ids(TOKUTEI_JOHO_RENEWAL)).not.toContain("career_documents");
  });

  it("旅券・申請書・写真は共通ルールに任せ、37号の側で独自の定義をしない（36号・46号と同じ定義）", () => {
    for (const id of ["application_form", "photo", "passport_copy", "passport_card"]) {
      for (const s of sets) {
        const own = s.rules.find((r) => r.id === id);
        if (!own) continue;
        const other = RULE_SETS.find((x) => x.subtype === "daigakuSotsugyo" && x.procedureType === s.procedureType)?.rules.find((r) => r.id === id);
        expect(own, `${s.id}/${id}`).toEqual(other);
      }
    }
  });

  it("家族の書類（扶養者）は含まない（家族は種別「その他」）", () => {
    for (const s of sets) for (const r of s.rules) expect(r.name, `${s.id}/${r.id}`).not.toMatch(/扶養者/);
  });

  it("案件の判定：種別 tokuteiJoho は手続ごとに本規則集合に当たる。未選択は当たらない。取得は事由別の規則集合のまま", () => {
    expect(evaluate(make("coe", "tokuteiJoho")).ruleSet).toBe(TOKUTEI_JOHO_COE);
    expect(evaluate(make("change", "tokuteiJoho")).ruleSet).toBe(TOKUTEI_JOHO_CHANGE);
    expect(evaluate(make("renewal", "tokuteiJoho")).ruleSet).toBe(TOKUTEI_JOHO_RENEWAL);
    expect(evaluate(make("renewal", "")).ruleSet).toBeNull();
    expect(evaluate(make("renewal", "tokuteiKenkyu")).ruleSet?.subtype).toBe("tokuteiKenkyu");
    expect(evaluate(make("acquisition", "tokuteiJoho")).ruleSet?.id).toBe(evaluate(make("acquisition", "")).ruleSet?.id);
    expect(RULE_SETS.some((r) => r.subtype === "tokuteiJoho" && r.procedureType === "acquisition")).toBe(false);
  });

  it("「任意」の書類は、不足にも要確認にも数えない（認定の旅券の写し）", () => {
    const e = evaluate(make("coe", "tokuteiJoho"));
    const passport = e.items.find((i) => i.rule.id === "passport_copy");
    expect(passport?.rule.level).toBe("optional");
    expect(e.missing.some((i) => i.rule.id === "passport_copy")).toBe(false);
    expect(e.toCheck.some((i) => i.rule.id === "passport_copy")).toBe(false);
  });

  it("題名・出典名・書類名・注記に、英語・韓国語の訳がある", () => {
    for (const s of sets) {
      for (const text of [s.title, ...s.sources.map((x) => x.title), ...s.rules.flatMap((r) => (r.note ? [r.note] : []))]) {
        expect(ruleText("en", text), text).not.toBe(text);
        expect(ruleText("ko", text), text).not.toBe(text);
      }
      for (const r of s.rules) {
        expect(ruleDocumentName("en", r.name), r.name).not.toBe(r.name);
        expect(ruleDocumentName("ko", r.name), r.name).not.toBe(r.name);
      }
    }
  });
});

describe("特定情報処理活動（告示37号）の依頼人向けの案内", () => {
  it.each(["coe", "change", "renewal"])("%s：案内に載るのは「必須」の書類だけ（任意・要確認は載せない）で、書類名は英語・韓国語とも訳がある", (procedure) => {
    const c = make(procedure, "tokuteiJoho");
    const guide = buildClientGuide(c);
    const ev = evaluate(c);
    expect(guide.items.length).toBeGreaterThan(0);
    expect(guide.items.map((i) => i.id).sort()).toEqual(ev.items.filter((i) => i.effective === "required").map((i) => i.rule.id).filter((id) => guide.items.some((g) => g.id === id)).sort());
    for (const i of guide.items) {
      expect(ev.items.find((x) => x.rule.id === i.id)?.effective, i.id).toBe("required");
      for (const lang of ["en", "ko"] as const) expect(requirementNameCell(i.id, i.name, lang).untranslated, `${lang}/${i.id}`).toBe(false);
    }
    expect(guide.items.some((i) => i.id === "passport_copy")).toBe(false);
  });
});
