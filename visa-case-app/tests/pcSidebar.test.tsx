import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ pathname: "/cases", session: null as null | { user: { user_metadata: Record<string, unknown>; email: string } }, supabase: false }));
vi.mock("next/navigation", () => ({ usePathname: () => ctx.pathname }));
vi.mock("../lib/auth", () => ({ useSession: () => ctx.session }));
vi.mock("../lib/demo", () => ({ useDemo: () => false }));
vi.mock("../lib/supabase", () => ({
  get isSupabaseEnabled() {
    return ctx.supabase;
  },
}));

import { PcSidebar } from "../components/PcSidebar";

function html(pathname: string): string {
  ctx.pathname = pathname;
  return renderToStaticMarkup(<PcSidebar />);
}

beforeEach(() => {
  ctx.session = null;
  ctx.supabase = false;
});

describe("PcSidebar（PC 版の左のサイドバー）", () => {
  it("md 未満では隠し、md 以上で表示する。名前付きの領域・移動先にする", () => {
    const m = html("/");
    expect(m).toMatch(/<aside[^>]*aria-label="サイドバー"[^>]*class="[^"]*\bhidden\b[^"]*\bmd:flex\b/);
    expect(m).toContain('aria-label="主な移動先"');
  });
  it("現在の画面だけに aria-current を付ける（ホームは完全一致、案件は配下も含む）", () => {
    expect(html("/").match(/aria-current/g)).toHaveLength(1);
    const cases = html("/cases/abc");
    expect(cases.match(/aria-current/g)).toHaveLength(1);
    expect(cases).toMatch(/href="\/cases"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/cases"/);
  });
  it("未ログイン・Supabase 未設定では、アカウントを出さない。設定済み・ログイン済みでは名前を出す", () => {
    expect(html("/cases")).not.toContain('href="/account"');
    ctx.supabase = true;
    ctx.session = { user: { user_metadata: { full_name: "仮の名前" }, email: "sample@example.com" } };
    const m = html("/account");
    expect(m).toContain('href="/account"');
    expect(m).toContain("仮の名前");
  });
});
