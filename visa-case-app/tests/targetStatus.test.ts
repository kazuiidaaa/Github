import { describe, expect, it } from "vitest";
import { getTargetStatusDisplay, needsTargetStatus } from "../lib/types";

describe("needsTargetStatus", () => {
  it("在留資格変更・認定証明書交付のみ true", () => {
    expect(needsTargetStatus("change")).toBe(true);
    expect(needsTargetStatus("coe")).toBe(true);
    expect(needsTargetStatus("renewal")).toBe(false);
    expect(needsTargetStatus("other")).toBe(false);
  });
});

describe("getTargetStatusDisplay", () => {
  it("renewal・other は表示なし", () => {
    expect(getTargetStatusDisplay("renewal", "技術・人文知識・国際業務")).toBeNull();
    expect(getTargetStatusDisplay("other", "技術・人文知識・国際業務")).toBeNull();
  });

  it("change は「変更後」のラベルと値を返す", () => {
    expect(getTargetStatusDisplay("change", "経営・管理")).toEqual({
      tableLabel: "変更後：",
      cardLabel: "変更後の在留資格",
      value: "経営・管理",
    });
  });

  it("coe は「希望」のラベルと値を返す", () => {
    expect(getTargetStatusDisplay("coe", "経営・管理")).toEqual({
      tableLabel: "希望：",
      cardLabel: "希望する在留資格",
      value: "経営・管理",
    });
  });

  it("空・空白のみ・undefined は未入力（value が null）", () => {
    for (const v of ["", "   ", "　", undefined]) {
      expect(getTargetStatusDisplay("change", v)?.value).toBeNull();
      expect(getTargetStatusDisplay("coe", v)?.value).toBeNull();
    }
  });

  it("前後の空白は取り除く", () => {
    expect(getTargetStatusDisplay("change", "  経営・管理 ")?.value).toBe("経営・管理");
  });
});
