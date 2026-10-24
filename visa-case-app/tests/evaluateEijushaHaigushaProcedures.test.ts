import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { ruleDocumentName } from "../lib/i18n/ruleTexts";
import { evaluate, ruleSetOfCase } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt, type RuleSet } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type ProcedureType } from "../lib/types";

// Issue #420：永住者の配偶者等の認定・変更・更新。照合表 coe-change-renewal-eijushahaigusha-2026-10-24.md。提出書類一覧（チェックシート）の項目を固定する。
type Proc = "coe" | "change" | "renewal";
const STATUS = "永住者の配偶者等";

function make(procedureType: ProcedureType, status: string): CaseRecord {
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
    employment: { ...EMPTY_EMPLOYMENT, category: "1" },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}

const set = (id: string) => RULE_SETS.find((r) => r.id === id)!;
const SETS: Record<Proc, RuleSet> = { coe: set("eijusha_haigusha_coe"), change: set("eijusha_haigusha_change"), renewal: set("eijusha_haigusha_renewal") };
const idsOf = (proc: Proc) => evaluate(make(proc, STATUS)).items.filter((i) => i.effective !== "not_required").map((i) => i.rule.id);

describe("永住者の配偶者等の認定・変更・更新（coe-change-renewal-eijushahaigusha-2026-10-24.md）", () => {
  it("規則集合：手続ごとに引かれ、出典は番号から組み立てた PDF（照合日 2026-10-24）", () => {
    const sheetIds = { coe: "001426553", change: "001426554", renewal: "001426555" };
    for (const [proc, rs] of Object.entries(SETS) as [Proc, RuleSet][]) {
      expect(rs.procedureType).toBe(proc);
      expect(ruleSetOfCase(make(proc as ProcedureType, STATUS))?.id).toBe(rs.id);
      expect(ruleSetComparedAt(rs)).toBe("2026-10-24");
      expect(rs.sources).toEqual([expect.objectContaining({ kind: "pdf", url: `https://www.moj.go.jp/isa/content/${sheetIds[proc]}.pdf` })]);
      expect(rs.sources[0].title).toContain("未確認");
    }
  });

  it("書類の内訳：認定9項目＋旅券、変更8項目＋旅券、更新6項目（シートの No. の最大値）", () => {
    expect(idsOf("coe")).toEqual(["application_form", "photo", "passport_copy", "return_envelope", "marriage_certificate", "stay_cost_documents", "identity_guarantee", "household_residence_certificate", "questionnaire", "marital_exchange_materials"]);
    expect(idsOf("change")).toEqual(["application_form", "photo", "passport_card", "marriage_certificate", "stay_cost_documents", "identity_guarantee", "household_residence_certificate", "questionnaire", "marital_exchange_materials"]);
    expect(idsOf("renewal")).toEqual(["application_form", "photo", "passport_card", "marriage_continuation_proof", "stay_cost_documents", "identity_guarantee", "household_residence_certificate"]);
  });

  it("取得と共有する書類は、取得と同じ id・書類名。更新だけの婚姻継続の文書は新しい書類", () => {
    const acq = set("eijusha_haigusha_acquisition");
    for (const proc of ["coe", "change", "renewal"] as const) {
      for (const r of SETS[proc].rules.filter((x) => !["application_form", "photo", "passport_card", "passport_copy"].includes(x.id) && acq.rules.some((a) => a.id === x.id))) {
        expect(r.name, `${proc}:${r.id}`).toBe(acq.rules.find((a) => a.id === r.id)!.name);
      }
    }
    expect(acq.rules.some((a) => a.id === "marriage_continuation_proof")).toBe(false);
    expect(SETS.renewal.rules.find((r) => r.id === "marriage_continuation_proof")).toMatchObject({ level: "required", verify: true });
    expect(SETS.coe.rules.find((r) => r.id === "return_envelope")?.party).toBe("applicant");
  });

  it("条件つきの書類は無い：すべて必須（旅券の写しだけ任意）。要確認の印は質問書だけ（変更）", () => {
    for (const rs of Object.values(SETS)) {
      for (const r of rs.rules) {
        if (r.id === "passport_copy") expect(r.level).toBe("optional");
        else expect(r.level, r.id).toBe("required");
      }
    }
    expect(SETS.change.rules.filter((r) => r.verify).map((r) => r.id)).toEqual(["questionnaire"]);
  });

  it("訳が付く（書類名。en は仮訳）", () => {
    const name = SETS.renewal.rules.find((r) => r.id === "marriage_continuation_proof")!.name;
    expect(ruleDocumentName("en", name)).not.toMatch(/[ぁ-ん]/);
    expect(ruleDocumentName("ko", name)).not.toMatch(/[ぁ-ん]/);
  });

  it("取得に影響しない：取得の規則集合は事由の判定のまま、書類は変わらない", () => {
    const acq = set("eijusha_haigusha_acquisition");
    expect(acq.basis).toBe("acquisitionCause");
    expect(acq.procedureType).toBe("acquisition");
    expect(acq.rules.map((r) => r.id)).not.toContain("return_envelope");
    expect(evaluate(make("acquisition", STATUS)).ruleSet?.id).toBe("eijusha_haigusha_acquisition");
  });

  it("他の在留資格に影響しない：永住者・定住者・日本人の配偶者等などの認定・変更・更新は引かれない", () => {
    for (const status of ["永住者", "特別永住者", "定住者", "日本人の配偶者等", "家族滞在"]) {
      for (const proc of ["coe", "change", "renewal"] as const) {
        expect(evaluate(make(proc, status)).ruleSet?.id ?? "", `${status}:${proc}`).not.toMatch(/^eijusha_haigusha_(coe|change|renewal)$/);
      }
    }
  });
});
