import { createClient } from "@supabase/supabase-js";
import { hasSecretKey, isMisconfigured, supabaseKey, supabaseUrl } from "./env";

/** 接続情報が設定されている場合のみ有効。開発時に未設定なら、ブラウザ内の仮データで動作する。 */
export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseKey) && !hasSecretKey;

export const supabase = isSupabaseEnabled ? createClient(supabaseUrl!, supabaseKey!) : null;

export { isMisconfigured };
