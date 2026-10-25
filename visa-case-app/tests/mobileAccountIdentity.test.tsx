import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type U = { id: string; email: string; user_metadata: Record<string, unknown> };
const ctx = vi.hoisted(() => ({ session: null as { user: U } | null }));
vi.mock("../lib/auth", () => ({ useSession: () => ctx.session, updateFullName: () => Promise.resolve(null) }));

import { MobileAccountIdentity } from "../components/MobileAccountIdentity";

const ID = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  ctx.session = { user: { id: ID, email: "user@example.com", user_metadata: {} } };
});

describe("アカウント：ユーザー ID と氏名（iPhone 版）", () => {
  it("氏名が未登録なら、アイコンと文字で登録を案内する（シートは閉じている）", () => {
    const m = renderToStaticMarkup(<MobileAccountIdentity />);
    expect(m).toContain("氏名が未登録です");
    expect(m).toContain("登録");
    expect(m).toContain("<svg");
    expect(m).not.toContain('role="dialog"');
  });
  it("登録済みなら、氏名を表示し「編集」を出す", () => {
    ctx.session = { user: { id: ID, email: "user@example.com", user_metadata: { full_name: "試験 太郎" } } };
    const m = renderToStaticMarkup(<MobileAccountIdentity />);
    expect(m).toContain("試験 太郎");
    expect(m).toContain("編集");
    expect(m).not.toContain("氏名が未登録です");
  });
  it("ユーザー ID は折り返して全文を出し、コピーの操作が 44pt 以上で付く", () => {
    const m = renderToStaticMarkup(<MobileAccountIdentity />);
    expect(m).toContain(ID);
    expect(m).toContain("break-all");
    expect(m).toContain("ユーザーIDをコピー");
    expect(m).toContain("min-h-[44px]");
  });
  it("子要素（ログアウトなど）を同じ一覧に出す", () => {
    const m = renderToStaticMarkup(
      <MobileAccountIdentity>
        <li>子の行</li>
      </MobileAccountIdentity>,
    );
    expect(m).toContain("子の行");
  });
});
