import type { Lang } from "@/lib/documents/lang";

/**
 * 画面の訳表を、区分（例：header）ごとに定義する。
 * 日本語を原文（正）とし、英語・韓国語は、日本語と同じキーをすべて持つ型にする。
 * 訳の漏れは、型検査（tsc）で検出される。
 */
export type MessageTable<K extends string> = Record<Lang, Record<K, string>>;

export function defineMessages<K extends string>(table: MessageTable<K>): MessageTable<K> {
  return table;
}
