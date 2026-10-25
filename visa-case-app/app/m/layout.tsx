import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MobileShell } from "@/components/mobile/MobileShell";
import "./mobile.css";

// viewport は /m だけに設定する（PC 版の <head> を変えないため）。viewport-fit=cover で画面の端まで使い、
// ノッチ・ホームバー部分は mobile.css の env(safe-area-inset-*) で避ける。
// themeColor は OS の明暗に合わせる（globals.css の --background と同じ色。画面内の切り替えボタンには追随しない）。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1d1f" },
  ],
};

export const metadata: Metadata = {
  title: "在留資格案件管理",
};

/**
 * iPhone 版の layout。<html>・<body>・各種 Provider・AuthGate は、ルート（app/layout.tsx）のものを使う。
 * ルートの AppFrame が /m では PC 版の枠を出さないので、ここで iPhone 版の枠（MobileShell）を足す。
 */
export default function MobileLayout({ children }: { children: ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
