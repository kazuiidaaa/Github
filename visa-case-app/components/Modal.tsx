"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "@/lib/useDialogA11y";
import { exitDelayMs } from "@/lib/motion";

/**
 * 確認ダイアログの共通の枠（Issue #392）。5種の確認ダイアログが、これを使う。
 * - 背景（スクリム）は半透明の黒のみ。ぼかしは使わない。
 * - 出入りは transition（globals.css の .motion-*）。入りは @starting-style、出は data-state="closed"。
 * - 「閉じる（キャンセル・Escape）」は、出る動き（0.15 秒）を見せてから onCancel を呼ぶ。
 *   動きを減らす設定では待たずに即時に呼ぶ。「実行」は動きを待たず、呼び出し側が onConfirm を直接呼ぶ。
 * - Tab の閉じ込め・Escape・フォーカスの復帰は useDialogA11y が担う。
 * 呼び出し側は、これまでどおり「開くときだけ描画する（{open && <Dialog />}）」でよい。
 */
export function Modal({
  titleId,
  busy = false,
  onCancel,
  children,
}: {
  /** 見出し要素の id（aria-labelledby） */
  titleId: string;
  /** 処理中は、Escape とキャンセルで閉じない */
  busy?: boolean;
  onCancel: () => void;
  /** 子は、キャンセルの操作に渡す close を受け取れる */
  children: ReactNode | ((api: { cancel: () => void }) => ReactNode);
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });

  // 出る動きを見せてから、呼び出し側へ閉じるよう伝える
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      cancelRef.current();
      // 呼び出し側が閉じなかった場合に備え、表示を戻す（閉じた場合は、そのままアンマウントされる）
      setClosing(false);
    }, exitDelayMs());
    return () => window.clearTimeout(timer);
  }, [closing]);

  const cancel = () => {
    if (busy || closing) return;
    if (exitDelayMs() === 0) onCancel();
    else setClosing(true);
  };

  useDialogA11y(dialogRef, cancel);

  const state = closing ? "closed" : "open";
  return (
    <div data-state={state} className={`motion-scrim fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? "pointer-events-none" : ""}`}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state={state}
        className="motion-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-overlay"
      >
        {typeof children === "function" ? children({ cancel }) : children}
      </div>
    </div>
  );
}
