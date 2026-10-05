import { isSupabaseEnabled } from "../supabase";

/** Supabase 設定済みの環境で、デモモード（ログインなし）のとき、公式様式（エクセル）は生成できない（Issue #120） */
export const OFFICIAL_FORM_LOGIN_REQUIRED = "公式様式（エクセル）の生成には、ログインが必要です。デモモードでは利用できません。";

/** 生成 API は、Supabase 設定済みではログインのトークンを必須とする。デモモードではトークンが無いため、送る前に止める */
export function officialFormNeedsLogin(demo: boolean): boolean {
  return isSupabaseEnabled && demo;
}
