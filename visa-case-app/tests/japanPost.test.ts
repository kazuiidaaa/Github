import { describe, expect, it, vi } from "vitest";
import { buildAddress, createJapanPostClient, lookupAddress, readJapanPostConfig } from "../lib/japanPost";

// 認証情報・URL は、すべてダミー（本物の API は呼ばない）。
const config = { baseUrl: "https://api.example.invalid", clientId: "dummy-id", secretKey: "dummy-secret" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const tokenRes = (expiresIn = 600) => json({ token: "dummy-token", token_type: "Bearer", expires_in: expiresIn });
const found = { addresses: [{ pref_name: "東京都", city_name: "千代田区", town_name: "千代田" }] };

describe("環境変数の読み取り", () => {
  it("3つとも設定されていれば、設定を返す（末尾のスラッシュは除く）", () => {
    expect(readJapanPostConfig({ JAPANPOST_API_BASE_URL: "https://x.example.invalid/", JAPANPOST_CLIENT_ID: "a", JAPANPOST_SECRET_KEY: "b" })).toEqual({
      baseUrl: "https://x.example.invalid",
      clientId: "a",
      secretKey: "b",
    });
  });
  it("1つでも欠ける、または https でなければ null", () => {
    expect(readJapanPostConfig({})).toBeNull();
    expect(readJapanPostConfig({ JAPANPOST_API_BASE_URL: "https://x.example.invalid", JAPANPOST_CLIENT_ID: "a" })).toBeNull();
    expect(readJapanPostConfig({ JAPANPOST_API_BASE_URL: "http://x.example.invalid", JAPANPOST_CLIENT_ID: "a", JAPANPOST_SECRET_KEY: "b" })).toBeNull();
    expect(readJapanPostConfig({ JAPANPOST_API_BASE_URL: "not a url", JAPANPOST_CLIENT_ID: "a", JAPANPOST_SECRET_KEY: "b" })).toBeNull();
  });
  it("未設定なら、通信せずに unconfigured を返す", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await lookupAddress("1008924", "203.0.113.1", {})).toEqual({ status: "unconfigured" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("応答から住所を作る", () => {
  it("都道府県・市区町村・町域をつなぐ。null は空として扱う", () => {
    expect(buildAddress(found)).toBe("東京都千代田区千代田");
    expect(buildAddress({ addresses: [{ pref_name: "東京都", city_name: "千代田区", town_name: null }] })).toBe("東京都千代田区");
  });
  it("候補が複数なら、食い違う項目から先は入れない", () => {
    const body = { addresses: [{ pref_name: "東京都", city_name: "千代田区", town_name: "甲" }, { pref_name: "東京都", city_name: "千代田区", town_name: "乙" }] };
    expect(buildAddress(body)).toBe("東京都千代田区");
  });
  it("「以下に掲載がない場合」は、町域として入れない", () => {
    expect(buildAddress({ addresses: [{ pref_name: "東京都", city_name: "千代田区", town_name: "以下に掲載がない場合" }] })).toBe("東京都千代田区");
  });
  it("候補がない・形式が違うときは null", () => {
    expect(buildAddress({ addresses: [] })).toBeNull();
    expect(buildAddress({})).toBeNull();
    expect(buildAddress(null)).toBeNull();
  });
});

describe("日本郵便 API の呼び出し", () => {
  it("トークンを取得し、choikitype=1・searchtype=2 で検索する。必須ヘッダーを付ける", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => (String(url).endsWith("/token") ? tokenRes() : json(found)));
    const r = await createJapanPostClient(config, { fetchImpl }).search("1008924", "203.0.113.1");
    expect(r).toEqual({ status: "found", address: "東京都千代田区千代田" });
    const [tokenUrl, tokenInit] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(tokenUrl).toBe("https://api.example.invalid/api/v2/j/token");
    expect(JSON.parse(tokenInit.body as string)).toEqual({ grant_type: "client_credentials", client_id: "dummy-id", secret_key: "dummy-secret" });
    expect((tokenInit.headers as Record<string, string>)["x-forwarded-for"]).toBe("203.0.113.1");
    expect((tokenInit.headers as Record<string, string>)["User-Agent"]).toBeTruthy();
    const [searchUrl, searchInit] = fetchImpl.mock.calls[1] as unknown as [string, RequestInit];
    expect(searchUrl).toBe("https://api.example.invalid/api/v2/searchcode/1008924?choikitype=1&searchtype=2");
    expect((searchInit.headers as Record<string, string>).Authorization).toBe("Bearer dummy-token");
  });
  it("トークンは期限まで再利用し、期限が切れたら取り直す", async () => {
    let t = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => (String(url).endsWith("/token") ? tokenRes(600) : json(found)));
    const client = createJapanPostClient(config, { fetchImpl, now: () => t });
    await client.search("1008924", "203.0.113.1");
    await client.search("1008924", "203.0.113.1");
    expect(fetchImpl.mock.calls.filter((c) => String(c[0]).endsWith("/token"))).toHaveLength(1);
    t = 600_000; // 期限（余裕を含む）を過ぎる
    await client.search("1008924", "203.0.113.1");
    expect(fetchImpl.mock.calls.filter((c) => String(c[0]).endsWith("/token"))).toHaveLength(2);
  });
  it("検索が 401 のときは、トークンを取り直して1回だけ再試行する", async () => {
    let searches = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith("/token")) return tokenRes();
      return ++searches === 1 ? json({}, 401) : json(found);
    });
    expect(await createJapanPostClient(config, { fetchImpl }).search("1008924", "203.0.113.1")).toEqual({ status: "found", address: "東京都千代田区千代田" });
  });
  it("該当なし（404、または候補が空）は notFound", async () => {
    for (const res of [() => json({}, 404), () => json({ addresses: [] })]) {
      const fetchImpl = vi.fn(async (url: string | URL | Request) => (String(url).endsWith("/token") ? tokenRes() : res()));
      expect(await createJapanPostClient(config, { fetchImpl }).search("0000000", "203.0.113.1")).toEqual({ status: "notFound" });
    }
  });
  it("通信の失敗・トークン取得の失敗・サーバーの異常は unavailable（例外を投げない）", async () => {
    const down = vi.fn(async () => {
      throw new Error("network");
    });
    expect(await createJapanPostClient(config, { fetchImpl: down }).search("1008924", "203.0.113.1")).toEqual({ status: "unavailable" });
    const noToken = vi.fn(async () => json({}, 403));
    expect(await createJapanPostClient(config, { fetchImpl: noToken }).search("1008924", "203.0.113.1")).toEqual({ status: "unavailable" });
    const broken = vi.fn(async (url: string | URL | Request) => (String(url).endsWith("/token") ? tokenRes() : json({}, 500)));
    expect(await createJapanPostClient(config, { fetchImpl: broken }).search("1008924", "203.0.113.1")).toEqual({ status: "unavailable" });
    const badJson = vi.fn(async (url: string | URL | Request) => (String(url).endsWith("/token") ? tokenRes() : new Response("not json")));
    expect(await createJapanPostClient(config, { fetchImpl: badJson }).search("1008924", "203.0.113.1")).toEqual({ status: "unavailable" });
  });
});
