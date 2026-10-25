"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * 初回の読み込み中に出す小さなスピナーと文字（SwiftUI の ProgressView）。role="status" で支援技術にも伝える。
 * 動きを減らす設定（prefers-reduced-motion）では回さず、静止した円弧と文字だけにする。
 *
 * props:
 * - label  文字。省略時は「読み込み中……」（caseList.loading）
 */
export function LoadingSpinner({ label }: { label?: string }) {
  const t = useT();
  return (
    <div role="status" className="flex flex-col items-center gap-3 px-4 py-10 text-sm text-slate-600">
      <svg aria-hidden="true" viewBox="0 0 20 20" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin text-slate-500 motion-reduce:animate-none">
        <path d="M10 2a8 8 0 1 0 8 8" />
      </svg>
      <p>{label ?? t("caseList.loading")}</p>
    </div>
  );
}
