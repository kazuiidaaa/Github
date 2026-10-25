"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { exitDemo, signOut, useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";
import { useCan } from "@/lib/store";
import { CaseSearchField } from "./CaseSearchField";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const plainButton =
  "inline-flex min-h-(--control-height-mac-large) shrink-0 items-center whitespace-nowrap rounded-mac-control border border-line-strong bg-grouped-surface px-3 text-mac-footnote font-bold text-slate-700 hover:bg-slate-100";
const badge = "min-h-(--control-height-mac-small) min-w-0 truncate rounded-mac-control bg-amber-100 px-2 py-1 text-mac-caption font-bold text-amber-800";
// 言語の選択と表示の明暗は、iPhone 版のアカウント画面とも共用の部品。ツールバーの中だけ、コントロールの高さ（標準）をそろえる
const regularControls = "inline-flex items-center [&_button]:min-h-(--control-height-mac-regular) [&_select]:min-h-(--control-height-mac-regular)";

/**
 * PC 版（幅 md 以上）の上のツールバー。既存の操作（新規登録・言語・表示の明暗・デモ終了・ログアウト）を、右の内容の上に1行で置く。
 * 狭い PC 幅（md〜lg）では、長い注記を短い表記にし、入りきらないときは折り返す。幅 md 未満では出さない（従来のヘッダーを使う）。
 */
export function PcToolbar() {
  const t = useT();
  const router = useRouter();
  const session = useSession();
  const demo = useDemo();
  const canEdit = useCan("edit");
  const onCaseList = usePathname() === "/cases";
  return (
    <div
      role="toolbar"
      aria-label={t("header.toolbarAria")}
      className="sticky top-0 z-30 hidden min-h-12 flex-wrap items-center gap-x-3 gap-y-2 border-b border-separator bg-window/80 px-4 py-2 backdrop-blur-xl backdrop-saturate-150 print:hidden md:flex lg:px-6"
    >
      {canEdit && (
        <Link
          href="/cases/new"
          className="inline-flex min-h-(--control-height-mac-large) shrink-0 items-center whitespace-nowrap rounded-mac-control bg-accent px-3 text-mac-footnote font-bold text-accent-text hover:bg-accent-hover active:bg-accent-hover"
        >
          {t("caseList.newCase")}
        </Link>
      )}
      {onCaseList && <CaseSearchField />}
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <span className={regularControls}>
          <LanguageSwitcher />
        </span>
        <span className={regularControls}>
          <ThemeToggle />
        </span>
        {demo ? (
          <>
            <span title={t("header.demoLong")} className={badge}>
              <span className="lg:hidden">{t("header.demoShort")}</span>
              <span className="hidden lg:inline">{t("header.demoLong")}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                exitDemo();
                router.replace("/login");
              }}
              className={plainButton}
            >
              {t("header.exitDemo")}
            </button>
          </>
        ) : !isSupabaseEnabled ? (
          <span title={t("header.prototypeLong")} className={badge}>
            <span className="lg:hidden">{t("header.prototypeShort")}</span>
            <span className="hidden lg:inline">{t("header.prototypeLong")}</span>
          </span>
        ) : (
          session && (
            <button type="button" onClick={() => void signOut()} className={plainButton}>
              {t("header.logout")}
            </button>
          )
        )}
      </div>
    </div>
  );
}
