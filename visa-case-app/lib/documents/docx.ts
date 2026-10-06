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
import { CLIENT_GUIDE_TEXTS } from "./clientGuideText";
import { DEFAULT_LANG, type Lang } from "./lang";
import { buildBlocks, footerLabel } from "./model";
import type { GeneratedDocument } from "./types";

// 保存済みの content_json だけから Word ファイルを作る。現在の案件情報は参照しない。
// 画面（components/documents/DocumentSheet.tsx）と同じ構成にする。

const FONT = { ascii: "Yu Gothic", eastAsia: "Yu Gothic", hAnsi: "Yu Gothic", cs: "Yu Gothic" };
// 韓国語は、Yu Gothic にハングルがないため、ハングルを持つ書体（Windows 標準の Malgun Gothic）を指定する。
// ない環境では、Word が代わりの書体を選ぶ
const FONT_KO = { ascii: "Malgun Gothic", eastAsia: "Malgun Gothic", hAnsi: "Malgun Gothic", cs: "Malgun Gothic" };
const GRAY = "666666";

function fontOf(lang: Lang) {
  return lang === "ko" ? FONT_KO : FONT;
}

/** 文書の言語。校正・文字の選択に使われる */
const LANGUAGE_TAGS: Record<Lang, { value: string; eastAsia: string }> = {
  ja: { value: "ja-JP", eastAsia: "ja-JP" },
  en: { value: "en-US", eastAsia: "ja-JP" },
  ko: { value: "ko-KR", eastAsia: "ko-KR" },
};

/** 書体を固定した、Word の部品を作る */
function builders(font: typeof FONT) {
  function text(t: string, o: { bold?: boolean; size?: number; color?: string } = {}) {
    return new TextRun({ text: t, bold: o.bold, size: o.size, color: o.color, font });
  }

  function para(t: string, o: { bold?: boolean; size?: number; color?: string; after?: number } = {}) {
    // 改行を含む文章は、行ごとに折り返す
    const lines = t.split("\n");
    return new Paragraph({
      spacing: { after: o.after ?? 80 },
      children: lines.flatMap((l, i) => [new TextRun({ text: l, break: i > 0 ? 1 : 0, bold: o.bold, size: o.size, color: o.color, font })]),
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

  return { text, para, heading, table };
}

/** Word ファイルを作る。lang は、ご案内書類（client_guide）の言語。それ以外の文書は、日本語のみ */
export async function buildDocx(doc: GeneratedDocument, lang: Lang = DEFAULT_LANG): Promise<Blob> {
  const font = fontOf(lang);
  const { text, para, heading, table } = builders(font);
  const children: (Paragraph | Table)[] = [];
  for (const b of buildBlocks(doc, lang)) {
    switch (b.kind) {
      case "eyebrow":
        children.push(para(b.text, { size: 18, color: GRAY }));
        break;
      case "title":
        children.push(para(b.text, { bold: true, size: 36, after: 60 }));
        break;
      case "subtitle":
        children.push(para(b.text, { after: 60 }));
        break;
      case "status":
        children.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [
              text(`${b.meta}　`, { size: 18, color: GRAY }),
              text(`【${b.label}】`, { bold: true, size: 20, color: b.confirmed ? "166534" : "B45309" }),
              ...(b.reviewed ? [text(`　${b.reviewed}`, { size: 18, color: GRAY })] : []),
            ],
          }),
        );
        break;
      case "heading":
        children.push(heading(b.text));
        break;
      case "note":
        children.push(para(b.text, { size: 18, color: GRAY }));
        break;
      case "paragraph":
        children.push(para(b.text));
        break;
      case "kv":
        children.push(table([30, 70], null, b.rows));
        break;
      case "table":
        children.push(table(b.widths, b.head, b.rows));
        break;
      case "notices":
        children.push(
          new Paragraph({ spacing: { before: 280 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 4 } }, children: [] }),
        );
        for (const n of b.lines) children.push(para(n, { size: 18, color: GRAY, after: 20 }));
        break;
    }
  }

  const document = new Document({
    title: `${doc.title} v${doc.version}`,
    description: doc.documentType === "client_guide" ? CLIENT_GUIDE_TEXTS[lang].docDescription : "内部確認用（公式様式ではありません）",
    // 日本語は、従来の出力のまま。ほかの言語は、文書の言語を示す
    styles: { default: { document: { run: { font, size: 21, ...(lang === "ja" ? {} : { language: LANGUAGE_TAGS[lang] }) } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  text(`${footerLabel(doc, lang)}  `, { size: 16, color: GRAY }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBlob(document);
}
