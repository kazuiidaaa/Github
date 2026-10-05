import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

// 値はすべて架空。デモ開始・終了の保存領域の扱いを、ブラウザの保存領域を模して検証する。
function fakeStorage() {
  const m = new Map<string, string>();
  return {
    m,
    api: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    },
  };
}
const local = fakeStorage();
const session = fakeStorage();
vi.stubGlobal("localStorage", local.api);
vi.stubGlobal("sessionStorage", session.api);

import { exitDemo, startDemo } from "../lib/auth";
import { CASES_KEY, ensureLoaded, resetStore, saveCase, updateCase } from "../lib/store";
import { applyFilter, DEFAULT_FILTER, summarize } from "../lib/caseMetrics";
import { buildDemoSeedCases } from "../lib/demoSeed";
import { daysUntil } from "../lib/format";
import type { CaseRecord } from "../lib/types";

const DEMO_KEY = `${CASES_KEY}:demo`;
const readDemo = () => JSON.parse(local.m.get(DEMO_KEY) ?? "[]") as CaseRecord[];

beforeEach(() => {
  local.m.clear();
  session.m.clear();
  exitDemo();
});

describe("buildDemoSeedCases", () => {
  it("3件以上で、対応が必要・申請準備完了・期限が近い案件が揃う", () => {
    const cases = buildDemoSeedCases();
    expect(cases.length).toBeGreaterThanOrEqual(3);
    const s = summarize(cases);
    expect(s.review).toBeGreaterThanOrEqual(1);
    expect(s.ready).toBeGreaterThanOrEqual(1);
    expect(s.within30).toBeGreaterThanOrEqual(1);
    expect(s.missingDocs).toBeGreaterThanOrEqual(1);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  it("申請準備完了の案件は、不足書類がなく申請前チェックも完了している", () => {
    const b = applyFilter(buildDemoSeedCases(), { ...DEFAULT_FILTER, status: "application_ready" });
    expect(b).toHaveLength(1);
    expect(b[0].metrics.missingCount).toBe(0);
    expect(b[0].metrics.checksPending).toBe(false);
  });

  it("在留期限は、渡した日付からの相対日数になる", () => {
    for (const now of [new Date(2026, 0, 5, 9), new Date(2030, 11, 31, 23)]) {
      const cases = buildDemoSeedCases(now);
      const days = cases.map((c) => Math.round((new Date(c.applicant.residenceExpiryDate + "T00:00:00").getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000));
      expect(days).toEqual([120, 200, 14]);
    }
    // 現在日に対しても、期限が近い案件が緊急（30日以内）になる
    const near = buildDemoSeedCases().filter((c) => (daysUntil(c.applicant.residenceExpiryDate) ?? 99) <= 30);
    expect(near).toHaveLength(1);
  });

  it("名称は明確なサンプル表記で、番号・住所・書類を含まない", () => {
    for (const c of buildDemoSeedCases()) {
      expect(c.caseName).toMatch(/^サンプル案件/);
      expect(c.applicant.legalName).toMatch(/^サンプル申請人/);
      expect(c.employment.companyName).toMatch(/^サンプル株式会社/);
      expect(c.applicant.residenceCardNumber).toBe("");
      expect(c.applicant.address).toBe("");
      expect(c.applicant.dateOfBirth).toBe("");
      expect(c.employment.companyAddress).toBe("");
      expect(c.documents).toHaveLength(0);
      expect(JSON.stringify(c)).not.toMatch(/\d{7,}/);
    }
  });
});

describe("startDemo / exitDemo", () => {
  it("デモ開始直後に、デモ用の保存領域へだけサンプルが入る", () => {
    startDemo();
    expect(readDemo().length).toBeGreaterThanOrEqual(3);
    expect(local.m.has(CASES_KEY)).toBe(false);
  });

  it("デモ中の変更は保存され、再読み込み後も残り、再度startDemoすると初期状態に戻る", async () => {
    startDemo();
    await ensureLoaded();
    const first = readDemo()[0];
    updateCase(first.id, (c) => ({ ...c, caseName: "変更後の案件名" }));
    saveCase({ ...first, id: "added", caseName: "追加した案件" });
    expect(readDemo().map((c) => c.caseName)).toContain("変更後の案件名");
    expect(readDemo().map((c) => c.id)).toContain("added");

    // 再読み込み（startDemo は呼ばれない）後も、変更を引き続き保存領域から読み込める
    resetStore();
    await ensureLoaded();
    updateCase("added", (c) => ({ ...c, caseName: "再読み込み後の変更" }));
    expect(readDemo().map((c) => c.caseName)).toEqual(expect.arrayContaining(["変更後の案件名", "再読み込み後の変更"]));
    expect(readDemo()).toHaveLength(4);

    startDemo();
    const reset = readDemo();
    expect(reset.map((c) => c.id)).not.toContain("added");
    expect(reset.map((c) => c.caseName)).not.toContain("変更後の案件名");
    expect(reset).toHaveLength(3);
  });

  it("exitDemo でサンプルも変更分も消え、通常の保存領域は変わらない", async () => {
    local.m.set(CASES_KEY, "[]");
    startDemo();
    await ensureLoaded();
    saveCase({ ...readDemo()[0], id: "added" });
    exitDemo();
    expect(local.m.has(DEMO_KEY)).toBe(false);
    expect(local.m.get(CASES_KEY)).toBe("[]");
  });

  it("デモに切り替えられない環境では、通常の保存領域へサンプルを書かない", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    });
    startDemo();
    expect(local.m.has(CASES_KEY)).toBe(false);
    expect(local.m.has(DEMO_KEY)).toBe(false);
    vi.stubGlobal("sessionStorage", session.api);
  });
});
