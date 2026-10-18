"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import { Modal } from "./Modal";
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
    <Modal titleId="replace-doc-title" onCancel={onCancel}>
      {({ cancel }) => (
        <>
          <h2 id="replace-doc-title" className="text-lg font-semibold">
            {t("dialog.confirmDocReplace_title")}
          </h2>
          <p className="mt-3 text-sm">{t("dialog.confirmDocReplace_body", { currentFileName, newFileName })}</p>
          <p className="mt-3 text-xs text-slate-500">{t("dialog.confirmDocReplace_note")}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={cancel}>
              {t("dialog.confirmDocReplace_cancel")}
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              {t("dialog.confirmDocReplace_confirm")}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
