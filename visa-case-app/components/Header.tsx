"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { exitDemo, signOut, useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { isSupabaseEnabled } from "@/lib/supabase";

export function Header() {
  const session = useSession();
  const demo = useDemo();
  const router = useRouter();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/cases" className="text-lg font-semibold">
          在留資格案件管理
        </Link>
        {demo ? (
          <span className="flex items-center gap-3 text-sm">
            <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
              デモ：仮データ（サーバーには保存されません）
            </span>
            <button
              onClick={() => {
                exitDemo();
                router.replace("/login");
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-600 hover:bg-slate-50"
            >
              デモを終了
            </button>
          </span>
        ) : !isSupabaseEnabled ? (
          <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
            試作版：仮データ（このブラウザ内にのみ保存）
          </span>
        ) : (
          session && (
            <span className="flex items-center gap-3 text-sm text-slate-600">
              <Link href="/account" className="text-blue-700 hover:underline">
                {session.user.email}
              </Link>
              <button
                onClick={() => void signOut()}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50"
              >
                ログアウト
              </button>
            </span>
          )
        )}
      </div>
    </header>
  );
}
