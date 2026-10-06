"use client";

import { useEffect, useRef, useState } from "react";
import { MembersPanel } from "@/components/MembersPanel";
import { Button, Field, inputClass } from "@/components/ui";
import { changePassword, signOut, useSession } from "@/lib/auth";
import { useDemo } from "@/lib/demo";
import { formatDateTime } from "@/lib/format";
import { useAccountText } from "@/lib/i18n/accountText";
import { useT } from "@/lib/i18n/LanguageProvider";
import { getAccount, listAudit, renameOrganization, useCases } from "@/lib/store";
import { messageOf } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { isSupabaseEnabled } from "@/lib/supabase";
import type { AccountInfo, AuditEntry } from "@/lib/supabaseBackend";

export default function AccountPage() {
  const demo = useDemo();
  const t = useT();
  if (!isSupabaseEnabled || demo) {
    return (
      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <h1 className="mb-2 text-xl font-semibold">{t("account.title")}</h1>
        <p className="text-slate-600">{t("account.demoNotice")}</p>
      </div>
    );
  }
  return <AccountContent />;
}

function AccountContent() {
  const t = useT();
  const text = useAccountText();
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
    if (!name) return setOrgMsg(t("account.orgRequired"));
    if (name === info?.organizationName) return setOrgMsg(t("account.orgNoChange"));
    setBusy(true);
    try {
      await renameOrganization(name);
      setInfo((i) => (i ? { ...i, organizationName: name } : i));
      setOrgMsg(t("account.orgSaved"));
      setAudit(await listAudit());
    } catch (e) {
      setOrgMsg(text.error(messageOf(e)));
    }
    setBusy(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: t("account.pwMismatch") });
    setBusy(true);
    const err = await changePassword(info.email, pw.current, pw.next);
    setBusy(false);
    if (err) return setPwMsg({ ok: false, text: text.error(err) });
    setPw({ current: "", next: "", confirm: "" });
    setPwMsg({ ok: true, text: t("account.pwChanged") });
    void listAudit().then(setAudit);
  }

  const caseName = (id: string | null) => (id ? (cases.find((c) => c.id === id)?.caseName ?? t("account.deletedCase")) : "-");
  const isOwner = can(info?.role, "renameOrganization");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("account.title")}</h1>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {text.error(error)}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">{t("account.infoTitle")}</h2>
        {info ? (
          <dl className="grid grid-cols-[10rem_1fr] gap-y-3 text-sm">
            <dt className="text-slate-500">{t("account.email")}</dt>
            <dd>{info.email}</dd>
            <dt className="text-slate-500">{t("account.userId")}</dt>
            <dd className="font-mono text-xs">{info.userId}</dd>
            <dt className="text-slate-500">{t("account.lastSignIn")}</dt>
            <dd>{info.lastSignInAt ? formatDateTime(info.lastSignInAt) : "-"}</dd>
            <dt className="text-slate-500">{t("account.office")}</dt>
            <dd>
              {t("account.officeWithRole", { name: info.organizationName, role: text.role(info.role) })}
            </dd>
          </dl>
        ) : (
          !error && <p role="status" className="text-sm text-slate-500">{t("account.loading")}</p>
        )}
        <div className="mt-5">
          <Button variant="secondary" onClick={() => void signOut()}>
            {t("account.logout")}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">{t("account.orgTitle")}</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label={t("account.orgLabel")} hint={isOwner || !info ? undefined : t("account.orgOwnerOnly")}>
              <input className={inputClass} value={orgName} disabled={!isOwner} onChange={(e) => setOrgName(e.target.value)} />
            </Field>
          </div>
          <Button disabled={!isOwner || busy} onClick={() => void saveOrg()}>
            {t("account.save")}
          </Button>
        </div>
        {orgMsg && <p className="mt-2 text-sm text-slate-700">{orgMsg}</p>}
      </section>

      {info && can(info.role, "manageMembers") && (
        <MembersPanel myRole={info.role} myUserId={info.userId} onChanged={() => void listAudit().then(setAudit)} />
      )}

      <form onSubmit={savePassword} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">{t("account.pwTitle")}</h2>
        <Field label={t("account.pwCurrent")}>
          <input type="password" required autoComplete="current-password" className={inputClass} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        </Field>
        <Field label={t("account.pwNew")} hint={t("account.pwNewHint")}>
          <input type="password" required autoComplete="new-password" className={inputClass} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        </Field>
        <Field label={t("account.pwConfirm")}>
          <input type="password" required autoComplete="new-password" className={inputClass} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </Field>
        {pwMsg && (
          <p role="alert" className={`text-sm ${pwMsg.ok ? "text-green-700" : "text-red-600"}`}>
            {pwMsg.text}
          </p>
        )}
        <Button type="submit" disabled={busy || !info}>
          {t("account.pwSubmit")}
        </Button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-6 py-3 font-semibold">{t("account.auditTitle")}</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-6 py-2">{t("account.auditColDate")}</th>
              <th className="px-6 py-2">{t("account.auditColAction")}</th>
              <th className="px-6 py-2">{t("account.auditColCase")}</th>
            </tr>
          </thead>
          <tbody>
            {audit === null && (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-slate-500" role="status">
                  {t("account.loading")}
                </td>
              </tr>
            )}
            {audit?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-slate-500" role="status">
                  {t("account.auditEmpty")}
                </td>
              </tr>
            )}
            {audit?.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-6 py-2 whitespace-nowrap text-slate-600">{formatDateTime(a.createdAt)}</td>
                <td className="px-6 py-2">{text.audit(a.action)}{a.outcome === "failure" ? t("account.auditFailedSuffix") : ""}</td>
                <td className="px-6 py-2">{caseName(a.caseId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
