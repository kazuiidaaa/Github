import type { Metadata } from "next";
import { AboutContent } from "./AboutContent";

// 題名（metadata）はサーバー側で決まるため、日本語のまま（docs/ui-language.md の既知の限界）
export const metadata: Metadata = { title: "ご利用にあたって｜在留資格案件管理" };

export default function AboutPage() {
  return <AboutContent />;
}
