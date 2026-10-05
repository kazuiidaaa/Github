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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="flex items-center gap-6">
        <Link href="/" aria-label="在留資格案件管理（ホームへ）" className="text-lg font-bold">
          在留資格案件管理
        </Link>
        <nav aria-label="主な移動先" className="flex items-center gap-4 text-sm">
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
        <span className="flex items-center gap-3">
        <ThemeToggle />
        {demo ? (
          <span className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              デモ：仮データ（サーバーには保存されません）
            </span>
            <button
              onClick={() => {
                exitDemo();
                router.replace("/login");
              }}
              className="rounded-full border border-line-strong bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
            >
              デモを終了
            </button>
          </span>
        ) : !isSupabaseEnabled ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            試作版：仮データ（このブラウザ内にのみ保存）
          </span>
        ) : (
          session && (
            <span className="flex items-center gap-3 text-sm text-slate-600">
              <Link href="/account" className="font-bold text-blue-700 hover:underline">
                {session.user.email}
              </Link>
              <button
                onClick={() => void signOut()}
                className="rounded-full border border-line-strong bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
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
