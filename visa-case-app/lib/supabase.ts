import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** 接続情報が設定されている場合のみ有効。未設定時はブラウザ内の仮データで動作する。 */
export const isSupabaseEnabled = Boolean(url && key);

export const supabase = url && key ? createClient(url, key) : null;
