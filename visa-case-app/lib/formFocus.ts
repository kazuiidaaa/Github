// 入力フォームの検証後に、最初の誤りの欄へフォーカスを移す共通関数（Issue #392 PR-6）。
// 新規登録と申請人情報のフォームで使う。
import { scrollBehavior } from "@/lib/motion";

/** 画面の並び順（order）で、誤りのある最初の欄の名前を返す。誤りがなければ null */
export function firstErrorKey<K extends string>(errors: Partial<Record<K, string | undefined>>, order: readonly K[]): K | null {
  return order.find((k) => !!errors[k]) ?? null;
}

/**
 * id の要素の中で、フォーカスを移す先を選ぶ順。
 * 1. 誤りの印（aria-invalid）が付いた欄、2. 選択式の欄で Tab が止まる項目（選択済み・先頭）、3. 最初の入力欄・ボタン
 */
export const FOCUS_TARGET_SELECTORS = [
  '[aria-invalid="true"]:not(:disabled)',
  '[role="radio"][tabindex="0"]',
  "input:not(:disabled):not([type=hidden]), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)",
] as const;

/**
 * id の欄（または欄を包む枠）へフォーカスを移し、画面の中央に見せる。
 * スクロールは、動きを減らす設定では即時（lib/motion.ts）。移せたら true。
 */
export function focusField(id: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById(id);
  if (!el) return false;
  let target: HTMLElement | null = el.matches("input,select,textarea,button") ? el : null;
  for (const sel of FOCUS_TARGET_SELECTORS) {
    if (target) break;
    target = el.querySelector<HTMLElement>(sel);
  }
  if (!target) return false;
  target.scrollIntoView({ block: "center", behavior: scrollBehavior() });
  target.focus({ preventScroll: true });
  return true;
}
