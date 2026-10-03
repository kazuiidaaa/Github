import { createClient } from "@supabase/supabase-js";
import { isDemo } from "./demo";
import { hasSecretKey, isMisconfigured, supabaseKey, supabaseUrl } from "./env";

/** 接続情報が設定されている場合のみ有効。開発時に未設定なら、ブラウザ内の仮データで動作する。 */
export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseKey) && !hasSecretKey;

export const supabase = isSupabaseEnabled ? createClient(supabaseUrl!, supabaseKey!) : null;

/** データの読み書きに Supabase を使うか。デモモード中は、設定済みでもブラウザ内の仮データを使う。 */
export function usesSupabase(): boolean {
  return isSupabaseEnabled && !isDemo();
}

export { isMisconfigured };
