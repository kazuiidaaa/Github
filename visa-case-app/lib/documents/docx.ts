import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { formatDate, formatDateTime } from "../format";
import { CHECK_STATUS_LABELS, CHECK_TYPE_LABELS, REQUIREMENT_STATUS_LABELS } from "../types";
import { DOCUMENT_TYPE_LABELS, GENERATED_STATUS_LABELS, type GeneratedDocument } from "./types";

// 保存済みの content_json だけから Word ファイルを作る。現在の案件情報は参照しない。
// 画面（components/documents/DocumentSheet.tsx）と同じ構成にする。

const FONT = { ascii: "Yu Gothic", eastAsia: "Yu Gothic", hAnsi: "Yu Gothic", cs: "Yu Gothic" };
const CATEGORY_LABELS = { required: "必要", not_required: "不要", check: "要確認" } as const;
const GRAY = "666666";

function text(t: string, o: { bold?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({ text: t, bold: o.bold, size: o.size, color: o.color, font: FONT });
}

function para(t: string, o: { bold?: boolean; size?: number; color?: string; after?: number } = {}) {
  // 改行を含む文章は、行ごとに折り返す
  const lines = t.split("\n");
  return new Paragraph({
    spacing: { after: o.after ?? 80 },
    children: lines.flatMap((l, i) => [new TextRun({ text: l, break: i > 0 ? 1 : 0, bold: o.bold, size: o.size, color: o.color, font: FONT })]),
  });
}

function heading(t: string) {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 2 } },
    children: [text(t, { bold: true, size: 26 })],
  });
}

const LIGHT = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const BORDERS = { top: LIGHT, bottom: LIGHT, left: LIGHT, right: LIGHT };

function cell(t: string, width: number, bold = false, shade?: string) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    shading: shade ? { fill: shade } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [para(t, { bold, size: 18, after: 0 })],
  });
}

function table(widths: number[], head: string[] | null, rows: string[][]) {
  const all = [...(head ? [head] : []), ...rows];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: all.map(
      (r, i) =>
        new TableRow({
          tableHeader: !!head && i === 0,
          cantSplit: true,
          children: r.map((c, j) => cell(c, widths[j], !!head && i === 0, !!head && i === 0 ? "EEEEEE" : undefined)),
        }),
    ),
  });
}

/** 項目名と値を並べた表。値が空のものは「未入力」とする */
function kv(rows: [string, string | undefined][]) {
  return table(
    [30, 70],
    null,
    rows.map(([k, v]) => [k, v || "未入力"]),
  );
}

export async function buildDocx(doc: GeneratedDocument): Promise<Blob> {
  const c = doc.content;
  const type = doc.documentType;
  const body: (Paragraph | Table)[] = [];

  body.push(para("内部確認用（公式様式ではありません）", { size: 18, color: GRAY }));
  body.push(para(DOCUMENT_TYPE_LABELS[type], { bold: true, size: 36, after: 60 }));
  body.push(para(`${c.case.caseName}（${c.case.procedureLabel}）`, { after: 60 }));
  body.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        text(`版：v${doc.version}　生成日時：${formatDateTime(c.generatedAt)}　`, { size: 18, color: GRAY }),
        text(`【${GENERATED_STATUS_LABELS[doc.status]}】`, { bold: true, size: 20, color: doc.status === "draft" ? "B45309" : "166534" }),
        ...(doc.reviewedAt ? [text(`　確認：${doc.reviewedByName ?? ""}／${formatDateTime(doc.reviewedAt)}`, { size: 18, color: GRAY })] : []),
      ],
    }),
  );

  body.push(heading("案件情報"));
  body.push(
    kv([
      ["手続の種類", c.case.procedureLabel],
      ["現在の在留資格", c.case.currentStatus],
      ["希望する在留資格", c.case.targetStatus],
      ["案件の状態", c.case.workflowLabel],
    ]),
  );

  if (c.applicant) {
    const a = c.applicant;
    body.push(heading("申請人情報"));
    body.push(
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
    body.push(heading("雇用・会社情報"));
    body.push(
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
    body.push(heading("必要書類チェックリスト"));
    body.push(
      para(
        `管理上の区分と収集状況です。書類の適否や最終的な要否は、行政書士が確認します。（必要な書類 ${c.requirements.requiredCount} 件中 ${c.requirements.receivedCount} 件が収集済み）`,
        { size: 18, color: GRAY },
      ),
    );
    body.push(
      table(
        [40, 12, 14, 14, 20],
        ["書類", "区分", "収集状況", "期限", "メモ"],
        c.requirements.items.map((r) => [
          r.name + (r.custom ? "（追加）" : ""),
          CATEGORY_LABELS[r.category] + (r.overridden ? "（変更）" : ""),
          REQUIREMENT_STATUS_LABELS[r.status],
          r.dueDate ? formatDate(r.dueDate) : "",
          r.note ?? "",
        ]),
      ),
    );
  }

  if (c.preApplicationChecks) {
    const k = c.preApplicationChecks;
    body.push(heading("申請前チェック結果"));
    if (!k.available) {
      body.push(para("未実施"));
    } else {
      body.push(para(`申請予定日：${k.plannedApplicationDate ? formatDate(k.plannedApplicationDate) : "未入力"}`));
      body.push(
        table(
          [14, 46, 14, 26],
          ["分類", "項目", "状態", "メモ"],
          k.items.map((i) => [CHECK_TYPE_LABELS[i.type], i.name, CHECK_STATUS_LABELS[i.status], i.note]),
        ),
      );
      if (k.memo) body.push(para(`行政書士メモ（チェック）：${k.memo}`));
    }
  }

  body.push(heading("行政書士メモ（案件）"));
  body.push(para(c.memo || "なし"));

  body.push(new Paragraph({ spacing: { before: 280 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 4 } }, children: [] }));
  for (const n of c.notices) body.push(para(n, { size: 18, color: GRAY, after: 20 }));

  const document = new Document({
    title: `${doc.title} v${doc.version}`,
    description: "内部確認用（公式様式ではありません）",
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  text(`${GENERATED_STATUS_LABELS[doc.status]}／内部確認用  `, { size: 16, color: GRAY }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: FONT }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });
  return Packer.toBlob(document);
}
