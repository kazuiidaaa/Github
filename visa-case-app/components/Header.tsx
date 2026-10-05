"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { exitDemo, signOut, useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { isSupabaseEnabled } from "@/lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const session = useSession();
  const demo = useDemo();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/cases" aria-label="在留資格案件管理（案件一覧へ）" className="text-lg font-bold">
          在留資格案件管理
        </Link>
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
