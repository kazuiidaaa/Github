import type { GeneratedDocument } from "./types";

/** 生成履歴を、通常の版と保管（archived）の版に分ける。並び順は保つ。削除はしない */
export function splitHistory(documents: GeneratedDocument[]): {
  active: GeneratedDocument[];
  archived: GeneratedDocument[];
} {
  return {
    active: documents.filter((d) => d.status !== "archived"),
    archived: documents.filter((d) => d.status === "archived"),
  };
}
