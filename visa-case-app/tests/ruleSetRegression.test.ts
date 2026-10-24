import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/requirements/evaluate";
import { RULE_SETS, categoryRangeOf, type RuleSet } from "@/lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type OrgCategory } from "@/lib/types";
import { APPLICANT_IDENTITIES, EMPTY_FORM_DETAILS, SCHOOL_TYPES, type FormDetails } from "@/lib/formDetails";

/**
 * 回帰テスト（Issue #402）：判定の軸を複数にする仕組み（RuleSet.alsoBasis）を足しても、
 * alsoBasis を持たない既存の規則集合の結果（規則の id・判定・理由・注意の旗）が1件も変わらないことを固定する。
 * 期待値は、#402 の変更前の main（5e68eb0）で作った tests/fixtures/ruleSetResults.json。
 * 規則の中身を意図して変えたときだけ、`UPDATE_RULESET_FIXTURE=1 npx vitest run tests/ruleSetRegression.test.ts` で作り直す。
 */
const FIXTURE = path.resolve(__dirname, "fixtures/ruleSetResults.json");

interface Expected {
  ruleIds: string[];
  digest: string;
}

function makeCase(rs: RuleSet, over: { category?: OrgCategory; withholdingSpecial?: boolean; formDetails?: Partial<FormDetails> }): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType: rs.procedureType, currentStatus: rs.residenceStatus, targetStatus: rs.residenceStatus, memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category: over.category ?? "", withholdingSpecial: over.withholdingSpecial ?? false },
    formDetails: { ...EMPTY_FORM_DETAILS, tokuteiKatsudoType: rs.subtype ?? "", ...over.formDetails },
    requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
  };
}

/** 規則集合ごとの入力の組み合わせ。カテゴリー（未入力・1〜4）×納期の特例、取得の事由（未選択・3種）、医療の申請人の区分（未選択・2種） */
function inputsOf(rs: RuleSet) {
  const inputs: Parameters<typeof makeCase>[1][] = [];
  for (const category of ["", ...categoryRangeOf(null)] as OrgCategory[]) {
    for (const withholdingSpecial of [false, true]) inputs.push({ category, withholdingSpecial });
  }
  for (const acquisitionCause of ["", "nationalityLoss", "birth", "other"] as const) inputs.push({ formDetails: { acquisitionCause } });
  for (const medicalApplicantType of ["", "doctor", "other"] as const) inputs.push({ formDetails: { medicalApplicantType } });
  // 日本人の配偶者等の認定・変更・更新（basis: identity。Issue #420）だけ、申請人の身分（未選択・2身分）も加える。ほかの規則集合の入力は変えない
  if (rs.basis === "identity") for (const applicantIdentity of ["", ...APPLICANT_IDENTITIES] as const) inputs.push({ formDetails: { applicantIdentity } });
  // 留学の認定・変更・更新（basis: schoolType。Issue #420）だけ、入学先の種類（未選択・9区分）も加える
  if (rs.basis === "schoolType") for (const schoolType of ["", ...SCHOOL_TYPES] as const) inputs.push({ formDetails: { schoolType } });
  return inputs.map((input) => makeCase(rs, input));
}

/** 規則集合1つの判定結果を、比べられる形に並べる（その規則集合だけを渡して判定する） */
function resultsOf(rs: RuleSet) {
  return inputsOf(rs).map((c) => {
    const e = evaluate(c, [rs]);
    return {
      ruleSet: e.ruleSet?.id ?? null,
      flags: [e.needsCategory, e.categoryOutOfRange, e.needsCause, e.needsSubtype, e.needsApplicantType, ...(rs.basis === "identity" ? [e.needsIdentity] : []), ...(rs.basis === "schoolType" ? [e.needsSchoolType] : [])],
      items: e.items.map((i) => [i.rule.id, i.result, i.effective, i.reason, JSON.stringify(i.reasonCode)]),
    };
  });
}

function expectedOf(rs: RuleSet): Expected {
  const digest = createHash("sha256").update(JSON.stringify(resultsOf(rs))).digest("hex");
  return { ruleIds: rs.rules.map((r) => r.id), digest };
}

describe("既存の規則集合の結果（alsoBasis を持たないもの）は変わらない", () => {
  const legacy = RULE_SETS.filter((rs) => !rs.alsoBasis);

  if (process.env.UPDATE_RULESET_FIXTURE === "1") {
    it("期待値を作り直す", () => {
      const out = Object.fromEntries(legacy.map((rs) => [rs.id, expectedOf(rs)]));
      writeFileSync(FIXTURE, `${JSON.stringify(out, null, 2)}\n`);
    });
    return;
  }

  const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, Expected>;

  it("alsoBasis を持たない規則集合が、期待値にすべてある（足した・消した規則集合がない）", () => {
    // 期待値には、変更前に alsoBasis を持たなかった技人国の取得も入っている（今は alsoBasis を持つため、比べる対象から外す）
    const expectedIds = Object.keys(fixture).filter((id) => !RULE_SETS.find((rs) => rs.id === id)?.alsoBasis);
    expect(legacy.map((rs) => rs.id).sort()).toEqual(expectedIds.sort());
  });

  for (const rs of legacy) {
    it(`${rs.id}：規則の id と判定結果が、変更前と同じ`, () => {
      const actual = expectedOf(rs);
      expect(actual.ruleIds).toEqual(fixture[rs.id]?.ruleIds);
      expect(actual.digest).toBe(fixture[rs.id]?.digest);
    });
  }

  it("alsoBasis を持たずに、期待値へ後から足した規則集合は、日本人の配偶者等の認定・変更・更新だけ（basis: identity。Issue #420。身分ごとの結果も固定する）", () => {
    expect(legacy.filter((rs) => rs.basis === "identity").map((rs) => rs.id)).toEqual(["nihonjin_haigusha_coe", "nihonjin_haigusha_change", "nihonjin_haigusha_renewal"]);
  });

  it("alsoBasis を持たずに、期待値へ後から足した規則集合のうち、留学の認定・変更・更新は basis: schoolType（Issue #420。入学先の種類ごとの結果も固定する）", () => {
    expect(legacy.filter((rs) => rs.basis === "schoolType").map((rs) => rs.id)).toEqual(["ryugaku_coe", "ryugaku_change", "ryugaku_renewal"]);
  });

  it("alsoBasis を持つ規則集合は、技人国・経営・管理・研究・企業内転勤・医療・技能・定住者・教授・教育・報道・日本人の配偶者等・留学の取得だけ（技人国以外は Issue #420）", () => {
    expect(RULE_SETS.filter((rs) => rs.alsoBasis).map((rs) => rs.id)).toEqual([
      "gijinkoku_acquisition",
      "keiei_kanri_acquisition",
      "kenkyu_acquisition",
      "kigyonai_acquisition",
      "iryo_acquisition",
      "gino_acquisition",
      "teijusha_acquisition",
      "professor_acquisition",
      "education_acquisition",
      "hodo_acquisition",
      "nihonjin_haigusha_acquisition",
      "ryugaku_acquisition",
    ]);
  });
});
