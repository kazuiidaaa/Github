import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state: { result: unknown; throws: boolean } = { result: { data: null, error: null }, throws: false };
  const calls = { table: "", select: "", eq: [] as unknown[], upsert: [] as unknown[] };
  const run = () => {
    if (state.throws) throw new Error("network");
    return Promise.resolve(state.result);
  };
  const client = {
    from: (table: string) => {
      calls.table = table;
      return {
        select: (cols: string) => {
          calls.select = cols;
          return { eq: (...a: unknown[]) => ((calls.eq = a), { maybeSingle: run }) };
        },
        upsert: (...a: unknown[]) => ((calls.upsert = a), run()),
      };
    },
  };
  return { state, calls, client };
});

vi.mock("@/lib/supabase", () => ({ supabase: h.client, isSupabaseEnabled: true }));

import { loadLanguagePreference, saveLanguagePreference } from "../lib/i18n/preferences";

beforeEach(() => {
  h.state.result = { data: null, error: null };
  h.state.throws = false;
  h.calls.table = "";
  h.calls.eq = [];
  h.calls.upsert = [];
});

describe("loadLanguagePreference", () => {
  it("保存した言語を返す。表と条件も確認する", async () => {
    h.state.result = { data: { language: "ko" }, error: null };
    expect(await loadLanguagePreference("u1")).toEqual({ ok: true, lang: "ko" });
    expect(h.calls.table).toBe("user_preferences");
    expect(h.calls.select).toBe("language");
    expect(h.calls.eq).toEqual(["user_id", "u1"]);
  });

  it("行がなければ、成功で、未設定（null）を返す", async () => {
    h.state.result = { data: null, error: null };
    expect(await loadLanguagePreference("u1")).toEqual({ ok: true, lang: null });
  });

  it("不正な値は、未設定（null）として扱う", async () => {
    h.state.result = { data: { language: "fr" }, error: null };
    expect(await loadLanguagePreference("u1")).toEqual({ ok: true, lang: null });
  });

  it("error があれば、失敗を返す", async () => {
    h.state.result = { data: null, error: { message: "denied" } };
    expect(await loadLanguagePreference("u1")).toEqual({ ok: false });
  });

  it("例外が起きても、投げずに、失敗を返す", async () => {
    h.state.throws = true;
    expect(await loadLanguagePreference("u1")).toEqual({ ok: false });
  });
});

describe("saveLanguagePreference", () => {
  it("成功すると true を返し、user_id と language を渡す", async () => {
    expect(await saveLanguagePreference("u1", "en")).toBe(true);
    expect(h.calls.table).toBe("user_preferences");
    const [row, options] = h.calls.upsert as [Record<string, unknown>, Record<string, unknown>];
    expect(row.user_id).toBe("u1");
    expect(row.language).toBe("en");
    expect(typeof row.updated_at).toBe("string");
    expect(options).toEqual({ onConflict: "user_id" });
  });

  it("error があれば、false を返す", async () => {
    h.state.result = { error: { message: "denied" } };
    expect(await saveLanguagePreference("u1", "en")).toBe(false);
  });

  it("例外が起きても、投げずに、false を返す", async () => {
    h.state.throws = true;
    expect(await saveLanguagePreference("u1", "ko")).toBe(false);
  });
});
