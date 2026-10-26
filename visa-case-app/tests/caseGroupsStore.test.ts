import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseRecord } from "../lib/types";

// 値はすべてダミー。ブラウザ内の仮データ方式（ローカル/デモ）で、グループを作る・案件を入れる・外す動きを検証する。
vi.mock("../lib/supabase", () => ({ usesSupabase: () => false }));

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

let mem: Map<string, string>;
beforeEach(() => {
  mem = stubStorage();
});

describe("ローカルのグループ", () => {
  it("グループを作ると保存され、再読み込み後も残る。案件を入れて外しても、案件は残る", async () => {
    mem.set("visa-case-app:cases:v1", JSON.stringify([rec("a")]));
    let store = await freshStore();
    await store.ensureLoaded();
    const g = store.createGroup("  サンプルグループ  ");
    expect(g?.name).toBe("サンプルグループ");
    store.updateCase("a", (c) => ({ ...c, groupId: g!.id, groupRelation: "primary" }));

    store = await freshStore();
    await store.ensureLoaded();
    const saved = JSON.parse(mem.get("visa-case-app:groups:v1")!);
    expect(saved).toHaveLength(1);
    const cases = JSON.parse(mem.get("visa-case-app:cases:v1")!) as CaseRecord[];
    expect(cases[0]).toMatchObject({ groupId: g!.id, groupRelation: "primary" });

    store.updateCase("a", (c) => {
      const next = { ...c };
      delete next.groupId;
      delete next.groupRelation;
      return next;
    });
    const after = JSON.parse(mem.get("visa-case-app:cases:v1")!) as CaseRecord[];
    expect(after).toHaveLength(1);
    expect(after[0].groupId).toBeUndefined();
    // 空になったグループは残る
    expect(JSON.parse(mem.get("visa-case-app:groups:v1")!)).toHaveLength(1);
  });

  it("グループ欄の無い、従来の保存データも読み込める", async () => {
    mem.set("visa-case-app:cases:v1", JSON.stringify([rec("a")]));
    const store = await freshStore();
    await store.ensureLoaded();
    expect(store.createGroup("g")).not.toBeNull();
  });
});
