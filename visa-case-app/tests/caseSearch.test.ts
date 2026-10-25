import { describe, expect, it } from "vitest";
import { applyFilter, DEFAULT_FILTER, metricsOf } from "../lib/caseMetrics";
import { listSearchTargets } from "../lib/caseSearch";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { jaT } from "../lib/i18n/jaT";
import { makeLabels } from "../lib/i18n/labels";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function make(over: Partial<CaseRecord> & { name?: string; status?: string; expiry?: string } = {}): CaseRecord {
  return {
    id: over.id ?? "1",
    caseName: over.caseName ?? "試験案件",
    procedureType: over.procedureType ?? "renewal",
    currentStatus: "",
    targetStatus: over.targetStatus ?? "",
    memo: over.memo ?? "",
    workflowStatus: over.workflowStatus ?? "preparing",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: over.updatedAt ?? "2026-01-01T00:00:00Z",
    applicant: { ...EMPTY_APPLICANT, legalName: over.name ?? "", residenceStatus: over.status ?? "", residenceExpiryDate: over.expiry ?? "" },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    documents: [],
    checks: [],
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
  };
}

const labels = makeLabels(jaT);
const targetsOf = (c: CaseRecord) => listSearchTargets(c, metricsOf(c), jaT, labels.workflow);
const ids = (cases: CaseRecord[], query: string, wide = true) =>
  applyFilter(cases, { ...DEFAULT_FILTER, query }, wide ? (c, m) => listSearchTargets(c, m, jaT, labels.workflow) : undefined).map((r) => r.record.id);

describe("PC 版の案件一覧の検索（表で見える列の語とメモ）", () => {
  const cases = [
    make({ id: "a", caseName: "甲社の案件", name: "試験 太郎", status: "留学", procedureType: "change", targetStatus: "技術・人文知識・国際業務", memo: "雇用契約書の再提出を待つ", expiry: "2026-12-31" }),
    make({ id: "b", caseName: "乙社の案件", name: "例 花子", status: "技能", procedureType: "renewal", targetStatus: "永住者", memo: "" }),
    make({ id: "c", caseName: "丙社の案件", name: "見本 次郎", procedureType: "coe", targetStatus: "技能" }),
  ];

  it("案件名・申請人氏名に当たる（従来どおり）", () => {
    expect(ids(cases, "甲社")).toEqual(["a"]);
    expect(ids(cases, "花子")).toEqual(["b"]);
  });
  it("手続の語に当たる", () => {
    expect(ids(cases, "在留期間更新")).toEqual(["b"]);
    expect(ids(cases, "在留資格変更")).toEqual(["a"]);
  });
  it("在留資格の語に当たる。変更後・希望の在留資格は、必要な手続のときだけ", () => {
    expect(ids(cases, "留学")).toEqual(["a"]);
    expect(ids(cases, "国際業務")).toEqual(["a"]);
    // 更新（renewal）では変更後を使わないので、「永住者」では当たらない
    expect(ids(cases, "永住者")).toEqual([]);
    // 認定（coe）の希望する在留資格には当たる
    expect(ids(cases, "技能").sort()).toEqual(["b", "c"]);
  });
  it("メモの語に当たる", () => {
    expect(ids(cases, "雇用契約書")).toEqual(["a"]);
  });
  it("期限の日付に、表の形（2026/12/31）でも保存の形（2026-12-31）でも当たる", () => {
    expect(ids(cases, "2026/12/31")).toEqual(["a"]);
    expect(ids(cases, "2026-12-31")).toEqual(["a"]);
  });
  it("次の作業の案内文・状態の名前に当たる", () => {
    expect(targetsOf(cases[0]).some((s) => s.includes("在留カード"))).toBe(true);
    expect(ids(cases, "在留カード").length).toBe(3);
    expect(ids(cases, labels.workflow("preparing")).length).toBe(3);
    expect(ids([...cases, make({ id: "d", workflowStatus: "review_required" })], labels.workflow("review_required"))).toEqual(["d"]);
  });
  it("全角・半角・空白の違いは、従来どおり吸収する", () => {
    expect(ids(cases, "試験　太郎")).toEqual(["a"]);
    expect(ids(cases, "試験太郎")).toEqual(["a"]);
  });
  it("空の検索語（空白のみを含む）は絞り込まず、語の組み立ても呼ばない", () => {
    let calls = 0;
    const r = applyFilter(cases, { ...DEFAULT_FILTER, query: "  　" }, () => {
      calls++;
      return [];
    });
    expect(r).toHaveLength(3);
    expect(calls).toBe(0);
  });
  it("他の絞り込み条件と重ねられる", () => {
    const r = applyFilter(cases, { ...DEFAULT_FILTER, query: "技能", procedure: "coe" }, (c, m) => listSearchTargets(c, m, jaT, labels.workflow));
    expect(r.map((x) => x.record.id)).toEqual(["c"]);
  });
});

describe("iPhone 版・ホームの一覧（語の組み立てを渡さない）は、従来の対象のまま", () => {
  const cases = [make({ id: "a", caseName: "甲社の案件", name: "試験 太郎", status: "留学", memo: "雇用契約書", procedureType: "change", targetStatus: "永住者" })];
  it("案件名・申請人氏名・在留資格には当たる", () => {
    expect(ids(cases, "甲社", false)).toEqual(["a"]);
    expect(ids(cases, "太郎", false)).toEqual(["a"]);
    expect(ids(cases, "留学", false)).toEqual(["a"]);
  });
  it("メモ・手続・変更後の在留資格・次の作業には当たらない（変更しない）", () => {
    expect(ids(cases, "雇用契約書", false)).toEqual([]);
    expect(ids(cases, "在留資格変更許可", false)).toEqual([]);
    expect(ids(cases, "永住者", false)).toEqual([]);
    expect(ids(cases, "在留カード", false)).toEqual([]);
  });
});
