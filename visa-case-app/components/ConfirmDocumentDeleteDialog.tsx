"use client";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm anim-fade-in">
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-doc-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl anim-pop-in">
        <h2 id="del-doc-title" className="text-lg font-semibold">
          書類の削除
        </h2>
        <p className="mt-3 text-sm">「{fileName}」を削除します。削除後は復元できません。よろしいですか？</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
          <li>アップロードした書類の記録</li>
          <li>書類から抽出した結果</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">案件の状態は「準備中」に戻ります。操作の記録（監査ログ）は、個人情報を含まない形で残ります。</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            削除する
          </Button>
        </div>
      </div>
    </div>
  );
}
