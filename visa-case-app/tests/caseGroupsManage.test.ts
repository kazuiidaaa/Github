import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseRecord } from "../lib/types";

// 値はすべてダミー。グループの名前変更・削除・作成の監査記録を、仮データ方式と Supabase 方式（保存先は模擬）で検証する。
const mode = vi.hoisted(() => ({ supabase: false, failDelete: false }));
const calls = vi.hoisted(() => ({ log: [] as string[], audits: [] as unknown[][] }));
vi.mock("../lib/supabase", () => ({ usesSupabase: () => mode.supabase }));
vi.mock("../lib/supabaseBackend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/supabaseBackend")>()),
  loadAll: async () => [
    { id: "a", caseName: "案件a", groupId: "g-1", groupRelation: "primary", createdAt: "t", updatedAt: "t" },
    { id: "b", caseName: "案件b", createdAt: "t", updatedAt: "t" },
  ],
  loadGroups: async () => ({ available: true, groups: [{ id: "g-1", name: "元の名前", createdAt: "t" }] }),
  getAccount: async () => ({ role: "owner" }),
  createGroup: async (g: { id: string }) => void calls.log.push(`create:${g.id}`),
  renameGroup: async (id: string, name: string) => void calls.log.push(`rename:${id}:${name}`),
  deleteGroup: async (id: string) => {
    if (mode.failDelete) throw new Error("denied");
    calls.log.push(`delete:${id}`);
  },
  audit: async (...a: unknown[]) => void calls.audits.push(a),
  persistCase: async () => {},
}));

function stubStorage() {
  const mem = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  return mem;
}

async function freshStore() {
  vi.resetModules();
  return import("../lib/store");
}

const rec = (id: string): CaseRecord =>
  ({
    id,
    caseName: `案件${id}`,
    workflowStatus: "preparing",
    applicant: {},
    employment: {},
    documents: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }) as unknown as CaseRecord;

beforeEach(() => {
  mode.supabase = false;
  mode.failDelete = false;
  calls.log = [];
  calls.audits = [];
});

describe("仮データ方式のグループの名前変更・削除", () => {
  it("名前を変えて保存する。空の名前は拒否する", async () => {
    const mem = stubStorage();
    const store = await freshStore();
    await store.ensureLoaded();
    const g = store.createGroup("元の名前")!;
    expect(await store.renameGroup(g.id, "  新しい名前 ")).toBe(true);
    expect(JSON.parse(mem.get("visa-case-app:groups:v1")!)[0].name).toBe("新しい名前");
    expect(await store.renameGroup(g.id, "   ")).toBe(false);
  });

  it("削除しても案件は消えず、グループと関係の印だけが外れる。空のグループは自動では消えない", async () => {
    const mem = stubStorage();
    mem.set("visa-case-app:cases:v1", JSON.stringify([rec("a"), rec("b")]));
    const store = await freshStore();
    await store.ensureLoaded();
    const g1 = store.createGroup("グループ1")!;
    const g2 = store.createGroup("空のグループ")!;
    store.updateCase("a", (c) => ({ ...c, groupId: g1.id, groupRelation: "primary" }));
    store.updateCase("b", (c) => ({ ...c, groupId: g1.id, groupRelation: "companion" }));
    store.updateCase("b", (c) => ({ ...c, groupId: undefined, groupRelation: undefined }));
    expect(JSON.parse(mem.get("visa-case-app:groups:v1")!)).toHaveLength(2);

    expect(await store.deleteGroup(g1.id)).toBe(true);
    const cases = JSON.parse(mem.get("visa-case-app:cases:v1")!) as CaseRecord[];
    expect(cases).toHaveLength(2);
    expect(cases.find((c) => c.id === "a")).not.toHaveProperty("groupId");
    expect(cases.find((c) => c.id === "a")).not.toHaveProperty("groupRelation");
    const left = JSON.parse(mem.get("visa-case-app:groups:v1")!) as { id: string }[];
    expect(left.map((g) => g.id)).toEqual([g2.id]);
  });

  it("存在しないグループは何もしない", async () => {
    stubStorage();
    const store = await freshStore();
    await store.ensureLoaded();
    expect(await store.deleteGroup("none")).toBe(false);
    expect(await store.renameGroup("none", "x")).toBe(false);
  });
});

describe("Supabase 方式の監査記録", () => {
  beforeEach(() => {
    mode.supabase = true;
    stubStorage();
  });

  it("作成・名前変更・削除を監査ログに残す。グループ名は残さず、ID のみ", async () => {
    const store = await freshStore();
    await store.ensureLoaded();
    const g = store.createGroup("秘密にしたい名前")!;
    await store.settleWrites();
    expect(await store.renameGroup("g-1", "別の秘密の名前")).toBe(true);
    expect(await store.deleteGroup("g-1")).toBe(true);
    expect(calls.audits.map((a) => [a[0], a[1], a[2]])).toEqual([
      [null, "group_created", { groupId: g.id }],
      [null, "group_renamed", { groupId: "g-1" }],
      [null, "group_deleted", { groupId: "g-1" }],
    ]);
    expect(JSON.stringify(calls.audits)).not.toContain("秘密");
    expect(calls.log).toEqual([`create:${g.id}`, "rename:g-1:別の秘密の名前", "delete:g-1"]);
  });

  it("削除に失敗したら、グループも案件の所属も変えず、監査ログも残さない", async () => {
    mode.failDelete = true;
    const store = await freshStore();
    await store.ensureLoaded();
    expect(await store.deleteGroup("g-1")).toBe(false);
    expect(calls.audits).toHaveLength(0);
  });
});
