import { describe, expect, it } from "vitest";
import {
  GROUP_NAME_MAX,
  groupCases,
  groupHeads,
  headingGroupId,
  orderRowsByGroup,
  groupNameError,
  normalizeRelation,
  sortCasesInGroup,
  withGroup,
} from "../lib/caseGroups";
import { buildNewCaseRecord, type NewCaseInput } from "../lib/newCaseSubmit";
import { EMPTY_EMPLOYMENT, type CaseGroup, type CaseRecord } from "../lib/types";

// 値はすべてダミー。
const c = (id: string, createdAt: string, groupId?: string, groupRelation?: CaseRecord["groupRelation"]): CaseRecord =>
  ({ id, caseName: `案件${id}`, createdAt, groupId, groupRelation }) as CaseRecord;
const g = (id: string, createdAt: string): CaseGroup => ({ id, name: `グループ${id}`, createdAt });

describe("normalizeRelation", () => {
  it("3つの値のみ受け付け、空・未知は未設定", () => {
    expect(normalizeRelation("primary")).toBe("primary");
    expect(normalizeRelation("companion")).toBe("companion");
    expect(normalizeRelation("other")).toBe("other");
    expect(normalizeRelation("")).toBeUndefined();
    expect(normalizeRelation("spouse")).toBeUndefined();
    expect(normalizeRelation(null)).toBeUndefined();
  });
});

describe("groupNameError", () => {
  it("空・空白のみは必須、101文字は長すぎ、100文字は可", () => {
    expect(groupNameError("")).toBe("required");
    expect(groupNameError("   ")).toBe("required");
    expect(groupNameError("あ".repeat(GROUP_NAME_MAX + 1))).toBe("tooLong");
    expect(groupNameError("あ".repeat(GROUP_NAME_MAX))).toBeNull();
  });
});

describe("sortCasesInGroup", () => {
  it("主たる申請人を先頭、同じ関係なら登録順（未設定は最後）", () => {
    const list = [
      c("1", "2026-01-01", "g", "companion"),
      c("2", "2026-01-02", "g"),
      c("3", "2026-01-05", "g", "primary"),
      c("4", "2026-01-03", "g", "primary"),
      c("5", "2026-01-04", "g", "other"),
      c("6", "2026-01-00", "g", "companion"),
    ];
    expect(sortCasesInGroup(list).map((x) => x.id)).toEqual(["4", "3", "6", "1", "5", "2"]);
  });

  it("主たる申請人は何人いてもよい。全員が主たる、全員が空欄でも登録順になる", () => {
    const allPrimary = [c("b", "2026-02-02", "g", "primary"), c("a", "2026-02-01", "g", "primary")];
    expect(sortCasesInGroup(allPrimary).map((x) => x.id)).toEqual(["a", "b"]);
    const allBlank = [c("b", "2026-02-02", "g"), c("a", "2026-02-01", "g")];
    expect(sortCasesInGroup(allBlank).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("元の配列を変更しない", () => {
    const list = [c("2", "2026-01-02"), c("1", "2026-01-01")];
    sortCasesInGroup(list);
    expect(list.map((x) => x.id)).toEqual(["2", "1"]);
  });
});

describe("groupCases", () => {
  const groups = [g("g2", "2026-03-02"), g("g1", "2026-03-01")];

  it("グループの作成順にまとめ、グループ外は元の並びのまま", () => {
    const cases = [
      c("x", "2026-01-01"),
      c("a", "2026-01-02", "g1", "companion"),
      c("b", "2026-01-03", "g1", "primary"),
      c("y", "2026-01-04"),
    ];
    const r = groupCases(cases, groups);
    expect(r.sections.map((s) => s.group.id)).toEqual(["g1", "g2"]);
    expect(r.sections[0].cases.map((x) => x.id)).toEqual(["b", "a"]);
    expect(r.sections[1].cases).toEqual([]);
    expect(r.ungrouped.map((x) => x.id)).toEqual(["x", "y"]);
  });

  it("空のグループは残す。絞り込み中（includeEmpty=false）は出さない", () => {
    expect(groupCases([], groups).sections).toHaveLength(2);
    expect(groupCases([], groups, false).sections).toHaveLength(0);
  });

  it("存在しないグループを指す案件は、グループ外として扱う", () => {
    const r = groupCases([c("z", "2026-01-01", "gone", "primary")], groups);
    expect(r.ungrouped.map((x) => x.id)).toEqual(["z"]);
  });
});

describe("withGroup", () => {
  it("入れる・移す（関係は省略なら今のまま）・外す（関係も消える）", () => {
    const base = c("1", "2026-01-01");
    const joined = withGroup(base, "g1", "primary");
    expect(joined.groupId).toBe("g1");
    expect(joined.groupRelation).toBe("primary");
    const moved = withGroup(joined, "g2");
    expect(moved.groupId).toBe("g2");
    expect(moved.groupRelation).toBe("primary");
    const cleared = withGroup(moved, "g2", "");
    expect(cleared.groupRelation).toBeUndefined();
    const out = withGroup(joined, "");
    expect(out.groupId).toBeUndefined();
    expect(out.groupRelation).toBeUndefined();
    expect(out.id).toBe("1");
  });
});

describe("orderRowsByGroup / groupHeads / headingGroupId（一覧の並び）", () => {
  const groups = [g("g1", "2026-03-01"), g("g2", "2026-03-02")];
  const row = (rec: CaseRecord) => ({ record: rec });

  it("グループは最初の案件の位置にまとめ、グループ内は主たる申請人が先頭。グループ外は元の位置のまま", () => {
    const rows = [
      row(c("x", "2026-01-01")),
      row(c("a", "2026-01-02", "g1", "companion")),
      row(c("y", "2026-01-03")),
      row(c("b", "2026-01-04", "g1", "primary")),
      row(c("z", "2026-01-05", "gone", "primary")),
    ];
    expect(orderRowsByGroup(rows, groups).map((r) => r.record.id)).toEqual(["x", "b", "a", "y", "z"]);
  });

  it("見出しは、前の行と別のグループに入った最初の行にだけ出す。件数は一覧に出る案件の数", () => {
    const rows = orderRowsByGroup(
      [row(c("a", "2026-01-02", "g1", "primary")), row(c("b", "2026-01-03", "g1")), row(c("x", "2026-01-01"))],
      groups,
    );
    const heads = groupHeads(rows, groups);
    expect(heads.get("g1")).toEqual({ name: "グループg1", count: 2 });
    expect(heads.get("g2")).toEqual({ name: "グループg2", count: 0 });
    expect(headingGroupId(undefined, rows[0].record, heads)).toBe("g1");
    expect(headingGroupId(rows[0].record, rows[1].record, heads)).toBeNull();
    expect(headingGroupId(rows[1].record, rows[2].record, heads)).toBeNull();
  });
});

describe("まとめて登録のグループ", () => {
  const input: NewCaseInput & { procedureType: "renewal" } = {
    bulk: true, caseName: "", procedureType: "renewal", currentStatus: "", targetStatus: "", memo: "", acceptedDate: "",
    employment: { ...EMPTY_EMPLOYMENT }, groupName: "グループ", names: ["", ""],
  };
  it("作成する案件をグループに入れる（関係は空欄）。グループがなければ従来どおり", () => {
    const withGroupId = buildNewCaseRecord(input, "A", "id1", "2026-01-01T00:00:00.000Z", "g-1");
    expect(withGroupId.groupId).toBe("g-1");
    expect(withGroupId.groupRelation).toBeUndefined();
    const plain = buildNewCaseRecord(input, "A", "id2", "2026-01-01T00:00:00.000Z");
    expect(plain).not.toHaveProperty("groupId");
  });
});
