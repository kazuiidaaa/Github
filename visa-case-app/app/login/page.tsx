"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { Button, Field, inputClass } from "@/components/ui";
import { requestPasswordReset, signIn, startDemo } from "@/lib/auth";
import { useAuthErrorText } from "@/lib/i18n/authErrors";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const t = useT();
  const tr = useAuthErrorText();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError((await signIn(email, password)) ?? "");
    setBusy(false);
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await requestPasswordReset(email);
    setBusy(false);
    if (err) return setError(err);
    setError("");
    setSent(true);
  }

  function switchMode(m: "login" | "reset") {
    setMode(m);
    setError("");
    setSent(false);
  }

  if (!isSupabaseEnabled) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <p className="mb-2 font-semibold">{t("auth.disabledTitle")}</p>
        <p className="text-slate-600">
          {t("auth.disabledBody", { envFile: "{envFile}", readme: "{readme}" })
            .split(/(\{envFile\}|\{readme\})/)
            .map((part, i) =>
              part === "{envFile}" ? <code key={i}>.env.local</code> : part === "{readme}" ? <code key={i}>supabase/README.md</code> : part,
            )}
        </p>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <form onSubmit={submitReset} className="mx-auto max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-center text-xl font-semibold">{t("auth.resetTitle")}</h1>
        <p className="text-xs text-slate-500">{t("auth.resetIntro")}</p>
        <fieldset disabled={busy} className="space-y-5">
          <Field label={t("auth.email")}>
            <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {tr(error)}
          </p>
        )}
        {sent && (
          <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-800">
            {t("auth.resetSent")}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? t("auth.resetSending") : t("auth.resetSubmit")}
        </Button>
        <button type="button" onClick={() => switchMode("login")} className="block w-full text-center text-sm font-bold text-accent underline underline-offset-2">
          {t("auth.backToLogin")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-center text-xl font-semibold">{t("auth.loginTitle")}</h1>
      <p className="text-xs text-slate-500">{t("auth.loginIntro")}</p>
      <fieldset disabled={busy} className="space-y-5">
        <Field label={t("auth.email")}>
          <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <PasswordField label={t("auth.password")} value={password} onChange={setPassword} autoComplete="current-password" />
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {tr(error)}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t("auth.loggingIn") : t("auth.login")}
      </Button>
      <button type="button" disabled={busy} onClick={() => switchMode("reset")} className="block w-full text-center text-sm font-bold text-accent underline underline-offset-2">
        {t("auth.forgotPassword")}
      </button>
      <div className="border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            startDemo();
            router.push("/");
          }}
        >
          {t("auth.tryDemo")}
        </Button>
        <p className="mt-2 text-xs text-slate-500">
          {t("auth.demoNote")}
        </p>
      </div>
    </form>
  );
}
