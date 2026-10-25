import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const listMembers = vi.hoisted(() => vi.fn(() => Promise.resolve([])));
vi.mock("../lib/store", () => ({ listMembers }));

import { MemberRows, MembersSection } from "../components/mobile/MobileMembers";
import { memberDisplayLabel } from "../lib/accountName";
import { CATALOG } from "../lib/i18n/messages";
import type { MemberInfo } from "../lib/supabaseBackend";

const base = { createdAt: "2026-01-01T00:00:00Z" };
const members: MemberInfo[] = [
  { userId: "u1", email: "owner@example.com", role: "owner", displayName: "試験 太郎", ...base },
  { userId: "u2", email: "admin-with-a-very-long-address.example@example.com", role: "admin", ...base },
  { userId: "u3", email: "viewer@example.com", role: "viewer", ...base },
];

describe("メンバー一覧（iPhone 版）", () => {
  it("氏名があれば氏名のみ、無ければ（列が返らない場合も）メールアドレスを出す", () => {
    expect(memberDisplayLabel(members[0])).toBe("試験 太郎");
    expect(memberDisplayLabel(members[1])).toBe(members[1].email);
    expect(memberDisplayLabel({ email: "a@example.com", displayName: "  " })).toBe("a@example.com");
    const m = renderToStaticMarkup(<MemberRows members={members} myUserId="u1" />);
    expect(m).toContain("試験 太郎");
    expect(m).not.toContain("owner@example.com");
    expect(m).toContain("admin-with-a-very-long-address.example@example.com");
  });
  it("役割を文字で示し、本人に「あなた」を添え、全文を折り返す", () => {
    const m = renderToStaticMarkup(<MemberRows members={members} myUserId="u1" />);
    expect(m).toContain("役割：所有者");
    expect(m).toContain("役割：管理者");
    expect(m).toContain("役割：閲覧のみ");
    expect(m.match(/あなた/g)).toHaveLength(1);
    expect(m).toContain("break-all");
    expect(m).not.toContain("truncate");
    expect(m).toContain("min-h-[44px]");
  });
  it("所有者・管理者にだけ出し、担当者・閲覧のみ・役割不明には出さず取得もしない", () => {
    for (const role of ["owner", "admin"]) {
      expect(renderToStaticMarkup(<MembersSection role={role} myUserId="u1" />)).toContain("メンバー");
    }
    listMembers.mockClear();
    for (const role of ["staff", "viewer", "", null, undefined]) {
      expect(renderToStaticMarkup(<MembersSection role={role} myUserId="u1" />)).toBe("");
    }
    expect(listMembers).not.toHaveBeenCalled();
  });
  it("文言は ja/en/ko でキーが揃う", () => {
    const ja = Object.keys(CATALOG.mobileAccount.ja).sort();
    expect(Object.keys(CATALOG.mobileAccount.en).sort()).toEqual(ja);
    expect(Object.keys(CATALOG.mobileAccount.ko).sort()).toEqual(ja);
  });
});
