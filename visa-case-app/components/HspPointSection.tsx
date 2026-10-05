"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Field, inputClass } from "@/components/ui";
import type { FormDetails } from "@/lib/formDetails";
import { HSP_PASS_POINTS, HSP_POINT_SHEETS, estimateHspPoints, hspPointConfirmLines, pointCheckId, resolveHspPointSheet, type HspPointSheetKey } from "@/lib/hspPoints";
import { useDemo } from "@/lib/demo";
import { downloadHspPointXlsx } from "@/lib/documents/officialFormClient";
import { OFFICIAL_FORM_LOGIN_REQUIRED, officialFormNeedsLogin } from "@/lib/documents/officialFormAccess";
import { officialFormInputOf } from "@/lib/documents/officialForms";
import type { CaseRecord } from "@/lib/types";

const SECTION_HINTS: Record<string, string> = {
  年収: "年齢によって、選べる年収の範囲が異なります。計算表の欄で確認してください。年収が300万円に満たないときは、他の項目の合計が70点以上でも、高度専門職外国人としては認められません。",
  年齢: "申請の時点の年齢です。",
  特別加算: "大学一覧・日本語能力・イノベーション促進支援措置などの該当は、行政書士が資料で確認して選んでください。",
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
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const needsLogin = officialFormNeedsLogin(useDemo());
  const resolution = resolveHspPointSheet(status, form.hspPointSheet);
  if (resolution.kind === "not_applicable") return null;
  const sheet: HspPointSheetKey | null = resolution.kind === "resolved" ? resolution.sheet : null;
  const def = sheet ? HSP_POINT_SHEETS[sheet] : null;
  const estimate = sheet ? estimateHspPoints(sheet, form.hspPointChecks) : null;

  function toggle(id: string, on: boolean) {
    onChange("hspPointChecks", on ? [...form.hspPointChecks, id] : form.hspPointChecks.filter((x) => x !== id));
  }

  async function download() {
    setConfirming(false);
    setBusy(true);
    setMessage("");
    try {
      const input = { ...officialFormInputOf(record), formDetails: JSON.parse(JSON.stringify(form)) as FormDetails, targetStatus: status };
      const warnings = await downloadHspPointXlsx(record.procedureType, input, `ポイント計算表_${record.caseName}.xlsx`.replace(/[\\/:*?"<>|]/g, "_"));
      setMessage(warnings.length > 0 ? `作成しました。注意：${warnings.join(" ")}` : "作成しました。");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "作成に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">高度専門職のポイント計算表</h2>
      <p className="mb-4 mt-1 text-xs text-slate-500">
        該当する項目を選ぶと、公式の計算表（エクセル）のチェック欄（■）へ差し込みます。合計欄には、選んだ項目の印字点数の合計を書き込みます（点数の印字がない項目や、択一の重複があるときは書き込みません）。該当の判断（大学・日本語能力・加算など）は、行政書士が資料で確認してください。疎明資料の番号（①〜㉑）は、各項目の右に表示します。項目を選ぶと、必要書類の一覧に、その番号ごとの疎明資料が「要確認」で出ます。
      </p>
      {resolution.kind === "needs_choice" || !resolution.fromGrade ? (
        <div className="mb-4 max-w-sm">
          <Field label="使うシート" hint="号が未選択、または高度専門職2号の場合は、1号イ・ロ・ハのいずれかのシートを選びます。">
            <select className={inputClass} value={form.hspPointSheet} onChange={(e) => onChange("hspPointSheet", e.target.value)}>
              <option value="">選択してください</option>
              {(Object.keys(HSP_POINT_SHEETS) as HspPointSheetKey[]).map((k) => (
                <option key={k} value={k}>
                  {HSP_POINT_SHEETS[k].label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <p className="mb-4 text-sm">使うシート：{def?.label}（希望する在留資格の号から決まります）</p>
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
                      {SECTION_HINTS[heading] && <p className="mt-0.5 font-normal text-slate-500">{SECTION_HINTS[heading]}</p>}
                    </div>
                  )}
                  <label className="flex items-start gap-2 py-0.5 text-sm">
                    <input type="checkbox" className="mt-1" checked={form.hspPointChecks.includes(id)} onChange={(e) => toggle(id, e.target.checked)} />
                    <span className="flex-1">{r.label}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {r.points === null ? "点数は計算表で確認" : `${r.points}点`}
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
                選択した項目の印字点数の単純合計（目安）：<strong>{estimate.total}点</strong>（基準 {HSP_PASS_POINTS}点：
                {estimate.reachesPass ? "目安では到達" : "目安では未到達"}）
              </p>
              <p className="mt-1 text-xs text-slate-500">研究実績の組み合わせ・特別加算の上限・年齢による年収の範囲は判定していません。正式な合計は、計算表で確認してください。</p>
              {estimate.notes.map((n) => (
                <p key={n} className="mt-1 text-xs text-amber-900">
                  {n}
                </p>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={busy || needsLogin} onClick={() => setConfirming(true)}>
              ポイント計算表をダウンロード（エクセル）
            </Button>
            {needsLogin && <span className="text-xs text-amber-900">{OFFICIAL_FORM_LOGIN_REQUIRED}</span>}
            <span role="status" className="text-xs text-slate-600">
              {message}
            </span>
          </div>
        </>
      )}
      {confirming && estimate && (
        <ConfirmDialog
          title="ポイント計算表を作成します"
          message={hspPointConfirmLines(estimate).map((line) => (
            <span key={line} className="mt-1 block first:mt-0">
              {line}
            </span>
          ))}
          confirmLabel="確認して作成する"
          onCancel={() => setConfirming(false)}
          onConfirm={() => void download()}
        />
      )}
    </section>
  );
}
