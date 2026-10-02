import { afterEach, describe, expect, it, vi } from "vitest";

async function load(env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("../lib/env");
}

afterEach(() => vi.unstubAllEnvs());

describe("環境変数の検証", () => {
  it("本番で未設定なら停止扱いになる", async () => {
    const m = await load({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" });
    expect(m.isMisconfigured).toBe(true);
  });
  it("開発で未設定なら仮データで動作できる", async () => {
    const m = await load({ NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" });
    expect(m.isMisconfigured).toBe(false);
  });
  it("秘密鍵は環境を問わず拒否し、値をメッセージへ含めない", async () => {
    const m = await load({
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_dummyvalue",
    });
    expect(m.isMisconfigured).toBe(true);
    expect(m.configIssues.join("")).not.toContain("dummyvalue");
  });
  it("正しい設定なら問題なし", async () => {
    const m = await load({
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_dummy",
    });
    expect(m.isMisconfigured).toBe(false);
  });
});
