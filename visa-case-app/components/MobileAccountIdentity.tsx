"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { TextRow } from "@/components/mobile/FormRows";
import { ToneIcon } from "@/components/ui";
import { checkFullName, readFullName } from "@/lib/accountName";
import { updateFullName, useSession } from "@/lib/auth";
import { useAccountText } from "@/lib/i18n/accountText";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useDialogA11y } from "@/lib/useDialogA11y";

/**
 * 氏名の登録・変更のシート（iPhone のモーダルシート）。左に「キャンセル」、中央に題、右に「完了」。
 * ボタンは 44pt 以上。入力は 16px（iOS が拡大しない）。文字を大きくしても、シート内でスクロールして全体を見られる。
 */
function NameSheet({ initial, registered, onClose }: { initial: string; registered: boolean; onClose: () => void }) {
  const t = useT();
  const text = useAccountText();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useDialogA11y(panel, () => {
    if (!busy) closeRef.current();
  });

  async function done() {
    const checked = checkFullName(value);
    if (!checked.ok) {
      const key = { empty: "mobileAccount.errEmpty", tooLong: "mobileAccount.errTooLong", control: "mobileAccount.errControl" } as const;
      return setError(t(key[checked.reason]));
    }
    // 変更がなければ、保存せずに閉じる
    if (checked.value === initial) return onClose();
    setBusy(true);
    setError("");
    const err = await updateFullName(checked.value);
    setBusy(false);
    if (err) return setError(text.error(err));
    onClose();
  }

  const btn = "inline-flex min-h-[44px] min-w-[44px] items-center px-2 text-base disabled:text-slate-500";
  return (
    <div className="motion-scrim fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="motion-panel max-h-[calc(100dvh-env(safe-area-inset-top)-16px)] w-full max-w-md overflow-y-auto rounded-t-2xl bg-slate-100 pb-[env(safe-area-inset-bottom)] shadow-overlay sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-2 rounded-t-2xl bg-slate-100 px-2">
          <button type="button" onClick={onClose} disabled={busy} className={`${btn} text-accent`}>
            {t("mobileAccount.sheetCancel")}
          </button>
          <h2 id={titleId} className="min-w-0 break-words text-center text-base font-bold">
            {registered ? t("mobileAccount.sheetTitleEdit") : t("mobileAccount.sheetTitleRegister")}
          </h2>
          <button type="button" onClick={() => void done()} disabled={busy} className={`${btn} font-bold text-accent`}>
            {busy ? t("mobileAccount.sheetSaving") : t("mobileAccount.sheetDone")}
          </button>
        </div>
        <GroupedList>
          <TextRow
            id="m-account-name"
            label={t("mobileAccount.nameLabel")}
            value={value}
            onChange={(v) => {
              setValue(v);
              setError("");
            }}
            error={error || undefined}
            hint={t("mobileAccount.nameInputHint")}
            inputProps={{ autoComplete: "name", "data-autofocus": true, disabled: busy }}
          />
        </GroupedList>
      </div>
    </div>
  );
}

/**
 * アカウント画面（iPhone 版）の「ログイン中のユーザー」の本体（Supabase 接続時のみ）。
 * 氏名（未登録なら登録を案内。押すとシートで登録・変更）、メール、ユーザー ID（折り返して全文を出し、コピーできる）。
 * 氏名は Supabase Auth の user_metadata.full_name。データベースの表は使わない。
 */
export function MobileAccountIdentity({ children }: { children?: React.ReactNode }) {
  const t = useT();
  const session = useSession();
  const [sheet, setSheet] = useState(false);
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const user = session?.user;
  const name = readFullName(user?.user_metadata);
  const userId = user?.id ?? "";

  async function copyId() {
    try {
      await navigator.clipboard.writeText(userId);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <>
      <GroupedList header={t("mobile.accountSectionUser")} footer={name ? undefined : t("mobileAccount.nameMissingHint")}>
        {name ? (
          <GroupedRow
            label={t("mobileAccount.nameLabel")}
            value={name}
            trailing={<span className="font-bold text-accent">{t("mobileAccount.nameEdit")}</span>}
            onClick={() => setSheet(true)}
          />
        ) : (
          <GroupedRow
            leading={<ToneIcon tone="yellow" />}
            title={t("mobileAccount.nameMissing")}
            trailing={<span className="font-bold text-accent">{t("mobileAccount.nameRegister")}</span>}
            onClick={() => setSheet(true)}
          />
        )}
        <GroupedRow label={t("mobile.accountSignedInAs")} value={<span className="break-all">{user?.email ?? ""}</span>} />
        {userId && (
          <>
            <GroupedRow label={t("mobileAccount.userIdLabel")} value={<span className="break-all font-mono text-xs">{userId}</span>} />
            <GroupedRow
              title={<span className="font-bold text-accent">{copy === "done" ? t("mobileAccount.userIdCopied") : t("mobileAccount.userIdCopy")}</span>}
              leading={
                <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  {copy === "done" ? (
                    <path d="m3 8.5 3.2 3.2L13 4.8" />
                  ) : (
                    <>
                      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                      <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
                    </>
                  )}
                </svg>
              }
              onClick={() => void copyId()}
              chevron={false}
            />
          </>
        )}
        {children}
      </GroupedList>
      <p role="status" className="mx-8 -mt-2 mb-2 break-words text-xs text-slate-600 empty:hidden">
        {copy === "done" ? t("mobileAccount.userIdCopied") : copy === "failed" ? t("mobileAccount.userIdCopyFailed") : ""}
      </p>
      {sheet && <NameSheet initial={name} registered={!!name} onClose={() => setSheet(false)} />}
    </>
  );
}
