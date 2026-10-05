import type { Summary } from "./caseMetrics";

export type CardKey = "total" | "review" | "missingDocs" | "unconfirmed" | "checksPending" | "ready" | "within30";

export interface MetricDefinition {
  key: CardKey;
  /** カードの表示名 */
  label: string;
  /** 何を数えるかの1行説明 */
  description: string;
  /** 件数を取り出す `Summary` の項目 */
  field: keyof Summary;
  /** ホームのカードの移動先（案件一覧の対応する絞り込み） */
  href: string;
}

/**
 * ホームと案件一覧の指標カードの定義（表示名・順序・説明・移動先）。
 * 件数の集計は `summarize`、案件一覧での絞り込みは `cardFilter` が担う。
 */
export const METRICS: readonly MetricDefinition[] = [
  { key: "total", label: "案件総数", description: "登録されているすべての案件の数です。", field: "total", href: "/cases" },
  {
    key: "review",
    label: "確認待ち",
    description: "状態が「要確認」で、行政書士の確認を待つ案件です。",
    field: "review",
    href: "/cases?status=review_required",
  },
  {
    key: "missingDocs",
    label: "書類待ち",
    description: "必要書類の規則に照らして、未受領の書類がある案件です。",
    field: "missingDocs",
    href: "/cases?missing=1",
  },
  {
    key: "unconfirmed",
    label: "確認未了",
    description: "申請人情報が確認済みでない案件です。「確認待ち」とは別の数え方です。",
    field: "unconfirmed",
    href: "/cases?unconfirmed=1",
  },
  {
    key: "checksPending",
    label: "申請前チェック待ち",
    description: "申請前チェックが未実施、または未解決の項目が残る案件です。",
    field: "checksPending",
    href: "/cases?checks=1",
  },
  {
    key: "ready",
    label: "申請準備完了",
    description: "状態が「申請準備完了」の案件です。",
    field: "ready",
    href: "/cases?status=application_ready",
  },
  {
    key: "within30",
    label: "期限30日以内",
    description: "在留期限まで30日以内の案件です。期限を過ぎた案件も含みます。",
    field: "within30",
    href: "/cases?within30=1&sort=expiry",
  },
];

/** ホームに表示する指標（「案件総数」は表示しない） */
export const HOME_METRIC_KEYS: readonly CardKey[] = ["review", "missingDocs", "unconfirmed", "checksPending", "ready", "within30"];

export function metricsFor(keys?: readonly CardKey[]): MetricDefinition[] {
  return keys ? METRICS.filter((m) => keys.includes(m.key)) : [...METRICS];
}
