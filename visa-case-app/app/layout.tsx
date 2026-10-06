import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { AuthGate } from "@/components/AuthGate";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { StoreErrorBanner } from "@/components/StoreErrorBanner";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

// 予備の書体。Apple 端末はシステム書体が先に使われるため、これらは取得されない。
// preload を止め、実際に使われるときだけ取得する（Apple 端末では取得しない）。
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
});

// 書類のプレビュー（paper）でも使う。
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "在留資格案件管理",
  description: "行政書士向け 在留資格申請の案件管理（MVP-1 試作）",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" data-theme="light" suppressHydrationWarning className={`${inter.variable} ${notoSansJP.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
            <AuthGate>
              <StoreErrorBanner />
              <PageTransition>{children}</PageTransition>
            </AuthGate>
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
