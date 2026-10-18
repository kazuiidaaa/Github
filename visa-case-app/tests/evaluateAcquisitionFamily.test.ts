import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { evaluate, hasRuleSetFor, shouldShowNoRuleGuide } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// Issue #396：照合表 acquisition-gijinkoku-kazokutaizai-2026-10-18.md の、人の判断「推奨のとおり」（2026-10-18）の6件（R-2・R-8・R-9・R-10・R-12・R-17）
type Cause = FormDetails["acquisitionCause"];

function make(cause: Cause, over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "acquisition",
    currentStatus: "",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
const ALL: Cause[] = ["", "nationalityLoss", "birth", "other"];

describe("evaluate: 技術・人文知識・国際業務／家族滞在の在留資格取得許可申請（Issue #396）", () => {
  const gij = RULE_SETS.find((r) => r.id === "gijinkoku_acquisition")!;
  const kazoku = RULE_SETS.find((r) => r.id === "kazokutaizai_acquisition")!;
  const base = RULE_SETS.find((r) => r.id === "acquisition_by_cause")!;
  const gijEval = (cause: Cause, over: Partial<CaseRecord> = {}) => evaluate(make(cause, { targetStatus: "技術・人文知識・国際業務", ...over }));
  const kazokuEval = (cause: Cause, over: Partial<CaseRecord> = {}) => evaluate(make(cause, { targetStatus: "家族滞在", ...over }));
  const BIRTH_THREE = ["birth_certificate", "parents_questionnaire", "household_residence_certificate"];
  const FAMILY_REQUIRED = ["family_relationship_proof", "supporter_card_or_passport_copy"];
  const FAMILY_CHECK = ["supporter_income_active", "supporter_income_other"];
  const COMMON_CHECK = ["passport_reason_statement", "agent_identity_document"];

  it("技人国：gijinkoku_acquisition が引かれ、題名に「一部のみ整備」と示す。在留資格が技人国を含む表記でも同じ", () => {
    for (const status of ["技術・人文知識・国際業務", "技術・人文知識・国際業務（旧在留資格）"]) {
      const e = gijEval("other", { targetStatus: status });
      expect(e.ruleSet?.id).toBe("gijinkoku_acquisition");
      expect(e.ruleSet?.title).toContain("（一部のみ整備）");
    }
  });

  it("R-2：出生の3書類を外し、出生は「その事由を証する書類」として扱う（必須）。注記は実務の扱いを推測せず「行政書士が確認」", () => {
    for (const id of BIRTH_THREE) expect(gij.rules.some((r) => r.id === id), id).toBe(false);
    const cause = gij.rules.find((r) => r.id === "cause_proof")!;
    expect(cause.causes).toEqual(["birth", "other"]);
    expect(cause.level).toBe("required");
    expect(cause.note).toContain("行政書士が確認");
    // 既存の注記（R-4。未反映）は残す
    expect(cause.note).toContain("日米地位協定");
    const e = gijEval("birth");
    expect(ids(e, "required")).toEqual(["application_form", "passport_presentation", "cause_proof"]);
    // カテゴリーが未選択の間に出る、全カテゴリー共通の要確認（専門士・派遣。#402 の R-1）
    expect(ids(e, "check")).toEqual([...COMMON_CHECK, "vocational_school_certificate", "dispatch_documents"]);
  });

  it("技人国：R-2 以外（写真・活動に応じた資料・注記など、未反映の R）は ACQUISITION_BY_CAUSE のまま", () => {
    expect(ids(gijEval("nationalityLoss"), "required")).toEqual(["application_form", "photo", "passport_presentation", "nationality_proof", "activity_materials"]);
    expect(ids(gijEval("other"), "required")).toEqual(["application_form", "photo", "passport_presentation", "cause_proof", "activity_materials"]);
    expect(ids(gijEval(""), "required")).toEqual(["application_form", "passport_presentation"]);
    for (const id of ["application_form", "photo", "passport_presentation", "passport_reason_statement", "agent_identity_document", "nationality_proof", "activity_materials"]) {
      expect(gij.rules.find((r) => r.id === id), id).toBe(base.rules.find((r) => r.id === id));
    }
  });

  it("技人国：事由別の書類（ACQUISITION_BY_CAUSE から引き継ぐもの）は、所属機関のカテゴリーによらず同じ（カテゴリー別の書類は #402。tests/evaluateAxes.test.ts）", () => {
    const fromBase = new Set(base.rules.map((r) => r.id));
    const ref = gijEval("other").items.filter((i) => fromBase.has(i.rule.id)).map((i) => [i.rule.id, i.effective]);
    for (const category of ["1", "2", "3", "4"] as OrgCategory[]) {
      const e = gijEval("other", { employment: { ...EMPTY_EMPLOYMENT, category } });
      expect(e.needsCategory).toBe(false);
      expect(e.items.filter((i) => fromBase.has(i.rule.id)).map((i) => [i.rule.id, i.effective])).toEqual(ref);
    }
  });

  it("家族滞在：kazokutaizai_acquisition が引かれ、題名に「一部のみ整備」と示す", () => {
    const e = kazokuEval("other");
    expect(e.ruleSet?.id).toBe("kazokutaizai_acquisition");
    expect(e.ruleSet?.title).toContain("（一部のみ整備）");
  });

  it("R-8・R-9：身分関係を証する文書と、扶養者の在留カード又は旅券の写しを、全事由で必須にする。名称に5種の例", () => {
    for (const cause of ALL) {
      const e = kazokuEval(cause);
      for (const id of FAMILY_REQUIRED) expect(ids(e, "required"), `${cause}:${id}`).toContain(id);
    }
    const rel = kazoku.rules.find((r) => r.id === "family_relationship_proof")!;
    for (const w of ["戸籍謄本", "婚姻届受理証明書", "結婚証明書の写し", "出生証明書の写し", "準ずる文書"]) expect(rel.name, w).toContain(w);
    expect(rel.note).toContain("次のいずれか");
    expect(kazoku.rules.find((r) => r.id === "supporter_card_or_passport_copy")?.name).toBe("扶養者の在留カード又は旅券の写し");
  });

  it("R-10：扶養者の職業及び収入を証する文書は(1)(2)の2行を要確認で足す（必須にしない）。注記に分岐を書く", () => {
    for (const cause of ALL) {
      const e = kazokuEval(cause);
      for (const id of FAMILY_CHECK) {
        expect(ids(e, "check"), `${cause}:${id}`).toContain(id);
        expect(ids(e, "required"), `${cause}:${id}`).not.toContain(id);
      }
    }
    const a = kazoku.rules.find((r) => r.id === "supporter_income_active")!;
    const b = kazoku.rules.find((r) => r.id === "supporter_income_other")!;
    expect(a.note).toContain("(1)(2)のどちらか");
    expect(a.note).toContain("在職証明書又は営業許可書の写し");
    expect(a.note).toContain("いずれか一方でよい");
    expect(b.note).toContain("(1)(2)のどちらか");
    expect(b.note).toContain("預金残高証明書");
    expect(b.note).toContain("奨学金給付");
  });

  it("R-12：住民票は全事由で任意（不足にも要確認にも数えない）。名称は「住民票」。注記に原文の2点（個人番号は省略、住居地の届出）", () => {
    const rule = kazoku.rules.find((r) => r.id === "household_residence_certificate")!;
    expect(rule.name).toBe("住民票");
    expect(rule.level).toBe("optional");
    expect(rule.causes).toEqual(["nationalityLoss", "birth", "other"]);
    expect(rule.note).toContain("個人番号");
    expect(rule.note).toContain("省略");
    expect(rule.note).toContain("届出");
    for (const cause of ALL) {
      const e = kazokuEval(cause);
      expect(e.items.find((i) => i.rule.id === "household_residence_certificate")?.effective, cause).toBe("optional");
      expect(e.missing.map((i) => i.rule.id)).not.toContain("household_residence_certificate");
      expect(e.toCheck.map((i) => i.rule.id)).not.toContain("household_residence_certificate");
    }
  });

  it("R-17：質問書は出生のみ、要確認（△）。必須にしない。名称は変えない（R-11 は未反映）", () => {
    const rule = kazoku.rules.find((r) => r.id === "parents_questionnaire")!;
    expect(rule.causes).toEqual(["birth"]);
    expect(rule.level).toBe("check");
    expect(rule.name).toBe("両親の情報を記載した質問書");
    expect(rule.note).toContain("△");
    expect(ids(kazokuEval("birth"), "check")).toContain("parents_questionnaire");
    expect(ids(kazokuEval("birth"), "required")).not.toContain("parents_questionnaire");
    for (const cause of ["nationalityLoss", "other"] as Cause[]) {
      expect(kazokuEval(cause).items.find((i) => i.rule.id === "parents_questionnaire")?.effective, cause).toBe("not_required");
    }
  });

  it("家族滞在：事由別の必須・要確認・任意の書類が、過不足なく判定される", () => {
    const optional = (e: ReturnType<typeof evaluate>) => e.items.filter((i) => i.effective === "optional").map((i) => i.rule.id);
    const rows: { cause: Cause; required: string[]; check: string[] }[] = [
      { cause: "", required: ["application_form", "passport_presentation", ...FAMILY_REQUIRED], check: [...COMMON_CHECK, ...FAMILY_CHECK] },
      { cause: "nationalityLoss", required: ["application_form", "photo", "passport_presentation", "nationality_proof", ...FAMILY_REQUIRED, "activity_materials"], check: [...COMMON_CHECK, ...FAMILY_CHECK] },
      { cause: "birth", required: ["application_form", "passport_presentation", "birth_certificate", ...FAMILY_REQUIRED], check: [...COMMON_CHECK, ...FAMILY_CHECK, "parents_questionnaire"] },
      { cause: "other", required: ["application_form", "photo", "passport_presentation", "cause_proof", ...FAMILY_REQUIRED, "activity_materials"], check: [...COMMON_CHECK, ...FAMILY_CHECK] },
    ];
    for (const row of rows) {
      const e = kazokuEval(row.cause);
      expect(ids(e, "required"), row.cause || "未選択").toEqual(row.required);
      expect(ids(e, "check"), row.cause || "未選択").toEqual(row.check);
      expect(optional(e), row.cause || "未選択").toEqual(["household_residence_certificate"]);
    }
  });

  it("家族滞在：未反映の R（写真・注記・旅券の理由書・活動に応じた資料など）は ACQUISITION_BY_CAUSE のまま", () => {
    for (const id of ["application_form", "photo", "passport_presentation", "passport_reason_statement", "agent_identity_document", "nationality_proof", "cause_proof", "birth_certificate", "activity_materials"]) {
      expect(kazoku.rules.find((r) => r.id === id), id).toBe(base.rules.find((r) => r.id === id));
    }
  });

  it("ACQUISITION_BY_CAUSE は変えない（出生の3書類・世帯全員の住民票・必須の質問書が残り、新しい書類は無い）", () => {
    for (const id of BIRTH_THREE) expect(base.rules.some((r) => r.id === id), id).toBe(true);
    expect(base.rules.find((r) => r.id === "household_residence_certificate")).toMatchObject({ name: "世帯全員の住民票", level: "required", causes: ["birth"] });
    expect(base.rules.find((r) => r.id === "parents_questionnaire")?.level).toBe("required");
    expect(base.rules.find((r) => r.id === "cause_proof")?.causes).toEqual(["other"]);
    for (const id of [...FAMILY_REQUIRED, ...FAMILY_CHECK]) expect(base.rules.some((r) => r.id === id), id).toBe(false);
    expect(base.checkedAt).toBe("2026-10-04");
    expect(base.sources.every((s) => s.comparedAt === undefined)).toBe(true);
  });

  it("他の在留資格の取得は、従来どおり ACQUISITION_BY_CAUSE", () => {
    for (const status of ["", "留学", "介護", "永住者"]) expect(evaluate(make("birth", { targetStatus: status })).ruleSet?.id, status).toBe("acquisition_by_cause");
  });

  it("規則集合：すべて verify: true、IDは重複せず、basis は取得の事由。HSP_ACQUISITION の後、ACQUISITION_BY_CAUSE の前に照合する", () => {
    for (const set of [gij, kazoku]) {
      expect(set.basis).toBe("acquisitionCause");
      // 技人国のカテゴリー別の書類（#402。認定から写したもの）は除く
      expect(set.rules.filter((r) => r.categories === undefined).every((r) => r.verify === true), set.id).toBe(true);
      const rids = set.rules.map((r) => r.id);
      expect(new Set(rids).size, set.id).toBe(rids.length);
    }
    const at = (id: string) => RULE_SETS.findIndex((r) => r.id === id);
    expect(at("hsp_acquisition")).toBeLessThan(at("gijinkoku_acquisition"));
    expect(at("gijinkoku_acquisition")).toBeLessThan(at("acquisition_by_cause"));
    expect(at("kazokutaizai_acquisition")).toBeLessThan(at("acquisition_by_cause"));
  });

  it("出典：各ページ（kind: page）と手続案内は 2026-10-18 に照合済み。申請書の様式は日付なし。URLは重複しない", () => {
    for (const [set, url] of [
      [gij, "https://www.moj.go.jp/isa/applications/status/gijinkoku.html"],
      [kazoku, "https://www.moj.go.jp/isa/applications/status/dependent.html"],
    ] as const) {
      expect(set.sources.find((s) => s.url === url)).toMatchObject({ kind: "page", comparedAt: "2026-10-18" });
      expect(set.sources.find((s) => s.url.endsWith("procedures/16-10.html"))).toMatchObject({ kind: "page", comparedAt: "2026-10-18" });
      const form = set.sources.find((s) => s.url.endsWith("930004121.xlsx"));
      expect(form).toMatchObject({ kind: "form" });
      expect(form?.comparedAt).toBeUndefined();
      expect(ruleSetComparedAt(set)).toBe("2026-10-18");
      expect(new Set(set.sources.map((s) => s.url)).size).toBe(set.sources.length);
    }
  });

  it("案内：技人国・家族滞在の取得は規則あり", () => {
    for (const status of ["技術・人文知識・国際業務", "家族滞在"]) {
      expect(shouldShowNoRuleGuide("acquisition", "", status)).toBe(false);
      expect(hasRuleSetFor("acquisition", status)).toBe(true);
    }
  });
});
