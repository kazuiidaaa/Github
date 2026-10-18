import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { evaluate, hasRuleSetFor, notApplicableMessage, shouldShowNoRuleGuide } from "../lib/requirements/evaluate";
import { RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "../lib/types";

type Cause = FormDetails["acquisitionCause"];

function make(cause: Cause, over: Partial<CaseRecord> = {}, category: OrgCategory = ""): CaseRecord {
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
    employment: { ...EMPTY_EMPLOYMENT, category },
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

// 行政書士提供の実務資料（解説記事に基づく）の一覧を、そのまま期待値として固定する。
const COMMON_CHECK = ["passport_reason_statement", "agent_identity_document"];
const EXPECTED: { cause: Cause; required: string[]; check: string[] }[] = [
  // 未選択：全事由に共通の書類のみ
  { cause: "", required: ["application_form", "passport_presentation"], check: COMMON_CHECK },
  {
    cause: "nationalityLoss",
    required: ["application_form", "photo", "passport_presentation", "nationality_proof", "activity_materials"],
    check: COMMON_CHECK,
  },
  {
    cause: "birth",
    required: ["application_form", "passport_presentation", "birth_certificate", "parents_questionnaire", "household_residence_certificate"],
    check: COMMON_CHECK,
  },
  {
    cause: "other",
    required: ["application_form", "photo", "passport_presentation", "cause_proof", "activity_materials"],
    check: COMMON_CHECK,
  },
];

describe("evaluate: 在留資格取得許可申請（取得の事由別）", () => {
  for (const row of EXPECTED) {
    const label = row.cause || "未選択";
    it(`事由=${label}: 必要書類と確認対象が過不足なく判定される`, () => {
      const e = evaluate(make(row.cause));
      expect(e.ruleSet?.id).toBe("acquisition_by_cause");
      expect(e.needsCause).toBe(row.cause === "");
      expect(e.needsCategory).toBe(false);
      expect(ids(e, "required")).toEqual(row.required);
      expect(ids(e, "check")).toEqual(row.check);
    });
  }

  it("出生では写真を必要書類に含めない（提供の一覧に記載がないため）", () => {
    const e = evaluate(make("birth"));
    expect(ids(e, "required")).not.toContain("photo");
    expect(ids(e, "check")).not.toContain("photo");
    expect(e.items.find((i) => i.rule.id === "photo")?.effective).toBe("not_required");
  });

  it("事由未選択では、事由別の書類は判定対象に含まれない", () => {
    const e = evaluate(make(""));
    expect(e.items.map((i) => i.rule.id)).toEqual(["application_form", "passport_presentation", ...COMMON_CHECK]);
  });

  it("所属機関のカテゴリーに依存しない（雇用・会社情報は未入力でも、どのカテゴリーでも同じ）", () => {
    for (const cause of ["", "birth", "nationalityLoss", "other"] as Cause[]) {
      const base = evaluate(make(cause));
      for (const category of ["1", "2", "3", "4"] as OrgCategory[]) {
        const e = evaluate(make(cause, {}, category));
        expect(e.items.map((i) => [i.rule.id, i.effective])).toEqual(base.items.map((i) => [i.rule.id, i.effective]));
        expect(e.needsCategory).toBe(false);
      }
    }
  });

  it("希望する在留資格が空でも何であっても同じ規則が適用される", () => {
    for (const cause of ["", "birth", "other"] as Cause[]) {
      const base = ids(evaluate(make(cause)), "required");
      for (const targetStatus of ["", "留学", "永住者", "介護"]) {
        const e = evaluate(make(cause, { targetStatus, currentStatus: "留学" }));
        expect(e.ruleSet?.id).toBe("acquisition_by_cause");
        expect(e.notApplicableReason).toBeUndefined();
        expect(ids(e, "required")).toEqual(base);
      }
    }
  });

  it("案件作成画面の案内は、evaluate の判定と一致する（取得では出さない）", () => {
    for (const targetStatus of ["", "技術・人文知識・国際業務", "留学", "永住者"]) {
      const c = make("", { targetStatus });
      expect(shouldShowNoRuleGuide("acquisition", c.currentStatus, targetStatus)).toBe(false);
      expect(evaluate(c).ruleSet !== null).toBe(true);
      expect(hasRuleSetFor("acquisition", targetStatus)).toBe(true);
    }
    // 規則のない手続（other）では、案内が出て、evaluate は規則なしとなる
    expect(shouldShowNoRuleGuide("other", "技術・人文知識・国際業務", "")).toBe(true);
    expect(evaluate(make("", { procedureType: "other", currentStatus: "技術・人文知識・国際業務" })).ruleSet).toBeNull();
  });

  it("案内文に、在留資格を問わない取得許可申請が含まれる", () => {
    expect(notApplicableMessage()).toContain("在留資格を問わない「在留資格取得許可申請」");
  });

  it("行政書士の上書きが判定に反映される", () => {
    const e = evaluate(make("birth", { requirementStates: { birth_certificate: { status: "not_received", override: "not_required" } } }));
    expect(ids(e, "required")).not.toContain("birth_certificate");
  });

  it("提出済みの書類は不足に数えない", () => {
    const e = evaluate(make("birth", { requirementStates: { birth_certificate: { status: "received" } } }));
    expect(e.requiredCount).toBe(5);
    expect(e.receivedCount).toBe(1);
    expect(e.missing.map((i) => i.rule.id)).toEqual(["application_form", "passport_presentation", "parents_questionnaire", "household_residence_certificate"]);
  });

  it("すべての規則が verify: true（出典が解説記事のため、行政書士の確認後に外す）", () => {
    const set = RULE_SETS.find((r) => r.id === "acquisition_by_cause");
    expect(set?.rules.every((r) => r.verify === true)).toBe(true);
  });

  it("規則は出典・確認日を持ち、IDが重複せず、旅券は提示と明記される", () => {
    const set = RULE_SETS.find((r) => r.id === "acquisition_by_cause")!;
    expect(set.checkedAt).toBe("2026-10-04");
    expect(set.sources.length).toBeGreaterThan(0);
    const rids = set.rules.map((r) => r.id);
    expect(new Set(rids).size).toBe(rids.length);
    expect(set.rules.find((r) => r.id === "passport_presentation")?.name).toContain("提示");
  });
});

describe("evaluate: 高度専門職の在留資格取得許可申請（Issue #212・#374 項目1）", () => {
  const CAUSES: Cause[] = ["nationalityLoss", "birth", "other"];
  const hsp = (cause: Cause, targetStatus: string, over: Partial<CaseRecord> = {}) => evaluate(make(cause, { targetStatus, ...over }));
  const baseRules = RULE_SETS.find((r) => r.id === "acquisition_by_cause")!;
  const hspSet = RULE_SETS.find((r) => r.id === "hsp_acquisition")!;
  // 高度専門職（1号）と、号なし（号の未選択）。2号の取得は原文（取得の節は1号のみ）に記載がなく、取得の事由別の規則集合で扱う
  const grade1 = ["高度専門職", "高度専門職（1号イ）", "高度専門職（1号ロ）", "高度専門職（1号ハ）"];
  const REMOVED = ["passport_reason_statement", "parents_questionnaire", "household_residence_certificate"];

  // 案内ページの取得の節（照合表 acquisition-2026-10-18.md）を、そのまま期待値として固定する
  const HSP_EXPECTED: { cause: Cause; required: string[]; check: string[] }[] = [
    {
      cause: "",
      required: ["application_form", "photo", "passport_presentation", "activity_materials", "hsp_point_table"],
      check: ["agent_identity_document", "hsp_point_evidence"],
    },
    {
      cause: "nationalityLoss",
      required: ["application_form", "photo", "passport_presentation", "nationality_proof", "activity_materials", "hsp_point_table"],
      check: ["agent_identity_document", "hsp_point_evidence"],
    },
    {
      cause: "birth",
      required: ["application_form", "photo", "passport_presentation", "birth_certificate", "activity_materials", "hsp_point_table"],
      check: ["agent_identity_document", "hsp_point_evidence"],
    },
    {
      cause: "other",
      required: ["application_form", "photo", "passport_presentation", "cause_proof", "activity_materials", "hsp_point_table"],
      check: ["agent_identity_document", "hsp_point_evidence"],
    },
  ];

  it("高度専門職（1号・号なし）は HSP_ACQUISITION が適用される。2号は取得の事由別の規則集合（原文は1号のみ）", () => {
    for (const status of grade1) {
      const e = hsp("other", status);
      expect(e.ruleSet?.id, status).toBe("hsp_acquisition");
      expect(e.ruleSet?.title).toContain("（一部のみ整備）");
    }
    expect(hsp("other", "高度専門職（2号）").ruleSet?.id).toBe("acquisition_by_cause");
  });

  it("国籍離脱・出生・その他・未選択で、原文のとおりの必須・要確認の書類になる（写真と活動に応じた資料は出生にもある）", () => {
    for (const row of HSP_EXPECTED) {
      for (const status of grade1) {
        const e = hsp(row.cause, status);
        expect(ids(e, "required"), `${row.cause || "未選択"}:${status}`).toEqual(row.required);
        expect(ids(e, "check"), `${row.cause || "未選択"}:${status}`).toEqual(row.check);
      }
    }
  });

  it("原文にない3書類（旅券の理由書、出生の両親質問書・世帯全員の住民票）は、高度専門職の取得では出ない", () => {
    for (const id of REMOVED) expect(hspSet.rules.some((r) => r.id === id), id).toBe(false);
    for (const cause of CAUSES) {
      const e = hsp(cause, "高度専門職（1号ロ）");
      for (const id of REMOVED) expect(e.items.some((i) => i.rule.id === id), `${cause}:${id}`).toBe(false);
    }
  });

  it("他の在留資格の取得（ACQUISITION_BY_CAUSE）には、3書類が残り、写真は出生に載らない（高度専門職の取得でのみ変える）", () => {
    for (const id of REMOVED) expect(baseRules.rules.some((r) => r.id === id), id).toBe(true);
    expect(baseRules.rules.find((r) => r.id === "photo")?.causes).toEqual(["nationalityLoss", "other"]);
    expect(baseRules.rules.find((r) => r.id === "activity_materials")?.causes).toEqual(["nationalityLoss", "other"]);
    expect(baseRules.rules.find((r) => r.id === "activity_materials")?.name).toBe("日本での活動内容に応じた資料");
  });

  it("写真は年齢の注記（1歳未満は不要。令和8年6月14日以降は1歳以上が必要）を持つ", () => {
    const note = hspSet.rules.find((r) => r.id === "photo")?.note ?? "";
    expect(note).toContain("1歳に満たない");
    expect(note).toContain("令和8年6月14日以降");
    expect(note).toContain("令和8年6月13日以前は16歳未満");
  });

  it("活動に応じた資料は、原文の名称と範囲（別表第３、カテゴリー別）を持つ", () => {
    const rule = hspSet.rules.find((r) => r.id === "activity_materials");
    expect(rule?.name).toBe("本邦において行おうとする活動に応じた資料");
    expect(rule?.note).toContain("別表第３");
    expect(rule?.note).toContain("カテゴリー");
  });

  it("ポイント計算表は提出書類（必須）。疎明資料は、70点以上を確認できれば足りる旨の注記つきで要確認のまま", () => {
    const table = hspSet.rules.find((r) => r.id === "hsp_point_table");
    const evidence = hspSet.rules.find((r) => r.id === "hsp_point_evidence");
    expect(table?.level).toBe("required");
    expect(table?.note ?? "").not.toContain("確認できていない");
    expect(evidence?.level).toBe("check");
    expect(evidence?.note).toContain("70点以上");
    expect(evidence?.note).not.toContain("確認できていない");
  });

  it("申請取次者の書類は「申請人本人以外が提出する場合」。事由の証明に、原文にない注記の例は無い", () => {
    expect(hspSet.rules.find((r) => r.id === "agent_identity_document")?.note).toContain("申請人本人以外");
    expect(hspSet.rules.find((r) => r.id === "agent_identity_document")?.note).toContain("申請取次者証明書、戸籍謄本等");
    expect(hspSet.rules.find((r) => r.id === "cause_proof")?.note).toBeUndefined();
  });

  it("事由未選択でも、全事由に共通の書類とポイント計算表を判定する", () => {
    const e = hsp("", "高度専門職");
    expect(e.needsCause).toBe(true);
    expect(e.items.map((i) => i.rule.id)).toEqual(["application_form", "photo", "passport_presentation", "agent_identity_document", "activity_materials", "hsp_point_table", "hsp_point_evidence"]);
  });

  it("書類名・順序は、ACQUISITION_BY_CAUSE から外した3書類と上書きした項目を除き、そのまま引き継ぐ", () => {
    const overridden = ["photo", "agent_identity_document", "cause_proof", "activity_materials"];
    for (const rule of baseRules.rules) {
      if (REMOVED.includes(rule.id)) continue;
      const mine = hspSet.rules.find((r) => r.id === rule.id);
      expect(mine, rule.id).toBeDefined();
      if (!overridden.includes(rule.id)) expect(hspSet.rules, rule.id).toContain(rule);
      else if (rule.id !== "activity_materials") expect(mine?.name, rule.id).toBe(rule.name);
    }
    expect(hspSet.basis).toBe("acquisitionCause");
    expect(hspSet.excludeStatuses).toEqual(["高度専門職（2号）"]);
    expect(hspSet.rules.every((r) => r.verify === true)).toBe(true);
    const rids = hspSet.rules.map((r) => r.id);
    expect(new Set(rids).size).toBe(rids.length);
  });

  it("出典：高度専門職ページと手続案内は 2026-10-18 に照合済み（kind は page）。申請書の様式は日付なし。checkedAt は変えない", () => {
    expect(hspSet.checkedAt).toBe("2026-10-07");
    const bySuffix = (suffix: string) => hspSet.sources.find((s) => s.url.endsWith(suffix));
    expect(bySuffix("designatedactivities02_00004.html")).toMatchObject({ kind: "page", comparedAt: "2026-10-18" });
    expect(bySuffix("procedures/16-10.html")).toMatchObject({ kind: "page", comparedAt: "2026-10-18" });
    expect(bySuffix("930004121.xlsx")).toMatchObject({ kind: "form" });
    expect(bySuffix("930004121.xlsx")?.comparedAt).toBeUndefined();
    expect(new Set(hspSet.sources.map((s) => s.url)).size).toBe(hspSet.sources.length);
  });

  it("他の在留資格の取得は、従来どおり ACQUISITION_BY_CAUSE（技人国・家族滞在は専用の規則集合。Issue #396）", () => {
    for (const row of EXPECTED) {
      for (const targetStatus of ["", "留学", "永住者", "介護"]) {
        const e = evaluate(make(row.cause, { targetStatus }));
        expect(e.ruleSet?.id).toBe("acquisition_by_cause");
        expect(ids(e, "required")).toEqual(row.required);
        expect(ids(e, "check")).toEqual(row.check);
      }
    }
  });

  it("ポイント計算表の項目を選ぶと、疎明資料の番号ごとの項目が出る（号が決まるシートで）", () => {
    const e = hsp("other", "高度専門職（1号ロ）", { formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: "other", hspPointChecks: ["B:15"] } });
    expect(e.items.map((i) => i.rule.id)).toContain("hsp_point_evidence_①");
    expect(e.items.map((i) => i.rule.id)).not.toContain("hsp_point_evidence");
  });

  it("案内：高度専門職の取得は規則あり。2号も、取得の事由別の規則で案内する", () => {
    for (const status of [...grade1, "高度専門職（2号）"]) expect(shouldShowNoRuleGuide("acquisition", "", status)).toBe(false);
  });
});
