"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { desktopViewCookie } from "@/lib/deviceRedirect";
import { useT } from "@/lib/i18n/LanguageProvider";
import { TabBar } from "./TabBar";

/**
 * iPhone 版（/m 配下）の外枠。app/m/layout.tsx から使う。
 * 本文（main）、末尾の注意書きと「PC 版を開く」、下部の TabBar を並べる。
 * AuthGate・ToastProvider・LanguageProvider は、ルートの layout（app/layout.tsx）が提供するので、ここでは重ねない。
 * 本文の下には、TabBar（49pt＋safe-area）に隠れない余白を取る。
 */
export function MobileShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="m-root flex min-h-dvh flex-1 flex-col">
      <a
        href="#main"
        onClick={(e) => {
          const main = document.getElementById("main");
          if (!main) return;
          e.preventDefault();
          main.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-accent-text"
      >
        {t("mobile.skipToMain")}
      </a>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <footer className="m-footer px-4 pt-6 text-center text-xs text-slate-600 print:hidden">
        <p>{t("footer.prototypeNotice")}</p>
        {/* 画面幅に関係なく PC 版へ移れる導線。押せる範囲は 44pt 以上 */}
        {/* 押すと「PC 版を選んだ」Cookie（view=pc）をセットし、以後は自動で /m へ振り分けない（proxy.ts）。
            prefetch={false} にして、先読みが振り分けの結果（/m/cases）を残さないようにする */}
        <Link
          href="/"
          prefetch={false}
          onClick={() => {
            try {
              document.cookie = desktopViewCookie(location.protocol === "https:");
            } catch {
              // Cookie が使えなくても、移動はそのまま行う
            }
          }}
          className="mt-1 inline-flex min-h-[44px] items-center font-bold text-accent underline-offset-2 hover:underline"
        >
          {t("mobile.openDesktop")}
        </Link>
      </footer>
      <TabBar />
    </div>
  );
}
