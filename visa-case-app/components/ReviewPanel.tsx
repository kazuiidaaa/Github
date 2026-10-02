"use client";

import { useState } from "react";
import { Badge, Button, inputClass } from "@/components/ui";
import { isValidDate } from "@/lib/format";
import { updateCase } from "@/lib/store";
import type { CaseRecord, DocumentRecord, Extraction, FieldKey } from "@/lib/types";

const CONFIRMER = "自分";
const DATE_FIELDS: FieldKey[] = ["dateOfBirth", "residenceExpiryDate"];

export function ReviewPanel({
  record,
  doc,
  fields,
}: {
  record: CaseRecord;
  doc: DocumentRecord;
  fields: { key: FieldKey; label: string; placeholder: string }[];
}) {
  const [rows, setRows] = useState<Extraction[]>(doc.extractions);
  const confirmedAlready = record.workflowStatus === "confirmed";
  const [saved, setSaved] = useState(false);

  const confirmedCount = rows.filter((r) => r.reviewStatus === "confirmed").length;
  const invalidDates = rows.filter((r) => DATE_FIELDS.includes(r.field) && !isValidDate(r.value));
  const canConfirm = confirmedCount === fields.length && invalidDates.length === 0 && rows.every((r) => r.value.trim());

  function patch(field: FieldKey, change: Partial<Extraction>) {
    setSaved(false);
    setRows((prev) => prev.map((r) => (r.field === field ? { ...r, ...change } : r)));
  }

  function persist(confirm: boolean) {
    const now = new Date().toISOString();
    updateCase(record.id, (c) => {
      const value = (k: FieldKey) => rows.find((r) => r.field === k)?.value ?? "";
      return {
        ...c,
        workflowStatus: confirm ? "confirmed" : "review",
        documents: c.documents.map((d) => (d.id === doc.id ? { ...d, extractions: rows } : d)),
        applicant: confirm
          ? {
              legalName: value("legalName"),
              nationality: value("nationality"),
              dateOfBirth: value("dateOfBirth"),
              residenceStatus: value("residenceStatus"),
              residenceExpiryDate: value("residenceExpiryDate"),
              confirmationStatus: "confirmed",
              confirmedAt: now,
              confirmedBy: CONFIRMER,
            }
          : c.applicant,
      };
    });
    setSaved(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">原本：{doc.fileName}</h2>
        {doc.dataUrl && doc.mimeType.startsWith("image/") && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doc.dataUrl} alt="在留カード" className="max-h-[32rem] w-full rounded border border-slate-200 object-contain" />
        )}
        {doc.dataUrl && doc.mimeType === "application/pdf" && (
          <iframe src={doc.dataUrl} title="在留カード" className="h-[32rem] w-full rounded border border-slate-200" />
        )}
        {!doc.dataUrl && <p className="rounded bg-slate-50 p-8 text-center text-sm text-slate-500">プレビューを保持していません（ファイル容量が大きいか、再読み込みにより破棄されました）。</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 font-semibold">抽出結果（候補）</h2>
        <p className="mb-4 text-xs text-slate-500">原本と照合し、各項目を確認してください。確認するまで正式なデータにはなりません。</p>
        <div className="space-y-4">
          {fields.map((f) => {
            const r = rows.find((x) => x.field === f.key);
            if (!r) return null;
            const lowConfidence = r.confidence < 0.9;
            const dateError = DATE_FIELDS.includes(f.key) && !isValidDate(r.value);
            return (
              <div key={f.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{f.label}</span>
                  <Badge tone={lowConfidence ? "yellow" : "green"}>
                    {lowConfidence ? "要確認" : "高信頼"}（{Math.round(r.confidence * 100)}%）
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    className={inputClass}
                    value={r.value}
                    placeholder={f.placeholder}
                    disabled={confirmedAlready}
                    onChange={(e) => patch(f.key, { value: e.target.value, reviewStatus: "pending" })}
                  />
                  <label className="flex items-center gap-1 whitespace-nowrap text-sm">
                    <input
                      type="checkbox"
                      checked={r.reviewStatus === "confirmed"}
                      disabled={confirmedAlready}
                      onChange={(e) => patch(f.key, { reviewStatus: e.target.checked ? "confirmed" : "pending" })}
                    />
                    確認済み
                  </label>
                </div>
                {dateError && <p className="mt-1 text-xs text-red-600">YYYY-MM-DD の形式で入力してください。</p>}
                {r.value !== r.extractedValue && <p className="mt-1 text-xs text-slate-500">抽出値：{r.extractedValue}（修正あり）</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm">
          <p>
            必須項目：{fields.length}件／確認済み：{confirmedCount}件／未確認：{fields.length - confirmedCount}件
          </p>
          {confirmedAlready ? (
            <p className="mt-2 text-green-700">✓ 確定済みです。申請人情報は案件DBに保存されています。</p>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" onClick={() => persist(false)}>
                下書き保存
              </Button>
              <Button disabled={!canConfirm} onClick={() => persist(true)}>
                確定する
              </Button>
              {saved && <span className="text-green-700">保存しました。</span>}
            </div>
          )}
          {!confirmedAlready && !canConfirm && <p className="mt-2 text-xs text-slate-500">すべての必須項目を確認済みにすると確定できます。</p>}
        </div>
      </section>
    </div>
  );
}
