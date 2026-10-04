// 公式様式の生成 API（app/api/documents/official-form）の入口で使う、サイズ検査とレート制限。

/** 本文の上限（バイト） */
export const MAX_BODY_BYTES = 1_000_000;

/** Content-Length が上限を超えているか。ヘッダーが無い、または数値でない場合は false（読込後に再検査する） */
export function isDeclaredTooLarge(header: string | null, max = MAX_BODY_BYTES): boolean {
  if (!header || !/^\d+$/.test(header.trim())) return false;
  return Number(header) > max;
}

/** 文字列の UTF-8 バイト数（日本語は、1文字あたり3バイト程度） */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export type RateLimiter = (key: string, now?: number) => RateLimitResult;

/**
 * 固定窓のレート制限（プロセス内メモリ）。
 * サーバーレス環境では、実行単位ごとに集計が分かれるため、厳密な上限ではなく、過大な負荷の抑止を目的とする。
 */
export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (key, now = Date.now()) => {
    if (buckets.size > 1000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true };
    }
    if (bucket.count >= limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    bucket.count++;
    return { ok: true };
  };
}

/** 呼び出し元の識別。ログイン済みはユーザー ID、それ以外は IP（プロキシ経由の先頭） */
export function clientKey(userId: string | null, headers: Headers): string {
  if (userId) return `user:${userId}`;
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}
