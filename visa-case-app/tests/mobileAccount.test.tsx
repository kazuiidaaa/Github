import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ demo: false, supabase: true, session: { user: { email: "user@example.com" } } as { user: { email: string } } | null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/m/account", useRouter: () => ({ replace: () => {}, push: () => {} }) }));
vi.mock("../lib/auth", () => ({ useSession: () => ctx.session, signOut: () => Promise.resolve(), exitDemo: () => {} }));
vi.mock("../lib/demo", () => ({ useDemo: () => ctx.demo }));
vi.mock("../lib/supabase", () => ({
  get isSupabaseEnabled() {
    return ctx.supabase;
  },
}));

import MobileAccountPage from "../app/m/account/page";

beforeEach(() => {
  ctx.demo = false;
  ctx.supabase = true;
  ctx.session = { user: { email: "user@example.com" } };
});

describe("アカウント（iPhone 版・暫定）", () => {
  it("ログイン中のユーザー・ログアウト・言語/表示・PC 版への移動を出す", () => {
    const m = renderToStaticMarkup(<MobileAccountPage />);
    expect(m.match(/<h1/g)).toHaveLength(1);
    expect(m).toContain("user@example.com");
    expect(m).toContain("ログアウト");
    expect(m).toContain("表示言語");
    expect(m).toContain('href="/account"');
  });
  it("デモ中はデモの終了を出し、ログアウトは出さない", () => {
    ctx.demo = true;
    const m = renderToStaticMarkup(<MobileAccountPage />);
    expect(m).toContain("デモを終了");
    expect(m).not.toContain("ログアウト");
    expect(m).not.toContain('href="/account"');
  });
  it("仮データ方式（Supabase なし）では注意書きだけで、ログアウトは出さない", () => {
    ctx.supabase = false;
    const m = renderToStaticMarkup(<MobileAccountPage />);
    expect(m).toContain("試作版");
    expect(m).not.toContain("ログアウト");
  });
});
