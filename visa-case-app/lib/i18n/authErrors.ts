import { useT } from "./LanguageProvider";
import { CATALOG, type MessageKey } from "./messages";

type AuthName = keyof typeof CATALOG.auth.ja;

/**
 * lib/auth.ts・lib/authMessages.ts が返す日本語のエラー文を、表示の言語に訳す。
 * それらの日本語は、書類の出力や試験が使うため変更しない。画面の表示のときだけ、日本語の文から訳を引く。
 * 該当しない文（未知の文）は、そのまま返す。
 */
export function translateAuthError(t: (key: MessageKey) => string, ja: string): string {
  for (const name of Object.keys(CATALOG.auth.ja) as AuthName[]) {
    if (name.startsWith("err_") && CATALOG.auth.ja[name] === ja) return t(`auth.${name}`);
  }
  return ja;
}

/** 画面用。const tr = useAuthErrorText(); tr(error) */
export function useAuthErrorText(): (ja: string) => string {
  const t = useT();
  return (ja) => translateAuthError(t, ja);
}
