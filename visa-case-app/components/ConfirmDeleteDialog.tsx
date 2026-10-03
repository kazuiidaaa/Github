"use client";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id="del-title" className="text-lg font-semibold">
          案件の削除
        </h2>
        <p className="mt-3 text-sm">「{caseName}」について、この案件と関連ファイルを削除します。削除後は復元できません。よろしいですか？</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
          <li>申請人情報・雇用情報</li>
          <li>必要書類の記録</li>
          <li>アップロードした書類と抽出結果</li>
          <li>保存されているファイル</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">操作の記録（監査ログ）は、個人情報を含まない形で残ります。</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "削除中……" : "削除する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
