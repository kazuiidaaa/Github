"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GroupRelationBadge } from "@/components/GroupRelationBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { Button, Field, inputClass } from "@/components/ui";
import { GROUP_RELATIONS, groupNameError, normalizeRelation, sortCasesInGroup, withGroup } from "@/lib/caseGroups";
import { focusField } from "@/lib/formFocus";
import { relationKey } from "@/lib/i18n/caseGroup";
import { useT } from "@/lib/i18n/LanguageProvider";
import { createGroup, deleteGroup, logAudit, renameGroup, updateCase, useCan, useCases, useGroups, useGroupsAvailable } from "@/lib/store";
import type { CaseRecord, GroupRelation } from "@/lib/types";

const NEW = "__new__";
const EDIT_BUTTON_ID = "case-group-edit";
const SELECT_ID = "case-group-select";
const NAME_ID = "case-group-new-name";
const RENAME_ID = "case-group-rename";

/**
 * 案件詳細の「グループ」。案件を、グループに入れる・移す・外す（案件は消えない）。新しいグループをその場で作って入れることもできる。
 * 「主たる申請人との関係」は表示用の印のみ（判定・自動処理には使わない）。主たる申請人は、1グループに何人でも置ける。
 * グループの機能が使えない間（移行 0027 の未適用）は、グループに入っていない案件では何も出さない。
 */
export function CaseGroupSection({ record, canEdit }: { record: CaseRecord; canEdit: boolean }) {
  const t = useT();
  const toast = useToast();
  const available = useGroupsAvailable();
  const groups = useGroups();
  const cases = useCases();
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(record.groupId ?? "");
  const [newName, setNewName] = useState("");
  const [relation, setRelation] = useState<GroupRelation | "">(record.groupRelation ?? "");
  const [error, setError] = useState("");
  const canDelete = useCan("deleteGroup");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const focusAfterToggle = useRef<"form" | "editButton" | null>(null);
  useEffect(() => {
    const target = focusAfterToggle.current;
    if (!target) return;
    focusAfterToggle.current = null;
    if (target === "form") focusField(SELECT_ID);
    else document.getElementById(EDIT_BUTTON_ID)?.focus();
  }, [editing]);

  const current = groups.find((g) => g.id === record.groupId);
  const others = useMemo(
    () => (current ? sortCasesInGroup(cases.filter((c) => c.groupId === current.id && c.id !== record.id)) : []),
    [cases, current, record.id],
  );
  if (!available && !current) return null;

  function start() {
    setChoice(current ? current.id : "");
    setNewName("");
    setRelation(record.groupRelation ?? "");
    setError("");
    focusAfterToggle.current = "form";
    setEditing(true);
  }

  async function saveRename() {
    if (!current || busy) return;
    const problem = groupNameError(renameValue);
    if (problem) {
      setRenameError(t(problem === "required" ? "caseGroup.errNameRequired" : "caseGroup.errNameTooLong"));
      requestAnimationFrame(() => focusField(RENAME_ID));
      return;
    }
    setBusy(true);
    const done = await renameGroup(current.id, renameValue);
    setBusy(false);
    if (done) {
      toast.success(t("caseGroup.renameSaved"));
      setRenaming(false);
    }
  }

  async function confirmDelete() {
    if (!current || busy) return;
    setBusy(true);
    const done = await deleteGroup(current.id);
    setBusy(false);
    setDeleting(false);
    if (done) toast.success(t("caseGroup.deleted"));
  }

  function finish() {
    focusAfterToggle.current = "editButton";
    setEditing(false);
  }

  function save() {
    let groupId = choice === NEW ? "" : choice;
    if (choice === NEW) {
      const problem = groupNameError(newName);
      if (problem) {
        setError(t(problem === "required" ? "caseGroup.errNameRequired" : "caseGroup.errNameTooLong"));
        requestAnimationFrame(() => focusField(NAME_ID));
        return;
      }
      const made = createGroup(newName);
      if (!made) return;
      groupId = made.id;
    }
    updateCase(record.id, (c) => withGroup(c, groupId, groupId ? relation : ""));
    // グループ名・関係の値は監査ログに残さず、変更された項目名のみを記録する
    logAudit(record.id, "case_info_saved", { groupId: undefined });
    toast.success(t("caseGroup.saved"));
    finish();
  }

  const rel = normalizeRelation(record.groupRelation);

  return (
    <section className="mac-card rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:p-6" aria-labelledby="case-group-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="case-group-heading" className="font-semibold">
          {t("caseGroup.heading")}
        </h2>
        {canEdit && available && !editing && (
          <Button id={EDIT_BUTTON_ID} variant="secondary" onClick={start}>
            {t("caseGroup.edit")}
          </Button>
        )}
      </div>
      {!editing ? (
        <>
          <dl className="grid grid-cols-1 gap-y-1 md:grid-cols-[10rem_1fr] md:gap-y-3">
            <dt className="text-muted">{t("caseGroup.groupSelectLabel")}</dt>
            <dd className="mb-2 break-words md:mb-0">{current ? current.name : <span className="text-muted">{t("caseGroup.notIn")}</span>}</dd>
            {current && (
              <>
                <dt className="text-muted">{t("caseGroup.relationHeading")}</dt>
                <dd className="mb-2 md:mb-0">{rel ? <GroupRelationBadge relation={rel} /> : <span className="text-muted">{t("caseGroup.relationUnset")}</span>}</dd>
              </>
            )}
          </dl>
          {current && (
            <div className="mt-4">
              <h3 className="mb-1 text-mac-footnote font-bold text-muted">{t("caseGroup.membersHeading")}</h3>
              {others.length === 0 ? (
                <p className="text-muted">{t("caseGroup.membersEmpty")}</p>
              ) : (
                <ul className="divide-y divide-separator rounded-mac-group border border-separator">
                  {others.map((c) => (
                    <li key={c.id} className="flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                      <Link href={`/cases/${c.id}`} className="min-w-0 break-words font-medium text-blue-700 hover:underline">
                        {c.caseName}
                      </Link>
                      <GroupRelationBadge relation={c.groupRelation} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {current && canEdit && available && (
            <div className="mt-4 border-t border-separator pt-4">
              <h3 className="mb-2 text-mac-footnote font-bold text-muted">{t("caseGroup.manage")}</h3>
              {renaming ? (
                <div className="space-y-3">
                  <Field label={t("caseGroup.renameLabel")} required error={renameError}>
                    <input
                      id={RENAME_ID}
                      className={inputClass}
                      value={renameValue}
                      aria-invalid={renameError ? true : undefined}
                      onChange={(e) => setRenameValue(e.target.value)}
                    />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button type="button" variant="secondary" disabled={busy} onClick={() => setRenaming(false)}>
                      {t("caseGroup.cancel")}
                    </Button>
                    <Button type="button" disabled={busy} onClick={() => void saveRename()}>
                      {t("caseGroup.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setRenameValue(current.name);
                      setRenameError("");
                      setRenaming(true);
                      requestAnimationFrame(() => focusField(RENAME_ID));
                    }}
                  >
                    {t("caseGroup.renameOpen")}
                  </Button>
                  {canDelete && (
                    <Button type="button" variant="danger" onClick={() => setDeleting(true)}>
                      {t("caseGroup.deleteOpen")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          <p className="mt-4 text-xs text-muted">{t("caseGroup.hint")}</p>
          {deleting && current && (
            <ConfirmDialog
              title={t("caseGroup.deleteTitle")}
              message={t("caseGroup.deleteMessage", { name: current.name })}
              note={t("caseGroup.deleteNote")}
              confirmLabel={t("caseGroup.deleteConfirm")}
              tone="caution"
              busy={busy}
              onCancel={() => setDeleting(false)}
              onConfirm={() => void confirmDelete()}
            />
          )}
        </>
      ) : (
        <div className="space-y-5">
          <Field label={t("caseGroup.groupSelectLabel")} hint={choice === "" && current ? t("caseGroup.removeNote") : undefined}>
            <select
              id={SELECT_ID}
              className={inputClass}
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value);
                setError("");
              }}
            >
              <option value="">{t("caseGroup.none")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
              <option value={NEW}>{t("caseGroup.newOption")}</option>
            </select>
          </Field>
          {choice === NEW && (
            <Field label={t("caseGroup.newNameLabel")} required error={error}>
              <input id={NAME_ID} className={inputClass} value={newName} aria-invalid={error ? true : undefined} onChange={(e) => setNewName(e.target.value)} />
            </Field>
          )}
          {choice !== "" && (
            <Field label={t("caseGroup.relationHeading")}>
              <select className={inputClass} value={relation} onChange={(e) => setRelation(e.target.value as GroupRelation | "")}>
                <option value="">{t("caseGroup.relationUnset")}</option>
                {GROUP_RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(relationKey(r))}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <p className="text-xs text-muted">{t("caseGroup.hint")}</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={finish}>
              {t("caseGroup.cancel")}
            </Button>
            <Button type="button" onClick={save}>
              {t("caseGroup.save")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
