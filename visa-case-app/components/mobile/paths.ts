// iPhone 版（/m 配下）のパス判定と、下部タブの現在地の判定。画面の部品に依存しない純粋な関数。

/** iPhone 版のパスの先頭（案 A：別パス /m 配下に置く） */
export const MOBILE_BASE = "/m";

/** 下部タブの移動先 */
export const MOBILE_TABS = [
  { id: "cases", href: "/m/cases" },
  { id: "new", href: "/m/cases/new" },
  // 最初の PR では iPhone 版のアカウント画面を作らず、既存の /account（PC 版の画面）へ移す。iPhone 版は最後の PR で扱う
  { id: "account", href: "/account" },
] as const;

export type MobileTabId = (typeof MOBILE_TABS)[number]["id"];

/** パスが iPhone 版（/m または /m/…）か。/mail のような前方一致の別パスは含めない */
export function isMobilePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === MOBILE_BASE || pathname.startsWith(`${MOBILE_BASE}/`);
}

/** 現在のパスに対応するタブ。該当しなければ null（/m/cases/new は「新規」、/m/cases/… のその他は「案件」） */
export function activeTab(pathname: string | null | undefined): MobileTabId | null {
  if (!pathname) return null;
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (p === "/m/cases/new" || p.startsWith("/m/cases/new/")) return "new";
  if (p === "/m/cases" || p.startsWith("/m/cases/")) return "cases";
  return null;
}
