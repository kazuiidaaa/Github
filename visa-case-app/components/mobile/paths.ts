// iPhone 版（/m 配下）のパス判定と、下部タブの現在地の判定。画面の部品に依存しない純粋な関数。

/** iPhone 版のパスの先頭（案 A：別パス /m 配下に置く） */
export const MOBILE_BASE = "/m";

/** iPhone 版のログイン画面（未ログインで /m 配下を開いたときの行き先。AuthGate が使う） */
export const MOBILE_LOGIN = "/m/login";

/** 下部タブの移動先 */
export const MOBILE_TABS = [
  { id: "cases", href: "/m/cases" },
  // 暫定の最小版（ユーザー表示・言語/表示・ログアウト）。パスワード変更・メンバー管理は PC 版の /account へ移る
  { id: "account", href: "/m/account" },
] as const;

export type MobileTabId = (typeof MOBILE_TABS)[number]["id"];

/** パスが iPhone 版（/m または /m/…）か。/mail のような前方一致の別パスは含めない */
export function isMobilePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === MOBILE_BASE || pathname.startsWith(`${MOBILE_BASE}/`);
}

/** 現在のパスに対応するタブ。該当しなければ null（/m/account は「アカウント」、/m/cases と配下（新規登録 /m/cases/new を含む）は「案件」） */
export function activeTab(pathname: string | null | undefined): MobileTabId | null {
  if (!pathname) return null;
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (p === "/m/account" || p.startsWith("/m/account/")) return "account";
  if (p === "/m/cases" || p.startsWith("/m/cases/") || p === "/m/deadlines") return "cases";
  return null;
}

/**
 * iPhone 版の「新しいパスワードの設定」画面。PC 版の再設定メールのリンクは /reset-password のまま（変えない）。
 * この画面は、/m 配下で開いたとき（将来リンク先を変える場合を含む）の受け皿。
 */
export const MOBILE_RESET = "/m/reset-password";

/** パスが iPhone 版のログイン画面か（末尾のスラッシュは無視する）。この画面では下部タブを出さない */
export function isMobileLoginPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return p === MOBILE_LOGIN;
}

/** パスが iPhone 版の再設定の完了画面か（末尾のスラッシュは無視する） */
export function isMobileResetPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return p === MOBILE_RESET;
}

/** ログイン前の認証画面（ログイン・再設定の完了）か。これらの画面には下部タブを出さない */
export function isMobileAuthPath(pathname: string | null | undefined): boolean {
  return isMobileLoginPath(pathname) || isMobileResetPath(pathname);
}
