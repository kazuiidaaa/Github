"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import { Button } from "./ui";

/** 書類削除の確認。案件削除（ConfirmDeleteDialog）と同じ見た目で、削除範囲を明示する。 */
export function ConfirmDocumentDeleteDialog({
  fileName,
  onCancel,
  onConfirm,
}: {
  fileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm anim-fade-in">
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-doc-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl anim-pop-in">
        <h2 id="del-doc-title" className="text-lg font-semibold">
          {t("dialog.confirmDocDelete_title")}
        </h2>
        <p className="mt-3 text-sm">{t("dialog.confirmDocDelete_body", { fileName })}</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
          <li>{t("dialog.confirmDocDelete_item1")}</li>
          <li>{t("dialog.confirmDocDelete_item2")}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">{t("dialog.confirmDocDelete_note")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {t("dialog.confirmDocDelete_cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {t("dialog.confirmDocDelete_confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
