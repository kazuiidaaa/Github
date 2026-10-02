"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/auth";
import { isSupabaseEnabled } from "@/lib/supabase";

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

  if (!isSupabaseEnabled) return <>{children}</>;
  if (session === undefined) return <p className="text-sm text-slate-500">読み込み中……</p>;
  if (!session && !onLogin) return null;
  return <>{children}</>;
}
