"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useToast } from "@/components/Toast";
import { useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { DEFAULT_LANG, type Lang } from "@/lib/documents/lang";
import { isSupabaseEnabled } from "@/lib/supabase";
import type { MessageKey } from "./messages";
import { loadLanguagePreference, saveLanguagePreference } from "./preferences";
import { readUiLang, subscribeUiLang, writeUiLang } from "./store";
import { translate, type MessageParams } from "./translate";

type LanguageApi = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
};

const LanguageContext = createContext<LanguageApi>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, params) => translate(DEFAULT_LANG, key, params),
});

/**
 * 画面の表示言語を提供する。app/layout.tsx で、ToastProvider の内側に1か所だけ配置する。
 * - 初回の描画は、ブラウザの記憶（なければ日本語）。サーバー側の描画は、常に日本語。
 * - Supabase 利用中でログイン済みの場合は、保存した設定を1回取得し、記憶と異なれば切り替える（正は保存した設定）。
 * - 取得に失敗した場合は、記憶した言語のまま動かす。保存に失敗した場合は、その画面では選択を保ち、通知する。
 * - Supabase 未設定・デモの場合は、ブラウザの記憶のみで動かす。
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribeUiLang, readUiLang, () => DEFAULT_LANG);
  const session = useSession();
  const demo = useDemo();
  const toast = useToast();
  const userId = session?.user.id ?? null;
  const remote = isSupabaseEnabled && !demo && userId !== null;
  // 取得の完了前に、利用者が自分で切り替えた場合は、取得結果で上書きしない
  const touched = useRef(false);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!remote || !userId) return;
    let active = true;
    touched.current = false;
    void loadLanguagePreference(userId).then((r) => {
      if (!active || touched.current || !r.ok || !r.lang) return;
      if (r.lang !== readUiLang()) writeUiLang(r.lang);
    });
    return () => {
      active = false;
    };
  }, [remote, userId]);

  const setLang = useCallback(
    (next: Lang) => {
      touched.current = true;
      writeUiLang(next);
      if (!remote || !userId) return;
      void saveLanguagePreference(userId, next).then((ok) => {
        if (!ok) toast.error(translate(next, "common.languageSaveFailed"));
      });
    },
    [remote, userId, toast],
  );

  const api = useMemo<LanguageApi>(
    () => ({ lang, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, setLang],
  );
  return <LanguageContext.Provider value={api}>{children}</LanguageContext.Provider>;
}

/** 現在の言語と、切り替えの関数 */
export function useLang(): Pick<LanguageApi, "lang" | "setLang"> {
  const { lang, setLang } = useContext(LanguageContext);
  return { lang, setLang };
}

/** 文言を引く関数。t("header.home") の形で使う */
export function useT(): LanguageApi["t"] {
  return useContext(LanguageContext).t;
}
