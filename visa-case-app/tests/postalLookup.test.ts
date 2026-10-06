import { describe, expect, it, vi } from "vitest";
import { lookupPostalCode } from "../lib/postalLookup";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const deps = (fetchImpl: typeof fetch) => ({ fetchImpl, getAuthHeaders: async () => ({ Authorization: "Bearer dummy" }) });

describe("画面側の郵便番号の検索", () => {
  it("郵便番号のみを送る", async () => {
    const fetchImpl = vi.fn(async () => json({ status: "found", address: "東京都千代田区千代田" }));
    expect(await lookupPostalCode("1008924", deps(fetchImpl as unknown as typeof fetch))).toEqual({ status: "found", address: "東京都千代田区千代田" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/postal-code");
    expect(JSON.parse(init.body as string)).toEqual({ zip: "1008924" });
  });
  it("該当なし・未設定は、そのまま返す", async () => {
    expect(await lookupPostalCode("1008924", deps((async () => json({ status: "notFound" })) as unknown as typeof fetch))).toEqual({ status: "notFound" });
    expect(await lookupPostalCode("1008924", deps((async () => json({ status: "unconfigured" })) as unknown as typeof fetch))).toEqual({ status: "unconfigured" });
  });
  it("通信の失敗・エラー応答・想定外の応答は unavailable", async () => {
    expect(await lookupPostalCode("1008924", deps((async () => { throw new Error("offline"); }) as unknown as typeof fetch))).toEqual({ status: "unavailable" });
    expect(await lookupPostalCode("1008924", deps((async () => json({ error: "x" }, 401)) as unknown as typeof fetch))).toEqual({ status: "unavailable" });
    expect(await lookupPostalCode("1008924", deps((async () => json({ status: "found" })) as unknown as typeof fetch))).toEqual({ status: "unavailable" });
    expect(await lookupPostalCode("1008924", deps((async () => new Response("<html>")) as unknown as typeof fetch))).toEqual({ status: "unavailable" });
  });
});
