import { beforeEach, describe, expect, it, vi } from "vitest";

// 値はすべてダミー。list_members の戻り値(氏名の有無)のマッピングを検証する。
const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
vi.mock("../lib/supabase", () => ({
  usesSupabase: () => true,
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: "u-self" } } }, error: null })) },
    from,
    rpc,
  },
}));

function mockOrg() {
  from.mockReturnValue({
    select: () => ({ eq: () => ({ limit: async () => ({ data: [{ organization_id: "org-1" }], error: null }) }) }),
  });
}

async function fresh() {
  vi.resetModules();
  return import("../lib/supabaseBackend");
}

describe("listMembers の氏名(displayName)", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    mockOrg();
  });

  it("display_name がある場合、displayName に入る", async () => {
    rpc.mockResolvedValue({
      data: [{ user_id: "u1", email: "a@example.test", role: "staff", created_at: "2026-10-01T00:00:00Z", display_name: "テスト 太郎" }],
      error: null,
    });
    const { listMembers } = await fresh();
    const list = await listMembers();
    expect(list[0]).toEqual({
      userId: "u1",
      email: "a@example.test",
      role: "staff",
      createdAt: "2026-10-01T00:00:00Z",
      displayName: "テスト 太郎",
    });
  });

  it("列が無い(移行の適用前)場合、displayName は undefined で、他の項目は従来どおり", async () => {
    rpc.mockResolvedValue({
      data: [{ user_id: "u1", email: "a@example.test", role: "owner", created_at: "2026-10-01T00:00:00Z" }],
      error: null,
    });
    const { listMembers } = await fresh();
    const list = await listMembers();
    expect(list[0].displayName).toBeUndefined();
    expect(list[0]).toMatchObject({ userId: "u1", email: "a@example.test", role: "owner" });
  });

  it("null・空文字・空白のみは undefined として扱う", async () => {
    const { mapMemberRow } = await fresh();
    const base = { user_id: "u", email: "b@example.test", role: "viewer", created_at: "2026-10-01T00:00:00Z" };
    expect(mapMemberRow({ ...base, display_name: null }).displayName).toBeUndefined();
    expect(mapMemberRow({ ...base, display_name: "" }).displayName).toBeUndefined();
    expect(mapMemberRow({ ...base, display_name: "  " }).displayName).toBeUndefined();
  });

  it("データが空(null)でも空配列を返す", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const { listMembers } = await fresh();
    expect(await listMembers()).toEqual([]);
  });
});
