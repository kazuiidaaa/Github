"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Field, inputClass } from "@/components/ui";
import type { FormDetails } from "@/lib/formDetails";
import { HSP_PASS_POINTS, HSP_POINT_SHEETS, estimateHspPoints, hspPointConfirmLines, pointCheckId, resolveHspPointSheet, type HspPointSheetKey } from "@/lib/hspPoints";
import { useDemo } from "@/lib/demo";
import { downloadHspPointXlsx } from "@/lib/documents/officialFormClient";
import { downloadFile, saveHspPointSheet } from "@/lib/documents/store";
import { officialFormNeedsLogin } from "@/lib/documents/officialFormAccess";
import { officialFormInputOf } from "@/lib/documents/officialForms";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { CaseRecord } from "@/lib/types";

/** 区分名（計算表の日本語。キー）ごとの案内文 */
const SECTION_HINTS: Record<string, MessageKey> = {
  年収: "casePoints.hint_income",
  年齢: "casePoints.hint_age",
  特別加算: "casePoints.hint_special",
};

/** 高度専門職のポイント計算表の入力（Issue #186）。選んだチェック欄を、公式様式（エクセル）へ差し込む */
export function HspPointSection({
  record,
  status,
  form,
  onChange,
}: {
  record: CaseRecord;
  /** 使うシートを決める在留資格（認定・変更は希望する在留資格、更新は現在の在留資格） */
  status: string;
  form: FormDetails;
  onChange: <K extends keyof FormDetails>(key: K, value: FormDetails[K]) => void;
}) {
  const t = useT();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<"" | "download" | "save">("");
  const needsLogin = officialFormNeedsLogin(useDemo());
  const resolution = resolveHspPointSheet(status, form.hspPointSheet);
  if (resolution.kind === "not_applicable") return null;
  const sheet: HspPointSheetKey | null = resolution.kind === "resolved" ? resolution.sheet : null;
  const def = sheet ? HSP_POINT_SHEETS[sheet] : null;
  const estimate = sheet ? estimateHspPoints(sheet, form.hspPointChecks, t) : null;

  function toggle(id: string, on: boolean) {
    onChange("hspPointChecks", on ? [...form.hspPointChecks, id] : form.hspPointChecks.filter((x) => x !== id));
  }

  async function save() {
    setConfirming("");
    setBusy(true);
    setMessage("");
    try {
      const input = { ...officialFormInputOf(record), formDetails: JSON.parse(JSON.stringify(form)) as FormDetails, targetStatus: status };
      const created = await saveHspPointSheet(record, input);
      await downloadFile(created);
      setMessage(t("casePoints.savedMessage", { version: created.version }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("casePoints.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setConfirming("");
    setBusy(true);
    setMessage("");
    try {
      const input = { ...officialFormInputOf(record), formDetails: JSON.parse(JSON.stringify(form)) as FormDetails, targetStatus: status };
      const warnings = await downloadHspPointXlsx(record.procedureType, input, `ポイント計算表_${record.caseName}.xlsx`.replace(/[\\/:*?"<>|]/g, "_"));
      setMessage(warnings.length > 0 ? t("casePoints.createdWithWarnings", { warnings: warnings.join(" ") }) : t("casePoints.created"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("casePoints.createFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">{t("casePoints.title")}</h2>
      <p className="mb-4 mt-1 text-xs text-slate-500">
        {t("casePoints.intro")}
      </p>
      {resolution.kind === "needs_choice" || !resolution.fromGrade ? (
        <div className="mb-4 max-w-sm">
          <Field label={t("casePoints.sheetLabel")} hint={t("casePoints.sheetHint")}>
            <select className={inputClass} value={form.hspPointSheet} onChange={(e) => onChange("hspPointSheet", e.target.value)}>
              <option value="">{t("casePoints.sheetChoose")}</option>
              {(Object.keys(HSP_POINT_SHEETS) as HspPointSheetKey[]).map((k) => (
                <option key={k} value={k}>
                  {HSP_POINT_SHEETS[k].label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <p className="mb-4 text-sm">{t("casePoints.sheetFixed", { label: def?.label ?? "" })}</p>
      )}
      {def && sheet && (
        <>
          <div className="space-y-1">
            {def.rows.map((r, i) => {
              const id = pointCheckId(sheet, r.row);
              const heading = i === 0 || def.rows[i - 1].section !== r.section ? r.section : "";
              return (
                <div key={id}>
                  {heading && (
                    <div className="mt-4 text-xs font-semibold text-slate-600">
                      {heading}
                      {SECTION_HINTS[heading] && <p className="mt-0.5 font-normal text-slate-500">{t(SECTION_HINTS[heading])}</p>}
                    </div>
                  )}
                  <label className="flex items-start gap-2 py-0.5 text-sm">
                    <input type="checkbox" className="mt-1" checked={form.hspPointChecks.includes(id)} onChange={(e) => toggle(id, e.target.checked)} />
                    <span className="flex-1">{r.label}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {r.points === null ? t("casePoints.pointsUnknown") : t("casePoints.pointsValue", { points: r.points })}
                      {r.evidence && `　${r.evidence}`}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
          {estimate && (
            <div role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
              <p>
                {t("casePoints.estimateTotal")}
                <strong>{t("casePoints.estimatePoints", { total: estimate.total })}</strong>
                {t("casePoints.estimatePass", { pass: HSP_PASS_POINTS, result: estimate.reachesPass ? t("casePoints.reached") : t("casePoints.notReached") })}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t("casePoints.estimateNote")}</p>
              {estimate.notes.map((n) => (
                <p key={n} className="mt-1 text-xs text-amber-900">
                  {n}
                </p>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={busy || needsLogin} onClick={() => setConfirming("save")}>
              {t("casePoints.saveButton")}
            </Button>
            <Button variant="secondary" disabled={busy || needsLogin} onClick={() => setConfirming("download")}>
              {t("casePoints.downloadButton")}
            </Button>
            {needsLogin && <span className="text-xs text-amber-900">{t("casePoints.loginRequired")}</span>}
            <span role="status" className="text-xs text-slate-600">
              {message}
            </span>
          </div>
        </>
      )}
      {confirming && estimate && (
        <ConfirmDialog
          title={confirming === "save" ? t("casePoints.confirmSaveTitle") : t("casePoints.confirmDownloadTitle")}
          message={hspPointConfirmLines(estimate, t).map((line) => (
            <span key={line} className="mt-1 block first:mt-0">
              {line}
            </span>
          ))}
          confirmLabel={confirming === "save" ? t("casePoints.confirmSaveButton") : t("casePoints.confirmDownloadButton")}
          onCancel={() => setConfirming("")}
          onConfirm={() => void (confirming === "save" ? save() : download())}
        />
      )}
    </section>
  );
}
