"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LanguageProvider";
import { ABOUT_PATH } from "@/lib/notices";

/** 全画面の下部に出す共通フッター。印刷時は表示しない */
export function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-slate-200 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-6 py-4 text-xs text-slate-600">
        <p>{t("footer.prototypeNotice")}</p>
        <p>{t("footer.reviewNotice")}</p>
        <Link href={ABOUT_PATH} className="font-bold text-blue-700 underline-offset-2 hover:underline">
          {t("footer.aboutLink")}
        </Link>
      </div>
    </footer>
  );
}
