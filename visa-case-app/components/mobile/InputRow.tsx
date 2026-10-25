import type { ReactNode } from "react";

/**
 * 入力行（GroupedList の中に置く。項目名を左、入力欄を右に並べる iOS 設定アプリ風の行）。
 * 入力欄は 16px 以上（iOS が拡大しない）、行は 44pt 以上。区切り線は mobile.css の .m-row が引く。
 */
export function InputRow({ id, label, trailing, children }: { id: string; label: string; trailing?: ReactNode; children: ReactNode }) {
  return (
    <li className="m-row relative">
      <div className="flex min-h-[44px] items-center gap-3 px-4">
        <label htmlFor={id} className="w-[7.5rem] shrink-0 break-words text-base font-medium">
          {label}
        </label>
        {children}
        {trailing}
      </div>
    </li>
  );
}

export const inputCls =
  "min-h-[44px] min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-accent/40";
