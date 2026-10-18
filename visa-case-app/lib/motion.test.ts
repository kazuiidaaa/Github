import { afterEach, describe, expect, it, vi } from "vitest";
import { EXIT_MS, exitDelayMs, prefersReducedMotion, scrollBehavior } from "./motion";

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
  it("出る動きの待ち時間：通常は EXIT_MS、減らす設定では 0", () => {
    stub(false);
    expect(exitDelayMs()).toBe(EXIT_MS);
    stub(true);
    expect(exitDelayMs()).toBe(0);
  });
});
