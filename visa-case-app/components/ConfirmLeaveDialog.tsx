"use client";

import { useRef } from "react";
import { useDialogA11y } from "@/lib/useDialogA11y";
import { Button } from "./ui";

/** 入力途中の画面から離れる前の確認（ConfirmDeleteDialog と同じ形式）。 */
export function ConfirmLeaveDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, onCancel);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm anim-fade-in">
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="leave-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl anim-pop-in">
        <h2 id="leave-title" className="text-lg font-semibold">
          入力内容の破棄
        </h2>
        <p className="mt-3 text-sm">入力した内容は、案件として作成されていません。この画面を離れると、入力した内容は消えます。よろしいですか？</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            入力を続ける
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            破棄して離れる
          </Button>
        </div>
      </div>
    </div>
  );
}
