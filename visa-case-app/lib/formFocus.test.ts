import { afterEach, describe, expect, it, vi } from "vitest";
import { firstErrorKey, focusField } from "./formFocus";

afterEach(() => vi.unstubAllGlobals());

describe("firstErrorKey", () => {
  const order = ["procedureType", "caseName", "targetStatus", "acceptedDate"] as const;
  it("画面の並び順で、最初の誤りの欄を返す（オブジェクトの順ではない）", () => {
    expect(firstErrorKey({ acceptedDate: "x", caseName: "y" }, order)).toBe("caseName");
  });
  it("空文字・undefined は誤りとして扱わない", () => {
    expect(firstErrorKey({ procedureType: "", caseName: undefined, targetStatus: "z" }, order)).toBe("targetStatus");
  });
  it("誤りがなければ null", () => {
    expect(firstErrorKey({}, order)).toBeNull();
  });
});

describe("focusField", () => {
  it("document が無い環境では何もしない", () => {
    expect(focusField("x")).toBe(false);
  });
  it("要素が無ければ false", () => {
    vi.stubGlobal("document", { getElementById: () => null });
    expect(focusField("x")).toBe(false);
  });
  it("入力欄そのものなら、それに移す。動きを減らす設定ではスクロールを即時にする", () => {
    const calls: unknown[] = [];
    const input = {
      matches: () => true,
      querySelector: () => null,
      scrollIntoView: (o: unknown) => calls.push(["scroll", o]),
      focus: (o: unknown) => calls.push(["focus", o]),
    };
    vi.stubGlobal("document", { getElementById: () => input });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(focusField("x")).toBe(true);
    expect(calls).toEqual([
      ["scroll", { block: "center", behavior: "auto" }],
      ["focus", { preventScroll: true }],
    ]);
  });
  it("枠なら、誤りの印のある欄を最優先に選ぶ", () => {
    const focused: string[] = [];
    const make = (name: string) => ({ scrollIntoView: () => {}, focus: () => focused.push(name) });
    const box = {
      matches: () => false,
      querySelector: (sel: string) => (sel.startsWith("[aria-invalid") ? make("invalid") : make("other")),
    };
    vi.stubGlobal("document", { getElementById: () => box });
    expect(focusField("x")).toBe(true);
    expect(focused).toEqual(["invalid"]);
  });
  it("枠に誤りの印が無ければ、Tab が止まる選択肢へ移す", () => {
    const focused: string[] = [];
    const make = (name: string) => ({ scrollIntoView: () => {}, focus: () => focused.push(name) });
    const box = {
      matches: () => false,
      querySelector: (sel: string) => (sel.startsWith('[role="radio"]') ? make("radio") : sel.startsWith("[aria-invalid") ? null : make("input")),
    };
    vi.stubGlobal("document", { getElementById: () => box });
    focusField("x");
    expect(focused).toEqual(["radio"]);
  });
});
