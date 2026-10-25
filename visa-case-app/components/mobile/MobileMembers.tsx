"use client";

import { useEffect, useState } from "react";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { memberDisplayLabel } from "@/lib/accountName";
import { messageOf } from "@/lib/errors";
import { useAccountText } from "@/lib/i18n/accountText";
import { useT } from "@/lib/i18n/LanguageProvider";
import { can } from "@/lib/permissions";
import { listMembers } from "@/lib/store";
import type { MemberInfo } from "@/lib/supabaseBackend";

/**
 * メンバーの一覧（表示のみ）の行。氏名が登録済みなら氏名、未登録ならメールアドレスを、折り返して全文を出す。
 * 役割は、色でなく文字（「役割：所有者」）で出す。本人の行には「あなた」を添える。
 */
export function MemberRows({ members, myUserId }: { members: MemberInfo[]; myUserId: string }) {
  const t = useT();
  const text = useAccountText();
  return (
    <>
      {members.map((m) => (
        <GroupedRow
          key={m.userId}
          title={<span className="break-all">{memberDisplayLabel(m)}</span>}
          subtitle={
            <>
              {t("mobileAccount.membersRoleLabel", { role: text.role(m.role) })}
              {m.userId === myUserId && ` ・ ${t("mobileAccount.membersYou")}`}
            </>
          }
        />
      ))}
    </>
  );
}

/**
 * アカウント画面（iPhone 版）のメンバー一覧。所有者・管理者のときだけ、呼び出し側（MobileAccountDetails）が置く。
 * 一覧の取得（listMembers）は PC 版と同じ関数で、権限のない利用者はデータベース側が拒否する（画面の出し分けは認可ではない）。
 * 追加・削除・役割の変更は PC 版の MembersPanel（ここでは行わない）。
 */
export function MobileMembers({ myUserId }: { myUserId: string }) {
  const t = useT();
  const text = useAccountText();
  const [members, setMembers] = useState<MemberInfo[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listMembers()
      .then((list) => active && setMembers(list))
      .catch((e) => active && setError(messageOf(e)));
    return () => {
      active = false;
    };
  }, []);

  return (
    <GroupedList header={t("mobileAccount.membersTitle")} footer={t("mobileAccount.membersFooter")}>
      {error ? (
        <li className="m-row relative">
          <p role="alert" className="break-words px-4 py-3 text-sm font-bold text-danger-text">
            {text.error(error)}
          </p>
        </li>
      ) : members === null ? (
        <li className="m-row relative">
          <p role="status" className="px-4 py-3 text-slate-600">
            {t("mobileAccount.membersLoading")}
          </p>
        </li>
      ) : members.length === 0 ? (
        <li className="m-row relative">
          <p className="px-4 py-3 text-slate-600">{t("mobileAccount.membersEmpty")}</p>
        </li>
      ) : (
        <MemberRows members={members} myUserId={myUserId} />
      )}
    </GroupedList>
  );
}

/** 役割が所有者・管理者のときだけ、メンバー一覧を出す（それ以外は何も出さず、一覧の取得もしない）。表示の制御であり、認可ではない */
export function MembersSection({ role, myUserId }: { role: string | null | undefined; myUserId: string | undefined }) {
  if (!myUserId || !can(role, "manageMembers")) return null;
  return <MobileMembers myUserId={myUserId} />;
}
