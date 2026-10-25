/**
 * 一覧（Finder の一覧表示のような表）のキーボード移動。React に依存しない。
 * 上下の矢印で 1 行ずつ、Home / End で先頭・末尾へ。範囲の外へは出ない（端で止まる）。
 * current が -1（どの行も選んでいない）のとき、下は先頭、上は末尾へ入る。
 * 対象外のキーと、行がないときは null。
 */
export function nextRowIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowDown") return current < 0 ? 0 : Math.min(current + 1, count - 1);
  if (key === "ArrowUp") return current < 0 ? count - 1 : Math.max(current - 1, 0);
  return null;
}
