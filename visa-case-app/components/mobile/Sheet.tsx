"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useDialogA11y } from "@/lib/useDialogA11y";

/**
 * 下から出るシート（SwiftUI の .sheet）。画面全体を覆う背景（スクリム）の上に、角丸の面を置く。
 * 「開くときだけ描画する（{open && <Sheet />}）」で使う。閉じると、開く前に押していたボタンへフォーカスが戻る。
 * - role="dialog"・aria-modal・aria-labelledby。Tab はシート内に閉じ込め、Escape と背景を押すと onClose を呼ぶ（useDialogA11y）。
 * - 開いている間は、背面のスクロールを止める。
 * - 高さは固定しない。中身が長いとき、または文字を大きくしたときは、面の中でスクロールする（画面の高さの 90% まで）。
 * - 上部のバー：左に見出し、右に「完了」ボタン（44pt 以上）。バーは面の中で固定され、中身だけスクロールする。見出しは長いとき折り返す。
 * - 最初のフォーカスは「完了」ボタン（data-autofocus）。
 * - 背景と面の動きは、globals.css の .motion-scrim / .motion-panel（確認ダイアログと同じ。動きを減らす設定に従う）。
 *
 * props:
 * - title      見出し（必須。読み上げ名にもなる）
 * - doneLabel  「完了」ボタンの文字（必須）
 * - onClose    閉じるとき（完了・Escape・背景）に呼ぶ
 * - children   中身（GroupedList など）
 */
export function Sheet({ title, doneLabel, onClose, children }: { title: string; doneLabel: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useDialogA11y(panel, onClose);

  // 背面のスクロールを止める（閉じたら元に戻す）
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="motion-scrim fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => {
        // 背景そのものを押したときだけ閉じる（面の中の操作は閉じない）
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="motion-panel flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[14px] bg-background shadow-overlay"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-slate-200 bg-white px-4">
          <h2 id={titleId} className="min-w-0 py-2 text-base font-bold">
            {title}
          </h2>
          <button type="button" data-autofocus onClick={onClose} className="ml-auto min-h-[44px] min-w-[44px] px-1 text-base font-bold text-accent">
            {doneLabel}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">{children}</div>
      </div>
    </div>
  );
}
