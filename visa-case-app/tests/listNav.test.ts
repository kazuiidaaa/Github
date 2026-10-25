import { describe, expect, it } from "vitest";
import { nextRowIndex } from "../lib/listNav";

describe("nextRowIndex（一覧のキーボード移動）", () => {
  it("下・上の矢印で 1 行ずつ移り、端で止まる", () => {
    expect(nextRowIndex("ArrowDown", 0, 3)).toBe(1);
    expect(nextRowIndex("ArrowDown", 2, 3)).toBe(2);
    expect(nextRowIndex("ArrowUp", 2, 3)).toBe(1);
    expect(nextRowIndex("ArrowUp", 0, 3)).toBe(0);
  });
  it("Home・End で先頭・末尾へ移る", () => {
    expect(nextRowIndex("Home", 2, 5)).toBe(0);
    expect(nextRowIndex("End", 1, 5)).toBe(4);
  });
  it("どの行も選んでいないとき、下は先頭、上は末尾へ入る", () => {
    expect(nextRowIndex("ArrowDown", -1, 4)).toBe(0);
    expect(nextRowIndex("ArrowUp", -1, 4)).toBe(3);
  });
  it("対象外のキーと、行がないときは null", () => {
    expect(nextRowIndex("Enter", 0, 3)).toBeNull();
    expect(nextRowIndex("a", 0, 3)).toBeNull();
    expect(nextRowIndex("ArrowDown", -1, 0)).toBeNull();
  });
});
