import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ supabase: true, pathname: "/m/login" }));
vi.mock("next/navigation", () => ({ usePathname: () => ctx.pathname, useRouter: () => ({ replace: () => {}, push: () => {} }) }));
vi.mock("../lib/auth", () => ({ signIn: () => Promise.resolve(null), requestPasswordReset: () => Promise.resolve(null), startDemo: () => {} }));
vi.mock("../lib/supabase", () => ({
  get isSupabaseEnabled() {
    return ctx.supabase;
  },
}));

import MobileLoginPage from "../app/m/login/page";
import { TabBar } from "../components/mobile/TabBar";
import { isMobileLoginPath, isMobilePath, MOBILE_LOGIN } from "../components/mobile/paths";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";

beforeEach(() => {
  ctx.supabase = true;
  ctx.pathname = "/m/login";
});

describe("ログイン（iPhone 版）", () => {
  it("メール・パスワードの入力行と、属性（username/current-password、16px、44pt）を持つ", () => {
    const m = renderToStaticMarkup(<MobileLoginPage />);
    expect(m.match(/<h1/g)).toHaveLength(1);
    expect(m).toContain('autoComplete="username"');
    expect(m).toContain('autoComplete="current-password"');
    expect(m).toContain('inputMode="email"');
    expect(m).toContain('type="password"');
    expect(m).toContain("text-base");
    expect(m).toContain("min-h-[44px]");
    expect(m).toContain("ログイン");
    expect(m).toContain("パスワードを忘れた場合");
    expect(m).toContain("デモを試す");
  });
  it("Supabase 無効のときは、入力欄を出さず案内だけ", () => {
    ctx.supabase = false;
    const m = renderToStaticMarkup(<MobileLoginPage />);
    expect(m).not.toContain("<input");
    expect(m).toContain("ログインは無効です");
  });
  it("ログイン画面には下部タブを出さない（他の /m 画面では出す）", () => {
    expect(renderToStaticMarkup(<TabBar />)).toBe("");
    ctx.pathname = "/m/cases";
    expect(renderToStaticMarkup(<TabBar />)).toContain("<nav");
  });
});

describe("ログイン画面のパス判定と文言", () => {
  it("/m/login だけがログイン画面", () => {
    expect(MOBILE_LOGIN).toBe("/m/login");
    expect(isMobileLoginPath("/m/login")).toBe(true);
    expect(isMobileLoginPath("/m/login/")).toBe(true);
    expect(isMobileLoginPath("/login")).toBe(false);
    expect(isMobileLoginPath("/m/loginx")).toBe(false);
    expect(isMobilePath("/m/login")).toBe(true);
  });
  it("文言は ja/en/ko のキーが揃い、reviewStatus に登録されている", () => {
    const ja = Object.keys(CATALOG.mobileLogin.ja).sort();
    expect(Object.keys(CATALOG.mobileLogin.en).sort()).toEqual(ja);
    expect(Object.keys(CATALOG.mobileLogin.ko).sort()).toEqual(ja);
    expect(REVIEW_STATUS.mobileLogin).toEqual({ en: "draft", ko: "draft" });
  });
});
