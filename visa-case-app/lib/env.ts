// 環境変数の検証。秘密情報の値そのものは、メッセージに含めない。
// NEXT_PUBLIC_ 変数はビルド時に埋め込まれるため、process.env.XXX と直接参照する必要がある。

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** 本番ビルド（next build / next start）かどうか */
export const isProduction = process.env.NODE_ENV === "production";

/** service_role など、ブラウザへ置いてはならない鍵かどうかを判定する */
function looksLikeSecretKey(value: string): boolean {
  if (value.startsWith("sb_secret_")) return true;
  const payload = value.split(".")[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json?.role === "service_role";
  } catch {
    return false;
  }
}

function collectIssues(): string[] {
  const issues: string[] = [];
  if (!url) issues.push("NEXT_PUBLIC_SUPABASE_URL が設定されていません。");
  if (!key) issues.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が設定されていません。");
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url) && isProduction) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL の形式が正しくありません（https://<プロジェクトID>.supabase.co）。");
  }
  if (key && looksLikeSecretKey(key)) {
    issues.push("秘密鍵（service_role）が設定されています。公開用キー（publishable / anon）のみを設定してください。");
  }
  return issues;
}

export const configIssues = collectIssues();

/** 秘密鍵の混入は、環境を問わず接続を禁止する */
export const hasSecretKey = Boolean(key && looksLikeSecretKey(key));

/**
 * 本番で設定に問題がある場合は、仮データ方式へ切り替えずに停止する。
 * （設定漏れのまま、保存されない状態で運用されることを防ぐ）
 */
export const isMisconfigured = (isProduction && configIssues.length > 0) || hasSecretKey;

export const supabaseUrl = url;
export const supabaseKey = key;
