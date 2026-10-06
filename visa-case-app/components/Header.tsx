"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 max-md:gap-y-1 max-md:py-2 lg:flex-nowrap lg:justify-between lg:px-6 lg:py-4">
        <span className="contents lg:flex lg:items-center lg:gap-6">
        <Link href="/" aria-label={t("header.homeAria")} className="order-1 text-lg font-bold lg:order-none">
          {t("header.siteName")}
        </Link>
        <nav aria-label={t("header.navAria")} className="order-4 flex items-center gap-4 text-sm lg:order-none">
          {NAV.map((n) => {
            const current = n.match(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={current ? "page" : undefined}
                className={`py-1 font-bold ${current ? "underline decoration-2 underline-offset-8" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t(n.label)}
              </Link>
            );
          })}
        </nav>
        </span>
        {/* 狭い幅では、ここで改行して2段目を始める */}
        <span aria-hidden="true" className="order-3 h-0 basis-full lg:hidden" />
        <span className="contents lg:flex lg:items-center lg:gap-3">
        <span className="order-2 ml-auto lg:order-none lg:ml-0">
          <span className="inline-flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </span>
        </span>
        {demo ? (
          <span className="order-5 ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 text-sm lg:order-none lg:ml-0 max-md:flex-nowrap lg:flex-nowrap lg:justify-start lg:gap-3">
            <span
              title={t("header.demoLong")}
              className="rounded-xl bg-amber-100 lg:rounded-full px-3 py-1 text-xs font-bold text-amber-800 max-md:shrink-0 max-md:whitespace-nowrap"
            >
              <span className="md:hidden">{t("header.demoShort")}</span>
              <span className="max-md:hidden">{t("header.demoLong")}</span>
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
          <span
            title={t("header.prototypeLong")}
            className="order-5 ml-auto rounded-xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 max-md:whitespace-nowrap lg:order-none lg:ml-0 lg:rounded-full"
          >
            <span className="md:hidden">{t("header.prototypeShort")}</span>
            <span className="max-md:hidden">{t("header.prototypeLong")}</span>
          </span>
        ) : (
          session && (
            <span className="order-5 ml-auto flex min-w-0 max-w-full items-center justify-end gap-2 text-sm text-slate-600 lg:order-none lg:ml-0 lg:justify-start lg:gap-3">
              <Link
                href="/account"
                title={session.user.email}
                className="block min-w-0 max-w-[14rem] truncate font-bold text-blue-700 max-md:max-w-[6.5rem] hover:underline lg:max-w-none"
              >
                {session.user.email}
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
        </span>
      </div>
    </header>
  );
}
