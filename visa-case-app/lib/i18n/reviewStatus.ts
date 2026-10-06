import type { Lang } from "@/lib/documents/lang";
import type { Namespace } from "./messages";

/**
 * 訳文の確認状態。区分ごと・言語ごとに持つ。
 * draft：行政書士の確認前（AI が作成した下書き）、reviewed：行政書士の確認済み。
 * 確認が済んだら、該当の区分を reviewed に直す（日本語は原文のため、対象外）。
 */
export type ReviewState = "draft" | "reviewed";

export const REVIEW_STATUS: Record<Namespace, Record<Exclude<Lang, "ja">, ReviewState>> = {
  common: { en: "draft", ko: "draft" },
  header: { en: "draft", ko: "draft" },
  footer: { en: "draft", ko: "draft" },
  input: { en: "draft", ko: "draft" },
  dialog: { en: "draft", ko: "draft" },
  display: { en: "draft", ko: "draft" },
  labels: { en: "draft", ko: "draft" },
  documents: { en: "draft", ko: "draft" },
};

/** 指定の言語に、確認前（下書き）の区分が1つでもあるか */
export function hasDraft(lang: Lang): boolean {
  if (lang === "ja") return false;
  return Object.values(REVIEW_STATUS).some((s) => s[lang] !== "reviewed");
}

/** 確認前（下書き）の区分の一覧 */
export function draftNamespaces(lang: Lang): Namespace[] {
  if (lang === "ja") return [];
  return (Object.keys(REVIEW_STATUS) as Namespace[]).filter((ns) => REVIEW_STATUS[ns][lang] !== "reviewed");
}
