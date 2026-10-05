"use client";

import { useStoreError } from "@/lib/store";

export const LOAD_FAILED_GUIDE = "読み込めませんでした。ページを再読み込みしてください。解決しない場合は、時間をおいて再度お試しください。";

// 「読み込み中……」の表示。支援技術にも伝わるよう role="status" を付ける。
// 読み込みに失敗している場合は、再読み込みの案内を role="alert" で表示する（StoreErrorBanner と同じ形）。
export function LoadingNotice({ error }: { error?: string }) {
  const storeError = useStoreError();
  if (error || storeError) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
        {LOAD_FAILED_GUIDE}
      </p>
    );
  }
  return (
    <p role="status" className="text-sm text-slate-500">
      読み込み中……
    </p>
  );
}
