"use client";

import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { MobileAccountDetails } from "@/components/MobileAccount";
import { MobileAccountIdentity } from "@/components/MobileAccountIdentity";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { exitDemo, signOut, useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";

/**
 * アカウント（iPhone 版・暫定の最小版）。既存の仕組みだけを使い、認証の経路は新設しない。
 * - ログイン中のユーザー（useSession）とログアウト（signOut。移動は AuthGate が /m/login へ行う）
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

      {supabase && session ? (
        // ログイン中：氏名・メール・ユーザー ID と、ログアウト
        <MobileAccountIdentity>
          <GroupedRow title={<span className="font-bold text-danger-text">{t("header.logout")}</span>} onClick={() => void signOut()} chevron={false} />
        </MobileAccountIdentity>
      ) : (
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
                router.replace("/m/login");
              }}
              chevron={false}
            />
          )}
        </GroupedList>
      )}

      {supabase && session && <MobileAccountDetails />}

      <GroupedList header={t("mobile.accountSectionDisplay")}>
        <GroupedRow
          // 文字サイズ 200% で選択欄が行からはみ出さないよう、幅が足りないときは項目名の下へ縦に積み、行の幅まで縮められるようにする
          title={
            <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 max-w-full break-words">{t("common.languageLabel")}</span>
              <span className="min-w-[7rem] max-w-full flex-1 basis-0 text-right font-normal [&>span]:flex [&>span]:max-w-full [&>span]:justify-end [&_select]:min-h-[44px] [&_select]:min-w-0 [&_select]:max-w-full [&_select]:text-base">
                <LanguageSwitcher />
              </span>
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
