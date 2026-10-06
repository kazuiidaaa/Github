// 日本郵便「郵便番号・デジタルアドレスAPI」（v2）の呼び出し（サーバー側のみ）。
// 送信するのは郵便番号のみ。認証情報と URL は、環境変数から読む（値はコードに書かない）。

export type JapanPostConfig = { baseUrl: string; clientId: string; secretKey: string };

export type AddressLookup =
  | { status: "found"; address: string }
  | { status: "notFound" }
  | { status: "unconfigured" }
  | { status: "unavailable" };

/** 環境変数の読み取り。1つでも欠ける、または URL が https でない場合は null（自動入力を使わない） */
export function readJapanPostConfig(env: Record<string, string | undefined> = process.env): JapanPostConfig | null {
  const baseUrl = env.JAPANPOST_API_BASE_URL?.trim();
  const clientId = env.JAPANPOST_CLIENT_ID?.trim();
  const secretKey = env.JAPANPOST_SECRET_KEY?.trim();
  if (!baseUrl || !clientId || !secretKey) return null;
  try {
    const u = new URL(baseUrl);
    if (u.protocol !== "https:") return null;
    return { baseUrl: baseUrl.replace(/\/+$/, ""), clientId, secretKey };
  } catch {
    return null;
  }
}

/** 日本郵便へ送る User-Agent（必須ヘッダー）。値は、利用者の確認事項 */
export const JAPANPOST_USER_AGENT = "visa-case-app";
const TIMEOUT_MS = 8000;
// 期限の直前に失効しないよう、余裕を持って再取得する
const TOKEN_MARGIN_MS = 60_000;
// 「以下に掲載がない場合」は、郵便番号データの町域に入る定型の語で、住所ではない
const NO_TOWN = "以下に掲載がない場合";

type Entry = { pref_name?: unknown; city_name?: unknown; town_name?: unknown };

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * 応答の候補から、住所の前半（都道府県・市区町村・町域）を作る。
 * 候補が複数ある場合は、全候補で一致する部分までを使う（食い違う項目から先は入れない）。
 */
export function buildAddress(body: unknown): string | null {
  const list = (body as { addresses?: unknown } | null)?.addresses;
  if (!Array.isArray(list) || list.length === 0) return null;
  const entries = list.filter((e): e is Entry => typeof e === "object" && e !== null);
  if (entries.length === 0) return null;
  let address = "";
  for (const key of ["pref_name", "city_name", "town_name"] as const) {
    const values = new Set(entries.map((e) => (str(e[key]) === NO_TOWN ? "" : str(e[key]))));
    if (values.size !== 1) break;
    address += [...values][0];
  }
  return address === "" ? null : address;
}

export type JapanPostDeps = {
  fetchImpl?: typeof fetch;
  now?: () => number;
};

/** トークンを期限まで再利用するクライアント。インスタンスごとにトークンを保持する */
export function createJapanPostClient(config: JapanPostConfig, deps: JapanPostDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  let cached: { token: string; expiresAt: number } | null = null;

  async function getToken(clientIp: string): Promise<string | null> {
    if (cached && cached.expiresAt > now()) return cached.token;
    cached = null;
    const res = await fetchImpl(`${config.baseUrl}/api/v2/j/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": clientIp, "User-Agent": JAPANPOST_USER_AGENT },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: config.clientId, secret_key: config.secretKey }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: unknown; expires_in?: unknown };
    if (typeof body.token !== "string" || body.token === "") return null;
    const sec = typeof body.expires_in === "number" && Number.isFinite(body.expires_in) ? body.expires_in : 0;
    cached = { token: body.token, expiresAt: now() + sec * 1000 - TOKEN_MARGIN_MS };
    return body.token;
  }

  /** zip は、7桁の数字（呼び出し側で検証済み）。clientIp は、接続元 IP（x-forwarded-for に使う） */
  async function search(zip: string, clientIp: string, retried = false): Promise<AddressLookup> {
    try {
      const token = await getToken(clientIp);
      if (!token) return { status: "unavailable" };
      const res = await fetchImpl(`${config.baseUrl}/api/v2/searchcode/${zip}?choikitype=1&searchtype=2`, {
        headers: { Authorization: `Bearer ${token}`, "x-forwarded-for": clientIp, "User-Agent": JAPANPOST_USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 401 && !retried) {
        cached = null; // 期限前に失効した場合は、1回だけ取り直す
        return search(zip, clientIp, true);
      }
      if (res.status === 404) return { status: "notFound" };
      if (!res.ok) return { status: "unavailable" };
      const address = buildAddress(await res.json());
      return address ? { status: "found", address } : { status: "notFound" };
    } catch {
      // 内容（郵便番号・認証情報）は、ログに残さない
      return { status: "unavailable" };
    }
  }

  return { search };
}

let shared: { config: JapanPostConfig; client: ReturnType<typeof createJapanPostClient> } | null = null;

/** ルートから使う。設定が無ければ unconfigured。同じ設定の間は、同じクライアント（トークン）を使う */
export function lookupAddress(zip: string, clientIp: string, env: Record<string, string | undefined> = process.env): Promise<AddressLookup> {
  const config = readJapanPostConfig(env);
  if (!config) return Promise.resolve({ status: "unconfigured" });
  if (!shared || shared.config.baseUrl !== config.baseUrl || shared.config.clientId !== config.clientId || shared.config.secretKey !== config.secretKey) {
    shared = { config, client: createJapanPostClient(config) };
  }
  return shared.client.search(zip, clientIp);
}
