import { isLang, type Lang } from "@/lib/documents/lang";
import { supabase } from "@/lib/supabase";

/**
 * 利用者ごとの表示言語の設定（表 user_preferences）の取得と保存。
 * 呼び出し側は、Supabase を使う場合（ログイン済み・デモでない）にだけ呼ぶ。
 * 失敗しても、例外は投げず、結果で返す（画面を壊さないため）。
 */
export type LoadResult = { ok: true; lang: Lang | null } | { ok: false };

/** 保存した言語を取得する。行がなければ lang は null（未設定） */
export async function loadLanguagePreference(userId: string): Promise<LoadResult> {
  if (!supabase) return { ok: false };
  try {
    const { data, error } = await supabase.from("user_preferences").select("language").eq("user_id", userId).maybeSingle();
    if (error) return { ok: false };
    const v = (data as { language?: unknown } | null)?.language;
    return { ok: true, lang: isLang(v) ? v : null };
  } catch {
    return { ok: false };
  }
}

/** 言語を保存する（なければ追加、あれば更新）。成功したかどうかを返す */
export async function saveLanguagePreference(userId: string, lang: Lang): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: userId, language: lang, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    return !error;
  } catch {
    return false;
  }
}
