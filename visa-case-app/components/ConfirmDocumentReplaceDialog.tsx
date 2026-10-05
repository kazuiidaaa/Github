"use client";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm anim-fade-in">
      <div role="alertdialog" aria-modal="true" aria-labelledby="replace-doc-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl anim-pop-in">
        <h2 id="replace-doc-title" className="text-lg font-semibold">
          書類の差し替え
        </h2>
        <p className="mt-3 text-sm">
          登録済みの「{currentFileName}」を、「{newFileName}」に差し替えます。差し替え後、元の書類は復元できません。よろしいですか？
        </p>
        <p className="mt-3 text-xs text-slate-500">案件の状態は「準備中」に戻ります。操作の記録（監査ログ）は、個人情報を含まない形で残ります。</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            差し替える
          </Button>
        </div>
      </div>
    </div>
  );
}
