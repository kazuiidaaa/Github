import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * モーダルダイアログのキーボード操作を補う。
 * 表示時に `[data-autofocus]`（なければ最初の操作可能な要素）へフォーカスを移し、
 * Tab キーの移動をダイアログ内に留め、Escape で `onCancel` を呼ぶ。閉じたときは元の位置にフォーカスを戻す。
 */
export function useDialogA11y(ref: RefObject<HTMLElement | null>, onCancel: () => void) {
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    (root.querySelector<HTMLElement>("[data-autofocus]") ?? items()[0] ?? root).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [ref]);
}
