import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseRecord } from "../lib/types";

// 値はすべてダミー。lib/store.ts の refetch（再取得）の挙動を、Supabase 利用時の経路で検証する。
const remote = vi.hoisted(() => ({
  loadAll: vi.fn(),
  loadGroups: vi.fn(),
  getAccount: vi.fn(),
  persistCase: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({ usesSupabase: () => true }));
vi.mock("../lib/supabaseBackend", () => ({
  ...remote,
  addMember: vi.fn(),
  audit: vi.fn(),
  currentUserEmail: vi.fn(),
  deleteCase: vi.fn(),
  listAudit: vi.fn(),
  listMembers: vi.fn(),
  removeMember: vi.fn(),
  renameOrganization: vi.fn(),
  setMemberRole: vi.fn(),
  signedUrl: vi.fn(),
  uploadFile: vi.fn(),
}));

const rec = (id: string): CaseRecord => ({ id, caseName: `案件${id}`, updatedAt: "2026-10-01T00:00:00.000Z" }) as CaseRecord;

async function freshStore() {
  vi.resetModules();
  return import("../lib/store");
}

/** 取得を保留にし、好きなタイミングで結果を返せるようにする */
function holdLoad() {
  let release!: (v: CaseRecord[]) => void;
  remote.loadAll.mockReturnValue(new Promise<CaseRecord[]>((r) => (release = r)));
  return (v: CaseRecord[]) => release(v);
}

beforeEach(() => {
  remote.loadAll.mockReset().mockResolvedValue([rec("a")]);
  remote.loadGroups.mockReset().mockResolvedValue({ available: false, groups: [] });
  remote.getAccount.mockReset().mockResolvedValue({ role: "owner" });
  remote.persistCase.mockReset().mockResolvedValue(undefined);
  remote.reset.mockReset();
});

describe("refetch", () => {
  it("読み込み済みなら再取得（loadAll）を呼ぶ", async () => {
    const store = await freshStore();
    await store.ensureLoaded();
    expect(remote.loadAll).toHaveBeenCalledTimes(1);
    expect(await store.refetch()).toBe(true);
    expect(remote.loadAll).toHaveBeenCalledTimes(2);
  });

  it("未読み込みなら ensureLoaded と同じ（取得は 1 回だけ）", async () => {
    const store = await freshStore();
    expect(await store.refetch()).toBe(true);
    expect(remote.loadAll).toHaveBeenCalledTimes(1);
  });

  it("失敗したら false を返し、全体のエラー表示は変えず、次の再取得はできる", async () => {
    const store = await freshStore();
    await store.ensureLoaded();
    remote.loadAll.mockRejectedValue(new Error("network down"));
    expect(await store.refetch()).toBe(false);
    remote.loadAll.mockResolvedValue([rec("c")]);
    expect(await store.refetch()).toBe(true);
    expect(remote.loadAll).toHaveBeenCalledTimes(3);
  });

  it("実行中に呼んでも、再取得は 1 回だけ（二重実行しない）", async () => {
    const store = await freshStore();
    await store.ensureLoaded();
    const release = holdLoad();
    const p1 = store.refetch();
    const p2 = store.refetch();
    expect(p2).toBe(p1);
    await new Promise((r) => setTimeout(r, 0));
    release([rec("a")]);
    expect(await Promise.all([p1, p2])).toEqual([true, true]);
    expect(remote.loadAll).toHaveBeenCalledTimes(2);
  });

  it("取得中に保存があれば、古い結果で上書きしない", async () => {
    const store = await freshStore();
    await store.ensureLoaded();
    const release = holdLoad();
    const p = store.refetch();
    await new Promise((r) => setTimeout(r, 0));
    store.saveCase(rec("new"));
    release([rec("a")]); // 保存前の状態
    expect(await p).toBe(true);
    // 保存した案件が、次の（保存を含まない）取得結果を待たずに手元へ残っていること：再取得せずに権限・件数を確認する代わりに persist を見る
    expect(remote.persistCase).toHaveBeenCalledTimes(1);
    remote.loadAll.mockResolvedValue([rec("a"), rec("new")]);
    expect(await store.refetch()).toBe(true);
  });

  it("取得中にログアウト（resetStore）したら、結果を反映しない", async () => {
    const store = await freshStore();
    await store.ensureLoaded();
    const release = holdLoad();
    const p = store.refetch();
    await new Promise((r) => setTimeout(r, 0));
    store.resetStore();
    release([rec("a")]);
    expect(await p).toBe(true);
    expect(remote.reset).toHaveBeenCalled();
  });
});
