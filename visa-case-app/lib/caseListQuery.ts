import { DEFAULT_FILTER, isSortKey, type CaseFilter } from "./caseMetrics";
import type { CardKey } from "./dashboardMetrics";

/** 案件一覧の URL クエリの読み書きと、ダッシュボードのカードとの対応付け（React に依存しない。PC 版・iPhone 版で共通） */

/** URL のクエリから、絞り込み条件を読む */
export function readFilter(p: URLSearchParams): CaseFilter {
  return {
    query: p.get("q") ?? "",
    procedure: p.get("procedure") ?? "all",
    status: p.get("status") ?? "all",
    within30: p.get("within30") === "1",
    missingDocs: p.get("missing") === "1",
    noCard: p.get("nocard") === "1",
    unconfirmed: p.get("unconfirmed") === "1",
    checksPending: p.get("checks") === "1",
    sort: isSortKey(p.get("sort")) ? (p.get("sort") as CaseFilter["sort"]) : "updated",
  };
}

/** URL の page を読む。不正な値は 1 とする。 */
export function readPage(p: URLSearchParams): number {
  const n = Number(p.get("page"));
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** 絞り込み条件を URL のクエリ文字列にする（既定の値は書かない。何もなければ "?"） */
export function toQuery(f: CaseFilter): string {
  const p = new URLSearchParams();
  if (f.query) p.set("q", f.query);
  if (f.procedure !== "all") p.set("procedure", f.procedure);
  if (f.status !== "all") p.set("status", f.status);
  if (f.within30) p.set("within30", "1");
  if (f.missingDocs) p.set("missing", "1");
  if (f.noCard) p.set("nocard", "1");
  if (f.unconfirmed) p.set("unconfirmed", "1");
  if (f.checksPending) p.set("checks", "1");
  if (f.sort !== "updated") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "?";
}

/** 絞り込み条件とページ番号を、URL のクエリ文字列にする。1 ページ目には page を付けない。 */
export function toQueryWithPage(f: CaseFilter, page = 1): string {
  const q = toQuery(f);
  return page > 1 ? `${q === "?" ? "?" : `${q}&`}page=${page}` : q;
}

/** ダッシュボードのカードに対応する絞り込みを返す */
export function cardFilter(key: CardKey): CaseFilter {
  const f = { ...DEFAULT_FILTER };
  if (key === "review") f.status = "review_required";
  if (key === "checksPending") f.checksPending = true;
  if (key === "ready") f.status = "application_ready";
  if (key === "missingDocs") f.missingDocs = true;
  if (key === "unconfirmed") f.unconfirmed = true;
  if (key === "within30") {
    f.within30 = true;
    f.sort = "expiry";
  }
  return f;
}

const CARD_KEYS: CardKey[] = ["total", "review", "missingDocs", "unconfirmed", "checksPending", "ready", "within30"];

/** 今の絞り込みに対応するカード（なければ null） */
export function activeCard(f: CaseFilter): CardKey | null {
  return CARD_KEYS.find((k) => toQuery(cardFilter(k)) === toQuery(f)) ?? null;
}
