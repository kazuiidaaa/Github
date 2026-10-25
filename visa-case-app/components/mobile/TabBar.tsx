"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { activeTab, isMobileAuthPath, MOBILE_TABS, type MobileTabId } from "./paths";

/** 下部タブの高さ（safe-area を除く）。本文の下余白の計算にも使う（mobile.css の --m-tabbar-h と同じ値） */
export const TAB_BAR_HEIGHT = 49;

const LABELS: Record<MobileTabId, MessageKey> = {
  cases: "mobile.tabCases",
  account: "mobile.tabAccount",
};

/** 線画（未選択）と塗りつぶし（選択中）の SVG。形そのものが違うので、色が見えなくても選択が分かる */
function TabIcon({ id, filled }: { id: MobileTabId; filled: boolean }) {
  const common = { "aria-hidden": true, viewBox: "0 0 24 24", width: 26, height: 26, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (id === "cases") {
    return filled ? (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2.5 5a1 1 0 1 0 0 2h9a1 1 0 1 0 0-2h-9Zm0 4a1 1 0 1 0 0 2h9a1 1 0 1 0 0-2h-9Zm0 4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2h-5Z" />
      </svg>
    ) : (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
        <path d="M7.5 9h9M7.5 13h9M7.5 17h5" />
      </svg>
    );
  }
  return filled ? (
    <svg {...common} fill="currentColor" stroke="none">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 13.2a8 8 0 0 1-5.6-2.3c.6-2 3-3.1 5.6-3.1s5 1.1 5.6 3.1a8 8 0 0 1-5.6 2.3Z" />
    </svg>
  ) : (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9.8" r="3" />
      <path d="M6.6 18.2c.9-2 3-3 5.4-3s4.5 1 5.4 3" />
    </svg>
  );
}

/**
 * 画面下部に固定するタブバー（SwiftUI の TabView 相当）。案件・アカウントの 2 つ。新規登録はタブではなく操作なので、案件一覧のナビゲーションバー右の「+」に置く。
 * props なし。現在地は usePathname から決め、選択中は塗りつぶしアイコン・青文字・aria-current="page"。
 * 各タブは 44pt 以上、下端は safe-area-inset-bottom 分の余白を足す。
 */
export function TabBar() {
  const t = useT();
  const pathname = usePathname();
  const current = activeTab(pathname);
  // ログイン前の画面には、移動先（案件・アカウント）が無いのでタブを出さない
  if (isMobileAuthPath(pathname)) return null;
  return (
    <nav
      aria-label={t("mobile.tabBarAria")}
      className="m-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/85 backdrop-blur-xl backdrop-saturate-150 print:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {MOBILE_TABS.map((tab) => {
          const selected = current === tab.id;
          const label: ReactNode = t(LABELS[tab.id]);
          return (
            <li key={tab.id} className="flex-1">
              <Link
                href={tab.href}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-[49px] flex-col items-center justify-center gap-0.5 px-2 pb-1 pt-1.5 text-xs ${
                  selected ? "font-bold text-accent" : "font-medium text-slate-500"
                }`}
              >
                <TabIcon id={tab.id} filled={selected} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
