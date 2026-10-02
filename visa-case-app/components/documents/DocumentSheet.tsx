import { formatDate, formatDateTime } from "@/lib/format";
import {
  DOCUMENT_TYPE_LABELS,
  GENERATED_STATUS_LABELS,
  TRANSCRIPTION_MODE_LABELS,
  type ContentJson,
  type GeneratedDocument,
} from "@/lib/documents/types";
import { CHECK_STATUS_LABELS, CHECK_TYPE_LABELS, REQUIREMENT_STATUS_LABELS } from "@/lib/types";

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="whitespace-pre-wrap">{value || <span className="text-slate-400">未入力</span>}</dd>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="mb-2 border-b border-slate-300 pb-1 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const CATEGORY_LABELS = { required: "必要", not_required: "不要", check: "要確認" } as const;

function ApplicantSection({ a }: { a: NonNullable<ContentJson["applicant"]> }) {
  return (
    <Section title="申請人情報">
      <dl className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
        <Row label="氏名" value={a.legalName} />
        <Row label="国籍・地域" value={a.nationality} />
        <Row label="生年月日" value={a.dateOfBirth ? formatDate(a.dateOfBirth) : ""} />
        <Row label="性別" value={a.gender} />
        <Row label="住居地" value={a.address} />
        <Row label="在留資格" value={a.residenceStatus} />
        <Row label="在留期間の満了日" value={a.residenceExpiryDate ? formatDate(a.residenceExpiryDate) : ""} />
        <Row label="在留カード番号" value={a.residenceCardNumber} />
        <Row label="就労制限" value={a.workRestriction} />
        <Row
          label="確認状況"
          value={
            a.confirmationStatus === "confirmed"
              ? `確認済み（${a.confirmedBy ?? ""}／${formatDateTime(a.confirmedAt)}）`
              : "下書き（未確認）"
          }
        />
      </dl>
    </Section>
  );
}

function TranscriptionSections({ t }: { t: NonNullable<ContentJson["transcription"]> }) {
  return (
    <>
      <Section title="対象の公式様式">
        <dl className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
          <Row label="様式" value={t.form.formName} />
          <Row label="ファイル識別番号" value={t.form.fileId} />
          <Row label="対応表の確認日" value={formatDate(t.form.confirmedOn)} />
          <Row label="申請人情報" value={t.applicantConfirmed ? "確認済み" : "下書き（未確認）"} />
        </dl>
        {t.warnings.map((w) => (
          <p key={w} className="mt-2 text-sm font-medium text-amber-800">注意：{w}</p>
        ))}
        <p className="mt-2 text-xs text-slate-600">
          区分：「差し込み」は確定済みの案件データ、「要確認」は保存値を原本と照合してから使う項目、「手入力」は案件DBに項目がない項目です。
        </p>
      </Section>
      {t.sheets.map((sheet) => (
        <Section key={sheet.title} title={sheet.title}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="w-12 border border-slate-300 p-1.5">項番</th>
                <th className="border border-slate-300 p-1.5">公式の項目</th>
                <th className="border border-slate-300 p-1.5">値</th>
                <th className="w-16 border border-slate-300 p-1.5">区分</th>
                <th className="border border-slate-300 p-1.5">備考</th>
              </tr>
            </thead>
            <tbody>
              {sheet.items.map((i, idx) => (
                <tr key={`${i.no}-${idx}`}>
                  <td className="border border-slate-300 p-1.5">{i.no}</td>
                  <td className="border border-slate-300 p-1.5">{i.label}</td>
                  <td className="border border-slate-300 p-1.5 whitespace-pre-wrap">{i.value}</td>
                  <td className="border border-slate-300 p-1.5">{TRANSCRIPTION_MODE_LABELS[i.mode]}</td>
                  <td className="border border-slate-300 p-1.5 whitespace-pre-wrap">{i.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ))}
    </>
  );
}

/** 保存済みの content_json だけを描画する。現在の案件情報は参照しない */
export function DocumentSheet({ doc }: { doc: GeneratedDocument }) {
  const c = doc.content;
  const type = doc.documentType;
  const confirmed = doc.status !== "draft";
  return (
    <article className="mx-auto max-w-[210mm] bg-white p-8 text-slate-900 shadow-sm print:shadow-none">
      <header className="mb-6 border-b-2 border-slate-800 pb-3">
        <p className="text-xs text-slate-500">
          {type === "transcription_aid" ? "転記補助用（公式様式ではありません）" : "内部確認用（公式様式ではありません）"}
        </p>
        <h1 className="mt-1 text-xl font-semibold">{DOCUMENT_TYPE_LABELS[type]}</h1>
        <p className="mt-1 text-sm">{c.case.caseName}（{c.case.procedureLabel}）</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>版：v{doc.version}</span>
          <span>生成日時：{formatDateTime(c.generatedAt)}</span>
          <span
            className={`rounded px-2 py-0.5 font-medium ${
              confirmed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {GENERATED_STATUS_LABELS[doc.status]}
          </span>
          {doc.reviewedAt && (
            <span>
              確認：{doc.reviewedByName}／{formatDateTime(doc.reviewedAt)}
            </span>
          )}
        </p>
      </header>

      <Section title="案件情報">
        <dl className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
          <Row label="手続の種類" value={c.case.procedureLabel} />
          <Row label="現在の在留資格" value={c.case.currentStatus} />
          <Row label="希望する在留資格" value={c.case.targetStatus} />
          <Row label="案件の状態" value={c.case.workflowLabel} />
        </dl>
      </Section>

      {c.transcription && <TranscriptionSections t={c.transcription} />}

      {c.applicant && <ApplicantSection a={c.applicant} />}

      {c.employment && type !== "application_checklist" && (
        <Section title="雇用・会社情報">
          <dl className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
            <Row label="会社名" value={c.employment.companyName} />
            <Row label="所在地" value={c.employment.companyAddress} />
            <Row label="業種" value={c.employment.industry} />
            <Row label="資本金" value={c.employment.capital} />
            <Row label="従業員数" value={c.employment.employeeCount} />
            <Row label="カテゴリー" value={c.employment.category ? `カテゴリー${c.employment.category}` : ""} />
            <Row label="職務内容" value={c.employment.jobDescription} />
            <Row label="雇用形態" value={c.employment.employmentType} />
            <Row label="月額報酬" value={c.employment.monthlySalary} />
            <Row label="雇用開始日" value={c.employment.employmentStartDate ? formatDate(c.employment.employmentStartDate) : ""} />
            <Row label="契約期間" value={c.employment.contractPeriod} />
          </dl>
        </Section>
      )}

      {c.requirements && (
        <Section title="必要書類チェックリスト">
          <p className="mb-2 text-xs text-slate-600">
            管理上の区分と収集状況です。書類の適否や最終的な要否は、行政書士が確認します。
            （必要な書類 {c.requirements.requiredCount} 件中 {c.requirements.receivedCount} 件が収集済み）
          </p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 p-1.5">書類</th>
                <th className="border border-slate-300 p-1.5">区分</th>
                <th className="border border-slate-300 p-1.5">収集状況</th>
                <th className="border border-slate-300 p-1.5">期限</th>
                <th className="border border-slate-300 p-1.5">メモ</th>
              </tr>
            </thead>
            <tbody>
              {c.requirements.items.map((r) => (
                <tr key={r.id}>
                  <td className="border border-slate-300 p-1.5">
                    {r.name}
                    {r.custom && <span className="ml-1 text-slate-500">（追加）</span>}
                  </td>
                  <td className="border border-slate-300 p-1.5">
                    {CATEGORY_LABELS[r.category]}
                    {r.overridden && <span className="text-slate-500">（変更）</span>}
                  </td>
                  <td className="border border-slate-300 p-1.5">{REQUIREMENT_STATUS_LABELS[r.status]}</td>
                  <td className="border border-slate-300 p-1.5">{r.dueDate ? formatDate(r.dueDate) : ""}</td>
                  <td className="border border-slate-300 p-1.5 whitespace-pre-wrap">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {c.preApplicationChecks && (
        <Section title="申請前チェック結果">
          {!c.preApplicationChecks.available ? (
            <p className="text-sm text-slate-500">未実施</p>
          ) : (
            <>
              <p className="mb-2 text-sm">
                申請予定日：
                {c.preApplicationChecks.plannedApplicationDate
                  ? formatDate(c.preApplicationChecks.plannedApplicationDate)
                  : "未入力"}
              </p>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {c.preApplicationChecks.items.map((k) => (
                    <tr key={k.key}>
                      <td className="w-24 border border-slate-300 p-1.5">{CHECK_TYPE_LABELS[k.type]}</td>
                      <td className="border border-slate-300 p-1.5">{k.name}</td>
                      <td className="w-24 border border-slate-300 p-1.5">{CHECK_STATUS_LABELS[k.status]}</td>
                      <td className="border border-slate-300 p-1.5 whitespace-pre-wrap">{k.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {c.preApplicationChecks.memo && (
                <p className="mt-2 whitespace-pre-wrap text-sm">行政書士メモ（チェック）：{c.preApplicationChecks.memo}</p>
              )}
            </>
          )}
        </Section>
      )}

      <Section title="行政書士メモ（案件）">
        <p className="min-h-8 whitespace-pre-wrap text-sm">{c.memo || <span className="text-slate-400">なし</span>}</p>
      </Section>

      <footer className="border-t border-slate-300 pt-3 text-xs text-slate-500">
        {c.notices.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </footer>
    </article>
  );
}
