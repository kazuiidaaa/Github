"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { Button, Field, inputClass } from "@/components/ui";
import { requestPasswordReset, signIn, startDemo } from "@/lib/auth";
import { isSupabaseEnabled } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [sent, setSent] = useState(false);
  const router = useRouter();

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
        <p className="mb-2 font-semibold">ログインは無効です</p>
        <p className="text-slate-600">
          Supabase の接続情報が未設定のため、仮データ方式で動作しています。ログインを使用する場合は、
          <code>.env.local</code> に接続情報を設定してください（<code>supabase/README.md</code> を参照）。
        </p>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <form onSubmit={submitReset} className="mx-auto max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-center text-xl font-semibold">パスワードの再設定</h1>
        <p className="text-xs text-slate-500">登録したメールアドレスを入力してください。再設定用のリンクをメールでお送りします。</p>
        <fieldset disabled={busy} className="space-y-5">
          <Field label="メールアドレス">
            <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-800">
            登録されている場合、再設定の案内をお送りします。
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "送信中……" : "再設定のメールを送る"}
        </Button>
        <button type="button" onClick={() => switchMode("login")} className="block w-full text-center text-sm font-bold text-accent underline underline-offset-2">
          ログイン画面へ戻る
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-center text-xl font-semibold">ログイン</h1>
      <p className="text-xs text-slate-500">行政書士事務所の関係者向けのシステムです。事務所のメンバー以外の方は、ご利用いただけません。</p>
      <fieldset disabled={busy} className="space-y-5">
        <Field label="メールアドレス">
          <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <PasswordField label="パスワード" value={password} onChange={setPassword} autoComplete="current-password" />
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "確認中……" : "ログイン"}
      </Button>
      <button type="button" disabled={busy} onClick={() => switchMode("reset")} className="block w-full text-center text-sm font-bold text-accent underline underline-offset-2">
        パスワードを忘れた場合
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
          デモを試す
        </Button>
        <p className="mt-2 text-xs text-slate-500">
          ログインせず、仮データで操作を試せます。入力した内容はサーバーに保存されず、デモを終了すると消去されます。
        </p>
      </div>
    </form>
  );
}
