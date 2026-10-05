"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSessionState } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { configIssues } from "@/lib/env";
import { isMisconfigured, isSupabaseEnabled } from "@/lib/supabase";

/** Supabase 利用時、未ログインの場合はログイン画面へ移動する（データ自体は行単位の保護で守られる） */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, failed } = useSessionState();
  const demo = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === "/login";
  // 再設定メールのリンク先は、未ログイン（リンクの期限切れ）でも、画面側で案内を出すため移動させない。「ご利用にあたって」（/about）も、ログイン前に読めるようにする
  const onReset = pathname === "/reset-password" || pathname === "/about";

  useEffect(() => {
    if (!isSupabaseEnabled || demo) return;
    if (session === null && !onLogin && !onReset) router.replace("/login");
    if (session && onLogin) router.replace("/");
  }, [session, onLogin, onReset, router, demo]);

  if (isMisconfigured) {
    // 本番で設定に問題がある場合は、仮データ方式へ切り替えず、画面全体を停止する
    return (
      <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <p className="mb-2 font-semibold">環境設定に問題があるため、利用を停止しています</p>
        <ul className="list-disc pl-5">
          {configIssues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="mt-2">管理者へご連絡ください（docs/production.md を参照）。</p>
      </div>
    );
  }
  if (!isSupabaseEnabled || demo) return <>{children}</>;
  if (session === undefined && failed && !onLogin) {
    return (
      <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <p className="mb-2 font-semibold">ログイン状態を確認できませんでした</p>
        <p>通信に問題がある可能性があります。再読み込みするか、ログイン画面からやり直してください。</p>
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-full border border-red-300 px-3 py-1 font-bold">
            再読み込み
          </button>
          <Link href="/login" className="rounded-full bg-red-700 px-3 py-1 font-bold text-white">
            ログイン画面へ
          </Link>
        </div>
      </div>
    );
  }
  if (session === undefined && failed) return <>{children}</>;
  if (session === undefined) return <p className="text-sm text-slate-500">読み込み中……</p>;
  if (!session && !onLogin && !onReset) return null;
  return <>{children}</>;
}
