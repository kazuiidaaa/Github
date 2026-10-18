// 動きを減らす設定（prefers-reduced-motion）に応じた、JS 側の動きの共通関数（Issue #392）。
// CSS の scroll-behavior は、JS が behavior を指定すると効かないため、JS 側でも分岐する。

/** 動きを減らす設定が有効か。判定できない環境（サーバー・古い環境）では false */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 出る動き（ダイアログ・通知）の長さ（ミリ秒）。globals.css の --dur-fade（0.15 秒）と同じ値にそろえる */
export const EXIT_MS = 150;

/** 出る動きを待つ時間。動きを減らす設定では 0（待たずに即時に閉じる） */
export function exitDelayMs(): number {
  return prefersReducedMotion() ? 0 : EXIT_MS;
}

/** scrollIntoView / scrollTo の behavior に渡す値。動きを減らす設定では "auto"（即時） */
export function scrollBehavior(): "smooth" | "auto" {
  return prefersReducedMotion() ? "auto" : "smooth";
}
