"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";

/**
 * 戻るリンク（SwiftUI の NavigationStack の戻るボタン）。LargeTitleHeader の leading に置く。
 * 標準の形は「‹（シェブロン）＋戻り先の画面名」。戻り先名は、戻り先の大見出しと同じ語にする（例：案件）。
 * 押せる範囲は 44pt 以上。
 *
 * props:
 * - href       戻り先
 * - label      戻り先の画面名（見える文字）
 * - ariaLabel  読み上げ名。省略時は label。見える文字を含めること（例：「案件へ戻る」）
 * - onClick    押したときの処理（入力の破棄の確認など）。任意
 */
export function BackLink({ href, label, ariaLabel, onClick }: { href: string; label: string; ariaLabel?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <Link href={href} aria-label={ariaLabel} onClick={onClick} className="inline-flex min-h-[44px] items-center gap-1 px-2 text-base text-accent">
      <svg aria-hidden="true" viewBox="0 0 10 18" width="10" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1 1 9l8 8" />
      </svg>
      {label}
    </Link>
  );
}
