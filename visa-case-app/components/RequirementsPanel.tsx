"use client";

import { DateField } from "@/components/DateField";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { Badge, Button } from "@/components/ui";
import { CustomRequirementForm, type CustomRequirementInput } from "@/components/CustomRequirementForm";
import { findDocumentOfType } from "@/lib/documentKinds";
import { formatDateTime, todayString } from "@/lib/format";
import { noRuleMessage } from "@/lib/i18n/caseNew";
import { reasonText, requirementName, requirementNote } from "@/lib/i18n/caseRequirements";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import { useLabels } from "@/lib/i18n/labels";
import { ruleText } from "@/lib/i18n/ruleTexts";
import { evaluate, type EvaluatedItem, type Result } from "@/lib/requirements/evaluate";
import { isOverdue, progressOf } from "@/lib/requirements/progress";
import { logAudit, newId, updateCase } from "@/lib/store";
import { useAutoSave } from "@/lib/useAutoSave";
import {
  REQUIREMENT_STATUSES,
  type CaseRecord,
  type CustomRequirement,
  type DocumentRecord,
  type RequirementState,
  type RequirementStatus,
} from "@/lib/types";

const RESULT_KEY = {
  required: "caseRequirements.resultRequired",
  not_required: "caseRequirements.resultNotRequired",
  check: "caseRequirements.resultCheck",
} as const satisfies Record<Result, string>;
const RESULT_TONE: Record<Result, "red" | "gray" | "yellow"> = { required: "red", not_required: "gray", check: "yellow" };
const PARTY_KEY = { applicant: "caseRequirements.partyApplicant", organization: "caseRequirements.partyOrganization" } as const;

// 狭い画面幅（md 未満）では、表の行をカード状に縦積みして表示する。
// 同じ要素を表示用に2重に描画すると、入力欄の状態（理由の自動保存）が二重になるため、
// 1つの表を CSS だけで切り替える。md 以上は従来の表形式のまま。
const TABLE_CLASS = "block w-full text-left text-sm md:table";
const THEAD_CLASS = "hidden bg-slate-50 text-slate-600 md:table-header-group";
const TBODY_CLASS = "block md:table-row-group";
const TR_CLASS = "block border-t border-slate-100 px-4 py-3 align-top first:border-t-0 md:table-row md:p-0 md:first:border-t";
const TD_CLASS = "block py-1.5 md:table-cell md:px-4 md:py-3";

/** 狭い画面幅でのみ表示する、項目名のラベル */
function CellLabel({ children }: { children: string }) {
  return <span className="mb-1 block text-xs text-slate-500 md:hidden">{children}</span>;
}

function StatusSelect({ label, value, onChange }: { label: string; value: RequirementStatus; onChange: (v: RequirementStatus) => void }) {
  const t = useT();
  const labels = useLabels();
  const options: ChoiceOption[] = REQUIREMENT_STATUSES.map((st) => ({ value: st, label: labels.requirementStatus(st) }));
  return <ChoiceGroup legend={t("caseRequirements.statusAria", { label })} hideLegend options={options} value={value} onChange={(v) => onChange(v as RequirementStatus)} />;
}

const selectClass = "rounded-xl border border-line-strong bg-white px-2 py-1 text-xs";

function DueInput({ label, value, overdue, onChange }: { label: string; value?: string; overdue: boolean; onChange: (v: string) => void }) {
  const t = useT();
  return (
    <div>
      <DateField
        aria-label={t("caseRequirements.dueAria", { label })}
        className={`${selectClass} w-32 ${overdue ? "border-red-400 bg-red-50" : ""}`}
        value={value ?? ""}
        onChange={onChange}
      />
      {overdue && <p className="mt-1 text-xs font-medium text-red-700">{t("caseRequirements.overdue")}</p>}
    </div>
  );
}

export function RequirementsPanel({
  record,
  onGoEmployment,
  onGoDocuments,
}: {
  record: CaseRecord;
  onGoEmployment: () => void;
  onGoDocuments: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const ev = evaluate(record);
  const today = todayString();
  const progress = progressOf(ev, record.customRequirements, today);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<CustomRequirement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function patchCustom(id: string, change: Partial<CustomRequirement>, action: string) {
    updateCase(record.id, (c) => ({
      ...c,
      customRequirements: c.customRequirements.map((r) => (r.id === id ? { ...r, ...change } : r)),
    }));
    logAudit(record.id, action, { requirementId: id, ...change });
  }

  function addCustom(v: CustomRequirementInput) {
    const item: CustomRequirement = { id: newId(), status: "not_received", ...v };
    updateCase(record.id, (c) => ({ ...c, customRequirements: [...c.customRequirements, item] }));
    logAudit(record.id, "custom_requirement_added", { requirementId: item.id, name: item.name });
    setAdding(false);
  }

  function editCustom(id: string, v: CustomRequirementInput) {
    patchCustom(id, v, "custom_requirement_updated");
    setEditingId(null);
  }

  function removeCustom(r: CustomRequirement) {
    setRemoving(null);
    updateCase(record.id, (c) => ({ ...c, customRequirements: c.customRequirements.filter((x) => x.id !== r.id) }));
    logAudit(record.id, "custom_requirement_deleted", { requirementId: r.id, name: r.name });
  }

  function patch(id: string, change: Partial<RequirementState>, action: string) {
    updateCase(record.id, (c) => {
      const prev = c.requirementStates[id] ?? { status: "not_received" as const };
      return { ...c, requirementStates: { ...c.requirementStates, [id]: { ...prev, ...change } } };
    });
    logAudit(record.id, action, { requirementId: id, ...change });
  }

  /** 進捗の項目（規則の書類、または追加した書類）の表示名。規則の書類は訳し、追加した書類は入力のまま */
  function nameOf(i: { key: string; name: string }): string {
    const item = ev.items.find((x) => x.rule.id === i.key);
    return item ? requirementName(t, lang, item.rule) : i.name;
  }

  async function copyMissing() {
    const lines = progress.missing.map((i) => `・${nameOf(i)}${i.dueDate ? t("caseRequirements.dueSuffix", { date: i.dueDate }) : ""}`);
    try {
      await navigator.clipboard.writeText(`${t("caseRequirements.copyHeader")}\n${lines.join("\n")}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <p className="font-medium">
          {t("caseRequirements.candidateNotice")}
        </p>
        {ev.ruleSet && (
          <>
            <p className="mt-2">
              {t("caseRequirements.ruleSetHeading", { title: ruleText(lang, ev.ruleSet.title), date: ev.ruleSet.checkedAt })}
            </p>
            <p className="mt-1">
              {t("caseRequirements.referenceNotice")}
            </p>
            <ul className="mt-1 list-inside list-disc">
              {ev.ruleSet.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                    {ruleText(lang, s.title)}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!ev.ruleSet && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">{noRuleMessage(t)}</p>}

      {ev.ruleSet && ev.needsCategory && (
        <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          {t(ev.categoryOutOfRange ? "caseRequirements.categoryOutOfRange" : "caseRequirements.needsCategory")}
          <button onClick={onGoEmployment} className="ml-2 underline">
            {t("caseRequirements.needsCategoryAction")}
          </button>
        </p>
      )}

      {ev.ruleSet && ev.needsCause && (
        <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          {t("caseRequirements.needsCause")}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p>
          {t("caseRequirements.summaryRequired", { count: progress.requiredCount })}
          {t("caseRequirements.summaryReceived", { count: progress.receivedCount })}
          <span className={progress.missing.length > 0 ? "font-semibold text-red-700" : "text-green-700"}>{t("caseRequirements.summaryMissing", { count: progress.missing.length })}</span>
          {progress.overdue.length > 0 && <span className="ml-2 font-semibold text-red-700">{t("caseRequirements.summaryOverdue", { count: progress.overdue.length })}</span>}
          {ev.toCheck.length > 0 && <span className="ml-2 text-yellow-800">{t("caseRequirements.summaryToCheck", { count: ev.toCheck.length })}</span>}
        </p>
        {progress.missing.length > 0 && (
          <div className="mt-3">
            <ul className="list-inside list-disc text-slate-700">
              {progress.missing.map((i) => (
                <li key={i.key}>
                  {nameOf(i)}
                  {i.dueDate && <span className="ml-1 text-xs text-slate-500">{t("caseRequirements.dueSuffix", { date: i.dueDate })}</span>}
                </li>
              ))}
            </ul>
            <button onClick={() => void copyMissing()} className="mt-2 rounded-full border border-line-strong px-3 py-1 font-bold hover:bg-slate-50">
              {t("caseRequirements.copyMissing")}
            </button>
            {copied && <span className="ml-2 text-green-700">{t("caseRequirements.copied")}</span>}
          </div>
        )}
      </section>

      {ev.ruleSet && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white md:overflow-x-auto">
          <table className={TABLE_CLASS}>
            <thead className={THEAD_CLASS}>
              <tr>
                <th className="px-4 py-3">{t("caseRequirements.colDocument")}</th>
                <th className="px-4 py-3">{t("caseRequirements.colParty")}</th>
                <th className="px-4 py-3">{t("caseRequirements.colResult")}</th>
                <th className="px-4 py-3">{t("caseRequirements.colStatus")}</th>
                <th className="px-4 py-3">{t("caseRequirements.colDue")}</th>
                <th className="px-4 py-3">{t("caseRequirements.colJudgment")}</th>
              </tr>
            </thead>
            <tbody className={TBODY_CLASS}>
              {ev.items.map((i) => (
                <Row
                  key={i.rule.id}
                  item={i}
                  today={today}
                  onPatch={patch}
                  photo={i.rule.id === "photo" ? findDocumentOfType(record.documents, "photo") : undefined}
                  onGoDocuments={onGoDocuments}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("caseRequirements.customHeading")}</h3>
          {!adding && (
            <Button variant="secondary" onClick={() => setAdding(true)}>
              {t("caseRequirements.addDocument")}
            </Button>
          )}
        </div>
        {adding && <CustomRequirementForm onSubmit={addCustom} onCancel={() => setAdding(false)} />}
        {record.customRequirements.length === 0 && !adding && (
          <p className="text-sm text-slate-500">{t("caseRequirements.customEmpty")}</p>
        )}
        {record.customRequirements.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white md:overflow-x-auto">
            <table className={TABLE_CLASS}>
              <thead className={THEAD_CLASS}>
                <tr>
                  <th className="px-4 py-3">{t("caseRequirements.colDocument")}</th>
                  <th className="px-4 py-3">{t("caseRequirements.colParty")}</th>
                  <th className="px-4 py-3">{t("caseRequirements.colRequired")}</th>
                  <th className="px-4 py-3">{t("caseRequirements.colStatus")}</th>
                  <th className="px-4 py-3">{t("caseRequirements.colDue")}</th>
                  <th className="px-4 py-3">{t("caseRequirements.colActions")}</th>
                </tr>
              </thead>
              <tbody className={TBODY_CLASS}>
                {record.customRequirements.map((r) =>
                  editingId === r.id ? (
                    <tr key={r.id} className={TR_CLASS}>
                      <td colSpan={6} className={TD_CLASS}>
                        <CustomRequirementForm initial={r} onSubmit={(v) => editCustom(r.id, v)} onCancel={() => setEditingId(null)} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} className={TR_CLASS}>
                      <td className={TD_CLASS}>
                        <p>{r.name}</p>
                        {r.note && <p className="mt-1 text-xs text-slate-500">{r.note}</p>}
                      </td>
                      <td className={`${TD_CLASS} md:whitespace-nowrap`}>
                        <CellLabel>{t("caseRequirements.colParty")}</CellLabel>
                        {t(PARTY_KEY[r.party])}
                      </td>
                      <td className={`${TD_CLASS} md:whitespace-nowrap`}>
                        <CellLabel>{t("caseRequirements.colRequired")}</CellLabel>
                        {r.isRequired ? t("caseRequirements.isRequired") : t("caseRequirements.isOptional")}
                      </td>
                      <td className={TD_CLASS}>
                        <CellLabel>{t("caseRequirements.colStatus")}</CellLabel>
                        <StatusSelect label={r.name} value={r.status} onChange={(v) => patchCustom(r.id, { status: v }, "requirement_status_changed")} />
                      </td>
                      <td className={TD_CLASS}>
                        <CellLabel>{t("caseRequirements.colDue")}</CellLabel>
                        <DueInput
                          label={r.name}
                          value={r.dueDate}
                          overdue={isOverdue(r.status, r.dueDate, today)}
                          onChange={(v) => patchCustom(r.id, { dueDate: v || undefined }, "requirement_due_changed")}
                        />
                      </td>
                      <td className={`${TD_CLASS} md:whitespace-nowrap`}>
                        <CellLabel>{t("caseRequirements.colActions")}</CellLabel>
                        <button onClick={() => setEditingId(r.id)} className="mr-3 text-blue-700 underline">
                          {t("caseRequirements.edit")}
                        </button>
                        <button onClick={() => setRemoving(r)} className="text-red-700 underline">
                          {t("caseRequirements.delete")}
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {removing && (
        <ConfirmDialog
          title={t("caseRequirements.removeTitle")}
          message={t("caseRequirements.removeMessage", { name: removing.name })}
          note={t("caseRequirements.removeNote")}
          confirmLabel={t("caseRequirements.removeConfirm")}
          tone="caution"
          onCancel={() => setRemoving(null)}
          onConfirm={() => removeCustom(removing)}
        />
      )}
    </div>
  );
}

function Row({
  item,
  today,
  onPatch,
  photo,
  onGoDocuments,
}: {
  item: EvaluatedItem;
  today: string;
  onPatch: (id: string, change: Partial<RequirementState>, action: string) => void;
  /** 「書類」タブに登録済みの証明写真（写真の行のみ） */
  photo?: DocumentRecord;
  onGoDocuments: () => void;
}) {
  const { rule, state } = item;
  const t = useT();
  const { lang } = useLang();
  const ruleName = requirementName(t, lang, rule);
  const [note, setNote] = useState(state.note ?? "");
  const flushNote = useAutoSave(note, state.note ?? "", (v) => onPatch(rule.id, { note: v }, "requirement_note"));
  return (
    <tr className={TR_CLASS}>
      <td className={TD_CLASS}>
        <p className={item.effective === "not_required" ? "text-slate-400" : ""}>{ruleName}</p>
        <p className="mt-1 text-xs text-slate-500">
          {rule.note
            ? t("caseRequirements.reasonWithNote", {
                reason: reasonText(t, item.reasonCode, (n) => requirementNote(lang, n)),
                note: requirementNote(lang, rule.note),
              })
            : reasonText(t, item.reasonCode, (n) => requirementNote(lang, n))}
        </p>
        {rule.verify && <Badge tone="yellow">{t("caseRequirements.verifyBadge")}</Badge>}
        {rule.id === "photo" && (
          <div className="mt-2 text-xs">
            {photo ? (
              <p className="text-green-700">
                {t("caseRequirements.photoRegistered", { file: photo.fileName, at: formatDateTime(photo.uploadedAt) })}
              </p>
            ) : (
              <p className="text-slate-500">{t("caseRequirements.photoNotRegistered")}</p>
            )}
            <button type="button" onClick={onGoDocuments} className="mt-1 text-blue-700 underline">
              {t("caseRequirements.photoGoDocuments")}
            </button>
          </div>
        )}
      </td>
      <td className={`${TD_CLASS} md:whitespace-nowrap`}>
        <CellLabel>{t("caseRequirements.colParty")}</CellLabel>
        {t(PARTY_KEY[rule.party])}
      </td>
      <td className={`${TD_CLASS} md:whitespace-nowrap`}>
        <CellLabel>{t("caseRequirements.colResult")}</CellLabel>
        <Badge tone={RESULT_TONE[item.result]}>{t(RESULT_KEY[item.result])}</Badge>
        {state.override && (
          <p className="mt-1 text-xs text-slate-500">{t("caseRequirements.overrideNote", { result: t(RESULT_KEY[item.effective]) })}</p>
        )}
      </td>
      <td className={TD_CLASS}>
        <CellLabel>{t("caseRequirements.colStatus")}</CellLabel>
        <StatusSelect label={ruleName} value={state.status} onChange={(v) => onPatch(rule.id, { status: v }, "requirement_status_changed")} />
      </td>
      <td className={TD_CLASS}>
        <CellLabel>{t("caseRequirements.colDue")}</CellLabel>
        <DueInput
          label={ruleName}
          value={state.dueDate}
          overdue={item.effective === "required" && isOverdue(state.status, state.dueDate, today)}
          onChange={(v) => onPatch(rule.id, { dueDate: v || undefined }, "requirement_due_changed")}
        />
      </td>
      <td className={TD_CLASS}>
        <CellLabel>{t("caseRequirements.colJudgment")}</CellLabel>
        <ChoiceGroup
          legend={t("caseRequirements.judgmentAria", { label: ruleName })}
          hideLegend
          options={[
            { value: "default", label: t("caseRequirements.overrideDefault") },
            { value: "required", label: t("caseRequirements.overrideRequired") },
            { value: "not_required", label: t("caseRequirements.overrideNotRequired") },
          ]}
          value={state.override ?? "default"}
          onChange={(v) =>
            onPatch(rule.id, { override: (v === "default" ? undefined : v) as RequirementState["override"] }, "requirement_overridden")
          }
        />
        {state.override && (
          <input
            className="mt-2 w-full rounded-xl border border-line-strong px-2 py-1 text-xs"
            placeholder={t("caseRequirements.reasonPlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={flushNote}
          />
        )}
      </td>
    </tr>
  );
}
