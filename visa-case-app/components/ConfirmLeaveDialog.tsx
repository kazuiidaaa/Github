"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import { Modal } from "./Modal";
import { Button } from "./ui";

/** 入力途中の画面から離れる前の確認（ConfirmDeleteDialog と同じ形式）。 */
export function ConfirmLeaveDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const t = useT();
  return (
    <Modal titleId="leave-title" onCancel={onCancel}>
      {({ cancel }) => (
        <>
          <h2 id="leave-title" className="text-lg font-semibold">
            {t("dialog.confirmLeave_title")}
          </h2>
          <p className="mt-3 text-sm">{t("dialog.confirmLeave_body")}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={cancel} data-autofocus>
              {t("dialog.confirmLeave_continue")}
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              {t("dialog.confirmLeave_discard")}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
