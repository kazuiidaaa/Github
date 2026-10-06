"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { Button, Field, inputClass } from "@/components/ui";
import { messageOf } from "@/lib/errors";
import { useAccountText } from "@/lib/i18n/accountText";
import { useT } from "@/lib/i18n/LanguageProvider";
import { assignableRoles, canRemoveMember, ROLES, type Role } from "@/lib/permissions";
import { addMember, listMembers, removeMember, setMemberRole } from "@/lib/store";
import type { MemberInfo } from "@/lib/supabaseBackend";

/** メンバー管理（所有者・管理者のみ表示）。権限の最終判定はデータベース側で行われる */
export function MembersPanel({ myRole, myUserId, onChanged }: { myRole: string; myUserId: string; onChanged: () => void }) {
  const t = useT();
  const text = useAccountText();
  const roleOptions = (roles: readonly Role[]): ChoiceOption[] => roles.map((r) => ({ value: r, label: text.role(r) }));
  const [members, setMembers] = useState<MemberInfo[] | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [removing, setRemoving] = useState<MemberInfo | null>(null);
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
      setMsg(text.error(messageOf(e)));
    }
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-2 font-semibold">{t("account.members_title")}</h2>
      <p className="mb-4 text-xs text-slate-500">
        {t("account.members_roles")}
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {text.error(error)}
        </p>
      )}
      <table className="mb-5 block w-full text-left text-sm md:table">
        <thead className="hidden bg-slate-50 text-slate-600 md:table-header-group">
          <tr>
            <th className="px-3 py-2">{t("account.members_colEmail")}</th>
            <th className="px-3 py-2">{t("account.members_colRole")}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {members === null && !error && (
            <tr className="block md:table-row">
              <td colSpan={3} className="block px-3 py-4 text-slate-500 md:table-cell" role="status">
                {t("common.loading")}
              </td>
            </tr>
          )}
          {members?.map((m) => (
            <tr key={m.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 md:table-row md:p-0">
              <td className="w-full break-all md:table-cell md:w-auto md:px-3 md:py-2">
                {m.email}
                {m.userId === myUserId && <span className="ml-2 text-xs text-slate-500">{t("account.members_you")}</span>}
              </td>
              <td className="md:table-cell md:px-3 md:py-2">
                {myRole === "owner" ? (
                  <ChoiceGroup
                    legend={t("account.members_roleOf", { email: m.email })}
                    hideLegend
                    options={roleOptions(ROLES)}
                    value={m.role}
                    disabled={busy}
                    onChange={(v) => void run(() => setMemberRole(m.userId, v), t("account.members_roleChanged"))}
                  />
                ) : (
                  text.role(m.role)
                )}
              </td>
              <td className="ml-auto md:table-cell md:px-3 md:py-2 md:text-right">
                {m.userId !== myUserId && canRemoveMember(myRole, m.role) && (
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => setRemoving(m)}
                  >
                    {t("account.members_remove")}
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
          void run(() => addMember(email.trim(), role), t("account.members_added")).then(() => setEmail(""));
        }}
      >
        <div className="min-w-64 flex-1">
          <Field label={t("account.members_addEmail")} hint={t("account.members_addHint")}>
            <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div>
          <ChoiceGroup legend={t("account.members_roleLegend")} options={roleOptions(addable)} value={role} onChange={(v) => setRole(v as Role)} />
        </div>
        <Button type="submit" disabled={busy || !email.trim()}>
          {t("account.members_add")}
        </Button>
      </form>
      {msg && <p className="mt-2 text-sm text-slate-700">{msg}</p>}
      {removing && (
        <ConfirmDialog
          title={t("account.members_removeTitle")}
          message={t("account.members_removeMessage", { email: removing.email })}
          note={t("account.members_removeNote")}
          confirmLabel={t("account.members_removeConfirm")}
          tone="caution"
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const target = removing;
            setRemoving(null);
            void run(() => removeMember(target.userId), t("account.members_removed"));
          }}
        />
      )}
    </section>
  );
}
