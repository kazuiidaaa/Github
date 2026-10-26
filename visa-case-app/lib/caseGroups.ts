import type { CaseGroup, CaseRecord, GroupRelation } from "./types";

// 案件のグループ（フォルダ）の、純粋な関数（画面・保存先に依存しない）。
// 関係（主たる申請人／帯同者／その他）は表示用の印のみ。判定・自動処理には使わない。

/** 選択肢の並び順（画面の選択肢・一覧の並び順の基準） */
export const GROUP_RELATIONS: readonly GroupRelation[] = ["primary", "companion", "other"];

/** グループ名の最大文字数（まとめて登録のグループ名と同じ。DB の制約とも一致） */
export const GROUP_NAME_MAX = 100;

export function isGroupRelation(v: unknown): v is GroupRelation {
  return v === "primary" || v === "companion" || v === "other";
}

/** 保存値を関係へ。空・未知の値は未設定（undefined） */
export function normalizeRelation(v: unknown): GroupRelation | undefined {
  return isGroupRelation(v) ? v : undefined;
}

/** グループ名の検証。誤りが無ければ null */
export function groupNameError(name: string): "required" | "tooLong" | null {
  const n = name.trim();
  if (!n) return "required";
  if (n.length > GROUP_NAME_MAX) return "tooLong";
  return null;
}

/** 並び順の重み。主たる申請人を先頭、続いて帯同者、その他、未設定 */
function relationRank(r: GroupRelation | undefined): number {
  const i = r ? GROUP_RELATIONS.indexOf(r) : -1;
  return i < 0 ? GROUP_RELATIONS.length : i;
}

/**
 * グループ内の並び。主たる申請人を先頭にし、同じ関係なら登録順（作成日時の昇順、同時刻は ID）。
 * 元の配列は変更しない。
 */
export function sortCasesInGroup(cases: readonly CaseRecord[]): CaseRecord[] {
  return [...cases].sort((a, b) => {
    const d = relationRank(a.groupRelation) - relationRank(b.groupRelation);
    if (d !== 0) return d;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface GroupSection {
  group: CaseGroup;
  cases: CaseRecord[];
}

export interface GroupedCases {
  /** グループごとのまとまり（グループの作成順） */
  sections: GroupSection[];
  /** グループに属さない案件（元の並びのまま）。存在しないグループを指す案件もここに入れる */
  ungrouped: CaseRecord[];
}

/**
 * 案件をグループごとにまとめる。
 * - グループ内は sortCasesInGroup の順。
 * - includeEmpty が false なら、案件のないグループは含めない（絞り込み中の一覧用）。
 */
export function groupCases(
  cases: readonly CaseRecord[],
  groups: readonly CaseGroup[],
  includeEmpty = true,
): GroupedCases {
  const byId = new Map(groups.map((g) => [g.id, [] as CaseRecord[]]));
  const ungrouped: CaseRecord[] = [];
  for (const c of cases) {
    const bucket = c.groupId ? byId.get(c.groupId) : undefined;
    if (bucket) bucket.push(c);
    else ungrouped.push(c);
  }
  const sections = [...groups]
    .sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1))
    .map((group) => ({ group, cases: sortCasesInGroup(byId.get(group.id) ?? []) }))
    .filter((s) => includeEmpty || s.cases.length > 0);
  return { sections, ungrouped };
}

/**
 * 案件のグループと関係を変えた新しい案件を返す。groupId が空ならグループから外す（関係も消す）。
 * relation を省略すると、関係は今のまま（移すとき）。案件の他の項目は変えない。
 */
export function withGroup(c: CaseRecord, groupId: string, relation?: GroupRelation | ""): CaseRecord {
  const next: CaseRecord = { ...c };
  if (!groupId) {
    delete next.groupId;
    delete next.groupRelation;
    return next;
  }
  next.groupId = groupId;
  if (relation === "") delete next.groupRelation;
  else if (relation !== undefined) next.groupRelation = relation;
  return next;
}
