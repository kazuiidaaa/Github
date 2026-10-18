"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import { Modal } from "./Modal";
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
  // 削除の処理中は、Escape とキャンセルで閉じない（Modal の busy）
  return (
    <Modal titleId="del-title" busy={busy} onCancel={onCancel}>
      {({ cancel }) => (
        <>
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
            <Button variant="secondary" onClick={cancel} disabled={busy} data-autofocus>
              {t("dialog.confirmDelete_cancel")}
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={busy}>
              {busy ? t("dialog.confirmDelete_busy") : t("dialog.confirmDelete_confirm")}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
