// 動きを減らす設定（prefers-reduced-motion）に応じた、JS 側の動きの共通関数（Issue #392）。
// CSS の scroll-behavior は、JS が behavior を指定すると効かないため、JS 側でも分岐する。

/** 動きを減らす設定が有効か。判定できない環境（サーバー・古い環境）では false */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** scrollIntoView / scrollTo の behavior に渡す値。動きを減らす設定では "auto"（即時） */
export function scrollBehavior(): "smooth" | "auto" {
  return prefersReducedMotion() ? "auto" : "smooth";
}
