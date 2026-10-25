"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { accountDisplayLabel } from "@/lib/accountName";
import { useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";
import { ABOUT_PATH } from "@/lib/notices";

const ICON = { "aria-hidden": true, viewBox: "0 0 16 16", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", className: "shrink-0" } as const;

const icons = {
  home: (
    <svg {...ICON}>
      <path d="M2.5 7.5 8 3l5.5 4.5M4 6.8V13h8V6.8" />
    </svg>
  ),
  cases: (
    <svg {...ICON}>
      <path d="M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z" />
    </svg>
  ),
  account: (
    <svg {...ICON}>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 13.5c.6-2.6 2.6-4 5-4s4.4 1.4 5 4" />
    </svg>
  ),
  about: (
    <svg {...ICON}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 7.2v3.6M8 5.2v.1" />
    </svg>
  ),
};

type Item = { href: string; label: ReactNode; title?: string; icon: ReactNode; current: boolean };

function Group({ heading, items }: { heading?: string; items: Item[] }) {
  return (
    <div className="mb-4">
      {heading && <p className="px-2 pb-1 text-mac-caption font-bold text-slate-600">{heading}</p>}
      <ul className="space-y-0.5">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              title={it.title}
              aria-current={it.current ? "page" : undefined}
              // 選択中は、背景・太字・左の線（色に頼らない印）で示す
              className={`flex min-h-(--control-height-mac-large) items-center gap-2 rounded-mac-control px-2 py-1 text-mac-body ${
                it.current
                  ? "bg-sidebar-selected font-bold text-slate-900 shadow-[inset_3px_0_0_var(--accent)]"
                  : "text-slate-700 hover:bg-separator"
              }`}
            >
              {it.icon}
              <span className="min-w-0 break-words">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * PC 版（幅 md 以上）の左のサイドバー。既存の移動先（ホーム・案件一覧・アカウント・ご利用にあたって）を並べる。
 * 幅 md 未満では出さず、従来のヘッダー（メニュー）を使う。Finder のサイドバーに倣い、面は sidebar、選択行は sidebar-selected。
 */
export function PcSidebar() {
  const t = useT();
  const pathname = usePathname();
  const session = useSession();
  const demo = useDemo();
  const showAccount = !demo && isSupabaseEnabled && !!session;
  const accountName = showAccount ? accountDisplayLabel(session.user.user_metadata, session.user.email) : "";

  const main: Item[] = [
    { href: "/", label: t("header.home"), icon: icons.home, current: pathname === "/" },
    { href: "/cases", label: t("header.cases"), icon: icons.cases, current: pathname.startsWith("/cases") },
  ];
  const help: Item[] = [
    ...(showAccount ? [{ href: "/account", label: accountName, title: accountName, icon: icons.account, current: pathname.startsWith("/account") }] : []),
    { href: ABOUT_PATH, label: t("footer.aboutLink"), icon: icons.about, current: pathname.startsWith(ABOUT_PATH) },
  ];

  return (
    <aside aria-label={t("header.sidebarAria")} className="sticky top-0 hidden h-screen w-[min(11rem,24vw)] shrink-0 flex-col overflow-y-auto border-r border-separator bg-sidebar print:hidden md:flex lg:w-[min(14rem,24vw)]">
      <Link href="/" aria-label={t("header.homeAria")} className="mx-2 mt-3 mb-4 block rounded-mac-control px-2 py-1 text-mac-title3 font-bold leading-snug">
        {t("header.siteName")}
      </Link>
      <nav aria-label={t("header.navAria")} className="flex-1 px-2 pb-3">
        <Group heading={t("header.groupCases")} items={main} />
        <Group heading={t("header.groupHelp")} items={help} />
      </nav>
    </aside>
  );
}
