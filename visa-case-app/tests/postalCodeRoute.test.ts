import { afterEach, describe, expect, it, vi } from "vitest";

const call = (post: (r: Request) => Promise<Response>, body: string, headers: Record<string, string> = { "x-forwarded-for": "203.0.113.1" }) =>
  post(new Request("http://localhost/api/postal-code", { method: "POST", headers, body }));

async function loadRoute(supabaseEnabled: boolean, lookup = vi.fn(async () => ({ status: "found", address: "東京都千代田区千代田" }))) {
  vi.resetModules();
  vi.doMock("../lib/supabase", () => ({ isSupabaseEnabled: supabaseEnabled }));
  vi.doMock("../lib/env", () => ({ supabaseUrl: supabaseEnabled ? "https://abc.supabase.co" : undefined, supabaseKey: supabaseEnabled ? "sb_publishable_dummy" : undefined }));
  vi.doMock("../lib/japanPost", () => ({ lookupAddress: lookup }));
  vi.doMock("@supabase/supabase-js", () => ({
    createClient: () => ({
      rpc: async () => ({ data: 0, error: null }),
      auth: { getUser: async (t: string) => (t === "good-token" ? { data: { user: { id: "u1" } }, error: null } : { data: { user: null }, error: new Error("x") }) },
    }),
  }));
  return { post: (await import("../app/api/postal-code/route")).POST, lookup };
}

afterEach(() => {
  vi.doUnmock("../lib/supabase");
  vi.doUnmock("../lib/env");
  vi.doUnmock("../lib/japanPost");
  vi.doUnmock("@supabase/supabase-js");
});

describe("郵便番号 API", () => {
  it("Supabase 有効時、トークンが無い・無効なら 401", async () => {
    const { post } = await loadRoute(true);
    expect((await call(post, "{}", {})).status).toBe(401);
    expect((await call(post, "{}", { authorization: "Bearer bad" })).status).toBe(401);
  });
  it("7桁でない・形式が不正なら 400（検索しない）", async () => {
    const { post, lookup } = await loadRoute(false);
    expect((await call(post, JSON.stringify({ zip: "100" }))).status).toBe(400);
    expect((await call(post, "not json")).status).toBe(400);
    expect((await call(post, JSON.stringify({ zip: 1008924 }))).status).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });
  it("大きすぎる入力は 413", async () => {
    const { post } = await loadRoute(false);
    expect((await call(post, JSON.stringify({ zip: "1".repeat(2000) }))).status).toBe(413);
  });
  it("有効なトークンで、郵便番号（数字のみ）を検索に渡す", async () => {
    const { post, lookup } = await loadRoute(true);
    const res = await call(post, JSON.stringify({ zip: "100-8924" }), { authorization: "Bearer good-token", "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(await res.json()).toEqual({ status: "found", address: "東京都千代田区千代田" });
    expect(lookup).toHaveBeenCalledWith("1008924", "203.0.113.1");
  });
  it("接続元 IP が分からないときは、検索せず unavailable", async () => {
    const { post, lookup } = await loadRoute(false);
    expect(await (await call(post, JSON.stringify({ zip: "1008924" }), {})).json()).toEqual({ status: "unavailable" });
    expect(lookup).not.toHaveBeenCalled();
  });
});
