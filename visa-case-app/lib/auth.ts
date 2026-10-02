"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { resetStore } from "./store";
import { supabase } from "./supabase";

/** undefined：確認中、null：未ログイン */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") resetStore();
      setSession(s);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return session;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return "Supabase の接続情報が設定されていません。";
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return null;
    // 接続不能などの場合は、認証情報の誤りと区別して表示する
    return error.status && error.status < 500
      ? "メールアドレスまたはパスワードが正しくありません。"
      : "サーバーに接続できません。時間をおいて再度お試しください。";
  } catch {
    return "サーバーに接続できません。時間をおいて再度お試しください。";
  }
}

export async function signOut() {
  await supabase?.auth.signOut();
}
