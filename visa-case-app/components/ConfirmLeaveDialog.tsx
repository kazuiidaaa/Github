"use client";

import { useRef } from "react";
import { useDialogA11y } from "@/lib/useDialogA11y";
import { useT } from "@/lib/i18n/LanguageProvider";
import { Button } from "./ui";

/** 入力途中の画面から離れる前の確認（ConfirmDeleteDialog と同じ形式）。 */
export function ConfirmLeaveDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, onCancel);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm anim-fade-in">
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="leave-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl anim-pop-in">
        <h2 id="leave-title" className="text-lg font-semibold">
          {t("dialog.confirmLeave_title")}
        </h2>
        <p className="mt-3 text-sm">{t("dialog.confirmLeave_body")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            {t("dialog.confirmLeave_continue")}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {t("dialog.confirmLeave_discard")}
          </Button>
        </div>
      </div>
    </div>
  );
}
