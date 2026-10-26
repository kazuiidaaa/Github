import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseRecord } from "../lib/types";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT } from "../lib/types";

// 値はすべてダミー。移行 0027（グループ）の未適用でも従来どおり動くこと、適用後に読み書きできることを検証する。
type Result = { data: unknown; error: { message?: string; code?: string } | null };
const state = vi.hoisted(() => ({
  groupsResult: { data: [], error: null } as Result,
  casesRows: [] as unknown[],
  upserts: [] as { table: string; row: Record<string, unknown> }[],
  inserts: [] as { table: string; row: Record<string, unknown> }[],
}));

vi.mock("../lib/supabase", () => ({
  usesSupabase: () => true,
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u-self", email: "x@example.test" } } }, error: null }) },
    from(table: string) {
      const result = (): Result => {
        if (table === "case_groups") return state.groupsResult;
        if (table === "members") return { data: [{ organization_id: "org-1" }], error: null };
        if (table === "cases") return { data: state.casesRows, error: null };
        return { data: [], error: null };
      };
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "order", "limit", "delete"]) b[m] = () => b;
      b.upsert = (row: Record<string, unknown>) => {
        state.upserts.push({ table, row });
        return b;
      };
      b.insert = (row: Record<string, unknown>) => {
        state.inserts.push({ table, row });
        return b;
      };
      b.then = (resolve: (r: Result) => unknown) => resolve(result());
      return b;
    },
  },
}));

async function fresh() {
  vi.resetModules();
  return import("../lib/supabaseBackend");
}

const record = (extra: Partial<CaseRecord> = {}): CaseRecord => ({
  id: "c-1",
  caseName: "案件1",
  procedureType: "renewal",
  currentStatus: "",
  targetStatus: "",
  memo: "",
  workflowStatus: "preparing",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  applicant: { ...EMPTY_APPLICANT },
  employment: { ...EMPTY_EMPLOYMENT },
  formDetails: { ...EMPTY_FORM_DETAILS },
  requirementStates: {},
  customRequirements: [],
  acceptedDate: "",
  plannedApplicationDate: "",
  checkMemo: "",
  checks: [],
  documents: [],
  ...extra,
});

const casesUpsert = () => state.upserts.find((u) => u.table === "cases")!.row;

beforeEach(() => {
  state.groupsResult = { data: [], error: null };
  state.casesRows = [];
  state.upserts = [];
  state.inserts = [];
});

describe("isMissingSchemaError", () => {
  it("表・列が無いエラーのみ true（権限・通信のエラーは false）", async () => {
    const b = await fresh();
    expect(b.isMissingSchemaError({ code: "42P01" })).toBe(true);
    expect(b.isMissingSchemaError({ code: "PGRST205" })).toBe(true);
    expect(b.isMissingSchemaError({ message: "Could not find the table 'public.case_groups' in the schema cache" })).toBe(true);
    expect(b.isMissingSchemaError({ code: "42501" })).toBe(false);
    expect(b.isMissingSchemaError({ code: "401", message: "JWT expired" })).toBe(false);
    expect(b.isMissingSchemaError(null)).toBe(false);
  });
});

describe("移行 0027 の未適用（表が無い）", () => {
  beforeEach(() => {
    state.groupsResult = { data: null, error: { code: "PGRST205", message: "Could not find the table" } };
  });

  it("loadGroups はエラーにせず、空で無効を返す", async () => {
    const b = await fresh();
    expect(await b.loadGroups()).toEqual({ available: false, groups: [] });
    expect(b.isGroupsAvailable()).toBe(false);
  });

  it("案件の保存に group_id / group_relation を含めない（列が無くても従来どおり保存できる）", async () => {
    const b = await fresh();
    await b.loadGroups();
    await b.persistCase(record());
    const row = casesUpsert();
    expect(row).not.toHaveProperty("group_id");
    expect(row).not.toHaveProperty("group_relation");
    expect(row.case_name).toBe("案件1");
  });

  it("グループの作成は拒否する（画面は無効のため通常は呼ばれない）", async () => {
    const b = await fresh();
    await b.loadGroups();
    await expect(b.createGroup({ id: "g-1", name: "グループ", createdAt: "2026-01-01T00:00:00.000Z" })).rejects.toThrow();
    expect(state.inserts).toHaveLength(0);
  });

  it("案件の読み込み（loadAll）は列が無くても成功し、グループなしとして扱う", async () => {
    state.casesRows = [
      { id: "c-1", case_name: "案件1", procedure_type: "renewal", workflow_status: "preparing", created_at: "t", updated_at: "t" },
    ];
    const b = await fresh();
    const all = await b.loadAll();
    expect(all[0].groupId).toBeUndefined();
    expect(all[0].groupRelation).toBeUndefined();
  });
});

describe("移行 0027 の適用後", () => {
  it("loadGroups は作成順のグループを返し、有効になる", async () => {
    state.groupsResult = { data: [{ id: "g-1", name: "グループ1", created_at: "2026-01-01T00:00:00Z" }], error: null };
    const b = await fresh();
    expect(await b.loadGroups()).toEqual({
      available: true,
      groups: [{ id: "g-1", name: "グループ1", createdAt: "2026-01-01T00:00:00Z" }],
    });
    expect(b.isGroupsAvailable()).toBe(true);
  });

  it("権限などの別のエラーは握りつぶさず失敗させる", async () => {
    state.groupsResult = { data: null, error: { code: "42501", message: "row-level security" } };
    const b = await fresh();
    await expect(b.loadGroups()).rejects.toThrow();
  });

  it("案件の保存に group_id / group_relation を含める。グループなしなら両方 null（外す操作が保存される）", async () => {
    const b = await fresh();
    await b.loadGroups();
    await b.persistCase(record({ groupId: "g-1", groupRelation: "companion" }));
    expect(casesUpsert()).toMatchObject({ group_id: "g-1", group_relation: "companion" });
    state.upserts = [];
    await b.persistCase(record({ groupRelation: "primary" }));
    expect(casesUpsert()).toMatchObject({ group_id: null, group_relation: null });
    state.upserts = [];
    await b.persistCase(record({ groupId: "g-1" }));
    expect(casesUpsert()).toMatchObject({ group_id: "g-1", group_relation: null });
  });

  it("loadAll は group_id / group_relation を読み取る（未知の関係は未設定、グループなしの関係は無視）", async () => {
    const base = { procedure_type: "renewal", workflow_status: "preparing", created_at: "t", updated_at: "t" };
    state.casesRows = [
      { id: "a", case_name: "A", group_id: "g-1", group_relation: "primary", ...base },
      { id: "b", case_name: "B", group_id: "g-1", group_relation: "spouse", ...base },
      { id: "c", case_name: "C", group_id: null, group_relation: "primary", ...base },
    ];
    const b = await fresh();
    const all = await b.loadAll();
    expect(all.map((x) => [x.groupId, x.groupRelation])).toEqual([
      ["g-1", "primary"],
      ["g-1", undefined],
      [undefined, undefined],
    ]);
  });

  it("createGroup は組織 ID を付けて追加する", async () => {
    const b = await fresh();
    await b.loadGroups();
    await b.createGroup({ id: "g-9", name: "新しいグループ", createdAt: "2026-02-01T00:00:00.000Z" });
    expect(state.inserts[0]).toEqual({
      table: "case_groups",
      row: { id: "g-9", organization_id: "org-1", name: "新しいグループ", created_at: "2026-02-01T00:00:00.000Z" },
    });
  });
});
