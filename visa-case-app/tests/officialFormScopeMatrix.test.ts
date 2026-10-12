import { describe, expect, it } from "vitest";
import { fillOfficialExcel } from "../lib/documents/excelFill";
import { OFFICIAL_FORM_SPECS, officialFormScopeWarnings, officialFormSpecFor } from "../lib/documents/officialForms";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { FORM_STATUSES, formCodeOfStatus, isStatusInFormScope } from "../lib/hspForm";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type ProcedureType } from "../lib/types";

// 在留資格×手続の組み合わせで、使う様式と「対象外の可能性」の注意の有無を確かめる（Issue #290）。値はすべてダミー。
// 一覧（FORM_STATUSES）の件数・並びは決め打ちせず、一覧から期待値を作る。

const KEIEI = "経営・管理";
const HSP = "高度専門職（1号ロ）";
// 一覧にない（対象外の可能性を警告する）在留資格。研究・特定活動は、一覧に足すまで対象外（Issue #299・#300）
const OUT_OF_SCOPE = ["研究", "特定活動", "留学", "永住者", "家族滞在", "特定技能", "技能実習", "外交"];

const allListed = (["I", "L", "N", "U"] as const).flatMap((code) => FORM_STATUSES[code].map((status) => ({ status, code })));

/** 更新・変更の、対象範囲の期待値：一覧・高度専門職・経営・管理なら注意なし */
const IN_SCOPE = [...allListed.map((x) => x.status), HSP, KEIEI];

function scope(procedureType: ProcedureType, status: string, over: { residenceStatus?: string; targetStatus?: string } = {}) {
  return officialFormScopeWarnings({
    procedureType,
    currentStatus: status,
    residenceStatus: over.residenceStatus ?? status,
    targetStatus: over.targetStatus,
  });
}

describe("在留資格→様式（一覧が唯一の表）", () => {
  for (const { status, code } of allListed) {
    it(`${status}は様式${code}`, () => {
      expect(formCodeOfStatus(status)).toBe(code);
    });
  }
  it("一覧にない在留資格・近い名前の在留資格は、様式を特定しない（完全一致）", () => {
    for (const status of [...OUT_OF_SCOPE, KEIEI, ""]) expect(formCodeOfStatus(status), status).toBeUndefined();
    expect(formCodeOfStatus(" 教授 ")).toBe("I"); // 前後の空白は無視する
  });
  it("技術・人文知識・国際業務だけは、部分一致で様式N（既存の動きを保つ）", () => {
    expect(formCodeOfStatus("技術・人文知識・国際業務（旧）")).toBe("N");
    expect(formCodeOfStatus("介護（旧）")).toBeUndefined();
  });
  it("対象範囲：一覧・高度専門職・経営・管理は範囲内、研究・特定活動などは範囲外", () => {
    for (const status of IN_SCOPE) expect(isStatusInFormScope(status), status).toBe(true);
    for (const status of OUT_OF_SCOPE) expect(isStatusInFormScope(status), status).toBe(false);
  });
});

describe("対象外の注意（画面の事前表示と同じ判定）：更新", () => {
  for (const status of IN_SCOPE) {
    it(`更新×${status}：注意なし`, () => {
      expect(scope("renewal", status)).toEqual([]);
    });
  }
  for (const status of OUT_OF_SCOPE) {
    it(`更新×${status}：注意が1件`, () => {
      expect(scope("renewal", status)).toHaveLength(1);
    });
  }
  it("現在の在留資格か申請人情報の在留資格の、どちらかが範囲内なら注意なし／どちらも範囲外か空なら注意あり", () => {
    expect(scope("renewal", "留学", { residenceStatus: "報道" })).toEqual([]);
    expect(scope("renewal", "教育", { residenceStatus: "留学" })).toEqual([]);
    expect(scope("renewal", "留学", { residenceStatus: "" })).toHaveLength(1);
    expect(scope("renewal", "", { residenceStatus: "" })).toHaveLength(1);
  });
});

describe("対象外の注意：変更（変更後の在留資格で決まる）", () => {
  for (const target of IN_SCOPE) {
    it(`変更×変更後${target}：注意なし（現在の在留資格によらない）`, () => {
      expect(scope("change", "留学", { targetStatus: target })).toEqual([]);
    });
  }
  for (const target of OUT_OF_SCOPE) {
    it(`変更×変更後${target}：注意が1件`, () => {
      expect(scope("change", "技術・人文知識・国際業務", { targetStatus: target })).toHaveLength(1);
    });
  }
  it("変更後が未入力・省略なら、ここでは注意を出さない（生成時に別の案内が出る）", () => {
    expect(scope("change", "留学")).toEqual([]);
    expect(scope("change", "留学", { targetStatus: "  " })).toEqual([]);
  });
});

describe("対象外の注意：認定・取得・その他", () => {
  it("認定・取得は、在留資格によらず注意なし", () => {
    for (const status of [...IN_SCOPE, ...OUT_OF_SCOPE]) {
      expect(scope("coe", status, { targetStatus: status }), status).toEqual([]);
      expect(scope("acquisition", status, { targetStatus: status }), status).toEqual([]);
    }
  });
  it("その他は、更新の様式にフォールバックし、在留資格によらず注意が1件", () => {
    expect(officialFormSpecFor("other")).toBe(OFFICIAL_FORM_SPECS.renewal);
    for (const status of [...IN_SCOPE, ...OUT_OF_SCOPE]) expect(scope("other", status), status).toHaveLength(1);
  });
});

describe("生成（fillOfficialExcel）の注意が、事前表示と一致する", () => {
  const run = (procedureType: ProcedureType, status: string, targetStatus = "") =>
    fillOfficialExcel({
      procedureType,
      currentStatus: status,
      targetStatus,
      applicant: { ...EMPTY_APPLICANT, residenceStatus: status },
      employment: EMPTY_EMPLOYMENT,
      formDetails: EMPTY_FORM_DETAILS,
    });
  const SAMPLE = ["技術・人文知識・国際業務", "教育", "報道", "企業内転勤", "医療", "介護", "技能", KEIEI, "研究", "留学"];

  for (const status of SAMPLE) {
    it(`更新×${status}：生成の warnings に、対象外の注意が出るのは事前表示と同じ場合だけ（重複なし）`, async () => {
      const expected = scope("renewal", status);
      const { warnings } = await run("renewal", status);
      for (const w of expected) expect(warnings.filter((x) => x === w)).toHaveLength(1);
      if (expected.length === 0) expect(warnings.some((x) => x.includes("対象外の可能性"))).toBe(false);
    });
    it(`変更×変更後${status}：生成の warnings に、事前表示と同じ文面が1件だけ（または無し）`, async () => {
      const expected = scope("change", "留学", { targetStatus: status });
      const { warnings } = await run("change", "留学", status);
      const hits = warnings.filter((x) => x.includes("変更後の在留資格に合う様式"));
      expect(hits).toEqual(expected);
    });
  }
  it("経営・管理の更新は、第1表のみの案内だけが出る（二重にならない）", async () => {
    const { warnings } = await run("renewal", KEIEI);
    expect(warnings.filter((x) => x.includes("第1表（申請人用（更新）１）のみ"))).toHaveLength(1);
    expect(warnings.some((x) => x.includes("対象外の可能性"))).toBe(false);
  });
  it("その他は、更新の様式で作り、対象外の注意を先頭に付ける", async () => {
    const { warnings } = await run("other", "技術・人文知識・国際業務");
    expect(warnings[0]).toBe(OFFICIAL_FORM_SPECS.renewal?.outOfScopeWarning);
  });
});
