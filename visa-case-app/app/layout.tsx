import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { AuthGate } from "@/components/AuthGate";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PageTransition } from "@/components/PageTransition";
import { StoreErrorBanner } from "@/components/StoreErrorBanner";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "在留資格案件管理",
  description: "行政書士向け 在留資格申請の案件管理（MVP-1 試作）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" data-theme="light" suppressHydrationWarning className={`${notoSansJP.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <AuthGate>
            <StoreErrorBanner />
            <PageTransition>{children}</PageTransition>
          </AuthGate>
        </main>
        <Footer />
      </body>
    </html>
  );
}
