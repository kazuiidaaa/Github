import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { StoreErrorBanner } from "@/components/StoreErrorBanner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "在留資格案件管理",
  description: "行政書士向け 在留資格申請の案件管理（MVP-1 試作）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <AuthGate>
            <StoreErrorBanner />
            {children}
          </AuthGate>
        </main>
      </body>
    </html>
  );
}
