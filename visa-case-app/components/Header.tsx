"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { accountDisplayLabel } from "@/lib/accountName";
import { exitDemo, signOut, useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "header.home", match: (p: string) => p === "/" },
  { href: "/cases", label: "header.cases", match: (p: string) => p.startsWith("/cases") },
] as const;

export function Header() {
  const session = useSession();
  const demo = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  // 狭い幅のメニューが開いている画面のパス。別の画面に移ると、自然に閉じた扱いになる
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  return (
    <>
      <a
        href="#main"
        onClick={(e) => {
          // 次の読み込みを伴わず、本文へフォーカスを移す
          const main = document.getElementById("main");
          if (!main) return;
          e.preventDefault();
          main.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        {t("header.skipToMain")}
      </a>
      <header
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            setOpenAt(null);
            menuButton.current?.focus();
          }
        }}
        className="sticky top-0 z-40 border-b md:hidden border-slate-200 bg-white/75 backdrop-blur-xl backdrop-saturate-150"
      >
        {/* 狭い幅（lg 未満）は1段：ロゴとメニューボタン。残りはメニューに入れる。lg 以上は従来どおり横一列 */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 py-2 lg:flex-nowrap lg:px-6 lg:py-4">
          <Link href="/" aria-label={t("header.homeAria")} className="min-w-0 flex-1 truncate text-lg font-bold lg:flex-none">
            {t("header.siteName")}
          </Link>
          <button
            ref={menuButton}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpenAt(open ? null : pathname)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-line-strong bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
            {t("header.menu")}
          </button>
          <div
            id={menuId}
            className={`${open ? "flex" : "hidden"} basis-full flex-col items-start gap-3 pb-3 pt-1 lg:flex lg:flex-1 lg:basis-auto lg:flex-row lg:items-center lg:gap-6 lg:p-0`}
          >
            <nav aria-label={t("header.navAria")} className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              {NAV.map((n) => {
                const current = n.match(pathname);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={current ? "page" : undefined}
                    className={`py-2 font-bold lg:py-1 ${current ? "underline decoration-2 underline-offset-8" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {t(n.label)}
                  </Link>
                );
              })}
            </nav>
            <div className="flex w-full min-w-0 flex-col items-start gap-3 lg:ml-auto lg:w-auto lg:flex-row lg:items-center">
              <span className="inline-flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </span>
              {demo ? (
                <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm lg:flex-nowrap lg:gap-3">
                  <span title={t("header.demoLong")} className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 lg:rounded-full">
                    {t("header.demoLong")}
                  </span>
                  <button
                    onClick={() => {
                      exitDemo();
                      router.replace("/login");
                    }}
                    className="shrink-0 whitespace-nowrap rounded-full border border-line-strong bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
                  >
                    {t("header.exitDemo")}
                  </button>
                </span>
              ) : !isSupabaseEnabled ? (
                <span title={t("header.prototypeLong")} className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 lg:rounded-full">
                  {t("header.prototypeLong")}
                </span>
              ) : (
                session && (
                  <span className="flex min-w-0 max-w-full items-center gap-2 text-sm text-slate-600 lg:gap-3">
                    <Link
                      href="/account"
                      title={accountDisplayLabel(session.user.user_metadata, session.user.email)}
                      className="block min-w-0 max-w-[14rem] truncate font-bold text-blue-700 hover:underline lg:max-w-none"
                    >
                      {accountDisplayLabel(session.user.user_metadata, session.user.email)}
                    </Link>
                    <button
                      onClick={() => void signOut()}
                      className="shrink-0 whitespace-nowrap rounded-full border border-line-strong bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {t("header.logout")}
                    </button>
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
