import { DEFAULT_LANG, type Lang } from "@/lib/documents/lang";
import { CATALOG, type MessageKey } from "./messages";

export type MessageParams = Record<string, string | number>;

type Table = Record<string, Record<string, string>>;

/** 区分とキーを分け、指定の言語の文言を返す。訳がない（空）場合は、日本語の原文を返す */
function lookup(lang: Lang, key: string): string {
  const dot = key.indexOf(".");
  const table = (CATALOG as unknown as Record<string, Record<Lang, Table[string]>>)[key.slice(0, dot)];
  const name = key.slice(dot + 1);
  const text = table?.[lang]?.[name];
  if (text) return text;
  return table?.[DEFAULT_LANG]?.[name] ?? key;
}

/** 文言を引く。{名前} の部分を、params の値に置き換える */
export function translate(lang: Lang, key: MessageKey, params?: MessageParams): string {
  const text = lookup(lang, key);
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** 英語・韓国語で、訳が空（未訳）の文言のキーを返す。テストと確認用 */
export function untranslatedKeys(lang: Lang): MessageKey[] {
  const result: MessageKey[] = [];
  for (const [ns, table] of Object.entries(CATALOG as unknown as Record<string, Record<Lang, Table[string]>>)) {
    for (const name of Object.keys(table[DEFAULT_LANG])) {
      if (!table[lang]?.[name]) result.push(`${ns}.${name}` as MessageKey);
    }
  }
  return result;
}
