import { formatDate, formatDateTime } from "../format";
import { CHECK_STATUS_LABELS, CHECK_TYPE_LABELS, REQUIREMENT_STATUS_LABELS } from "../types";
import {
  DOCUMENT_TYPE_LABELS,
  GENERATED_STATUS_LABELS,
  TRANSCRIPTION_MODE_LABELS,
  type GeneratedDocument,
} from "./types";

// Word と PDF の出力で共通に使う、文書の構成。保存済みの content_json だけから作る。
// 画面（components/documents/DocumentSheet.tsx）と同じ項目・順序にする。

export type Block =
  | { kind: "eyebrow"; text: string }
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "status"; meta: string; label: string; confirmed: boolean; reviewed: string }
  | { kind: "heading"; text: string }
  | { kind: "note"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "kv"; rows: [string, string][] }
  | { kind: "table"; widths: number[]; head: string[]; rows: string[][] }
  | { kind: "notices"; lines: string[] };

const CATEGORY_LABELS = { required: "必要", not_required: "不要", check: "要確認" } as const;

function kv(rows: [string, string | undefined][]): Block {
  return { kind: "kv", rows: rows.map(([k, v]) => [k, v || "未入力"]) };
}

export function buildBlocks(doc: GeneratedDocument): Block[] {
  const c = doc.content;
  const type = doc.documentType;
  const out: Block[] = [];

  out.push({
    kind: "eyebrow",
    text: type === "transcription_aid" ? "転記補助用（公式様式ではありません）" : "内部確認用（公式様式ではありません）",
  });
  out.push({ kind: "title", text: DOCUMENT_TYPE_LABELS[type] });
  out.push({ kind: "subtitle", text: `${c.case.caseName}（${c.case.procedureLabel}）` });
  out.push({
    kind: "status",
    meta: `版：v${doc.version}　生成日時：${formatDateTime(c.generatedAt)}`,
    label: GENERATED_STATUS_LABELS[doc.status],
    confirmed: doc.status !== "draft",
    reviewed: doc.reviewedAt ? `確認：${doc.reviewedByName ?? ""}／${formatDateTime(doc.reviewedAt)}` : "",
  });

  out.push({ kind: "heading", text: "案件情報" });
  out.push(
    kv([
      ["手続の種類", c.case.procedureLabel],
      ["現在の在留資格", c.case.currentStatus],
      ["希望する在留資格", c.case.targetStatus],
      ["案件の状態", c.case.workflowLabel],
    ]),
  );

  if (c.transcription) {
    const t = c.transcription;
    out.push({ kind: "heading", text: "対象の公式様式" });
    out.push(
      kv([
        ["様式", t.form.formName],
        ["ファイル識別番号", t.form.fileId],
        ["対応表の確認日", formatDate(t.form.confirmedOn)],
        ["申請人情報", t.applicantConfirmed ? "確認済み" : "下書き（未確認）"],
      ]),
    );
    for (const w of t.warnings) out.push({ kind: "paragraph", text: `注意：${w}` });
    out.push({
      kind: "note",
      text: "区分：「差し込み」は確定済みの案件データ、「要確認」は保存値を原本と照合してから使う項目、「手入力」は案件DBに項目がない項目です。",
    });
    for (const sheet of t.sheets) {
      out.push({ kind: "heading", text: sheet.title });
      out.push({
        kind: "table",
        widths: [8, 30, 28, 10, 24],
        head: ["項番", "公式の項目", "値", "区分", "備考"],
        rows: sheet.items.map((i) => [i.no, i.label, i.value, TRANSCRIPTION_MODE_LABELS[i.mode], i.note]),
      });
    }
  }

  if (c.applicant) {
    const a = c.applicant;
    out.push({ kind: "heading", text: "申請人情報" });
    out.push(
      kv([
        ["氏名", a.legalName],
        ["国籍・地域", a.nationality],
        ["生年月日", a.dateOfBirth ? formatDate(a.dateOfBirth) : ""],
        ["性別", a.gender],
        ["住居地", a.address],
        ["在留資格", a.residenceStatus],
        ["在留期間の満了日", a.residenceExpiryDate ? formatDate(a.residenceExpiryDate) : ""],
        ["在留カード番号", a.residenceCardNumber],
        ["就労制限", a.workRestriction],
        [
          "確認状況",
          a.confirmationStatus === "confirmed"
            ? `確認済み（${a.confirmedBy ?? ""}／${formatDateTime(a.confirmedAt)}）`
            : "下書き（未確認）",
        ],
      ]),
    );
  }

  if (c.employment && type !== "application_checklist") {
    const e = c.employment;
    out.push({ kind: "heading", text: "雇用・会社情報" });
    out.push(
      kv([
        ["会社名", e.companyName],
        ["所在地", e.companyAddress],
        ["業種", e.industry],
        ["資本金", e.capital],
        ["従業員数", e.employeeCount],
        ["カテゴリー", e.category ? `カテゴリー${e.category}` : ""],
        ["職務内容", e.jobDescription],
        ["雇用形態", e.employmentType],
        ["月額報酬", e.monthlySalary],
        ["雇用開始日", e.employmentStartDate ? formatDate(e.employmentStartDate) : ""],
        ["契約期間", e.contractPeriod],
      ]),
    );
  }

  if (c.requirements) {
    out.push({ kind: "heading", text: "必要書類チェックリスト" });
    out.push({
      kind: "note",
      text: `管理上の区分と収集状況です。書類の適否や最終的な要否は、行政書士が確認します。（必要な書類 ${c.requirements.requiredCount} 件中 ${c.requirements.receivedCount} 件が収集済み）`,
    });
    out.push({
      kind: "table",
      widths: [40, 12, 14, 14, 20],
      head: ["書類", "区分", "収集状況", "期限", "メモ"],
      rows: c.requirements.items.map((r) => [
        r.name + (r.custom ? "（追加）" : ""),
        CATEGORY_LABELS[r.category] + (r.overridden ? "（変更）" : ""),
        REQUIREMENT_STATUS_LABELS[r.status],
        r.dueDate ? formatDate(r.dueDate) : "",
        r.note ?? "",
      ]),
    });
  }

  if (c.preApplicationChecks) {
    const k = c.preApplicationChecks;
    out.push({ kind: "heading", text: "申請前チェック結果" });
    if (!k.available) {
      out.push({ kind: "paragraph", text: "未実施" });
    } else {
      out.push({
        kind: "paragraph",
        text: `申請予定日：${k.plannedApplicationDate ? formatDate(k.plannedApplicationDate) : "未入力"}`,
      });
      out.push({
        kind: "table",
        widths: [14, 46, 14, 26],
        head: ["分類", "項目", "状態", "メモ"],
        rows: k.items.map((i) => [CHECK_TYPE_LABELS[i.type], i.name, CHECK_STATUS_LABELS[i.status], i.note]),
      });
      if (k.memo) out.push({ kind: "paragraph", text: `行政書士メモ（チェック）：${k.memo}` });
    }
  }

  out.push({ kind: "heading", text: "行政書士メモ（案件）" });
  out.push({ kind: "paragraph", text: c.memo || "なし" });
  out.push({ kind: "notices", lines: c.notices });
  return out;
}

/** 各ページの下部に表示する文言（ページ番号は出力側で付ける） */
export function footerLabel(doc: GeneratedDocument): string {
  return `${GENERATED_STATUS_LABELS[doc.status]}／内部確認用`;
}
