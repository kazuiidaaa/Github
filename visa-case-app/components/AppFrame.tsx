"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PcSidebar } from "@/components/PcSidebar";
import { PcToolbar } from "@/components/PcToolbar";
import { PageTransition } from "@/components/PageTransition";
import { StoreErrorBanner } from "@/components/StoreErrorBanner";
import { isMobilePath } from "@/components/mobile/paths";

/**
 * 画面の外枠（PC 版はサイドバー・ツールバー・本文の幅・フッター）を、パスで出し分ける。
 * PC 版（/m 以外）は、幅 md（768px）以上で、Finder のように左にサイドバー・上にツールバー・右に内容（Issue #456 PR2、docs/pc-mac-ui.md）。
 * md 未満は従来のヘッダー。
 *
 * iPhone 版は /m 配下に置く（案 A）。PC 側のファイルを route group（(pc)/ など）へ移すと、
 * 差分が大きく PC 版への影響を確かめにくいため、ルートの layout は 1 つのまま、この小さな client コンポーネントで
 * 枠だけを切り替える。/m 以外では、従来と同じ要素を同じ順序で出す（PC 版の出力は変わらない）。
 * /m では、PC 版のヘッダー・フッター・max-w-6xl の本文を出さず、app/m/layout.tsx の枠（下部タブなど）に任せる。
 * 認証（AuthGate）とエラー表示は、どちらでも同じものを通す。
 *
 * 備考：ルートの layout は画面遷移で再描画されないが、usePathname を読む client コンポーネントは遷移に追随する。
 * サーバー側の描画でも pathname は確定しているので、初回表示で枠がちらつくことはない。
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isMobilePath(pathname)) {
    return (
      // 認証の案内画面（設定停止・確認失敗）は max-w-lg の箱なので、画面端に付かないよう余白を足す
      <div className="flex min-h-full flex-1 flex-col [&>[role=alert]]:m-4">
        <AuthGate>
          <StoreErrorBanner />
          {children}
        </AuthGate>
      </div>
    );
  }
  return (
    <>
      {/* 幅 md 未満は従来のヘッダー（メニュー）。md 以上は、Header 自身が隠れ、左のサイドバー＋上のツールバーに替わる */}
      <Header />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <PcSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PcToolbar />
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 md:py-8">
            <AuthGate>
              <StoreErrorBanner />
              <PageTransition>{children}</PageTransition>
            </AuthGate>
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
}
