import type { GeneratedDocument } from "./types";

/** 文書を、種類順・版の新しい順に並べる */
export function sortDocuments(list: GeneratedDocument[]): GeneratedDocument[] {
  return [...list].sort(
    (a, b) => a.documentType.localeCompare(b.documentType) || b.version - a.version,
  );
}

/**
 * 画面状態の一覧へ、生成・更新した版を反映する（id が同じ版は置き換え、なければ足す）。
 * 生成の途中で失敗しても、保存済みの版を画面へ反映するために、純関数として切り出している。
 */
export function mergeCreated(existing: GeneratedDocument[], created: GeneratedDocument[]): GeneratedDocument[] {
  const next = new Map(created.map((d) => [d.id, d]));
  const replaced = existing.map((d) => next.get(d.id) ?? d);
  const known = new Set(existing.map((d) => d.id));
  return sortDocuments([...replaced, ...created.filter((d) => !known.has(d.id))]);
}

/**
 * 更新の対象になる、確認前（draft）の最新の版を探す。
 * 同じ案件・同じ種類・同じ出力形式の中で、版番号が最大の確認前の版のみを対象にする。
 * 確認済み以降の版が最新であっても、それより前の確認前の版は対象にしない（古い版を書き換えないため）。
 */
export function findEditableDraft(
  list: GeneratedDocument[],
  caseId: string,
  documentType: GeneratedDocument["documentType"],
  outputFormat: GeneratedDocument["outputFormat"],
): GeneratedDocument | undefined {
  const same = list.filter((d) => d.caseId === caseId && d.documentType === documentType && d.outputFormat === outputFormat);
  const latest = same.reduce<GeneratedDocument | undefined>((m, d) => (!m || d.version > m.version ? d : m), undefined);
  return latest && latest.status === "draft" ? latest : undefined;
}
