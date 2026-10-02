"use client";

import { useEffect, useRef, useState } from "react";
import { MembersPanel } from "@/components/MembersPanel";
import { Button, Field, inputClass } from "@/components/ui";
import { changePassword, signOut, useSession } from "@/lib/auth";
import { auditLabel } from "@/lib/auditLabels";
import { formatDateTime } from "@/lib/format";
import { getAccount, listAudit, renameOrganization, useCases } from "@/lib/store";
import { messageOf } from "@/lib/errors";
import { can, ROLE_LABELS, isRole } from "@/lib/permissions";
import { isSupabaseEnabled } from "@/lib/supabase";
import type { AccountInfo, AuditEntry } from "@/lib/supabaseBackend";

export default function AccountPage() {
  if (!isSupabaseEnabled) {
    return (
      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <h1 className="mb-2 text-xl font-semibold">アカウント</h1>
        <p className="text-slate-600">
          仮データ方式で動作しているため、ログインとアカウントの機能は使用できません。Supabase の接続情報を設定すると、この画面が有効になります。
        </p>
      </div>
    );
  }
  return <AccountContent />;
}

function AccountContent() {
  const session = useSession();
  const userId = session?.user.id;
  const initialized = useRef(false);
  const cases = useCases();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgMsg, setOrgMsg] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // 再認証などでセッション情報が更新されても、入力途中の内容を上書きしないよう、ユーザーIDの変化でのみ読み込む
  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.all([getAccount(), listAudit()])
      .then(([a, l]) => {
        if (!active) return;
        setInfo(a);
        if (!initialized.current) {
          initialized.current = true;
          setOrgName(a.organizationName);
        }
        setAudit(l);
      })
      .catch((e) => active && setError(messageOf(e)));
    return () => {
      active = false;
    };
  }, [userId]);

  async function saveOrg() {
    const name = orgName.trim();
    if (!name) return setOrgMsg("事務所名を入力してください。");
    if (name === info?.organizationName) return setOrgMsg("変更はありません。");
    setBusy(true);
    try {
      await renameOrganization(name);
      setInfo((i) => (i ? { ...i, organizationName: name } : i));
      setOrgMsg("保存しました。");
      setAudit(await listAudit());
    } catch (e) {
      setOrgMsg(messageOf(e));
    }
    setBusy(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: "新しいパスワードが、確認用の入力と一致しません。" });
    setBusy(true);
    const err = await changePassword(info.email, pw.current, pw.next);
    setBusy(false);
    if (err) return setPwMsg({ ok: false, text: err });
    setPw({ current: "", next: "", confirm: "" });
    setPwMsg({ ok: true, text: "パスワードを変更しました。" });
    void listAudit().then(setAudit);
  }

  const caseName = (id: string | null) => (id ? (cases.find((c) => c.id === id)?.caseName ?? "（削除済みの案件）") : "-");
  const isOwner = can(info?.role, "renameOrganization");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">アカウント</h1>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">アカウント情報</h2>
        {info ? (
          <dl className="grid grid-cols-[10rem_1fr] gap-y-3 text-sm">
            <dt className="text-slate-500">メールアドレス</dt>
            <dd>{info.email}</dd>
            <dt className="text-slate-500">ユーザーID</dt>
            <dd className="font-mono text-xs">{info.userId}</dd>
            <dt className="text-slate-500">最終ログイン</dt>
            <dd>{info.lastSignInAt ? formatDateTime(info.lastSignInAt) : "-"}</dd>
            <dt className="text-slate-500">事務所</dt>
            <dd>
              {info.organizationName}（{isRole(info.role) ? ROLE_LABELS[info.role] : info.role}）
            </dd>
          </dl>
        ) : (
          !error && <p className="text-sm text-slate-500">読み込み中……</p>
        )}
        <div className="mt-5">
          <Button variant="secondary" onClick={() => void signOut()}>
            ログアウト
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">事務所名</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="事務所名" hint={isOwner || !info ? undefined : "事務所名を変更できるのは、所有者のみです。"}>
              <input className={inputClass} value={orgName} disabled={!isOwner} onChange={(e) => setOrgName(e.target.value)} />
            </Field>
          </div>
          <Button disabled={!isOwner || busy} onClick={() => void saveOrg()}>
            保存
          </Button>
        </div>
        {orgMsg && <p className="mt-2 text-sm text-slate-700">{orgMsg}</p>}
      </section>

      {info && can(info.role, "manageMembers") && (
        <MembersPanel myRole={info.role} myUserId={info.userId} onChanged={() => void listAudit().then(setAudit)} />
      )}

      <form onSubmit={savePassword} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">パスワードの変更</h2>
        <Field label="現在のパスワード">
          <input type="password" required autoComplete="current-password" className={inputClass} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        </Field>
        <Field label="新しいパスワード" hint="8文字以上。英数字を組み合わせてください。">
          <input type="password" required autoComplete="new-password" className={inputClass} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        </Field>
        <Field label="新しいパスワード（確認）">
          <input type="password" required autoComplete="new-password" className={inputClass} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </Field>
        {pwMsg && (
          <p role="alert" className={`text-sm ${pwMsg.ok ? "text-green-700" : "text-red-600"}`}>
            {pwMsg.text}
          </p>
        )}
        <Button type="submit" disabled={busy || !info}>
          変更する
        </Button>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-6 py-3 font-semibold">監査ログ（直近100件）</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-6 py-2">日時</th>
              <th className="px-6 py-2">操作</th>
              <th className="px-6 py-2">案件</th>
            </tr>
          </thead>
          <tbody>
            {audit === null && (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-slate-500">
                  読み込み中……
                </td>
              </tr>
            )}
            {audit?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-slate-500">
                  記録はありません。
                </td>
              </tr>
            )}
            {audit?.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-6 py-2 whitespace-nowrap text-slate-600">{formatDateTime(a.createdAt)}</td>
                <td className="px-6 py-2">{auditLabel(a.action)}{a.outcome === "failure" ? "（失敗）" : ""}</td>
                <td className="px-6 py-2">{caseName(a.caseId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
