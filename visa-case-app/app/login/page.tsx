"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { signIn, startDemo } from "@/lib/auth";
import { isSupabaseEnabled } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError((await signIn(email, password)) ?? "");
    setBusy(false);
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

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-center text-xl font-semibold">ログイン</h1>
      <Field label="メールアドレス">
        <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="パスワード">
        <input type="password" required autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "確認中……" : "ログイン"}
      </Button>
      <div className="border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            startDemo();
            router.push("/cases");
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
