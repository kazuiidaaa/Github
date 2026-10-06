"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import { useStoreError } from "@/lib/store";

// 「読み込み中……」の表示。支援技術にも伝わるよう role="status" を付ける。
// 読み込みに失敗している場合は、再読み込みの案内を role="alert" で表示する（StoreErrorBanner と同じ形）。
export function LoadingNotice({ error }: { error?: string }) {
  const storeError = useStoreError();
  const t = useT();
  if (error || storeError) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
        {t("common.loadFailedGuide")}
      </p>
    );
  }
  return (
    <p role="status" className="text-sm text-slate-500">
      {t("common.loading")}
    </p>
  );
}
