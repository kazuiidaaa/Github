import type { CardKey } from "@/lib/dashboardMetrics";
import { useT } from "./LanguageProvider";
import type { MessageKey } from "./messages";

type T = (key: MessageKey) => string;

/**
 * 指標カードの表示名・説明（言語別）。lib/dashboardMetrics.ts の label・description と、
 * 日本語の出力が一致する（試験で確認）。元の定義は変更しない。
 */
const KEYS: Record<CardKey, { label: MessageKey; description: MessageKey }> = {
  total: { label: "home.metric_total_label", description: "home.metric_total_desc" },
  review: { label: "home.metric_review_label", description: "home.metric_review_desc" },
  missingDocs: { label: "home.metric_missingDocs_label", description: "home.metric_missingDocs_desc" },
  unconfirmed: { label: "home.metric_unconfirmed_label", description: "home.metric_unconfirmed_desc" },
  checksPending: { label: "home.metric_checksPending_label", description: "home.metric_checksPending_desc" },
  ready: { label: "home.metric_ready_label", description: "home.metric_ready_desc" },
  within30: { label: "home.metric_within30_label", description: "home.metric_within30_desc" },
};

export const METRIC_KEYS = KEYS;

export function makeMetricText(t: T, key: CardKey): { label: string; description: string } {
  return { label: t(KEYS[key].label), description: t(KEYS[key].description) };
}

export function useMetricText() {
  const t = useT();
  return (key: CardKey) => makeMetricText(t, key);
}
