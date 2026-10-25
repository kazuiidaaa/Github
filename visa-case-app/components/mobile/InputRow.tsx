import type { ReactNode } from "react";

/**
 * 入力行（GroupedList の中に置く）。項目名を上、枠付きの入力欄を下に置く（長い入力でも欄の幅を確保するため）。
 * 入力欄は 16px 以上（iOS が拡大しない）、欄は 44pt 以上。区切り線は mobile.css の .m-row が引く。
 * - 枠は slate-400（白地に対し 3:1 以上）で、入力欄だと分かるようにする。フォーカス時は accent の枠と輪を出す。
 * - trailing は項目名と同じ行の右端（パスワードの表示切替など）。below は欄の下の補助表示（入力中の全文など）。
 */
export function InputRow({ id, label, trailing, below, children }: { id: string; label: string; trailing?: ReactNode; below?: ReactNode; children: ReactNode }) {
  return (
    <li className="m-row relative">
      <div className="px-4 py-2">
        <div className="mb-0.5 flex flex-wrap items-center justify-between gap-x-3">
          <label htmlFor={id} className="min-w-0 break-words text-sm font-medium text-slate-600">
            {label}
          </label>
          {trailing}
        </div>
        <div className="flex min-h-[44px] items-center rounded-[10px] border border-slate-400 bg-slate-50 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40">
          {children}
        </div>
        {below}
      </div>
    </li>
  );
}

export const inputCls = "min-h-[44px] min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none focus-visible:outline-none! placeholder:text-slate-500";

/**
 * 入力中の全文の確認行。入力欄の中で途中が見切れても、全体を折り返して読めるようにする。
 * 画面の見た目だけの補助（読み上げでは入力欄自体を読むため aria-hidden）。値の保存・送信には使わない。
 */
export function TypedPreview({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p aria-hidden="true" className="mt-1.5 break-all text-sm text-slate-600">
      <span className="font-bold">{label}</span> <span data-testid="typed-preview">{value}</span>
    </p>
  );
}
