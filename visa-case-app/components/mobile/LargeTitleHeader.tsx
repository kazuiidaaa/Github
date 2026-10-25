"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * NavigationStack の大見出し（SwiftUI の navigationTitle(.large)）。
 * 上部に固定のバー（高さ 44pt＋上の safe-area）と、その下に大きな見出しを置く。
 * 大見出しがバーの裏へ隠れると、バー中央に小さな見出しが現れる（IntersectionObserver で判定。非対応環境では常に大見出しのまま）。
 *
 * 置き方：バーは position: sticky なので、ページ全体を包む要素の直下（兄弟として）に置く。小さな箱で包まない。
 *
 * props:
 * - title    見出しの文字（必須）。h1 として 1 回だけ出る。バー中央の小さな見出しは aria-hidden（重複して読み上げない）
 * - leading  バー左端に置く要素（戻るボタンなど）。任意。押せる要素は 44pt 以上にすること
 * - trailing バー右端に置く操作（MenuButton など）。任意。大見出しが見えている間も、バーは常に見える
 */
export function LargeTitleHeader({ title, leading, trailing }: { title: string; leading?: ReactNode; trailing?: ReactNode }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // 上端から 44pt を除いた範囲に入っていなければ、大見出しはバーの裏に隠れたとみなす
    const io = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: "-44px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        data-collapsed={collapsed}
        className={`m-navbar sticky top-0 z-30 border-b backdrop-blur-xl backdrop-saturate-150 ${
          collapsed ? "border-slate-200 bg-white/85" : "border-transparent bg-background/0"
        }`}
      >
        <div className="relative flex h-11 items-center justify-between gap-2 px-2">
          <div className="flex min-w-[44px] items-center justify-start">{leading}</div>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-14 truncate text-center text-base font-bold transition-opacity ${
              collapsed ? "opacity-100" : "opacity-0"
            }`}
          >
            {title}
          </span>
          <div className="flex min-w-[44px] items-center justify-end">{trailing}</div>
        </div>
      </div>
      <h1 ref={titleRef} className="px-4 pb-2 pt-1 text-[2.125rem] font-bold leading-tight tracking-tight">
        {title}
      </h1>
    </>
  );
}
