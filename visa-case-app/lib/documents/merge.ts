import type { GeneratedDocument } from "./types";

/** 文書を、種類順・版の新しい順に並べる */
export function sortDocuments(list: GeneratedDocument[]): GeneratedDocument[] {
  return [...list].sort(
    (a, b) => a.documentType.localeCompare(b.documentType) || b.version - a.version,
  );
}

/**
 * 画面状態の一覧へ、新しく作った版を足す（id が重複するものは足さない）。
 * 生成の途中で失敗しても、保存済みの版を画面へ反映するために、純関数として切り出している。
 */
export function mergeCreated(existing: GeneratedDocument[], created: GeneratedDocument[]): GeneratedDocument[] {
  const known = new Set(existing.map((d) => d.id));
  return sortDocuments([...existing, ...created.filter((d) => !known.has(d.id))]);
}
