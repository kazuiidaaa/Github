import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UI_LANG_STORAGE_KEY } from "../lib/i18n/store";

// 利用者の操作の途中状態（メモリ上の値）が、テスト間で残らないよう、毎回モジュールを読み直す
async function loadStore() {
  vi.resetModules();
  return await import("../lib/i18n/store");
}

function stubStorage(store: Map<string, string>) {
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  });
}

describe("表示言語の記憶（store）", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    stubStorage(store);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("記憶がなければ、日本語を返す", async () => {
    const s = await loadStore();
    expect(s.readUiLang()).toBe("ja");
  });

  it("記憶した言語を読む", async () => {
    store.set(UI_LANG_STORAGE_KEY, "ko");
    const s = await loadStore();
    expect(s.readUiLang()).toBe("ko");
  });

  it("不正な値は、日本語にする", async () => {
    store.set(UI_LANG_STORAGE_KEY, "fr");
    const s = await loadStore();
    expect(s.readUiLang()).toBe("ja");
  });

  it("書き込むと、記憶され、読み取りに反映される", async () => {
    const s = await loadStore();
    s.writeUiLang("en");
    expect(store.get(UI_LANG_STORAGE_KEY)).toBe("en");
    expect(s.readUiLang()).toBe("en");
  });

  it("書き込みを、購読者へ通知する。購読を解除すると、通知しない", async () => {
    const s = await loadStore();
    const cb = vi.fn();
    const unsubscribe = s.subscribeUiLang(cb);
    s.writeUiLang("en");
    expect(cb).toHaveBeenCalledTimes(1);
    s.writeUiLang("ko");
    expect(cb).toHaveBeenCalledTimes(2);
    unsubscribe();
    s.writeUiLang("ja");
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("通知を受けた時点で、新しい言語を読める", async () => {
    const s = await loadStore();
    const seen: string[] = [];
    s.subscribeUiLang(() => seen.push(s.readUiLang()));
    s.writeUiLang("ko");
    expect(seen).toEqual(["ko"]);
  });
});

describe("localStorage が使えない場合", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("読み取りが例外を投げても、日本語を返す", async () => {
    vi.stubGlobal("window", {
      get localStorage(): never {
        throw new Error("blocked");
      },
    });
    const s = await loadStore();
    expect(s.readUiLang()).toBe("ja");
  });

  it("書き込みが例外を投げても、画面は壊れず、切り替わり、通知する", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("quota");
        },
      },
    });
    const s = await loadStore();
    const cb = vi.fn();
    s.subscribeUiLang(cb);
    expect(() => s.writeUiLang("en")).not.toThrow();
    expect(s.readUiLang()).toBe("en");
    expect(cb).toHaveBeenCalledTimes(1);
    s.writeUiLang("ko");
    expect(s.readUiLang()).toBe("ko");
  });
});
