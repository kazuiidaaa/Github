import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * このリポジトリには、DOM 環境（jsdom 等）も @testing-library もないため、
 * React のフックを最小限の仕組みに差し替え、LanguageProvider を関数として直接実行して検証する。
 * 検証するのは、Provider の振る舞い（取得・保存・上書きの判断・html の lang）。
 */
const h = vi.hoisted(() => {
  type Effect = { deps: unknown[] | undefined; cleanup?: void | (() => void) };
  const rt = {
    slots: [] as unknown[],
    index: 0,
    effects: [] as { slot: number; fn: () => void | (() => void) }[],
    rerender: () => {},
  };
  const sameDeps = (a: unknown[] | undefined, b: unknown[] | undefined) =>
    !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  return {
    rt,
    session: { current: undefined as unknown },
    demo: { current: false },
    supabaseEnabled: { current: true },
    toast: { success: vi.fn(), error: vi.fn() },
    load: vi.fn(),
    save: vi.fn(),
    hooks: {
      useRef: (init: unknown) => {
        const i = rt.index++;
        if (!(i in rt.slots)) rt.slots[i] = { current: init };
        return rt.slots[i];
      },
      useMemo: (fn: () => unknown, deps: unknown[]) => {
        const i = rt.index++;
        const prev = rt.slots[i] as { deps: unknown[]; value: unknown } | undefined;
        if (prev && sameDeps(prev.deps, deps)) return prev.value;
        rt.slots[i] = { deps, value: fn() };
        return (rt.slots[i] as { value: unknown }).value;
      },
      useCallback: (fn: unknown, deps: unknown[]) => h.hooks.useMemo(() => fn, deps),
      useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
        const i = rt.index++;
        const prev = rt.slots[i] as Effect | undefined;
        if (prev && sameDeps(prev.deps, deps)) return;
        rt.effects.push({ slot: i, fn });
        rt.slots[i] = { deps, cleanup: prev?.cleanup } satisfies Effect;
      },
      useSyncExternalStore: (subscribe: (cb: () => void) => () => void, getSnapshot: () => unknown) => {
        const i = rt.index++;
        if (!(i in rt.slots)) rt.slots[i] = subscribe(() => rt.rerender());
        return getSnapshot();
      },
    },
  };
});

vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), ...h.hooks }));
vi.mock("@/lib/auth", () => ({ useSession: () => h.session.current }));
vi.mock("@/lib/demo", () => ({ useDemo: () => h.demo.current }));
vi.mock("@/lib/supabase", () => ({
  get isSupabaseEnabled() {
    return h.supabaseEnabled.current;
  },
}));
vi.mock("@/components/Toast", () => ({ useToast: () => h.toast }));
vi.mock("@/lib/i18n/preferences", () => ({ loadLanguagePreference: h.load, saveLanguagePreference: h.save }));

type Api = { lang: string; setLang: (l: "ja" | "en" | "ko") => void; t: (k: string, p?: Record<string, string | number>) => string };

const KEY = "visa-case-app:ui-lang";
let storage: Map<string, string>;
let docEl: { lang: string };

/** Provider を1回実行し、保留中の副作用を実行する。context の値を返す */
function render(Provider: (p: { children: null }) => unknown): Api {
  h.rt.index = 0;
  const el = Provider({ children: null }) as { props: { value: Api } };
  const pending = h.rt.effects.splice(0);
  for (const { slot, fn } of pending) {
    const s = h.rt.slots[slot] as { cleanup?: void | (() => void) };
    if (typeof s.cleanup === "function") s.cleanup();
    s.cleanup = fn();
  }
  latest = el.props.value;
  return latest;
}
let latest: Api;
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

async function mount() {
  vi.resetModules();
  const { LanguageProvider } = await import("../lib/i18n/LanguageProvider");
  const store = await import("../lib/i18n/store");
  const P = LanguageProvider as unknown as (p: { children: null }) => unknown;
  h.rt.slots = [];
  h.rt.effects = [];
  h.rt.rerender = () => render(P);
  render(P);
  return { store, api: () => latest, rerender: () => render(P) };
}

const loggedIn = () => {
  h.session.current = { user: { id: "u1" } };
};

beforeEach(() => {
  storage = new Map();
  docEl = { lang: "" };
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v) },
  });
  vi.stubGlobal("document", { documentElement: docEl });
  h.session.current = null;
  h.demo.current = false;
  h.supabaseEnabled.current = true;
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  h.load.mockReset();
  h.save.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("LanguageProvider", () => {
  it("(a) Supabase 未設定では、preferences を呼ばず、記憶のみで切り替わる", async () => {
    h.supabaseEnabled.current = false;
    loggedIn();
    const m = await mount();
    expect(m.api().lang).toBe("ja");
    m.api().setLang("en");
    await flush();
    expect(m.api().lang).toBe("en");
    expect(storage.get(KEY)).toBe("en");
    expect(h.load).not.toHaveBeenCalled();
    expect(h.save).not.toHaveBeenCalled();
  });

  it("(a) デモでは、preferences を呼ばず、記憶のみで切り替わる", async () => {
    h.demo.current = true;
    loggedIn();
    const m = await mount();
    m.api().setLang("ko");
    await flush();
    expect(m.api().lang).toBe("ko");
    expect(storage.get(KEY)).toBe("ko");
    expect(h.load).not.toHaveBeenCalled();
    expect(h.save).not.toHaveBeenCalled();
  });

  it("未ログインでは、preferences を呼ばない", async () => {
    const m = await mount();
    m.api().setLang("en");
    expect(m.api().lang).toBe("en");
    expect(h.load).not.toHaveBeenCalled();
    expect(h.save).not.toHaveBeenCalled();
  });

  it("(b) ログイン済みで保存値があれば、記憶より優先して切り替わる", async () => {
    storage.set(KEY, "en");
    loggedIn();
    let resolve!: (v: unknown) => void;
    h.load.mockReturnValue(new Promise((r) => (resolve = r)));
    const m = await mount();
    expect(m.api().lang).toBe("en");
    resolve({ ok: true, lang: "ko" });
    await flush();
    expect(h.load).toHaveBeenCalledWith("u1");
    expect(m.api().lang).toBe("ko");
    expect(storage.get(KEY)).toBe("ko");
  });

  it("保存値がなければ（未設定）、記憶した言語のまま", async () => {
    storage.set(KEY, "en");
    loggedIn();
    h.load.mockResolvedValue({ ok: true, lang: null });
    const m = await mount();
    await flush();
    expect(m.api().lang).toBe("en");
  });

  it("(c) 取得に失敗しても、記憶した言語のまま", async () => {
    storage.set(KEY, "en");
    loggedIn();
    h.load.mockResolvedValue({ ok: false });
    const m = await mount();
    await flush();
    expect(m.api().lang).toBe("en");
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("(d) 取得の完了前に利用者が切り替えた場合は、取得結果で上書きしない", async () => {
    loggedIn();
    let resolve!: (v: unknown) => void;
    h.load.mockReturnValue(new Promise((r) => (resolve = r)));
    h.save.mockResolvedValue(true);
    const m = await mount();
    m.api().setLang("en");
    resolve({ ok: true, lang: "ko" });
    await flush();
    expect(m.api().lang).toBe("en");
    expect(storage.get(KEY)).toBe("en");
    expect(h.save).toHaveBeenCalledWith("u1", "en");
  });

  it("ログイン済みで切り替えると、保存する。成功しても通知しない", async () => {
    loggedIn();
    h.load.mockResolvedValue({ ok: true, lang: null });
    h.save.mockResolvedValue(true);
    const m = await mount();
    await flush();
    m.api().setLang("ko");
    await flush();
    expect(h.save).toHaveBeenCalledWith("u1", "ko");
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("(e) 保存に失敗したら、toast.error を呼び、選択は保つ", async () => {
    loggedIn();
    h.load.mockResolvedValue({ ok: true, lang: null });
    h.save.mockResolvedValue(false);
    const m = await mount();
    await flush();
    m.api().setLang("en");
    await flush();
    expect(h.toast.error).toHaveBeenCalledTimes(1);
    expect(typeof h.toast.error.mock.calls[0][0]).toBe("string");
    expect(h.toast.error.mock.calls[0][0]).toBe(m.api().t("common.languageSaveFailed"));
    expect(m.api().lang).toBe("en");
    expect(storage.get(KEY)).toBe("en");
  });

  it("(f) document.documentElement.lang が、表示言語に連動する", async () => {
    h.supabaseEnabled.current = false;
    const m = await mount();
    expect(docEl.lang).toBe("ja");
    m.api().setLang("ko");
    expect(docEl.lang).toBe("ko");
    m.api().setLang("en");
    expect(docEl.lang).toBe("en");
  });

  it("t は、現在の言語の文言を返す", async () => {
    h.supabaseEnabled.current = false;
    const m = await mount();
    expect(m.api().t("header.home")).toBe("ホーム");
    m.api().setLang("en");
    expect(m.api().t("header.home")).not.toBe("");
  });
});
