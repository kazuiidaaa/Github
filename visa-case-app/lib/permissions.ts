// 役割ごとの許可操作。画面の表示制御に使う。
// 実際の拒否はデータベース側の規則（supabase/migrations/0013_roles.sql）が行うため、両者の内容を揃えて保つこと。

export const ROLES = ["owner", "admin", "staff", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "所有者",
  admin: "管理者",
  staff: "担当者",
  viewer: "閲覧のみ",
};

export type Action =
  | "edit" // 案件の作成・編集、書類・必要書類・チェック・文書の管理
  | "deleteCase"
  | "manageMembers" // メンバーの一覧・追加・削除
  | "changeRole"
  | "renameOrganization";

const ALLOWED: Record<Action, readonly Role[]> = {
  edit: ["owner", "admin", "staff"],
  deleteCase: ["owner", "admin"],
  manageMembers: ["owner", "admin"],
  changeRole: ["owner"],
  renameOrganization: ["owner"],
};

export function isRole(value: string | null | undefined): value is Role {
  return (ROLES as readonly string[]).includes(value ?? "");
}

export function can(role: string | null | undefined, action: Action): boolean {
  return isRole(role) && ALLOWED[action].includes(role);
}

/** 追加するときに付与できる役割。管理者は担当者・閲覧のみに限る */
export function assignableRoles(role: string | null | undefined): Role[] {
  if (role === "owner") return [...ROLES];
  if (role === "admin") return ["staff", "viewer"];
  return [];
}

/** 対象のメンバーを削除できるか。管理者は、所有者・管理者を削除できない */
export function canRemoveMember(actor: string | null | undefined, target: string): boolean {
  if (actor === "owner") return true;
  if (actor === "admin") return target === "staff" || target === "viewer";
  return false;
}
