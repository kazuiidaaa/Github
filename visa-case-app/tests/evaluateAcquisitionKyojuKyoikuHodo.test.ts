import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// Issue #420：照合表 acquisition-kyoju-2026-10-24.md・acquisition-kyoiku-2026-10-24.md・acquisition-hodo-2026-10-24.md の、
// 人の判断「推奨のとおり」（2026-10-24）
type Cause = FormDetails["acquisitionCause"];

function make(targetStatus: string, cause: Cause, category: OrgCategory = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "acquisition",
    currentStatus: "",
    targetStatus,
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category },
    formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause },
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
const find = (id: string) => RULE_SETS.find((r) => r.id === id)!;
const ALL: Cause[] = ["", "nationalityLoss", "birth", "other"];
const SETS = [
  { id: "professor_acquisition", status: "教授", change: "professor_change" },
  { id: "education_acquisition", status: "教育", change: "education_coe" },
  { id: "hodo_acquisition", status: "報道", change: "hodo_change" },
] as const;
const REMOVED = ["birth_certificate", "parents_questionnaire", "household_residence_certificate", "activity_materials", "passport_reason_statement"];
const COMMON = ["application_form", "photo", "passport_presentation", "cause_proof"];

describe("evaluate: 教授／教育／報道の在留資格取得許可申請（Issue #420）", () => {
  const gij = find("gijinkoku_acquisition");
  const base = find("acquisition_by_cause");

  it("専用の規則集合が引かれる。basis は取得の事由、alsoBasis はカテゴリー。ACQUISITION_BY_CAUSE より先に照合する", () => {
    const at = (id: string) => RULE_SETS.findIndex((r) => r.id === id);
    for (const s of SETS) {
      expect(evaluate(make(s.status, "other")).ruleSet?.id, s.status).toBe(s.id);
      const set = find(s.id);
      expect(set.basis).toBe("acquisitionCause");
      expect(set.alsoBasis).toEqual(["category"]);
      expect(set.categoryDefinition).toBe(find(s.change).categoryDefinition);
      expect(set.title).toContain("（一部のみ整備）");
      expect(at(s.id)).toBeLessThan(at("acquisition_by_cause"));
      const rids = set.rules.map((r) => r.id);
      expect(new Set(rids).size, s.id).toBe(rids.length);
    }
  });

  it("事由別の書類は、技人国の取得と同じ（出生の3書類・活動に応じた資料・旅券の理由書を外し、写真・事由の証明を上書き）", () => {
    for (const s of SETS) {
      const set = find(s.id);
      for (const id of REMOVED) expect(set.rules.some((r) => r.id === id), `${s.id}:${id}`).toBe(false);
      for (const id of ["application_form", "nationality_proof", "cause_proof", "photo"]) {
        expect(set.rules.find((r) => r.id === id), `${s.id}:${id}`).toEqual(gij.rules.find((r) => r.id === id));
      }
      const photo = set.rules.find((r) => r.id === "photo")!;
      expect(photo.name).toBe("写真（40mm×30mm）");
      expect(photo.causes).toEqual(["nationalityLoss", "birth", "other"]);
      expect(photo.note).not.toContain("中長期在留者");
      const cause = set.rules.find((r) => r.id === "cause_proof")!;
      expect(cause.causes).toEqual(["birth", "other"]);
      expect(cause.note).not.toContain("日米地位協定");
      for (const c of ALL) expect(ids(evaluate(make(s.status, c)), "required"), `${s.id}:${c}`).toContain("photo");
    }
    // ACQUISITION_BY_CAUSE の文言は変えない
    expect(base.rules.find((r) => r.id === "photo")!.name).toBe("写真（縦4cm×横3cm）");
    expect(base.checkedAt).toBe("2026-10-04");
  });

  it("教育・報道：旅券の提示と申請取次者の注記は、技人国の取得と同じ。教授：原文（102・103行）のとおり教授だけの文言", () => {
    for (const s of SETS.filter((x) => x.id !== "professor_acquisition")) {
      for (const id of ["passport_presentation", "agent_identity_document"]) {
        expect(find(s.id).rules.find((r) => r.id === id), `${s.id}:${id}`).toEqual(gij.rules.find((r) => r.id === id));
      }
    }
    const prof = find("professor_acquisition");
    expect(prof.rules.find((r) => r.id === "passport_presentation")!.note).toContain("申請人以外の方が申請書類を提出する場合も、提示が必要");
    expect(prof.rules.find((r) => r.id === "agent_identity_document")!.note).toContain("代理人が申請する場合");
    expect(prof.rules.find((r) => r.id === "agent_identity_document")!.name).toBe(gij.rules.find((r) => r.id === "agent_identity_document")!.name);
    // 共通の定数・他の資格の取得は変えない
    expect(gij.rules.find((r) => r.id === "agent_identity_document")!.note).not.toContain("代理人が申請する場合");
  });

  it("カテゴリーが未選択の間は、共通の書類だけ。needsCategory を立てる", () => {
    for (const s of SETS) {
      const e = evaluate(make(s.status, "birth"));
      expect(e.needsCategory, s.id).toBe(true);
      expect(ids(e, "required"), s.id).toEqual(COMMON);
      expect(ids(e, "check"), s.id).toEqual(["agent_identity_document"]);
    }
  });

  it("出典：ページの URL は未記録（2026-10-24）・手続案内・申請書様式（日付なし）。照合日は 2026-10-24", () => {
    for (const s of SETS) {
      const set = find(s.id);
      expect(set.sources[0].title).toContain("URL 未記録");
      expect(set.sources[0]).toMatchObject({ kind: "page", comparedAt: "2026-10-24" });
      // 確定できない URL（professor.html・instructor.html・journalist.html）は書かない
      for (const x of set.sources) expect(x.url, s.id).not.toMatch(/professor\.html|instructor\.html|journalist\.html/);
      expect(set.sources.find((x) => x.url.endsWith("procedures/16-10.html"))).toMatchObject({ kind: "page" });
      expect(set.sources.find((x) => x.url.endsWith("930004121.xlsx"))?.comparedAt).toBeUndefined();
      expect(new Set(set.sources.map((x) => x.url)).size).toBe(set.sources.length);
      expect(ruleSetComparedAt(set)).toBe("2026-10-24");
      expect(set.checkedAt).toBe("2026-10-24");
    }
  });

  it("教授 KJ-2：活動の内容等を証明する文書は、変更と同じくカテゴリー2（非常勤）のみ・必須。カテゴリー1は共通の書類だけ", () => {
    const set = find("professor_acquisition");
    const change = find("professor_change").rules.find((r) => r.id === "activity_proof_document")!;
    const a = set.rules.find((r) => r.id === "activity_proof_document")!;
    expect([a.name, a.categories, a.level, a.party, a.causes]).toEqual([change.name, ["2"], "required", "organization", undefined]);
    expect(a.note).toContain("在留資格変更許可申請と同様の資料");
    expect(set.categoryDefinition).toEqual({ "1": "カテゴリー1（常勤職員）", "2": "カテゴリー2（非常勤職員）" });
    for (const c of ALL) {
      expect(ids(evaluate(make("教授", c, "1")), "required"), `1:${c}`).not.toContain("activity_proof_document");
      expect(ids(evaluate(make("教授", c, "2")), "required"), `2:${c}`).toContain("activity_proof_document");
    }
    expect(ids(evaluate(make("教授", "other", "1")), "required")).toEqual(COMMON);
  });

  it("教育 KI-1：認定・変更の部品4つを、名称・注記・割り当て・区分のまま写す。返信用封筒は写さない", () => {
    const set = find("education_acquisition");
    const coe = find("education_coe");
    const parts = ["activity_content_documents", "career_documents", "business_content_documents", "financial_statements"];
    expect(set.rules.filter((r) => r.categories).map((r) => r.id)).toEqual(parts);
    for (const id of parts) expect(set.rules.find((r) => r.id === id), id).toEqual(coe.rules.find((r) => r.id === id));
    expect(set.rules.some((r) => r.id === "return_envelope")).toBe(false);
    expect(ids(evaluate(make("教育", "other", "1")), "required")).toEqual(COMMON);
    expect(ids(evaluate(make("教育", "other", "2")), "required")).toEqual([...COMMON, "activity_content_documents", "career_documents", "business_content_documents"]);
    expect(ids(evaluate(make("教育", "nationalityLoss", "3")), "required")).toEqual([
      "application_form",
      "photo",
      "passport_presentation",
      "nationality_proof",
      "activity_content_documents",
      "career_documents",
      "business_content_documents",
      "financial_statements",
    ]);
  });

  it("報道 HD-1・HD-2：変更の3点を写し、カテゴリーで分ける。記者登録証の社員を雇用していることの証明は、カテゴリー1の機関のときだけ", () => {
    const set = find("hodo_acquisition");
    const change = find("hodo_change");
    const parts = ["registered_employer_proof", "activity_documents", "organization_overview"];
    expect(set.rules.filter((r) => r.categories).map((r) => r.id)).toEqual(parts);
    for (const id of parts) expect(set.rules.find((r) => r.id === id), id).toEqual(change.rules.find((r) => r.id === id));
    expect(set.rules.some((r) => r.id === "return_envelope")).toBe(false);
    expect(set.rules.find((r) => r.id === "registered_employer_proof")!.categories).toEqual(["1"]);
    for (const c of ALL) {
      expect(ids(evaluate(make("報道", c, "1")), "required"), `1:${c}`).toContain("registered_employer_proof");
      expect(ids(evaluate(make("報道", c, "1")), "required"), `1:${c}`).not.toContain("activity_documents");
      const e2 = ids(evaluate(make("報道", c, "2")), "required");
      expect(e2, `2:${c}`).not.toContain("registered_employer_proof");
      expect(e2, `2:${c}`).toEqual(expect.arrayContaining(["activity_documents", "organization_overview"]));
    }
    // カテゴリー未選択の間は、3点とも出ない
    const none = ids(evaluate(make("報道", "other")), "required");
    for (const id of parts) expect(none, id).not.toContain(id);
  });

  it("他の在留資格の取得は、従来どおり ACQUISITION_BY_CAUSE", () => {
    for (const status of ["", "留学", "永住者"]) expect(evaluate(make(status, "birth")).ruleSet?.id, status).toBe("acquisition_by_cause");
  });
});
