import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { AppError } from "../errors";
import { DEFAULT_LANG, type Lang } from "./lang";
import { buildBlocks, footerLabel } from "./model";
import type { GeneratedDocument } from "./types";

// 保存済みの content_json だけから PDF を作る。日本語・韓国語のフォントは呼び出し側が渡す（フォント全体を埋め込む）。
// 改ページは行・表の行の単位で行い、表の見出し行は次のページにも繰り返す。

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 42;
const FOOTER_SPACE = 34;
const GRAY = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0.08, 0.08, 0.1);
const LINE = rgb(0.73, 0.73, 0.73);
const HEAD_FILL = rgb(0.93, 0.93, 0.93);
const WARN = rgb(0.71, 0.33, 0.04);
const OK = rgb(0.09, 0.4, 0.21);

/** 行頭に置かない文字（句読点・閉じ括弧など） */
const NO_LINE_START = new Set("、。，．）」』】〕〉》！？：；ー・,.)]}!?:;%");

function clean(t: string): string {
  // 制御文字を除く（改行は呼び出し側で分割済み）
  return t.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\t/g, " ");
}

/** 文字列の幅を測れるもの（PDFFont、または複数のフォントをまとめた FontSet） */
export interface TextMeasurer {
  widthOfTextAtSize(text: string, size: number): number;
}

/**
 * 複数のフォントを、文字ごとに使い分ける。最初のフォントに無い文字は、次のフォントで描く。
 * 韓国語のご案内書類で、ハングルは韓国語のフォント、漢字・かなは日本語のフォントで描くために使う。
 * どのフォントにも無い文字は、最初のフォントで描く（欠けた字形になる）。
 */
export class FontSet implements TextMeasurer {
  private sets: Set<number>[];

  constructor(private fonts: PDFFont[]) {
    this.sets = fonts.map((f) => new Set(f.getCharacterSet()));
  }

  private indexOf(ch: string): number {
    if (this.fonts.length === 1) return 0;
    const cp = ch.codePointAt(0) ?? 0;
    const i = this.sets.findIndex((s) => s.has(cp));
    return i < 0 ? 0 : i;
  }

  /** 同じフォントで描ける文字ごとに区切る */
  runs(text: string): { font: PDFFont; text: string }[] {
    const out: { font: PDFFont; text: string; i: number }[] = [];
    for (const ch of text) {
      const i = this.indexOf(ch);
      const last = out[out.length - 1];
      if (last && last.i === i) last.text += ch;
      else out.push({ font: this.fonts[i], text: ch, i });
    }
    return out;
  }

  widthOfTextAtSize(text: string, size: number): number {
    if (this.fonts.length === 1) return this.fonts[0].widthOfTextAtSize(text, size);
    return this.runs(text).reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0);
  }

  drawText(page: PDFPage, text: string, o: { x: number; y: number; size: number; color: ReturnType<typeof rgb> }) {
    let x = o.x;
    for (const r of this.runs(text)) {
      page.drawText(r.text, { x, y: o.y, size: o.size, font: r.font, color: o.color });
      x += r.font.widthOfTextAtSize(r.text, o.size);
    }
  }
}

/** 指定の幅に収まるように、文字単位で折り返す。英単語は可能なら空白で折る */
export function wrapText(text: string, font: TextMeasurer, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const paragraph = clean(raw);
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const ch of paragraph) {
      const next = line + ch;
      if (line !== "" && font.widthOfTextAtSize(next, size) > maxWidth) {
        const sp = line.lastIndexOf(" ");
        if (ch !== " " && sp > 0 && /[\x21-\x7e]$/.test(line) && /[\x21-\x7e]/.test(ch)) {
          lines.push(line.slice(0, sp));
          line = line.slice(sp + 1) + ch;
        } else if (NO_LINE_START.has(ch)) {
          // 句読点などを行頭に置かないよう、直前の1文字と一緒に次の行へ送る
          const chars = [...line];
          const last = chars.pop() ?? "";
          lines.push(chars.join(""));
          line = last + ch;
        } else {
          lines.push(line);
          line = ch === " " ? "" : ch;
        }
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

class Writer {
  pdf: PDFDocument;
  font: FontSet;
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  contentWidth = A4.w - MARGIN * 2;

  constructor(pdf: PDFDocument, font: FontSet) {
    this.pdf = pdf;
    this.font = font;
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage([A4.w, A4.h]);
    this.pages.push(this.page);
    this.y = A4.h - MARGIN;
  }

  /** 残りが足りなければ改ページする。改ページしたら true */
  ensure(height: number): boolean {
    if (this.y - height < MARGIN + FOOTER_SPACE) {
      this.newPage();
      return true;
    }
    return false;
  }

  /** 太字の代わりに、わずかにずらして2回描く */
  draw(text: string, x: number, y: number, size: number, color = BLACK, bold = false) {
    if (!text) return;
    this.font.drawText(this.page, text, { x, y, size, color });
    if (bold) this.font.drawText(this.page, text, { x: x + 0.35, y, size, color });
  }

  /** 折り返した行を、ページをまたいで描く */
  lines(text: string, size: number, color = BLACK, opts: { bold?: boolean; after?: number; maxWidth?: number } = {}) {
    const lh = size * 1.55;
    for (const l of wrapText(text, this.font, size, opts.maxWidth ?? this.contentWidth)) {
      this.ensure(lh);
      this.y -= lh;
      this.draw(l, MARGIN, this.y, size, color, opts.bold);
    }
    this.y -= opts.after ?? 4;
  }

  heading(text: string) {
    this.ensure(60); // 見出しだけがページ末尾に残らないようにする
    this.y -= 14;
    this.lines(text, 12.5, BLACK, { bold: true, after: 0 });
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 2 },
      end: { x: A4.w - MARGIN, y: this.y - 2 },
      thickness: 0.8,
      color: LINE,
    });
    this.y -= 8;
  }

  table(widths: number[], head: string[] | null, rows: string[][]) {
    const size = 9;
    const lh = size * 1.5;
    const pad = 4;
    const total = widths.reduce((a, b) => a + b, 0);
    const cols = widths.map((w) => (w / total) * this.contentWidth);

    const rowCells = (cells: string[]) => cells.map((t, i) => wrapText(t, this.font, size, cols[i] - pad * 2));
    const drawRow = (cells: string[], header: boolean) => {
      const wrapped = rowCells(cells);
      const h = Math.max(...wrapped.map((w) => w.length)) * lh + pad * 2 - (lh - size) / 2;
      if (this.ensure(h) && !header && head) drawRowRaw(head, true);
      drawRowRaw(cells, header, wrapped, h);
    };
    const drawRowRaw = (cells: string[], header: boolean, wrapped = rowCells(cells), hh?: number) => {
      const h = hh ?? Math.max(...wrapped.map((w) => w.length)) * lh + pad * 2 - (lh - size) / 2;
      this.ensure(h);
      let x = MARGIN;
      const top = this.y;
      cells.forEach((_, i) => {
        this.page.drawRectangle({
          x,
          y: top - h,
          width: cols[i],
          height: h,
          borderColor: LINE,
          borderWidth: 0.6,
          color: header ? HEAD_FILL : undefined,
        });
        wrapped[i].forEach((l, j) => this.draw(l, x + pad, top - pad - size - j * lh + (lh - size) / 2, size, BLACK, header));
        x += cols[i];
      });
      this.y -= h;
    };

    if (head) drawRowRaw(head, true);
    for (const r of rows) drawRow(r, false);
    this.y -= 6;
  }

  /** 全ページの下部に、状態とページ番号を描く */
  footers(label: string) {
    const n = this.pages.length;
    this.pages.forEach((p, i) => {
      const t = `${label}　${i + 1} / ${n}`;
      const w = this.font.widthOfTextAtSize(t, 8);
      this.font.drawText(p, t, { x: (A4.w - w) / 2, y: MARGIN - 8, size: 8, color: GRAY });
    });
  }
}

/**
 * PDF を作る。fontBytes は、文書の言語に対応した TrueType/OpenType フォント（日本語・英語は日本語のフォント、韓国語は韓国語のフォント）。
 * fallbackFontBytes は、fontBytes に無い文字（韓国語の文書に含まれる漢字・かななど）を描くためのフォント。
 * lang は、ご案内書類（client_guide）の言語。それ以外の文書は、日本語のみ。
 */
export async function buildPdf(
  doc: GeneratedDocument,
  fontBytes: Uint8Array,
  lang: Lang = DEFAULT_LANG,
  fallbackFontBytes: Uint8Array[] = [],
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // subset: true は使わない。fontkit の絞り込みが、Noto Sans の字形データを途中で切ってしまい、
  // 文字が欠ける（日本語・英語・韓国語のいずれも、PDF で一部の文字が描かれない）ため。
  // フォント全体を埋め込む（PDF は数 MB になる。圧縮される）。docs/client-guide-languages.md を参照
  // locl（地域別の字形の置換）も切る。置換後の字形は、pdf-lib が幅を登録しない（既定の幅 1 em になる）ため、
  // 英数字だけの文（日時など）で、数字の間隔が広がる
  const embedded = [];
  for (const bytes of [fontBytes, ...fallbackFontBytes]) embedded.push(await pdf.embedFont(bytes, { subset: false, features: { locl: false } }));
  const font = new FontSet(embedded);
  pdf.setTitle(`${doc.title} v${doc.version}`);
  pdf.setSubject("内部確認用（公式様式ではありません）");
  pdf.setCreator("在留資格案件管理");
  pdf.setProducer("在留資格案件管理");
  const w = new Writer(pdf, font);

  for (const b of buildBlocks(doc, lang)) {
    switch (b.kind) {
      case "eyebrow":
        w.lines(b.text, 9, GRAY);
        break;
      case "title":
        w.lines(b.text, 19, BLACK, { bold: true, after: 2 });
        break;
      case "subtitle":
        w.lines(b.text, 10.5, BLACK, { after: 4 });
        break;
      case "status": {
        w.lines(b.meta, 8.5, GRAY, { after: 0 });
        w.lines(`【${b.label}】${b.reviewed ? "　" + b.reviewed : ""}`, 10, b.confirmed ? OK : WARN, { bold: true, after: 8 });
        break;
      }
      case "heading":
        w.heading(b.text);
        break;
      case "note":
        w.lines(b.text, 8.5, GRAY, { after: 6 });
        break;
      case "paragraph":
        w.lines(b.text, 10);
        break;
      case "kv":
        w.table([30, 70], null, b.rows);
        break;
      case "table":
        w.table(b.widths, b.head, b.rows);
        break;
      case "notices":
        w.y -= 8;
        w.ensure(30 + b.lines.length * 12);
        w.page.drawLine({ start: { x: MARGIN, y: w.y }, end: { x: A4.w - MARGIN, y: w.y }, thickness: 0.6, color: LINE });
        w.y -= 4;
        for (const n of b.lines) w.lines(n, 8.5, GRAY, { after: 0 });
        break;
    }
  }
  w.footers(footerLabel(doc, lang));
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

const fontPromises = new Map<string, Promise<Uint8Array>>();

/**
 * 日本語・韓国語フォント（Noto Sans JP / KR Regular、SIL Open Font License 1.1）の配信元。
 * リポジトリの容量削減のため同梱せず、版（Sans2.004）を固定した jsDelivr から取得する。
 */
const FONT_BASE = "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/SubsetOTF";
export const JAPANESE_FONT_URL = `${FONT_BASE}/JP/NotoSansJP-Regular.otf`;
export const KOREAN_FONT_URL = `${FONT_BASE}/KR/NotoSansKR-Regular.otf`;

/** 外部の配信元からフォントを読み込む（初回のみ） */
function loadFont(path: string): Promise<Uint8Array> {
  let p = fontPromises.get(path);
  if (!p) {
    p = fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error("font");
        return r.arrayBuffer();
      })
      .then((b) => new Uint8Array(b))
      .catch(() => {
        // 次回の再試行ができるように、失敗した取得は残さない。画面には、原因と対処が分かる文言を出す
        fontPromises.delete(path);
        throw new AppError("PDF に使うフォントを取得できませんでした。通信の状況を確認して、もう一度お試しください。");
      });
    fontPromises.set(path, p);
  }
  return p;
}

/** 日本語のフォントを読み込む（約4.5MB）。日本語・英語の出力で使う。韓国語では、漢字・かなの代わりとしても使う */
export function loadJapaneseFont(): Promise<Uint8Array> {
  return loadFont(JAPANESE_FONT_URL);
}

/** 韓国語のフォントを読み込む（約4.6MB。韓国語の出力のときだけ） */
export function loadKoreanFont(): Promise<Uint8Array> {
  return loadFont(KOREAN_FONT_URL);
}
