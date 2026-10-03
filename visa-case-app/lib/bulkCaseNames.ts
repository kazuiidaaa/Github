// まとめて登録時の案件名を生成する。
// 入力のある行はその入力をそのまま使い、空欄の行は「グループ名（行番号）」とする。
// 行番号は、空欄かどうかに関わらず、画面上の行の並び順（1始まり）。
export function buildBulkCaseNames(groupName: string, rows: string[]): string[] {
  const group = groupName.trim();
  return rows.map((row, i) => {
    const name = row.trim();
    return name || `${group}（${i + 1}）`;
  });
}
