import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decideDeviceRedirect, VIEW_COOKIE_NAME } from "@/lib/deviceRedirect";

// iPhone の User-Agent で PC 版の主要画面（/・/cases・/cases/new・/cases/[id]）を開いたとき、対応する /m の画面へ振り分ける。
// 認証はしない（リダイレクトのみ）。判定は lib/deviceRedirect.ts（純粋関数）に置く。
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const target = decideDeviceRedirect({
    method: request.method,
    pathname,
    userAgent: request.headers.get("user-agent"),
    viewCookie: request.cookies.get(VIEW_COOKIE_NAME)?.value,
  });
  if (target) {
    // 一時的な移動（307）。照会文字列は引き継がず、行き先は固定の対応表の値、または検証済みの id を足した /m/cases/[id] のみ
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    const res = NextResponse.redirect(url, 307);
    // 端末・選択で結果が変わるので、共有キャッシュに覚えさせない
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Vary", "User-Agent, Cookie");
    return res;
  }
  return NextResponse.next();
}

// /m 配下・/_next・静的ファイル・/api・favicon は、そもそも対象に入れない（無限ループの防止）。
// 対象の 4 パターンだけを列挙し（/cases/:id は 1 階層のみ）、さらに decideDeviceRedirect が対応表の完全一致と id の形の検証でのみ動く（二重の防止）。
export const config = {
  matcher: ["/", "/cases", "/cases/new", "/cases/:id"],
};
