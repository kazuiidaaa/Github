import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { loadJapaneseFontForTest } from "./helpers/fonts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildBlocks } from "../lib/documents/model";
import { buildPdf, loadJapaneseFont, wrapText } from "../lib/documents/pdf";
import { AppError } from "../lib/errors";
import { buildContent } from "../lib/documents/snapshot";
import type { GeneratedDocument } from "../lib/documents/types";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

const font = await loadJapaneseFontForTest();

function record(extra: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "李明さん 在留期間更新",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "確認メモ",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "2026-10-01T00:00:00.000Z",
    applicant: { ...EMPTY_APPLICANT, legalName: "LI MING" },
    employment: { ...EMPTY_EMPLOYMENT, category: "3", companyName: "株式会社A" },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...extra,
  };
}

function doc(r: CaseRecord, type: "case_summary" | "application_checklist" = "case_summary"): GeneratedDocument {
  return {
    id: "d1",
    caseId: r.id,
    outputFormat: "pdf",
    documentType: type,
    title: "t",
    version: 1,
    content: buildContent(r, type),
    status: "draft",
    createdAt: "",
  };
}

async function pagesOf(blob: Blob): Promise<number> {
  const pdf = await PDFDocument.load(await blob.arrayBuffer());
  return pdf.getPageCount();
}

describe("buildPdf", () => {
  it("PDF形式で出力し、日本語フォントを（全体で）埋め込む", async () => {
    const blob = await buildPdf(doc(record()), font);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(blob.type).toBe("application/pdf");
    // フォント全体を埋め込む。pdf-lib（fontkit）の文字の絞り込み（subset）は、字形データが途中で切れて、文字が欠けるため使わない
    // （字形が読み出せることは、tests/clientGuideLang.test.ts で確認する）
    expect(bytes.length).toBeGreaterThan(1_000_000);
  });

  it("内容が多い場合は複数ページに分割する", async () => {
    const custom = Array.from({ length: 60 }, (_, i) => ({
      id: `x${i}`,
      name: `追加書類${i}：説明が長い書類名を入れて折り返しを確認する`,
      party: "applicant" as const,
      isRequired: true,
      status: "not_received" as const,
      note: "メモ".repeat(30),
    }));
    const few = await pagesOf(await buildPdf(doc(record()), font));
    const many = await pagesOf(await buildPdf(doc(record({ customRequirements: custom })), font));
    expect(few).toBeLessThanOrEqual(2);
    expect(many).toBeGreaterThan(few);
  });

  it("画面・Wordと同じ構成（共通のモデル）から作る", () => {
    const blocks = buildBlocks(doc(record()));
    expect(blocks.find((b) => b.kind === "status")).toMatchObject({ label: "行政書士確認前", confirmed: false });
    expect(blocks.some((b) => b.kind === "notices")).toBe(true);
  });
});

describe("wrapText", () => {
  let f: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  beforeAll(async () => {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    f = await pdf.embedFont(font, { subset: true });
  });

  it("指定の幅を超えないように折り返す", () => {
    const lines = wrapText("在留期間更新許可申請に必要な書類を確認する".repeat(3), f, 10, 120);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(f.widthOfTextAtSize(l, 10)).toBeLessThanOrEqual(120.01);
  });

  it("句読点を行頭に置かない", () => {
    const lines = wrapText("あいうえおかきくけこ。さしすせそ", f, 10, 100);
    for (const l of lines.slice(1)) expect(l.startsWith("。")).toBe(false);
  });

  it("改行を保持する", () => {
    expect(wrapText("a\nb", f, 10, 100)).toEqual(["a", "b"]);
  });
});

describe("loadJapaneseFont", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("取得に失敗したときは、原因が分かる文言のエラーにし、次回は再取得する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(loadJapaneseFont()).rejects.toBeInstanceOf(AppError);
    await expect(loadJapaneseFont()).rejects.toThrow("フォントを取得できませんでした");

    const ok = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", ok);
    expect((await loadJapaneseFont()).length).toBe(3);
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("配信元が失敗（404など）を返したときも、同じ文言のエラーにする", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    // 前のテストで成功した取得が残っているため、別の配信元は使えない。取得済みでないフォント（韓国語）で確認する
    const { loadKoreanFont } = await import("../lib/documents/pdf");
    await expect(loadKoreanFont()).rejects.toThrow("フォントを取得できませんでした");
  });
});
