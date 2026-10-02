import { describe, expect, it } from "vitest";
import { assignableRoles, can, canRemoveMember } from "../lib/permissions";

describe("can", () => {
  it("閲覧のみは編集も削除もできない", () => {
    expect(can("viewer", "edit")).toBe(false);
    expect(can("viewer", "deleteCase")).toBe(false);
    expect(can("viewer", "manageMembers")).toBe(false);
  });
  it("担当者は編集できるが、案件を削除できない", () => {
    expect(can("staff", "edit")).toBe(true);
    expect(can("staff", "deleteCase")).toBe(false);
    expect(can("staff", "manageMembers")).toBe(false);
  });
  it("管理者はメンバー管理と案件削除ができるが、役割の変更と事務所名の変更はできない", () => {
    expect(can("admin", "edit")).toBe(true);
    expect(can("admin", "deleteCase")).toBe(true);
    expect(can("admin", "manageMembers")).toBe(true);
    expect(can("admin", "changeRole")).toBe(false);
    expect(can("admin", "renameOrganization")).toBe(false);
  });
  it("所有者はすべてできる", () => {
    for (const a of ["edit", "deleteCase", "manageMembers", "changeRole", "renameOrganization"] as const) {
      expect(can("owner", a)).toBe(true);
    }
  });
  it("未知の役割・未取得は何もできない", () => {
    expect(can(null, "edit")).toBe(false);
    expect(can("client", "edit")).toBe(false);
    expect(can("", "edit")).toBe(false);
  });
});

describe("assignableRoles / canRemoveMember", () => {
  it("管理者が付与できるのは担当者と閲覧のみ", () => {
    expect(assignableRoles("admin")).toEqual(["staff", "viewer"]);
    expect(assignableRoles("owner")).toEqual(["owner", "admin", "staff", "viewer"]);
    expect(assignableRoles("staff")).toEqual([]);
  });
  it("管理者は所有者・管理者を削除できない", () => {
    expect(canRemoveMember("admin", "owner")).toBe(false);
    expect(canRemoveMember("admin", "admin")).toBe(false);
    expect(canRemoveMember("admin", "staff")).toBe(true);
    expect(canRemoveMember("owner", "owner")).toBe(true);
    expect(canRemoveMember("staff", "viewer")).toBe(false);
  });
});
