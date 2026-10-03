import { describe, expect, it } from "vitest";
import { buildBulkCaseNames } from "../lib/bulkCaseNames";

describe("buildBulkCaseNames", () => {
  it("空欄の行は「グループ名（行番号）」になる", () => {
    expect(buildBulkCaseNames("A社 変更", ["", "", ""])).toEqual(["A社 変更（1）", "A社 変更（2）", "A社 変更（3）"]);
  });
  it("入力のある行はそのまま使い、行番号は並び順のまま", () => {
    expect(buildBulkCaseNames("A社 変更", ["", "個別名", " "])).toEqual(["A社 変更（1）", "個別名", "A社 変更（3）"]);
  });
  it("グループ名の前後の空白は取り除く", () => {
    expect(buildBulkCaseNames("  A社  ", [""])).toEqual(["A社（1）"]);
  });
});
