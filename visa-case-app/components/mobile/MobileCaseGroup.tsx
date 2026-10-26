"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GroupRelationBadge } from "@/components/GroupRelationBadge";
import { SelectRow, TextRow, type PickerOption } from "@/components/mobile/FormRows";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { Sheet } from "@/components/mobile/Sheet";
import { useToast } from "@/components/Toast";
import { ToneIcon } from "@/components/ui";
import { GROUP_RELATIONS, groupNameError, sortCasesInGroup, withGroup } from "@/lib/caseGroups";
import { focusField } from "@/lib/formFocus";
import { relationKey } from "@/lib/i18n/caseGroup";
import { useT } from "@/lib/i18n/LanguageProvider";
import { createGroup, deleteGroup, logAudit, renameGroup, settleWrites, updateCase, useCan, useCases, useGroups, useGroupsAvailable } from "@/lib/store";
import type { CaseRecord, GroupRelation } from "@/lib/types";

const NEW = "__new__";
const ROW_ID = "m-case-group-open";
const MANAGE_ID = "m-case-group-manage";
const fieldId = (k: string) => `m-case-group-${k}`;

/** グループの編集シート。グループに入れる・移す・外す、新しいグループをその場で作る、主たる申請人との関係を選ぶ（表示用の印のみ） */
function GroupSheet({ record, onClose }: { record: CaseRecord; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const groups = useGroups();
  const [choice, setChoice] = useState(record.groupId && groups.some((g) => g.id === record.groupId) ? record.groupId : "");
  const [newName, setNewName] = useState("");
  const [relation, setRelation] = useState<GroupRelation | "">(record.groupRelation ?? "");
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // 保存に失敗して「完了」を押し直したとき、同じ名前のグループを重ねて作らない
  const made = useRef<{ name: string; id: string } | null>(null);

  const groupOptions: PickerOption[] = [
    ...groups.map((g) => ({ value: g.id, label: g.name })),
    { value: NEW, label: t("caseGroup.newOption") },
  ];
  const relationOptions: PickerOption[] = GROUP_RELATIONS.map((r) => ({ value: r, label: t(relationKey(r)) }));

  async function done() {
    if (busy) return;
    setFailed(false);
    let groupId = choice === NEW ? "" : choice;
    if (choice === NEW) {
      const problem = groupNameError(newName);
      if (problem) {
        setError(t(problem === "required" ? "caseGroup.errNameRequired" : "caseGroup.errNameTooLong"));
        requestAnimationFrame(() => focusField(fieldId("newName")));
        return;
      }
      if (made.current?.name !== newName.trim()) {
        const g = createGroup(newName);
        if (!g) return;
        made.current = { name: g.name, id: g.id };
      }
      groupId = made.current.id;
    }
    if (groupId === (record.groupId ?? "") && (groupId ? relation : "") === (record.groupRelation ?? "")) {
      onClose();
      return;
    }
    setBusy(true);
    updateCase(record.id, (c) => withGroup(c, groupId, groupId ? relation : ""));
    const failure = await settleWrites();
    setBusy(false);
    if (failure) {
      setFailed(true);
      return;
    }
    // グループ名・関係の値は監査ログに残さず、変更された項目名のみを記録する
    logAudit(record.id, "case_info_saved", { groupId: undefined });
    toast.success(t("caseGroup.saved"));
    onClose();
  }

  return (
    <Sheet
      title={t("caseGroup.heading")}
      cancelLabel={t("mobileDetail.editCancel")}
      doneLabel={busy ? t("mobileDetail.editSaving") : t("mobileDetail.editDone")}
      busy={busy}
      onClose={onClose}
      onDone={() => void done()}
    >
      {failed && (
        <div role="alert" className="mx-4 mt-4 rounded-[10px] border border-danger-line bg-danger-soft p-3 text-sm text-danger-text">
          <p className="flex items-center gap-1.5 font-bold">
            <ToneIcon tone="red" />
            {t("mobileDetail.editSaveFailedTitle")}
          </p>
          <p className="mt-1">{t("mobileDetail.editSaveFailed")}</p>
        </div>
      )}
      <GroupedList footer={choice === "" && record.groupId ? t("caseGroup.removeNote") : undefined}>
        <SelectRow
          id={fieldId("select")}
          label={t("caseGroup.groupSelectLabel")}
          options={groupOptions}
          value={choice}
          onChange={(v) => {
            setChoice(v);
            setError("");
          }}
          placeholder={t("caseGroup.none")}
          wrapValue
        />
        {choice === NEW && (
          <TextRow id={fieldId("newName")} label={t("caseGroup.newNameLabel")} required value={newName} onChange={setNewName} error={error || undefined} />
        )}
        {choice !== "" && (
          <SelectRow
            id={fieldId("relation")}
            label={t("caseGroup.relationHeading")}
            options={relationOptions}
            value={relation}
            onChange={(v) => setRelation(v as GroupRelation | "")}
            placeholder={t("caseGroup.relationUnset")}
            wrapValue
          />
        )}
      </GroupedList>
      <p className="mx-4 mb-4 text-xs text-slate-600">{t("caseGroup.hint")}</p>
    </Sheet>
  );
}

/** グループの名前の変更・削除のシート。削除しても所属の案件は消えない（グループから外れるだけ）。削除は、削除できる役割のみ */
function ManageSheet({ group, canDelete, onClose }: { group: { id: string; name: string }; canDelete: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState(group.name);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function done() {
    if (busy) return;
    setFailed(false);
    const problem = groupNameError(name);
    if (problem) {
      setError(t(problem === "required" ? "caseGroup.errNameRequired" : "caseGroup.errNameTooLong"));
      requestAnimationFrame(() => focusField(fieldId("rename")));
      return;
    }
    if (name.trim() === group.name) {
      onClose();
      return;
    }
    setBusy(true);
    const ok = await renameGroup(group.id, name);
    setBusy(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    toast.success(t("caseGroup.renameSaved"));
    onClose();
  }

  async function remove() {
    if (busy) return;
    setFailed(false);
    setBusy(true);
    const ok = await deleteGroup(group.id);
    setBusy(false);
    if (!ok) {
      setFailed(true);
      setConfirming(false);
      return;
    }
    toast.success(t("caseGroup.deleted"));
    onClose();
  }

  return (
    <Sheet
      title={t("caseGroup.manage")}
      cancelLabel={t("mobileDetail.editCancel")}
      doneLabel={busy ? t("mobileDetail.editSaving") : t("mobileDetail.editDone")}
      busy={busy}
      onClose={onClose}
      onDone={() => void done()}
    >
      {failed && (
        <div role="alert" className="mx-4 mt-4 rounded-[10px] border border-danger-line bg-danger-soft p-3 text-sm text-danger-text">
          <p className="flex items-center gap-1.5 font-bold">
            <ToneIcon tone="red" />
            {t("mobileDetail.editSaveFailedTitle")}
          </p>
          <p className="mt-1">{t("mobileDetail.editSaveFailed")}</p>
        </div>
      )}
      <GroupedList>
        <TextRow id={fieldId("rename")} label={t("caseGroup.renameLabel")} required value={name} onChange={setName} error={error || undefined} />
      </GroupedList>
      {canDelete && (
        <div className="mx-4 mb-4">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="min-h-[44px] w-full rounded-[10px] border border-danger-line bg-danger-soft px-4 py-2 text-base font-bold text-danger-text active:opacity-80"
            >
              {t("caseGroup.deleteOpen")}
            </button>
          ) : (
            <div role="alertdialog" aria-label={t("caseGroup.deleteTitle")} className="rounded-[10px] border border-danger-line bg-danger-soft p-3 text-sm text-danger-text">
              <p className="font-bold">{t("caseGroup.deleteTitle")}</p>
              <p className="mt-1">{t("caseGroup.deleteMessage", { name: group.name })}</p>
              <p className="mt-1 text-xs">{t("caseGroup.deleteNote")}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="min-h-[44px] flex-1 rounded-[10px] border border-slate-300 bg-white px-4 py-2 text-base text-slate-900">
                  {t("caseGroup.cancel")}
                </button>
                <button type="button" disabled={busy} onClick={() => void remove()} className="min-h-[44px] flex-1 rounded-[10px] bg-danger-text px-4 py-2 text-base font-bold text-white active:opacity-80">
                  {t("caseGroup.deleteConfirm")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

/**
 * 案件詳細（iPhone 版）の「グループ」。グループ名・主たる申請人との関係（文字の印）・同じグループの他の案件を出し、
 * 編集できる役割には、グループの行から編集シートを開く。グループの機能が使えない間（移行 0027 の未適用）は、グループに入っていない案件では何も出さない。
 */
export function MobileCaseGroup({ record }: { record: CaseRecord }) {
  const t = useT();
  const available = useGroupsAvailable();
  const groups = useGroups();
  const cases = useCases();
  const canEdit = useCan("edit");
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const canDelete = useCan("deleteGroup");
  const wasOpen = useRef(false);
  const wasManage = useRef(false);
  const current = groups.find((g) => g.id === record.groupId);
  const others = useMemo(
    () => (current ? sortCasesInGroup(cases.filter((c) => c.groupId === current.id && c.id !== record.id)) : []),
    [cases, current, record.id],
  );

  // 閉じた後は、グループの行へフォーカスを戻す
  useEffect(() => {
    if (wasOpen.current && !open) document.getElementById(ROW_ID)?.focus();
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (wasManage.current && !manageOpen) (document.getElementById(MANAGE_ID) ?? document.getElementById(ROW_ID))?.focus();
    wasManage.current = manageOpen;
  }, [manageOpen]);

  if (!available && !current) return null;
  const editable = canEdit && available;
  const name = current ? current.name : <span className="text-slate-600">{t("caseGroup.notIn")}</span>;

  return (
    <>
      <GroupedList header={t("caseGroup.heading")} footer={current ? t("caseGroup.sortNote") : undefined}>
        <li className="m-row relative">
          {editable ? (
            <button
              type="button"
              id={ROW_ID}
              aria-haspopup="dialog"
              onClick={() => setOpen(true)}
              className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left text-base active:bg-slate-100"
            >
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="min-w-0 max-w-full break-words font-medium">{t("caseGroup.groupSelectLabel")}</span>
                <span className="min-w-0 max-w-full flex-1 basis-1/3 break-words text-right text-slate-600">{name}</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
                <path d="m1 1 6 6-6 6" />
              </svg>
            </button>
          ) : (
            <div className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-base">
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="min-w-0 max-w-full break-words font-medium">{t("caseGroup.groupSelectLabel")}</span>
                <span className="min-w-0 max-w-full flex-1 basis-1/3 break-words text-right text-slate-600">{name}</span>
              </span>
            </div>
          )}
        </li>
        {current && editable && (
          <GroupedRow id={MANAGE_ID} title={t("caseGroup.manage")} onClick={() => setManageOpen(true)} />
        )}
        {current && (
          <GroupedRow
            label={t("caseGroup.relationHeading")}
            value={record.groupRelation ? <GroupRelationBadge relation={record.groupRelation} /> : t("caseGroup.relationUnset")}
          />
        )}
      </GroupedList>

      {current && others.length > 0 && (
        <GroupedList header={t("caseGroup.membersHeading")}>
          {others.map((c) => (
            <GroupedRow
              key={c.id}
              href={`/m/cases/${c.id}`}
              title={c.caseName}
              subtitle={c.groupRelation ? <GroupRelationBadge relation={c.groupRelation} /> : undefined}
            />
          ))}
        </GroupedList>
      )}
      {manageOpen && current && createPortal(<ManageSheet group={current} canDelete={canDelete} onClose={() => setManageOpen(false)} />, document.querySelector(".m-root") ?? document.body)}
      {open && createPortal(<GroupSheet record={record} onClose={() => setOpen(false)} />, document.querySelector(".m-root") ?? document.body)}
    </>
  );
}
