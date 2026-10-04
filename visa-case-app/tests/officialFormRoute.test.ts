import { afterEach, describe, expect, it, vi } from "vitest";
import { byteLength, clientKey, createRateLimiter, isDeclaredTooLarge } from "../lib/documents/officialFormGuard";

// 値はすべてダミー。実案件の個人情報は書かない。

const URL_ = "http://localhost/api/documents/official-form";

/** Supabase の有効・無効を切り替えて、ルートを読み込み直す。getUser は、"good-token" のみ成功させる。 */
async function loadRoute(supabaseEnabled: boolean) {
  vi.resetModules();
  vi.doMock("../lib/supabase", () => ({ isSupabaseEnabled: supabaseEnabled }));
  vi.doMock("../lib/env", () => ({
    supabaseUrl: supabaseEnabled ? "https://abc.supabase.co" : undefined,
    supabaseKey: supabaseEnabled ? "sb_publishable_dummy" : undefined,
  }));
  vi.doMock("@supabase/supabase-js", () => ({
    createClient: () => ({
      auth: {
        getUser: async (token: string) =>
          token === "good-token" ? { data: { user: { id: "u1" } }, error: null } : { data: { user: null }, error: new Error("invalid") },
      },
    }),
  }));
  return (await import("../app/api/documents/official-form/route")).POST;
}

const call = (post: (r: Request) => Promise<Response>, headers: Record<string, string>, body = "not json") =>
  post(new Request(URL_, { method: "POST", headers, body }));

afterEach(() => {
  vi.doUnmock("../lib/supabase");
  vi.doUnmock("../lib/env");
  vi.doUnmock("@supabase/supabase-js");
});

describe("公式様式 API の認証（Supabase 有効時）", () => {
  it("トークンが無ければ 401", async () => {
    const post = await loadRoute(true);
    expect((await call(post, {})).status).toBe(401);
  });
  it("X-Demo-Mode のみでは 401", async () => {
    const post = await loadRoute(true);
    expect((await call(post, { "x-demo-mode": "1" })).status).toBe(401);
  });
  it("無効なトークンは 401", async () => {
    const post = await loadRoute(true);
    expect((await call(post, { authorization: "Bearer bad-token" })).status).toBe(401);
  });
  it("有効なトークンは認証を通る（本文が不正なら 400）", async () => {
    const post = await loadRoute(true);
    expect((await call(post, { authorization: "Bearer good-token" })).status).toBe(400);
  });
});

describe("公式様式 API のデモモード（Supabase 未設定）", () => {
  it("ヘッダー無しでも認証を通る", async () => {
    const post = await loadRoute(false);
    expect((await call(post, {})).status).toBe(400);
  });
});

describe("公式様式 API のレート制限", () => {
  it("上限を超えると 429 と Retry-After を返す", async () => {
    const post = await loadRoute(false);
    const h = { "x-forwarded-for": "203.0.113.1" };
    for (let i = 0; i < 10; i++) expect((await call(post, h)).status).toBe(400);
    const res = await call(post, h);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
  it("別の IP には影響しない", async () => {
    const post = await loadRoute(false);
    for (let i = 0; i < 11; i++) await call(post, { "x-forwarded-for": "203.0.113.2" });
    expect((await call(post, { "x-forwarded-for": "203.0.113.3" })).status).toBe(400);
  });
  it("ログイン済みは、ユーザー単位で数える（IP が違っても同じ枠）", async () => {
    const post = await loadRoute(true);
    for (let i = 0; i < 10; i++) {
      await call(post, { authorization: "Bearer good-token", "x-forwarded-for": `198.51.100.${i}` });
    }
    expect((await call(post, { authorization: "Bearer good-token", "x-forwarded-for": "198.51.100.99" })).status).toBe(429);
  });
});

describe("公式様式 API の本文サイズ", () => {
  it("Content-Length が上限超過なら、本文を読まずに 413", async () => {
    const post = await loadRoute(false);
    const res = await call(post, { "content-length": "1000001" }, "{}");
    expect(res.status).toBe(413);
  });
  it("日本語は、文字数が上限内でもバイト数で超過すれば 413", async () => {
    const post = await loadRoute(false);
    const body = "あ".repeat(400_000); // 400,000 文字 = 1,200,000 バイト
    expect(body.length).toBeLessThan(1_000_000);
    expect((await call(post, { "x-forwarded-for": "203.0.113.4" }, body)).status).toBe(413);
  });
});

describe("officialFormGuard", () => {
  it("isDeclaredTooLarge は、数値でない・無いヘッダーを超過扱いにしない", () => {
    expect(isDeclaredTooLarge(null)).toBe(false);
    expect(isDeclaredTooLarge("abc")).toBe(false);
    expect(isDeclaredTooLarge("1000000")).toBe(false);
    expect(isDeclaredTooLarge("1000001")).toBe(true);
  });
  it("byteLength は UTF-8 のバイト数", () => {
    expect(byteLength("abc")).toBe(3);
    expect(byteLength("あ")).toBe(3);
  });
  it("窓が過ぎると回復する", () => {
    const limiter = createRateLimiter(2, 1000);
    expect(limiter("k", 0).ok).toBe(true);
    expect(limiter("k", 1).ok).toBe(true);
    expect(limiter("k", 2).ok).toBe(false);
    expect(limiter("k", 1001).ok).toBe(true);
  });
  it("clientKey は、ユーザー ID を優先し、無ければ IP の先頭を使う", () => {
    expect(clientKey("u1", new Headers({ "x-forwarded-for": "1.1.1.1" }))).toBe("user:u1");
    expect(clientKey(null, new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("ip:1.1.1.1");
    expect(clientKey(null, new Headers())).toBe("ip:unknown");
  });
});
