"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { clearDemoData, isDemo, localKey, setDemo } from "./demo";
import { buildDemoSeedCases } from "./demoSeed";
import { resetDocuments, DOCUMENTS_KEY } from "./documents/store";
import { CASES_KEY, logAudit, resetStore } from "./store";
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

/**
 * 再設定メールの送信を依頼する。登録の有無は区別せず、成功扱いなら null を返す
 * （メールアドレスの有無を、画面から推測できないようにするため）。接続不良・回数超過のみ文言を返す。
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  if (!supabase) return "Supabase の接続情報が設定されていません。";
  const trouble = "送信できませんでした。時間をおいて再度お試しください。";
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Supabase の「Redirect URLs」に、この URL の登録が必要
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (!error) return null;
    if (error.status === 429 || !error.status || error.status >= 500) return trouble;
    return null;
  } catch {
    return trouble;
  }
}

/** 再設定メールのリンクから入った状態で、新しいパスワードを設定する。失敗時は表示用の文言を返す。 */
export async function setNewPassword(next: string): Promise<string | null> {
  if (!supabase) return "Supabase の接続情報が設定されていません。";
  if (next.length < 8) return "新しいパスワードは8文字以上で入力してください。";
  try {
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return "パスワードを設定できませんでした。リンクの有効期限が切れたか、条件を満たしていない可能性があります。";
    logAudit(null, "password_changed");
    return null;
  } catch {
    return "サーバーに接続できません。時間をおいて再度お試しください。";
  }
}

/** デモ用の保存領域にだけ、架空の案件を書き込む。ここへ来るのは startDemo の直後のみ（通常ログインでは呼ばれない） */
function seedDemoCases() {
  if (!isDemo()) return; // デモに切り替えられなかった場合は、通常の保存領域へ書かない
  try {
    localStorage.setItem(localKey(CASES_KEY), JSON.stringify(buildDemoSeedCases()));
  } catch {
    // 保存できない場合は、案件のない状態で開始する
  }
}

/** デモモードを開始する。サーバーには接続せず、ブラウザ内の仮データで動作する。 */
export function startDemo() {
  clearDemoData([CASES_KEY, DOCUMENTS_KEY]); // 前回の消去漏れがあれば取り除く
  setDemo(true); // 先に切り替える（resetStore が、切替後の方式で役割を初期化するため）
  seedDemoCases();
  resetStore();
  resetDocuments();
}

/** デモモードを終了し、デモで入力したデータを破棄する。 */
export function exitDemo() {
  setDemo(false);
  clearDemoData([CASES_KEY, DOCUMENTS_KEY]);
  resetStore();
  resetDocuments();
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
