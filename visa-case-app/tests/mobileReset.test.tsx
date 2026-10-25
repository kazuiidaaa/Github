import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ supabase: true, session: undefined as unknown, pathname: "/m/reset-password" }));
vi.mock("next/navigation", () => ({ usePathname: () => ctx.pathname, useRouter: () => ({ replace: () => {}, push: () => {} }) }));
vi.mock("../lib/auth", () => ({ setNewPassword: () => Promise.resolve(null), useSessionState: () => ({ session: ctx.session, failed: false }) }));
vi.mock("../lib/supabase", () => ({
  get isSupabaseEnabled() {
    return ctx.supabase;
  },
}));

import MobileResetPasswordPage from "../app/m/reset-password/page";
import { TabBar } from "../components/mobile/TabBar";
import { isMobileAuthPath, isMobileResetPath, MOBILE_RESET } from "../components/mobile/paths";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";

beforeEach(() => {
  ctx.supabase = true;
  ctx.session = { user: {} };
  ctx.pathname = "/m/reset-password";
});

describe("パスワード再設定の完了（iPhone 版）", () => {
  it("セッションがあれば、新しいパスワードと確認の入力行を出す（new-password、16px、44pt）", () => {
    const m = renderToStaticMarkup(<MobileResetPasswordPage />);
    expect(m.match(/<h1/g)).toHaveLength(1);
    expect(m.match(/autoComplete="new-password"/g)).toHaveLength(2);
    expect(m).toContain('type="password"');
    expect(m).toContain("text-base");
    expect(m).toContain("min-h-[44px]");
    expect(m).toContain("新しいパスワードの設定");
    expect(m).toContain("8文字以上");
    expect(m).toContain("設定する");
  });
  it("リンクが無効（セッション無し）なら、案内と /m/login へのリンクだけ", () => {
    ctx.session = null;
    const m = renderToStaticMarkup(<MobileResetPasswordPage />);
    expect(m).not.toContain("<input");
    expect(m).toContain("無効か、有効期限が切れています");
    expect(m).toContain('href="/m/login"');
  });
  it("確認中は読み込み表示、Supabase 無効なら案内だけ", () => {
    ctx.session = undefined;
    expect(renderToStaticMarkup(<MobileResetPasswordPage />)).toContain("読み込み中");
    ctx.supabase = false;
    const m = renderToStaticMarkup(<MobileResetPasswordPage />);
    expect(m).not.toContain("<input");
    expect(m).toContain("仮データ方式");
  });
  it("この画面には下部タブを出さない（他の /m 画面では出す）", () => {
    expect(renderToStaticMarkup(<TabBar />)).toBe("");
    ctx.pathname = "/m/cases";
    expect(renderToStaticMarkup(<TabBar />)).toContain("<nav");
  });
});

describe("再設定画面のパス判定と文言", () => {
  it("/m/reset-password だけが対象（PC 版 /reset-password は含めない）", () => {
    expect(MOBILE_RESET).toBe("/m/reset-password");
    expect(isMobileResetPath("/m/reset-password")).toBe(true);
    expect(isMobileResetPath("/m/reset-password/")).toBe(true);
    expect(isMobileResetPath("/reset-password")).toBe(false);
    expect(isMobileResetPath("/m/reset-passwordx")).toBe(false);
    expect(isMobileAuthPath("/m/login")).toBe(true);
    expect(isMobileAuthPath("/m/reset-password")).toBe(true);
    expect(isMobileAuthPath("/m/cases")).toBe(false);
  });
  it("再設定メールのリンク先は PC 版のまま（lib/auth.ts の redirectTo）", () => {
    expect(readFileSync("lib/auth.ts", "utf8")).toContain("redirectTo: `${window.location.origin}/reset-password`");
  });
  it("文言は ja/en/ko のキーが揃い、reviewStatus に登録されている", () => {
    const ja = Object.keys(CATALOG.mobileReset.ja).sort();
    expect(Object.keys(CATALOG.mobileReset.en).sort()).toEqual(ja);
    expect(Object.keys(CATALOG.mobileReset.ko).sort()).toEqual(ja);
    expect(REVIEW_STATUS.mobileReset).toEqual({ en: "draft", ko: "draft" });
  });
});
