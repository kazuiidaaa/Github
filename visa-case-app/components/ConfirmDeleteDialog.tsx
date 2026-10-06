"use client";

import { useRef } from "react";
import { useDialogA11y } from "@/lib/useDialogA11y";
import { useT } from "@/lib/i18n/LanguageProvider";
import { Button } from "./ui";

/** 案件削除の確認。削除される範囲を明示する。 */
export function ConfirmDeleteDialog({
  caseName,
  busy,
  onCancel,
  onConfirm,
}: {
  caseName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  // 削除の処理中は、Escape で閉じない
  useDialogA11y(dialogRef, () => !busy && onCancel());
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm anim-fade-in">
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="del-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl anim-pop-in">
        <h2 id="del-title" className="text-lg font-semibold">
          {t("dialog.confirmDelete_title")}
        </h2>
        <p className="mt-3 text-sm">{t("dialog.confirmDelete_body", { caseName })}</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
          <li>{t("dialog.confirmDelete_item1")}</li>
          <li>{t("dialog.confirmDelete_item2")}</li>
          <li>{t("dialog.confirmDelete_item3")}</li>
          <li>{t("dialog.confirmDelete_item4")}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">{t("dialog.confirmDelete_note")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy} data-autofocus>
            {t("dialog.confirmDelete_cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? t("dialog.confirmDelete_busy") : t("dialog.confirmDelete_confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
