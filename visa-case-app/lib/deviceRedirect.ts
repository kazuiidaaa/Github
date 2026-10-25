// PC 版の画面から iPhone 版（/m）への自動の振り分け（Issue #456）。proxy.ts から使う純粋な関数と定数。
// 認証は判定しない（/m の画面は AuthGate の内側にあり、未ログインなら従来どおり /login へ移る）。

/** 「PC 版を開く」を選んだ印の Cookie 名。個人情報は入れない */
export const VIEW_COOKIE_NAME = "view";
/** PC 版を選んだことを表す値 */
export const VIEW_COOKIE_PC = "pc";
/**
 * 選択を覚える期間（1 年）。端末の表示の好みであり、秘密ではない。
 * 長すぎると、後で iPhone 版に戻したくなったときに気付けないため、1 年で自然に失効させる。
 */
export const VIEW_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** User-Agent として受け入れる最大の長さ。通常は 200 文字前後。これを超える値は偽装・異常として iPhone とみなさない */
const MAX_USER_AGENT_LENGTH = 512;

/**
 * PC 版の画面と、振り分け先の対応表（完全一致）。ここに無いパスは振り分けない。
 * /cases/[id] は下の動的ルール（CASE_DETAIL_PATH）で扱う。書類・/account・/login・/reset-password・/about・/api は、iPhone 版に対応画面が無い、または認証・API なので対象外。
 */
const REDIRECT_TABLE: Readonly<Record<string, string>> = {
  "/": "/m/cases",
  "/cases": "/m/cases",
  "/cases/new": "/m/cases/new",
};

/**
 * 案件詳細 `/cases/<id>` の形。id は英数字・ハイフン・アンダースコアのみ（1〜64 文字。実際の id は UUID）。
 * `/` や `.` を含めないので、/cases/<id>/edit などの下位パスや、パスをすり抜ける値は一致しない。
 * 予約語 `new` は対応表で別に扱うため、ここでは除く。
 */
const CASE_DETAIL_PATH = /^\/cases\/([A-Za-z0-9_-]{1,64})$/;

/** 案件詳細の id を取り出す。詳細でない・予約語（new）なら null */
function caseDetailId(normalizedPath: string): string | null {
  const m = CASE_DETAIL_PATH.exec(normalizedPath);
  return m && m[1] !== "new" ? m[1] : null;
}

/** iPhone の User-Agent か。"iPhone" を含むもののみ（iPad・PC・Android・UA 無しは false）。極端に長い値は偽装らしいので false */
export function isIphoneUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length > MAX_USER_AGENT_LENGTH) return false;
  if (!userAgent.includes("iPhone")) return false;
  return !userAgent.includes("Android");
}

/** 末尾のスラッシュを除いたパス（"/" はそのまま） */
function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** 振り分けの対象となる PC 版のパスか（Vary の付与など、proxy 側の判断にも使う） */
export function isRedirectablePath(pathname: string): boolean {
  const p = normalize(pathname);
  return Object.hasOwn(REDIRECT_TABLE, p) || caseDetailId(p) !== null;
}

/**
 * 振り分け先のパスを返す。振り分けない場合は null。
 * 返すのは対応表の固定値か、`/m/cases/` に検証済みの id（英数字・ハイフン・アンダースコアのみ）を足したパスのみ。
 * 行き先は常に同一オリジンの `/m/cases/…` で、オープンリダイレクトは起きない。
 * 照会文字列（?…）は引き継がない（PC 版の絞り込みと iPhone 版の絞り込みは別物のため）。
 */
export function decideDeviceRedirect(input: {
  method: string;
  pathname: string;
  userAgent: string | null | undefined;
  /** Cookie `view` の値（無ければ undefined） */
  viewCookie: string | undefined;
}): string | null {
  // 画面の取得（GET）と、その確認（HEAD）のみ。Server Function などの POST は触らない
  if (input.method !== "GET" && input.method !== "HEAD") return null;
  if (input.viewCookie === VIEW_COOKIE_PC) return null;
  if (!isIphoneUserAgent(input.userAgent)) return null;
  const p = normalize(input.pathname);
  if (Object.hasOwn(REDIRECT_TABLE, p)) return REDIRECT_TABLE[p];
  const id = caseDetailId(p);
  return id ? `/m/cases/${id}` : null;
}

/** 「PC 版を開く」を選んだときの Cookie 文字列（document.cookie 用）。secure は https のときのみ */
export function desktopViewCookie(secure: boolean): string {
  return `${VIEW_COOKIE_NAME}=${VIEW_COOKIE_PC}; path=/; max-age=${VIEW_COOKIE_MAX_AGE_SECONDS}; samesite=lax${secure ? "; secure" : ""}`;
}

/** 選択を消す Cookie 文字列（iPhone 版へ戻るとき）。作ったときと同じ path・属性で期限を過去にする */
export function clearViewCookie(secure: boolean): string {
  return `${VIEW_COOKIE_NAME}=; path=/; max-age=0; samesite=lax${secure ? "; secure" : ""}`;
}
