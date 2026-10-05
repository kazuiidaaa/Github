"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { Button } from "@/components/ui";
import { setNewPassword, useSessionState } from "@/lib/auth";
import { isSupabaseEnabled } from "@/lib/supabase";

const cardClass = "mx-auto max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6";

export default function ResetPasswordPage() {
  const { session } = useSessionState();
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isSupabaseEnabled) {
    return (
      <div className={`${cardClass} text-sm`}>
        <h1 className="text-xl font-semibold">パスワードの再設定</h1>
        <p className="text-slate-600">仮データ方式で動作しているため、この機能は使用できません。</p>
      </div>
    );
  }
  if (session === undefined) return <p role="status" className="text-sm text-slate-500">読み込み中……</p>;
  if (session === null) {
    return (
      <div className={`${cardClass} text-sm`}>
        <h1 className="text-xl font-semibold">パスワードの再設定</h1>
        <p role="alert" className="text-slate-700">
          再設定のリンクが無効か、有効期限が切れています。ログイン画面から、もう一度再設定のメールを送ってください。
        </p>
        <Link href="/login" className="inline-block rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-text">
          ログイン画面へ
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setError("新しいパスワードが、確認用の入力と一致しません。");
    setBusy(true);
    const err = await setNewPassword(next);
    setBusy(false);
    if (err) return setError(err);
    router.replace("/");
  }

  return (
    <form onSubmit={submit} className={cardClass}>
      <h1 className="text-center text-xl font-semibold">新しいパスワードの設定</h1>
      <fieldset disabled={busy} className="space-y-5">
        <PasswordField label="新しいパスワード" hint="8文字以上。英数字を組み合わせてください。" value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordField label="新しいパスワード（確認）" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "設定中……" : "設定する"}
      </Button>
    </form>
  );
}
