import type { NextConfig } from "next";

// 全ページへ付与するセキュリティヘッダー。
// script-src などの厳格な CSP は、Next.js のインライン処理と PDF プレビュー（iframe）への影響があるため、
// 現時点では、副作用のない指定（フレーム埋め込み禁止・base/form の制限）のみとする。
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 公式様式（Excel）の差し込み元テンプレートは、実行時に node:fs で読む。本番のファイル追跡に含める
  outputFileTracingIncludes: {
    "/api/documents/official-form": ["./docs/official/**/*.xlsx"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
