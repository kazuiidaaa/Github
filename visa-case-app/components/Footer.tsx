import Link from "next/link";
import { ABOUT_LINK_LABEL, ABOUT_PATH, PROTOTYPE_NOTICE, REVIEW_NOTICE } from "@/lib/notices";

/** 全画面の下部に出す共通フッター。印刷時は表示しない */
export function Footer() {
  return (
    <footer className="border-t border-slate-200 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-6 py-4 text-xs text-slate-600">
        <p>{PROTOTYPE_NOTICE}</p>
        <p>{REVIEW_NOTICE}</p>
        <Link href={ABOUT_PATH} className="font-bold text-blue-700 underline-offset-2 hover:underline">
          {ABOUT_LINK_LABEL}
        </Link>
      </div>
    </footer>
  );
}
