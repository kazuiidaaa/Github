import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_JP, Noto_Sans_KR } from "next/font/google";
import { AuthGate } from "@/components/AuthGate";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { PageTransition } from "@/components/PageTransition";
import { StoreErrorBanner } from "@/components/StoreErrorBanner";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

// 画面の書体は、全端末で Noto Sans JP・Noto Sans KR を先頭にする（Issue #283）。システム書体は、読み込めないときの予備。
// 可変フォント（太さ 100〜900）を使い、500・600・700 を 1 組の字形データで賄う。
// 日本語・韓国語は、文字の範囲ごとに分割（unicode-range）して配信されるため、画面に出る文字を含む分だけ取得される。
// subsets は指定しない（next/font の subsets 名は英数字などに限られ、指定すると日本語・韓国語の字形が含まれないため）。preload は止める。
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "在留資格案件管理",
  description: "行政書士向け 在留資格申請の案件管理（MVP-1 試作）",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" data-theme="light" suppressHydrationWarning className={`${notoSansJP.variable} ${notoSansKR.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <LanguageProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
            <AuthGate>
              <StoreErrorBanner />
              <PageTransition>{children}</PageTransition>
            </AuthGate>
          </main>
          <Footer />
          </LanguageProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
