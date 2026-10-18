import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion, scrollBehavior } from "./motion";

afterEach(() => vi.unstubAllGlobals());

function stub(matches: boolean) {
  vi.stubGlobal("window", { matchMedia: () => ({ matches }) });
}

describe("motion", () => {
  it("window が無い環境では動きを減らさない扱い", () => {
    expect(prefersReducedMotion()).toBe(false);
    expect(scrollBehavior()).toBe("smooth");
  });
  it("減らす設定では auto", () => {
    stub(true);
    expect(scrollBehavior()).toBe("auto");
  });
  it("減らす設定でなければ smooth", () => {
    stub(false);
    expect(scrollBehavior()).toBe("smooth");
  });
});
