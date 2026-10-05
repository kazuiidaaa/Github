"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { exitDemo, signOut, useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { isSupabaseEnabled } from "@/lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "ホーム", match: (p: string) => p === "/" },
  { href: "/cases", label: "案件一覧", match: (p: string) => p.startsWith("/cases") },
];

export function Header() {
  const session = useSession();
  const demo = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:flex-nowrap md:justify-between md:px-6 md:py-4">
        <span className="contents md:flex md:items-center md:gap-6">
        <Link href="/" aria-label="在留資格案件管理（ホームへ）" className="order-1 text-lg font-bold md:order-none">
          在留資格案件管理
        </Link>
        <nav aria-label="主な移動先" className="order-4 flex items-center gap-4 text-sm md:order-none">
          {NAV.map((n) => {
            const current = n.match(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={current ? "page" : undefined}
                className={`py-1 font-bold ${current ? "underline decoration-2 underline-offset-8" : "text-slate-600 hover:text-slate-900"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        </span>
        {/* 狭い幅では、ここで改行して2段目を始める */}
        <span aria-hidden="true" className="order-3 h-0 basis-full md:hidden" />
        <span className="contents md:flex md:items-center md:gap-3">
        <span className="order-2 ml-auto md:order-none md:ml-0">
          <ThemeToggle />
        </span>
        {demo ? (
          <span className="order-5 ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 text-sm md:order-none md:ml-0 md:flex-nowrap md:justify-start md:gap-3">
            <span className="rounded-xl bg-amber-100 md:rounded-full px-3 py-1 text-xs font-bold text-amber-800">
              デモ：仮データ（サーバーには保存されません）
            </span>
            <button
              onClick={() => {
                exitDemo();
                router.replace("/login");
              }}
              className="shrink-0 whitespace-nowrap rounded-full border border-line-strong bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
            >
              デモを終了
            </button>
          </span>
        ) : !isSupabaseEnabled ? (
          <span className="order-5 ml-auto rounded-xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 md:order-none md:ml-0 md:rounded-full">
            試作版：仮データ（このブラウザ内にのみ保存）
          </span>
        ) : (
          session && (
            <span className="order-5 ml-auto flex min-w-0 max-w-full items-center justify-end gap-2 text-sm text-slate-600 md:order-none md:ml-0 md:justify-start md:gap-3">
              <Link
                href="/account"
                title={session.user.email}
                className="block min-w-0 max-w-[14rem] truncate font-bold text-blue-700 hover:underline md:max-w-none"
              >
                {session.user.email}
              </Link>
              <button
                onClick={() => void signOut()}
                className="shrink-0 whitespace-nowrap rounded-full border border-line-strong bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
              >
                ログアウト
              </button>
            </span>
          )
        )}
        </span>
      </div>
    </header>
  );
}
