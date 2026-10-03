"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { messageOf } from "@/lib/errors";
import { assignableRoles, canRemoveMember, ROLE_LABELS, ROLES, type Role } from "@/lib/permissions";
import { addMember, listMembers, removeMember, setMemberRole } from "@/lib/store";
import type { MemberInfo } from "@/lib/supabaseBackend";

/** メンバー管理（所有者・管理者のみ表示）。権限の最終判定はデータベース側で行われる */
export function MembersPanel({ myRole, myUserId, onChanged }: { myRole: string; myUserId: string; onChanged: () => void }) {
  const [members, setMembers] = useState<MemberInfo[] | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const addable = assignableRoles(myRole);
  const [role, setRole] = useState<Role>("staff");

  const reload = useCallback(async () => {
    try {
      setMembers(await listMembers());
      setError("");
    } catch (e) {
      setError(messageOf(e));
    }
  }, []);

  useEffect(() => {
    let active = true;
    listMembers()
      .then((list) => active && setMembers(list))
      .catch((e) => active && setError(messageOf(e)));
    return () => {
      active = false;
    };
  }, []);

  async function run(task: () => Promise<void>, done: string) {
    setBusy(true);
    setMsg("");
    try {
      await task();
      setMsg(done);
      await reload();
      onChanged();
    } catch (e) {
      setMsg(messageOf(e));
    }
    setBusy(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="mb-2 font-semibold">メンバー管理</h2>
      <p className="mb-4 text-xs text-slate-500">
        所有者：すべての操作。管理者：案件の削除とメンバーの追加・削除（担当者・閲覧のみ）。担当者：案件の作成・編集（削除は不可）。閲覧のみ：閲覧だけ。
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <table className="mb-5 block w-full text-left text-sm md:table">
        <thead className="hidden bg-slate-50 text-slate-600 md:table-header-group">
          <tr>
            <th className="px-3 py-2">メールアドレス</th>
            <th className="px-3 py-2">役割</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {members === null && !error && (
            <tr className="block md:table-row">
              <td colSpan={3} className="block px-3 py-4 text-slate-500 md:table-cell">
                読み込み中……
              </td>
            </tr>
          )}
          {members?.map((m) => (
            <tr key={m.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 md:table-row md:p-0">
              <td className="w-full break-all md:table-cell md:w-auto md:px-3 md:py-2">
                {m.email}
                {m.userId === myUserId && <span className="ml-2 text-xs text-slate-500">（あなた）</span>}
              </td>
              <td className="md:table-cell md:px-3 md:py-2">
                {myRole === "owner" ? (
                  <select
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                    aria-label={`${m.email}の役割`}
                    value={m.role}
                    disabled={busy}
                    onChange={(e) => void run(() => setMemberRole(m.userId, e.target.value), "役割を変更しました。")}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  (ROLE_LABELS[m.role as Role] ?? m.role)
                )}
              </td>
              <td className="ml-auto md:table-cell md:px-3 md:py-2 md:text-right">
                {m.userId !== myUserId && canRemoveMember(myRole, m.role) && (
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`${m.email} を事務所から削除します。よろしいですか？`)) {
                        void run(() => removeMember(m.userId), "メンバーを削除しました。");
                      }
                    }}
                  >
                    削除
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => addMember(email.trim(), role), "メンバーを追加しました。").then(() => setEmail(""));
        }}
      >
        <div className="min-w-64 flex-1">
          <Field label="追加するメンバーのメールアドレス" hint="すでにこのシステムのアカウントがある方に限ります。">
            <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div>
          <Field label="役割">
            <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {addable.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button type="submit" disabled={busy || !email.trim()}>
          追加
        </Button>
      </form>
      {msg && <p className="mt-2 text-sm text-slate-700">{msg}</p>}
    </section>
  );
}
