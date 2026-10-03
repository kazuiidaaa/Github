"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { logAudit, resetStore } from "./store";
import { supabase } from "./supabase";

/** undefined：確認中、null：未ログイン。取得に失敗した場合は failed が true になる */
export function useSessionState(): { session: Session | null | undefined; failed: boolean } {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setFailed(false);
        setSession(data.session);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") resetStore();
      setFailed(false);
      setSession(s);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, failed };
}

/** undefined：確認中、null：未ログイン */
export function useSession(): Session | null | undefined {
  return useSessionState().session;
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

/** 現在のパスワードで再認証したうえで、パスワードを変更する。失敗時は表示用の文言を返す。 */
export async function changePassword(email: string, current: string, next: string): Promise<string | null> {
  if (!supabase) return "Supabase の接続情報が設定されていません。";
  if (next.length < 8) return "新しいパスワードは8文字以上で入力してください。";
  if (next === current) return "新しいパスワードは、現在のパスワードと異なるものにしてください。";
  try {
    const re = await supabase.auth.signInWithPassword({ email, password: current });
    if (re.error) return "現在のパスワードが正しくありません。";
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return "パスワードを変更できませんでした。条件を満たしているかご確認ください。";
    logAudit(null, "password_changed");
    return null;
  } catch {
    return "サーバーに接続できません。時間をおいて再度お試しください。";
  }
}
