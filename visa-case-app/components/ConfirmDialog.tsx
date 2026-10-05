"use client";

import { useId, useRef, type ReactNode } from "react";
import { useDialogA11y } from "@/lib/useDialogA11y";
import { Button } from "./ui";

/**
 * 汎用の確認ダイアログ。ブラウザ標準の confirm() の代わりに使う。
 * 確認ボタンの文言は、操作を表す動詞にする（例：「削除する」）。
 * tone="caution" は、影響の大きい操作（元に戻せない・権限に関わる等）に使う。
 */
export function ConfirmDialog({
  title,
  message,
  note,
  confirmLabel,
  tone = "normal",
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  /** 影響を1行で説明する本文 */
  message: ReactNode;
  /** 補足（元に戻せるか、監査ログなど） */
  note?: ReactNode;
  confirmLabel: string;
  tone?: "normal" | "caution";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // 処理中は、Escape で閉じない
  useDialogA11y(dialogRef, () => !busy && onCancel());
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm anim-fade-in">
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl anim-pop-in">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-3 text-sm">{message}</p>
        {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy} data-autofocus>
            キャンセル
          </Button>
          <Button variant={tone === "caution" ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
