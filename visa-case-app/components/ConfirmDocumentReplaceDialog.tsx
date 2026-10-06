"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import { Button } from "./ui";

/** 書類差し替えの確認。削除確認（ConfirmDocumentDeleteDialog）と同じ見た目で、変更範囲を明示する。 */
export function ConfirmDocumentReplaceDialog({
  currentFileName,
  newFileName,
  onCancel,
  onConfirm,
}: {
  currentFileName: string;
  newFileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm anim-fade-in">
      <div role="alertdialog" aria-modal="true" aria-labelledby="replace-doc-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl anim-pop-in">
        <h2 id="replace-doc-title" className="text-lg font-semibold">
          {t("dialog.confirmDocReplace_title")}
        </h2>
        <p className="mt-3 text-sm">{t("dialog.confirmDocReplace_body", { currentFileName, newFileName })}</p>
        <p className="mt-3 text-xs text-slate-500">{t("dialog.confirmDocReplace_note")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {t("dialog.confirmDocReplace_cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {t("dialog.confirmDocReplace_confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
