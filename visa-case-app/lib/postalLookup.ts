// 画面側から、郵便番号の検索 API（app/api/postal-code）を呼ぶ。送るのは郵便番号のみ。

export type PostalLookupResult =
  | { status: "found"; address: string }
  | { status: "notFound" }
  | { status: "unconfigured" }
  | { status: "unavailable" };

export type PostalLookupDeps = {
  fetchImpl?: typeof fetch;
  /** 認証ヘッダー。省略時は、ログイン中の Supabase のセッションから作る */
  getAuthHeaders?: () => Promise<Record<string, string>>;
};

async function defaultAuthHeaders(): Promise<Record<string, string>> {
  const { supabase, usesSupabase } = await import("./supabase");
  if (usesSupabase() && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return { Authorization: `Bearer ${data.session.access_token}` };
  }
  return {};
}

/** zip は、7桁の数字。通信の失敗・想定外の応答は、すべて unavailable として返す（例外を投げない） */
export async function lookupPostalCode(zip: string, deps: PostalLookupDeps = {}): Promise<PostalLookupResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const auth = await (deps.getAuthHeaders ?? defaultAuthHeaders)();
    const res = await fetchImpl("/api/postal-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ zip }),
    });
    if (!res.ok) return { status: "unavailable" };
    const body = (await res.json()) as { status?: unknown; address?: unknown };
    if (body.status === "found" && typeof body.address === "string" && body.address !== "") return { status: "found", address: body.address };
    if (body.status === "notFound" || body.status === "unconfigured") return { status: body.status };
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
