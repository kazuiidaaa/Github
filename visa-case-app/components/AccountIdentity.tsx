"use client";

import { useState } from "react";
import { Button, Field, inputClass, ToneIcon } from "@/components/ui";
import { checkFullName, readFullName } from "@/lib/accountName";
import { updateFullName, useSession } from "@/lib/auth";
import { useAccountText } from "@/lib/i18n/accountText";
import { useT } from "@/lib/i18n/LanguageProvider";

/** ユーザー ID（全文を折り返して表示）と、コピーの操作 */
export function UserIdValue({ userId }: { userId: string }) {
  const t = useT();
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
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
      <span className="break-all font-mono text-xs">{userId}</span>
      <span className="mt-1 flex flex-wrap items-center gap-2 font-sans">
        <Button type="button" variant="secondary" onClick={() => void copyId()}>
          {copy === "done" ? t("account.userIdCopied") : t("account.userIdCopy")}
        </Button>
        <span role="status" className="text-xs text-slate-600">
          {copy === "failed" ? t("account.userIdCopyFailed") : ""}
        </span>
      </span>
    </>
  );
}

/**
 * 氏名の表示と、登録・変更（PC 版のアカウント画面）。氏名は Supabase Auth の user_metadata.full_name。
 * 検証は lib/accountName.ts、保存は updateFullName で、iPhone 版と同じ規則。未登録なら、図形と文字で登録を案内する。
 */
export function FullNameSection() {
  const t = useT();
  const text = useAccountText();
  const session = useSession();
  const name = readFullName(session?.user.user_metadata);
  const [draft, setDraft] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const value = draft ?? name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const checked = checkFullName(value);
    if (!checked.ok) {
      const key = { empty: "account.nameErrEmpty", tooLong: "account.nameErrTooLong", control: "account.nameErrControl" } as const;
      return setMsg({ ok: false, text: t(key[checked.reason]) });
    }
    if (checked.value === name) return setMsg({ ok: true, text: t("account.nameNoChange") });
    setBusy(true);
    setMsg(null);
    const err = await updateFullName(checked.value);
    setBusy(false);
    if (err) return setMsg({ ok: false, text: text.error(err) });
    setDraft(null);
    setMsg({ ok: true, text: t("account.nameSaved") });
  }

  return (
    <form onSubmit={save} className="space-y-4 mac-card rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">{t("account.nameTitle")}</h2>
      {name ? (
        <p className="break-words text-sm">
          <span className="text-slate-500">{t("account.nameLabel")}：</span>
          <span className="font-bold">{name}</span>
        </p>
      ) : (
        <p className="flex items-start gap-2 mac-notice rounded-xl bg-yellow-100 p-3 text-sm text-yellow-800">
          <span className="mt-0.5 shrink-0">
            <ToneIcon tone="yellow" />
          </span>
          <span>
            <span className="font-bold">{t("account.nameMissing")}</span>
            <br />
            {t("account.nameMissingHint")}
          </span>
        </p>
      )}
      <Field label={t("account.nameLabel")} hint={t("account.nameInputHint")}>
        <input
          className={inputClass}
          autoComplete="name"
          value={value}
          disabled={busy}
          onChange={(e) => {
            setDraft(e.target.value);
            setMsg(null);
          }}
        />
      </Field>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-success" : "text-danger-text"}`}>
          {msg.text}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? t("account.nameSaving") : t("account.nameSave")}
      </Button>
    </form>
  );
}
