import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ session: { user: { id: "u1", email: "user@example.com" } } as { user: { id: string; email: string } } | null }));
vi.mock("../lib/auth", () => ({ useSession: () => ctx.session, changePassword: () => Promise.resolve(null) }));
vi.mock("../lib/store", () => ({
  useCases: () => [],
  getAccount: () => Promise.resolve({}),
  listAudit: () => Promise.resolve([]),
  renameOrganization: () => Promise.resolve(),
}));

import { MobileAccountDetails } from "../components/MobileAccount";
import { CATALOG } from "../lib/i18n/messages";

beforeEach(() => {
  ctx.session = { user: { id: "u1", email: "user@example.com" } };
});

describe("アカウント本格版（iPhone 版）", () => {
  const m = renderToStaticMarkup(<MobileAccountDetails />);
  it("読み込み中は状態を出し、事務所名・パスワード・監査ログの区画を持つ", () => {
    expect(m).toContain("アカウント情報");
    expect(m).toContain("読み込み中");
    expect(m).toContain("事務所名");
    expect(m).toContain("パスワードの変更");
    expect(m).toContain("監査ログ");
  });
  it("所有者以外・未読み込みでは事務所名の入力と保存が無効", () => {
    expect(m).toMatch(/<input[^>]*disabled/);
    expect(m).toMatch(/<button[^>]*disabled[^>]*>保存/);
  });
  it("パスワード欄の autocomplete が正しく、16px・44pt 以上", () => {
    expect(m.match(/autoComplete="current-password"/g)).toHaveLength(1);
    expect(m.match(/autoComplete="new-password"/g)).toHaveLength(2);
    expect(m.match(/type="password"/g)).toHaveLength(3);
    expect(m).toContain('autoComplete="username"');
    expect(m).toContain("text-base");
    expect(m).toContain("min-h-[44px]");
  });
  it("mobile の文言は ja/en/ko でキーが揃う", () => {
    const ja = Object.keys(CATALOG.mobile.ja).sort();
    expect(Object.keys(CATALOG.mobile.en).sort()).toEqual(ja);
    expect(Object.keys(CATALOG.mobile.ko).sort()).toEqual(ja);
  });
});
