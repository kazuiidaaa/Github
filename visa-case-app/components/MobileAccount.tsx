"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { MembersSection } from "@/components/mobile/MobileMembers";
import { TextRow } from "@/components/mobile/FormRows";
import { Button } from "@/components/ui";
import { changePassword, useSession } from "@/lib/auth";
import { messageOf } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useAccountText } from "@/lib/i18n/accountText";
import { useT } from "@/lib/i18n/LanguageProvider";
import { can } from "@/lib/permissions";
import { getAccount, listAudit, renameOrganization, useCases } from "@/lib/store";
import type { AccountInfo, AuditEntry } from "@/lib/supabaseBackend";

/**
 * パスワード入力の行（項目名を上、入力欄を下）。文字は 16px（iOS が拡大しない）、行と入力欄は 44pt 以上。
 * autoComplete は呼び出し側が渡す（現在のパスワード＝current-password、新しいパスワード＝new-password）。
 */
function PasswordRow({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  hint?: string;
}) {
  const id = useId();
  const hintId = useId();
  return (
    <li className="m-row relative">
      <div className="px-4 pt-2">
        <label htmlFor={id} className="block break-words text-base font-medium">
          {label}
        </label>
        <input
          id={id}
          type="password"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={hint ? hintId : undefined}
          className="min-h-[44px] w-full min-w-0 bg-transparent py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </div>
      {hint ? (
        <p id={hintId} className="px-4 pb-2.5 text-xs text-slate-600">
          {hint}
        </p>
      ) : (
        <div className="pb-1" />
      )}
    </li>
  );
}

/**
 * アカウント画面（iPhone 版）の、Supabase 接続時の本体。PC 版 app/account/page.tsx の AccountContent と同じ関数を使う：
 * getAccount / listAudit / renameOrganization（lib/store.ts）、changePassword（lib/auth.ts）。DB の変更は無い。
 * 表示：アカウント情報（最終ログイン・事務所名と役割）、事務所名の変更（所有者のみ）、パスワードの変更、監査ログ。
 * メールとログアウトは app/m/account/page.tsx の最初の一覧が出す。
 * メンバー一覧（閲覧のみ。氏名またはメールアドレスと役割）は MobileMembers。追加・削除・役割の変更は PC 版の MembersPanel。
 */
export function MobileAccountDetails() {
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

  // 再認証などでセッション情報が更新されても、入力途中の内容を上書きしないよう、ユーザー ID の変化でのみ読み込む（PC 版と同じ）
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
    <>
      <GroupedList header={t("account.infoTitle")}>
        {error ? (
          <li className="m-row relative">
            <p role="alert" className="px-4 py-3 text-sm font-bold text-danger-text">
              {text.error(error)}
            </p>
          </li>
        ) : info ? (
          <>
            <GroupedRow label={t("account.lastSignIn")} value={info.lastSignInAt ? formatDateTime(info.lastSignInAt) : "-"} />
            <GroupedRow label={t("account.office")} value={t("account.officeWithRole", { name: info.organizationName, role: text.role(info.role) })} />
          </>
        ) : (
          <li className="m-row relative">
            <p role="status" className="px-4 py-3 text-sm text-slate-600">
              {t("account.loading")}
            </p>
          </li>
        )}
      </GroupedList>

      <GroupedList header={t("account.orgTitle")} footer={isOwner || !info ? undefined : t("account.orgOwnerOnly")}>
        <TextRow
          id="m-account-org"
          label={t("account.orgLabel")}
          value={orgName}
          onChange={setOrgName}
          inputProps={{ disabled: !isOwner, autoComplete: "organization" }}
        />
      </GroupedList>
      <div className="mx-4">
        <Button disabled={!isOwner || busy} onClick={() => void saveOrg()} className="w-full text-base">
          {t("account.save")}
        </Button>
        {orgMsg && (
          <p role="status" className="mt-2 break-words text-sm text-slate-700">
            {orgMsg}
          </p>
        )}
      </div>

      {/* メンバー一覧（所有者・管理者のみ。出し分けは表示の制御で、認可はデータベース側の規則が行う） */}
      <MembersSection role={info?.role} myUserId={userId} />

      <form onSubmit={savePassword} aria-label={t("account.pwTitle")}>
        <fieldset disabled={busy} className="min-w-0">
          <GroupedList header={t("account.pwTitle")}>
            {/* パスワード管理ツールがアカウントを結び付けられるよう、メールを隠し欄で渡す（画面には出さない） */}
            <li className="hidden" aria-hidden="true">
              <input type="text" name="username" autoComplete="username" value={info?.email ?? ""} readOnly tabIndex={-1} />
            </li>
            <PasswordRow label={t("account.pwCurrent")} value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} autoComplete="current-password" />
            <PasswordRow label={t("account.pwNew")} hint={t("account.pwNewHint")} value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} autoComplete="new-password" />
            <PasswordRow label={t("account.pwConfirm")} value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} autoComplete="new-password" />
          </GroupedList>
        </fieldset>
        <div className="mx-4">
          {pwMsg && (
            <p role={pwMsg.ok ? "status" : "alert"} className={`mb-2 break-words text-sm font-bold ${pwMsg.ok ? "text-success" : "text-danger-text"}`}>
              {pwMsg.text}
            </p>
          )}
          <Button type="submit" disabled={busy || !info} className="w-full text-base">
            {t("account.pwSubmit")}
          </Button>
        </div>
      </form>

      <GroupedList header={t("account.auditTitle")}>
        {audit === null ? (
          <li className="m-row relative">
            <p role="status" className="px-4 py-3 text-sm text-slate-600">
              {t("account.loading")}
            </p>
          </li>
        ) : audit.length === 0 ? (
          <li className="m-row relative">
            <p role="status" className="px-4 py-3 text-sm text-slate-600">
              {t("account.auditEmpty")}
            </p>
          </li>
        ) : (
          audit.map((a) => (
            <GroupedRow
              key={a.id}
              title={`${text.audit(a.action)}${a.outcome === "failure" ? t("account.auditFailedSuffix") : ""}`}
              subtitle={`${formatDateTime(a.createdAt)} ・ ${caseName(a.caseId)}`}
            />
          ))
        )}
      </GroupedList>
    </>
  );
}
