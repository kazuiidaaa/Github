"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { InputRow, inputCls } from "@/components/mobile/InputRow";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { MOBILE_LOGIN } from "@/components/mobile/paths";
import { Button } from "@/components/ui";
import { setNewPassword, useSessionState } from "@/lib/auth";
import { useAuthErrorText } from "@/lib/i18n/authErrors";
import { CATALOG } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isSupabaseEnabled } from "@/lib/supabase";

/**
 * 新しいパスワードの設定（iPhone 版）。見た目だけを iPhone 向けにし、認証は PC 版（app/reset-password/page.tsx）と同じ関数を使う。
 * - setNewPassword / useSessionState（lib/auth.ts）をそのまま呼ぶ。Supabase を直接呼ばない。判定の順序・エラー文も PC 版と同じ。
 * - 再設定メールのリンク先は PC 版の /reset-password のまま（lib/auth.ts の redirectTo は変えない）。この画面は /m 配下の受け皿。
 * - 未ログイン（リンクの無効・期限切れ）でも、AuthGate は移動させない。画面側で案内し、/m/login へのリンクを出す。
 * - 成功後は /m/cases へ移る（PC 版は /）。
 */
export default function MobileResetPasswordPage() {
  const { session } = useSessionState();
  const router = useRouter();
  const t = useT();
  const tr = useAuthErrorText();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useId();
  const confirmId = useId();
  const hintId = useId();
  const errorId = useId();

  if (!isSupabaseEnabled) {
    return (
      <>
        <LargeTitleHeader title={t("auth.resetTitle")} />
        <GroupedList>
          <GroupedRow title={t("auth.resetUnavailable")} />
        </GroupedList>
      </>
    );
  }
  if (session === undefined) {
    return (
      <>
        <LargeTitleHeader title={t("auth.resetTitle")} />
        <p role="status" className="mx-4 text-sm text-slate-600">
          {t("auth.resetLoading")}
        </p>
      </>
    );
  }
  if (session === null) {
    return (
      <>
        <LargeTitleHeader title={t("auth.resetTitle")} />
        <p role="alert" className="mx-4 text-sm text-slate-800">
          {t("auth.resetLinkInvalid")}
        </p>
        <GroupedList>
          <GroupedRow title={<span className="font-bold text-accent">{t("auth.toLoginScreen")}</span>} href={MOBILE_LOGIN} />
        </GroupedList>
      </>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setError(CATALOG.auth.ja.err_passwordMismatch);
    setBusy(true);
    const err = await setNewPassword(next);
    setBusy(false);
    if (err) return setError(err);
    router.replace("/m/cases");
  }

  const toggle = (
    <button
      type="button"
      aria-pressed={shown}
      aria-label={shown ? t("mobileReset.passwordHideAria") : t("mobileReset.passwordShowAria")}
      onClick={() => setShown(!shown)}
      className="-mr-2 inline-flex min-h-[44px] shrink-0 items-center rounded-full px-3 text-sm font-bold text-accent"
    >
      {shown ? t("input.passwordField_hide") : t("input.passwordField_show")}
    </button>
  );
  const common = {
    type: shown ? "text" : "password",
    required: true,
    autoComplete: "new-password",
    autoCapitalize: "none",
    autoCorrect: "off",
    spellCheck: false,
    "aria-describedby": error ? `${hintId} ${errorId}` : hintId,
    className: inputCls,
  } as const;

  return (
    <>
      <LargeTitleHeader title={t("auth.newPasswordTitle")} />
      <form onSubmit={submit} aria-label={t("mobileReset.formAria")}>
        <fieldset disabled={busy} className="min-w-0">
          <GroupedList footer={<span id={hintId}>{t("auth.newPasswordHint")}</span>}>
            <InputRow id={nextId} label={t("auth.newPassword")} trailing={toggle}>
              <input id={nextId} {...common} enterKeyHint="next" value={next} onChange={(e) => setNext(e.target.value)} />
            </InputRow>
            <InputRow id={confirmId} label={t("auth.newPasswordConfirm")}>
              <input id={confirmId} {...common} enterKeyHint="go" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </InputRow>
          </GroupedList>
        </fieldset>
        <div className="mx-4">
          {error && (
            <p id={errorId} role="alert" className="px-4 pt-1.5 text-xs font-bold text-danger-text">
              {tr(error)}
            </p>
          )}
          <Button type="submit" disabled={busy} className="mt-4 w-full text-base">
            {busy ? t("auth.newPasswordSubmitting") : t("auth.newPasswordSubmit")}
          </Button>
        </div>
      </form>
    </>
  );
}
