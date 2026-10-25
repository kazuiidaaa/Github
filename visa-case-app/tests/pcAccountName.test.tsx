import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type U = { id: string; email: string; user_metadata: Record<string, unknown> };
const ctx = vi.hoisted(() => ({ session: null as { user: U } | null, demo: false, supabase: true }));
vi.mock("next/navigation", () => ({ usePathname: () => "/account", useRouter: () => ({ replace: () => {} }) }));
vi.mock("../lib/auth", () => ({
  useSession: () => ctx.session,
  updateFullName: () => Promise.resolve(null),
  signOut: () => Promise.resolve(),
  exitDemo: () => {},
  changePassword: () => Promise.resolve(null),
}));
vi.mock("../lib/demo", () => ({ useDemo: () => ctx.demo }));
vi.mock("../lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/supabase")>();
  return {
    ...actual,
    get isSupabaseEnabled() {
      return ctx.supabase;
    },
  };
});

import { accountDisplayLabel } from "../lib/accountName";
import { FullNameSection, UserIdValue } from "../components/AccountIdentity";
import { Header } from "../components/Header";
import AccountPage from "../app/account/page";

const ID = "00000000-0000-4000-8000-000000000001";
const EMAIL = "user@example.com";
beforeEach(() => {
  ctx.demo = false;
  ctx.supabase = true;
  ctx.session = { user: { id: ID, email: EMAIL, user_metadata: {} } };
});

describe("表示規則 accountDisplayLabel", () => {
  it("氏名があれば氏名のみ（入力されたまま）、なければメール", () => {
    expect(accountDisplayLabel({ full_name: " 山田　太郎 " }, EMAIL)).toBe("山田　太郎");
    expect(accountDisplayLabel({ full_name: "試験 太郎" }, EMAIL)).toBe("試験 太郎");
    expect(accountDisplayLabel({}, EMAIL)).toBe(EMAIL);
    expect(accountDisplayLabel({ full_name: "  " }, EMAIL)).toBe(EMAIL);
    expect(accountDisplayLabel({ full_name: 1 }, EMAIL)).toBe(EMAIL);
    expect(accountDisplayLabel(undefined, EMAIL)).toBe(EMAIL);
    expect(accountDisplayLabel(undefined, undefined)).toBe("");
  });
});

describe("ヘッダー", () => {
  it("氏名が登録済みなら氏名のみ。メールは本文にも title にも出さない", () => {
    ctx.session = { user: { id: ID, email: EMAIL, user_metadata: { full_name: "試験 太郎" } } };
    const m = renderToStaticMarkup(<Header />);
    expect(m).toContain('title="試験 太郎"');
    expect(m).toContain(">試験 太郎<");
    expect(m).not.toContain(EMAIL);
  });
  it("未登録のときだけメールアドレス", () => {
    const m = renderToStaticMarkup(<Header />);
    expect(m).toContain(`title="${EMAIL}"`);
    expect(m).toContain(`>${EMAIL}<`);
  });
  it("デモ中・仮データ方式では、氏名もメールも出さない", () => {
    ctx.session = { user: { id: ID, email: EMAIL, user_metadata: { full_name: "試験 太郎" } } };
    ctx.demo = true;
    let m = renderToStaticMarkup(<Header />);
    expect(m).not.toContain(EMAIL);
    expect(m).not.toContain("試験 太郎");
    ctx.demo = false;
    ctx.supabase = false;
    m = renderToStaticMarkup(<Header />);
    expect(m).not.toContain("試験 太郎");
  });
});

describe("アカウント画面（PC 版）の氏名", () => {
  it("未登録なら、図形と文字で登録を案内する", () => {
    const m = renderToStaticMarkup(<FullNameSection />);
    expect(m).toContain("氏名が未登録です");
    expect(m).toContain("<svg");
    expect(m).toContain("保存");
  });
  it("登録済みなら氏名を表示し、入力欄に現在の氏名が入る", () => {
    ctx.session = { user: { id: ID, email: EMAIL, user_metadata: { full_name: "試験 太郎" } } };
    const m = renderToStaticMarkup(<FullNameSection />);
    expect(m).toContain("試験 太郎");
    expect(m).toContain('value="試験 太郎"');
    expect(m).not.toContain("氏名が未登録です");
  });
  it("ユーザー ID は全文を出し、コピーの操作が付く", () => {
    const m = renderToStaticMarkup(<UserIdValue userId={ID} />);
    expect(m).toContain(ID);
    expect(m).toContain("break-all");
    expect(m).toContain("ユーザーIDをコピー");
  });
  it("デモ・仮データ方式では、氏名欄を出さず案内のみ", () => {
    ctx.demo = true;
    const m = renderToStaticMarkup(<AccountPage />);
    expect(m).toContain("仮データ方式で動作しているため");
    expect(m).not.toContain("氏名");
  });
});
