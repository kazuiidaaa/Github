import { describe, expect, it } from "vitest";
import { needsTargetStatus } from "../lib/types";

describe("needsTargetStatus", () => {
  it("在留資格変更・認定証明書交付のみ true", () => {
    expect(needsTargetStatus("change")).toBe(true);
    expect(needsTargetStatus("coe")).toBe(true);
    expect(needsTargetStatus("renewal")).toBe(false);
    expect(needsTargetStatus("other")).toBe(false);
  });
});
