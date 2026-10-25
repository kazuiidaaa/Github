"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { InputRow, inputCls, TypedPreview } from "@/components/mobile/InputRow";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { Button } from "@/components/ui";
import { requestPasswordReset, signIn, startDemo } from "@/lib/auth";
import { useAuthErrorText } from "@/lib/i18n/authErrors";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";

/** 目のアイコン（表示中は斜線つき）。装飾のため読み上げない（ボタンの名前は aria-label）。 */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * ログイン（iPhone 版）。見た目だけを iPhone 向けにし、認証は PC 版（app/login/page.tsx）と同じ関数・同じ経路を使う。
 * - signIn / requestPasswordReset / startDemo（lib/auth.ts）をそのまま呼ぶ。Supabase を直接呼ばない。
 * - エラー文は lib/auth.ts が返す文を翻訳して出す（PC 版と同じ。登録の有無が推測できない文言）。
 * - ログイン後の移動は AuthGate が行う（session が付くと /m/cases へ）。この画面は移動先を決めない（デモ開始のみ /m/cases）。
 * - 再設定メールの先の画面（/reset-password）は PC 版のまま。
 */
export default function MobileLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const t = useT();
  const tr = useAuthErrorText();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

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
      <>
        <LargeTitleHeader title={t("auth.disabledTitle")} />
        <GroupedList>
          <GroupedRow title={t("auth.disabledTitle")} subtitle={t("auth.disabledBody", { envFile: ".env.local", readme: "supabase/README.md" })} />
        </GroupedList>
      </>
    );
  }

  const emailInput = (
    <input
      id={emailId}
      type="email"
      required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      autoComplete="username"
      inputMode="email"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint={mode === "login" ? "next" : "send"}
      aria-describedby={error ? errorId : undefined}
      className={inputCls}
    />
  );
  const errorNote = error ? (
    <p id={errorId} role="alert" className="px-4 pt-1.5 text-xs font-bold text-danger-text">
      {tr(error)}
    </p>
  ) : null;

  if (mode === "reset") {
    return (
      <>
        <LargeTitleHeader title={t("auth.resetTitle")} />
        <form onSubmit={submitReset} aria-label={t("mobileLogin.resetFormAria")}>
          <fieldset disabled={busy} className="min-w-0">
            <GroupedList footer={t("auth.resetIntro")}>
              <InputRow id={emailId} label={t("auth.email")} below={<TypedPreview label={t("mobileLogin.typedLabel")} value={email} />}>
                {emailInput}
              </InputRow>
            </GroupedList>
          </fieldset>
          <div className="mx-4">
            {errorNote}
            {sent && (
              <p role="status" className="mt-2 rounded-[10px] bg-slate-100 p-3 text-sm text-slate-800">
                {t("auth.resetSent")}
              </p>
            )}
            <Button type="submit" disabled={busy} className="mt-4 w-full text-base">
              {busy ? t("auth.resetSending") : t("auth.resetSubmit")}
            </Button>
          </div>
          <GroupedList>
            <GroupedRow title={<span className="font-bold text-accent">{t("auth.backToLogin")}</span>} onClick={() => switchMode("login")} chevron={false} />
          </GroupedList>
        </form>
      </>
    );
  }

  return (
    <>
      <LargeTitleHeader title={t("auth.loginTitle")} />
      <p className="mx-4 mb-1 text-sm text-slate-600">{t("auth.loginIntro")}</p>
      <form onSubmit={submit} aria-label={t("mobileLogin.loginFormAria")}>
        <fieldset disabled={busy} className="min-w-0">
          <GroupedList>
            <InputRow id={emailId} label={t("auth.email")} below={<TypedPreview label={t("mobileLogin.typedLabel")} value={email} />}>
              {emailInput}
            </InputRow>
            <InputRow
              id={passwordId}
              label={t("auth.password")}
              below={shown ? <TypedPreview label={t("mobileLogin.typedLabel")} value={password} /> : undefined}
              trailing={
                <button
                  type="button"
                  aria-pressed={shown}
                  aria-label={shown ? t("mobileLogin.passwordHideAria") : t("mobileLogin.passwordShowAria")}
                  onClick={() => setShown(!shown)}
                  className="-mr-3 inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <EyeIcon off={shown} />
                  {shown ? t("input.passwordField_hide") : t("input.passwordField_show")}
                </button>
              }
            >
              <input
                id={passwordId}
                type={shown ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-describedby={error ? errorId : undefined}
                className={inputCls}
              />
            </InputRow>
          </GroupedList>
        </fieldset>
        <div className="mx-4">
          {errorNote}
          <Button type="submit" disabled={busy} className="mt-4 w-full text-base">
            {busy ? t("auth.loggingIn") : t("auth.login")}
          </Button>
        </div>
        <GroupedList>
          <GroupedRow title={<span className="font-bold text-accent">{t("auth.forgotPassword")}</span>} onClick={() => switchMode("reset")} chevron={false} />
        </GroupedList>
      </form>
      <GroupedList header={t("mobileLogin.demoHeader")} footer={t("auth.demoNote")}>
        <GroupedRow
          title={<span className="font-bold text-accent">{t("auth.tryDemo")}</span>}
          onClick={() => {
            startDemo();
            router.push("/m/cases");
          }}
          chevron={false}
        />
      </GroupedList>
    </>
  );
}
