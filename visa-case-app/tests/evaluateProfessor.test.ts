import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { categoryOptions } from "../lib/i18n/caseNew";
import { evaluate } from "../lib/requirements/evaluate";
import { PROFESSOR_CHANGE, PROFESSOR_COE, PROFESSOR_RENEWAL, RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

// 在留資格「教授」（Issue #292）。区分は 1＝常勤職員・2＝非常勤職員。提出書類は、入管庁のチェックシートの表（○の位置）による。
function make(procedureType: string, category: OrgCategory = "", status = "教授"): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus: status,
    targetStatus: status,
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  } as CaseRecord;
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
const allIds = (e: ReturnType<typeof evaluate>) => e.items.map((i) => i.rule.id);

describe("教授の規則集合", () => {
  it("認定・変更・更新が登録され、在留資格「教授」で引ける", () => {
    for (const [rs, type] of [
      [PROFESSOR_RENEWAL, "renewal"],
      [PROFESSOR_CHANGE, "change"],
      [PROFESSOR_COE, "coe"],
    ] as const) {
      expect(RULE_SETS).toContain(rs);
      expect(rs.procedureType).toBe(type);
      expect(evaluate(make(type)).ruleSet?.id).toBe(rs.id);
    }
  });

  it("区分は 1（常勤）・2（非常勤）の2つで、選択肢の文言もそれに従う", () => {
    for (const rs of [PROFESSOR_RENEWAL, PROFESSOR_CHANGE, PROFESSOR_COE]) {
      expect(Object.keys(rs.categoryDefinition ?? {})).toEqual(["1", "2"]);
    }
    const t = ((k: string) => k) as never;
    expect(categoryOptions(t, "ja", PROFESSOR_COE).map((o) => o.label)).toEqual(["カテゴリー1（常勤職員）", "カテゴリー2（非常勤職員）"]);
    expect(categoryOptions(t, "en", PROFESSOR_COE).map((o) => o.label)).toEqual(["Category 1 (full-time staff)", "Category 2 (part-time staff)"]);
  });

  it("共通の書類（申請書・写真・パスポート及び在留カード）は、手続別の共通ルールから来る", () => {
    expect(allIds(evaluate(make("coe", "1")))).toEqual(expect.arrayContaining(["application_form", "photo"]));
    expect(allIds(evaluate(make("change", "1")))).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card"]));
    expect(allIds(evaluate(make("renewal", "1")))).toEqual(expect.arrayContaining(["application_form", "photo", "passport_card"]));
    expect(allIds(evaluate(make("coe", "1")))).not.toContain("passport_card");
  });

  describe("認定", () => {
    it("カテゴリー1：申請書・写真・返信用封筒のみ", () => {
      expect(ids(evaluate(make("coe", "1")), "required")).toEqual(["application_form", "photo", "return_envelope"]);
    });
    it("カテゴリー2：上記に加え、大学等での活動の内容・期間・地位・報酬を証明する文書", () => {
      expect(ids(evaluate(make("coe", "2")), "required")).toEqual(["application_form", "photo", "return_envelope", "activity_proof_document"]);
    });
  });

  describe("変更", () => {
    it("カテゴリー1：申請書・写真・パスポート及び在留カードのみ（返信用封筒は不要）", () => {
      expect(ids(evaluate(make("change", "1")), "required")).toEqual(["application_form", "photo", "passport_card"]);
    });
    it("カテゴリー2：上記に加え、活動を証明する文書", () => {
      expect(ids(evaluate(make("change", "2")), "required")).toEqual(["application_form", "photo", "passport_card", "activity_proof_document"]);
    });
  });

  describe("更新", () => {
    it("カテゴリー1：申請書・写真・パスポート及び在留カードのみ（住民税の証明書は不要）", () => {
      const e = evaluate(make("renewal", "1"));
      expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
      expect(ids(e, "check")).toEqual([]);
    });
    it("カテゴリー2：住民税の証明書・納税証明書が必要。活動を証明する文書は、常勤から非常勤への転職の場合のみ（確認）", () => {
      const e = evaluate(make("renewal", "2"));
      expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card", "resident_tax_certificates"]);
      expect(ids(e, "check")).toEqual(["activity_proof_document"]);
    });
  });

  it("カテゴリー未入力でも、全区分共通の書類は判定する。区分が必要な書類は、区分の入力を促す", () => {
    const e = evaluate(make("coe"));
    expect(ids(e, "required")).toEqual(["application_form", "photo", "return_envelope"]);
    expect(e.needsCategory).toBe(true);
  });

  it("会社の区分（3・4）は範囲外で、未入力と同じに扱い、範囲外である旨を示す", () => {
    for (const c of ["3", "4"] as const) {
      const e = evaluate(make("change", c));
      expect(e.needsCategory).toBe(true);
      expect(e.categoryOutOfRange).toBe(true);
      expect(ids(e, "required")).toEqual(["application_form", "photo", "passport_card"]);
    }
  });

  it("確認済みで、要確認（verify）の書類はない。出典は案内ページとチェックシート", () => {
    for (const [rs, pdf] of [
      [PROFESSOR_COE, "001404120"],
      [PROFESSOR_CHANGE, "001368410"],
      [PROFESSOR_RENEWAL, "001368411"],
    ] as const) {
      expect(rs.rules.some((r) => r.verify)).toBe(false);
      expect(rs.sources.map((s) => s.url)).toEqual(["https://www.moj.go.jp/isa/applications/status/professor.html", `https://www.moj.go.jp/isa/content/${pdf}.pdf`]);
      const idList = rs.rules.map((r) => r.id);
      expect(new Set(idList).size).toBe(idList.length);
    }
  });

  it("高度専門職（1号イ）など、教授以外の在留資格は、教授の規則に当たらない", () => {
    expect(evaluate(make("renewal", "1", "高度専門職（1号イ）")).ruleSet?.id).not.toBe("professor_renewal");
  });
});
