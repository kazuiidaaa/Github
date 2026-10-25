"use client";

import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { exitDemo, signOut, useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";

/**
 * アカウント（iPhone 版・暫定の最小版）。既存の仕組みだけを使い、認証の経路は新設しない。
 * - ログイン中のユーザー（useSession）とログアウト（signOut。移動は AuthGate が /login へ行う）
 * - デモ中はデモの終了（exitDemo）、仮データ方式では注意書き
 * - 言語・明暗の切り替え（PC 版と同じ LanguageSwitcher / ThemeToggle。押せる範囲だけ 44pt 以上にする）
 * パスワード変更・メンバー管理などは PC 版の /account へ移る（/account は端末の振り分けの対象外）。
 */
export default function MobileAccountPage() {
  const t = useT();
  const router = useRouter();
  const session = useSession();
  const demo = useDemo();
  const supabase = isSupabaseEnabled && !demo;

  return (
    <>
      <LargeTitleHeader title={t("mobile.tabAccount")} />

      <GroupedList header={t("mobile.accountSectionUser")}>
        {demo ? (
          <GroupedRow title={t("header.demoLong")} />
        ) : !isSupabaseEnabled ? (
          <GroupedRow title={t("header.prototypeLong")} />
        ) : (
          <GroupedRow label={t("mobile.accountSignedInAs")} value={session?.user.email ?? ""} />
        )}
        {demo && (
          <GroupedRow
            title={<span className="font-bold text-accent">{t("header.exitDemo")}</span>}
            onClick={() => {
              exitDemo();
              router.replace("/login");
            }}
            chevron={false}
          />
        )}
        {supabase && session && (
          <GroupedRow title={<span className="font-bold text-danger-text">{t("header.logout")}</span>} onClick={() => void signOut()} chevron={false} />
        )}
      </GroupedList>

      <GroupedList header={t("mobile.accountSectionDisplay")}>
        <GroupedRow
          label={t("common.languageLabel")}
          value={
            <span className="[&_select]:min-h-[44px] [&_select]:text-base">
              <LanguageSwitcher />
            </span>
          }
        />
        <GroupedRow
          label={t("mobile.accountAppearance")}
          value={
            <span className="[&_button]:min-h-[44px] [&_button]:text-base">
              <ThemeToggle />
            </span>
          }
        />
      </GroupedList>

      {supabase && (
        <GroupedList footer={t("mobile.accountDesktopNote")}>
          {/* /account は端末の振り分け対象外のため、そのまま PC 版の画面を開く */}
          <GroupedRow href="/account" title={<span className="font-bold text-accent">{t("mobile.accountDesktop")}</span>} />
        </GroupedList>
      )}
    </>
  );
}
