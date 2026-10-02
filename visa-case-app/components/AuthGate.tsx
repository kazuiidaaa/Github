"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/auth";
import { configIssues } from "@/lib/env";
import { isMisconfigured, isSupabaseEnabled } from "@/lib/supabase";

/** Supabase 利用時、未ログインの場合はログイン画面へ移動する（データ自体は行単位の保護で守られる） */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === "/login";

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    if (session === null && !onLogin) router.replace("/login");
    if (session && onLogin) router.replace("/cases");
  }, [session, onLogin, router]);

  if (isMisconfigured) {
    // 本番で設定に問題がある場合は、仮データ方式へ切り替えず、画面全体を停止する
    return (
      <div role="alert" className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
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
  if (!isSupabaseEnabled) return <>{children}</>;
  if (session === undefined) return <p className="text-sm text-slate-500">読み込み中……</p>;
  if (!session && !onLogin) return null;
  return <>{children}</>;
}
