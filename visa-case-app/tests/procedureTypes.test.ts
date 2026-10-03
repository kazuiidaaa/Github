import { describe, expect, it } from "vitest";
import { PROCEDURE_TYPES, procedureNeedsTarget, targetStatusLabel, type ProcedureType } from "../lib/types";

describe("手続種別", () => {
  it("取得許可申請が選択肢にある", () => {
    const p = PROCEDURE_TYPES.find((x) => x.value === "acquisition");
    expect(p?.label).toBe("在留資格取得許可申請");
  });

  it("変更・認定・取得は、変更後（希望する）在留資格が必要。更新・その他は不要", () => {
    const need: ProcedureType[] = ["change", "coe", "acquisition"];
    for (const p of PROCEDURE_TYPES) {
      expect(procedureNeedsTarget(p.value)).toBe(need.includes(p.value));
    }
  });

  it("入力欄の名称は、変更のみ「変更後の在留資格」", () => {
    expect(targetStatusLabel("change")).toBe("変更後の在留資格");
    expect(targetStatusLabel("coe")).toBe("希望する在留資格");
    expect(targetStatusLabel("acquisition")).toBe("希望する在留資格");
  });
});
