import { describe, expect, it } from "vitest";
import { hasAcceptedDateError, isAcceptedAfterPlanned } from "@/lib/acceptedDate";
import { sanitizeAuditDetail } from "@/lib/auditDetail";
import { buildDemoSeedCases } from "@/lib/demoSeed";

describe("受任日", () => {
  it("申請予定日より後のときだけ、警告の対象になる", () => {
    expect(isAcceptedAfterPlanned("2026-05-02", "2026-05-01")).toBe(true);
    expect(isAcceptedAfterPlanned("2026-05-01", "2026-05-01")).toBe(false);
    expect(isAcceptedAfterPlanned("2026-04-30", "2026-05-01")).toBe(false);
  });
  it("どちらかが未入力・不正なら、警告しない", () => {
    expect(isAcceptedAfterPlanned("", "2026-05-01")).toBe(false);
    expect(isAcceptedAfterPlanned("2026-05-02", "")).toBe(false);
    expect(isAcceptedAfterPlanned("2026-02-30", "2026-01-01")).toBe(false);
  });
  it("未入力は正常、存在しない日付は不正", () => {
    expect(hasAcceptedDateError("")).toBe(false);
    expect(hasAcceptedDateError("2026-05-01")).toBe(false);
    expect(hasAcceptedDateError("2026-02-30")).toBe(true);
  });
  it("監査ログには日付の値を残さず、項目名のみ残す", () => {
    expect(sanitizeAuditDetail({ acceptedDate: "2026-05-01" })).toEqual({ changedFields: ["acceptedDate"] });
  });
  it("デモの架空案件に、受任日が入っている", () => {
    for (const c of buildDemoSeedCases(new Date())) expect(c.acceptedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
