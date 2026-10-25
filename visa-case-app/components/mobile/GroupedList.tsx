import Link from "next/link";
import type { ReactNode } from "react";

/**
 * insetGrouped の一覧（SwiftUI の List(.insetGrouped)）。左右に余白を取り、角丸の白い面に行を並べ、行の間を細い線で区切る。
 *
 * props:
 * - children  GroupedRow を並べる（ul の中身になる）
 * - header    一覧の上に置く小さな見出し。任意（文字列などの ReactNode）
 * - footer    一覧の下に置く補足の文。任意
 * - ariaLabel 一覧の読み上げ名。header が無いときに付けるとよい。任意
 */
export function GroupedList({
  children,
  header,
  footer,
  ariaLabel,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <section className="mx-4 my-4">
      {header && <h2 className="px-4 pb-1.5 text-xs font-bold text-slate-600">{header}</h2>}
      {/* role="list" は、list-style を消した ul が Safari で一覧と読まれなくなるのを防ぐ */}
      <ul role="list" aria-label={ariaLabel} className="overflow-hidden rounded-[10px] bg-white">
        {children}
      </ul>
      {footer && <p className="px-4 pt-1.5 text-xs text-slate-600">{footer}</p>}
    </section>
  );
}

/**
 * GroupedList の行。href があればリンク、onClick があればボタン、どちらも無ければ表示のみ。
 * 押せる行は、右端にシェブロン（›）を出し、高さは 44pt 以上。区切り線は左に 16px 内側へ寄せる。
 *
 * props:
 * - title     主な文字（必須）
 * - subtitle  2 行目の補足。任意
 * - leading   左端に置く要素（アイコンなど）。任意
 * - trailing  右側に置く要素（値の文字、Badge など）。任意。シェブロンの手前に出る
 * - href      移動先（next/link）。指定すると行全体がリンクになる
 * - onClick   押したときの処理。href が無いときだけ使う
 * - chevron   シェブロンを出すか。省略時は、押せる行なら true、表示のみなら false
 * - current   現在地の行なら true（aria-current="page"）
 */
export function GroupedRow({
  title,
  subtitle,
  leading,
  trailing,
  href,
  onClick,
  chevron,
  current,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  current?: boolean;
}) {
  const interactive = href !== undefined || onClick !== undefined;
  const showChevron = chevron ?? interactive;
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block break-words font-medium">{title}</span>
        {subtitle && <span className="mt-0.5 block break-words text-xs text-slate-600">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-sm text-slate-600">{trailing}</span>}
      {showChevron && (
        <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
          <path d="m1 1 6 6-6 6" />
        </svg>
      )}
    </>
  );
  const cls = `flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left text-base ${interactive ? "active:bg-slate-100" : ""}`;
  return (
    <li className="m-row relative">
      {href !== undefined ? (
        <Link href={href} aria-current={current ? "page" : undefined} className={cls}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} aria-current={current ? "page" : undefined} className={cls}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
