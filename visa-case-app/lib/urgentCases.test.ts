import { describe, expect, it } from "vitest";
import { buildDemoSeedCases } from "./demoSeed";
import { urgentCases } from "./urgentCases";
import type { CaseRecord } from "./types";

function dateIn(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function caseWith(index: number, id: string, expiryInDays: number | null): CaseRecord {
  const base = buildDemoSeedCases()[index];
  return {
    ...base,
    id,
    applicant: { ...base.applicant, residenceExpiryDate: expiryInDays === null ? "" : dateIn(expiryInDays) },
  };
}

describe("urgentCases", () => {
  it("期限切れと30日以内のみを抽出し、31日以降と未入力は含めない", () => {
    const rows = urgentCases([
      caseWith(0, "far", 31),
      caseWith(0, "none", null),
      caseWith(0, "edge", 30),
      caseWith(0, "over", -1),
    ]);
    expect(rows.map((r) => r.record.id)).toEqual(["over", "edge"]);
  });

  it("期限切れを先頭に、以降は期限の近い順に並べる", () => {
    const rows = urgentCases([
      caseWith(0, "d20", 20),
      caseWith(1, "d0", 0),
      caseWith(2, "o3", -3),
      caseWith(0, "d5", 5),
      caseWith(1, "o10", -10),
    ]);
    expect(rows.map((r) => r.record.id)).toEqual(["o10", "o3", "d0", "d5", "d20"]);
  });

  it("該当がなければ空", () => {
    expect(urgentCases([caseWith(0, "a", 120), caseWith(1, "b", null)])).toEqual([]);
    expect(urgentCases([])).toEqual([]);
  });

  it("各行に、次に行うことの案内文を付ける", () => {
    const [row] = urgentCases([caseWith(0, "a", 5)]);
    expect(row.nextMessage.length).toBeGreaterThan(0);
  });
});
