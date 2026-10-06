"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { Button } from "@/components/ui";
import { setNewPassword, useSessionState } from "@/lib/auth";
import { useAuthErrorText } from "@/lib/i18n/authErrors";
import { CATALOG } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";

const cardClass = "mx-auto max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6";

export default function ResetPasswordPage() {
  const { session } = useSessionState();
  const router = useRouter();
  const t = useT();
  const tr = useAuthErrorText();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isSupabaseEnabled) {
    return (
      <div className={`${cardClass} text-sm`}>
        <h1 className="text-xl font-semibold">{t("auth.resetTitle")}</h1>
        <p className="text-slate-600">{t("auth.resetUnavailable")}</p>
      </div>
    );
  }
  if (session === undefined) return <p role="status" className="text-sm text-slate-500">{t("auth.resetLoading")}</p>;
  if (session === null) {
    return (
      <div className={`${cardClass} text-sm`}>
        <h1 className="text-xl font-semibold">{t("auth.resetTitle")}</h1>
        <p role="alert" className="text-slate-700">
          {t("auth.resetLinkInvalid")}
        </p>
        <Link href="/login" className="inline-block rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-text">
          {t("auth.toLoginScreen")}
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setError(CATALOG.auth.ja.err_passwordMismatch);
    setBusy(true);
    const err = await setNewPassword(next);
    setBusy(false);
    if (err) return setError(err);
    router.replace("/");
  }

  return (
    <form onSubmit={submit} className={cardClass}>
      <h1 className="text-center text-xl font-semibold">{t("auth.newPasswordTitle")}</h1>
      <fieldset disabled={busy} className="space-y-5">
        <PasswordField label={t("auth.newPassword")} hint={t("auth.newPasswordHint")} value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordField label={t("auth.newPasswordConfirm")} value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {tr(error)}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t("auth.newPasswordSubmitting") : t("auth.newPasswordSubmit")}
      </Button>
    </form>
  );
}
