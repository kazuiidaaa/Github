import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { procedureCommonRules, RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// Issue #420：照合表 acquisition-keiei-kanri-2026-10-19.md（#423）・acquisition-kenkyu-2026-10-19.md（#426）・acquisition-kigyounai-tenkin-2026-10-19.md（#427）の、
// 人の判断「推奨のとおり」（2026-10-19）
type Cause = FormDetails["acquisitionCause"];
// 変更の手続共通の書類（申請書・写真・パスポート及び在留カード）は、取得では写さず ACQUISITION_BY_CAUSE の共通の書類を使う
// （acquisition-kigyounai-tenkin-2026-10-19.md「変更の書類のうち、写真・申請書・…は procedureCommonRules("change") から来る。取得では写さず」）
const CHANGE_COMMON_IDS = procedureCommonRules("change").map((r) => r.id);

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
  { id: "keiei_kanri_acquisition", status: "経営・管理", change: "keiei_kanri_change", url: "https://www.moj.go.jp/isa/applications/status/businessmanager.html" },
  { id: "kenkyu_acquisition", status: "研究", change: "kenkyu_change", url: "https://www.moj.go.jp/isa/applications/status/researcher.html" },
  { id: "kigyonai_acquisition", status: "企業内転勤", change: "kigyonai_change", url: "https://www.moj.go.jp/isa/applications/status/intracompanytransfee.html" },
] as const;
const REMOVED = ["birth_certificate", "parents_questionnaire", "household_residence_certificate", "activity_materials", "passport_reason_statement"];
const AGENT_NOTE = "申請人本人以外の方が提出する場合。提出する方の身分を証する文書（申請取次者証明書、戸籍謄本等）の提示";

describe("evaluate: 経営・管理／研究／企業内転勤の在留資格取得許可申請（Issue #420）", () => {
  const gij = find("gijinkoku_acquisition");
  const base = find("acquisition_by_cause");

  it("専用の規則集合が引かれる。basis は取得の事由、alsoBasis はカテゴリー。ACQUISITION_BY_CAUSE より先に照合する", () => {
    const at = (id: string) => RULE_SETS.findIndex((r) => r.id === id);
    for (const s of SETS) {
      expect(evaluate(make(s.status, "other")).ruleSet?.id, s.status).toBe(s.id);
      const set = find(s.id);
      expect(set.basis).toBe("acquisitionCause");
      expect(set.alsoBasis).toEqual(["category"]);
      expect(set.title).toContain("（一部のみ整備）");
      expect(at(s.id)).toBeLessThan(at("acquisition_by_cause"));
      const rids = set.rules.map((r) => r.id);
      expect(new Set(rids).size, s.id).toBe(rids.length);
    }
  });

  it("R-2〜R-7：事由別の書類は、技人国の取得と同じ（出生の3書類・活動に応じた資料・旅券の理由書を外し、写真・事由の証明・申請取次者を上書き）", () => {
    for (const s of SETS) {
      const set = find(s.id);
      for (const id of REMOVED) expect(set.rules.some((r) => r.id === id), `${s.id}:${id}`).toBe(false);
      for (const id of ["application_form", "photo", "passport_presentation", "agent_identity_document", "nationality_proof", "cause_proof"]) {
        expect(set.rules.find((r) => r.id === id), `${s.id}:${id}`).toEqual(gij.rules.find((r) => r.id === id));
      }
      const photo = set.rules.find((r) => r.id === "photo")!;
      expect(photo.name).toBe("写真（40mm×30mm）");
      expect(photo.causes).toEqual(["nationalityLoss", "birth", "other"]);
      expect(photo.note).not.toContain("中長期在留者");
      const cause = set.rules.find((r) => r.id === "cause_proof")!;
      expect(cause.causes).toEqual(["birth", "other"]);
      expect(cause.note).not.toContain("日米地位協定");
      expect(set.rules.find((r) => r.id === "agent_identity_document")!.note).toBe(AGENT_NOTE);
      for (const c of ALL) expect(ids(evaluate(make(s.status, c)), "required"), `${s.id}:${c}`).toContain("photo");
    }
    // ACQUISITION_BY_CAUSE の文言は変えない
    expect(base.rules.find((r) => r.id === "photo")!.name).toBe("写真（縦4cm×横3cm）");
    expect(base.checkedAt).toBe("2026-10-04");
  });

  it("カテゴリーが未選択の間は、共通の書類だけ（全カテゴリーの研究の派遣の要確認は出る）。needsCategory を立てる", () => {
    for (const s of SETS) {
      const e = evaluate(make(s.status, "birth"));
      expect(e.needsCategory, s.id).toBe(true);
      expect(ids(e, "required"), s.id).toEqual(["application_form", "photo", "passport_presentation", "cause_proof"]);
      expect(ids(e, "check"), s.id).toEqual(s.id === "kenkyu_acquisition" ? ["agent_identity_document", "dispatch_documents"] : ["agent_identity_document"]);
    }
  });

  it("出典（経営・管理 R-10・研究 R-13・企業内転勤 R-8）：ページ（2026-10-19）・手続案内・申請書様式（日付なし）", () => {
    for (const s of SETS) {
      const set = find(s.id);
      expect(set.sources.find((x) => x.url === s.url)).toMatchObject({ kind: "page", comparedAt: "2026-10-19" });
      expect(set.sources.find((x) => x.url.endsWith("procedures/16-10.html"))).toMatchObject({ kind: "page" });
      expect(set.sources.find((x) => x.url.endsWith("930004121.xlsx"))?.comparedAt).toBeUndefined();
      expect(new Set(set.sources.map((x) => x.url)).size).toBe(set.sources.length);
      expect(ruleSetComparedAt(set)).toBe("2026-10-19");
      expect(set.checkedAt).toBe("2026-10-19");
    }
  });

  it("経営・管理 R-1：変更のカテゴリー別の書類12件を、同じ割り当て・区分で写す。R-8 活動内容の資料の名称は原文に合わせる。R-9 注記は引き継ぐ", () => {
    const set = find("keiei_kanri_acquisition");
    const change = find("keiei_kanri_change");
    const catIds = set.rules.filter((r) => r.categories).map((r) => r.id);
    expect(catIds).toHaveLength(12);
    for (const id of catIds) {
      const a = set.rules.find((r) => r.id === id)!;
      const c = change.rules.find((r) => r.id === id)!;
      expect([a.categories, a.level, a.party, a.note], id).toEqual([c.categories, c.level, c.party, c.note]);
      if (id !== "activity_documents") expect(a.name, id).toBe(c.name);
    }
    const activity = set.rules.find((r) => r.id === "activity_documents")!;
    expect(activity.name).toContain("外国法人内の日本支店への転勤");
    expect(activity.name).not.toContain("日本法人への転勤");
    // 認定・変更の名称は変えない
    expect(change.rules.find((r) => r.id === "activity_documents")!.name).toContain("日本法人への転勤");
    for (const id of ["return_envelope", "office_commission_documents"]) expect(set.rules.some((r) => r.id === id), id).toBe(false);
  });

  it("経営・管理：カテゴリー1・2はカテゴリーの証明だけ。カテゴリー4は法定調書を出せない理由の資料を足し、カテゴリーの証明は出さない", () => {
    for (const category of ["1", "2"] as OrgCategory[]) {
      expect(ids(evaluate(make("経営・管理", "other", category)), "required")).toEqual(["application_form", "photo", "passport_presentation", "cause_proof", "category_proof"]);
    }
    const e4 = ids(evaluate(make("経営・管理", "other", "4")), "required");
    expect(e4).toContain("statutory_report_unavailable_reason");
    expect(e4).not.toContain("category_proof");
  });

  it("研究 R-1・R-8〜R-11：変更の書類を写し、提出書類省略の説明書は写さない。受付印・様式L・チェックシートの記号を注記から外す", () => {
    const set = find("kenkyu_acquisition");
    const change = find("kenkyu_change");
    expect(set.rules.some((r) => r.id === "omission_statement")).toBe(false);
    expect(set.rules.some((r) => r.id === "return_envelope")).toBe(false);
    const changeCatIds = change.rules.filter((r) => r.categories && !CHANGE_COMMON_IDS.includes(r.id) && r.id !== "omission_statement").map((r) => r.id);
    expect(set.rules.filter((r) => r.categories).map((r) => r.id)).toEqual(changeCatIds);
    for (const id of changeCatIds) {
      const a = set.rules.find((r) => r.id === id)!;
      const c = change.rules.find((r) => r.id === id)!;
      expect([a.name, a.categories, a.level, a.party], id).toEqual([c.name, c.categories, c.level, c.party]);
    }
    expect(set.rules.find((r) => r.id === "category_proof")!.note).not.toContain("受付印");
    const transfer = set.rules.find((r) => r.id === "transfer_documents")!;
    expect(transfer.note).not.toContain("様式L");
    expect(transfer.note).toContain("基準省令ただし書き");
    const fin = set.rules.find((r) => r.id === "financial_statements")!;
    expect(fin.level).toBe("check");
    expect(fin.verify).toBe(true);
    expect(fin.note).toContain("取得のチェックシートは無い");
    expect(fin.note).not.toMatch(/[○△]/);
  });

  it("研究 R-12：「特定活動（研究活動等）」の取得には、研究の取得の規則集合を出さない", () => {
    expect(find("kenkyu_acquisition").excludeStatuses).toEqual(["特定活動"]);
    expect(evaluate(make("特定活動（研究活動等）", "other")).ruleSet?.id).not.toBe("kenkyu_acquisition");
  });

  it("企業内転勤 R-1：変更のカテゴリー別の書類を、名称・注記・割り当て・区分のまま写す", () => {
    const set = find("kigyonai_acquisition");
    const change = find("kigyonai_change");
    const changeCat = change.rules.filter((r) => r.categories && !CHANGE_COMMON_IDS.includes(r.id));
    expect(set.rules.filter((r) => r.categories)).toEqual(changeCat);
    const e3 = ids(evaluate(make("企業内転勤", "nationalityLoss", "3")), "required");
    for (const id of ["category_proof", "activity_documents", "workplace_relation_documents", "registry_certificate", "financial_statements"]) expect(e3, id).toContain(id);
    expect(e3).not.toContain("payroll_office_notification");
  });

  it("他の在留資格の取得は、従来どおり ACQUISITION_BY_CAUSE", () => {
    // 介護の取得は、専用の規則集合（kaigo_acquisition。Issue #420・#428）が扱うため含めない
    for (const status of ["", "留学", "永住者"]) expect(evaluate(make(status, "birth")).ruleSet?.id, status).toBe("acquisition_by_cause");
  });
});
