import JSZip from "jszip";
import fontkit from "@pdf-lib/fontkit";
import { readFileSync } from "node:fs";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_SOURCE, SOURCE_HINTS, buildClientGuide, cautionsOf, requirementNameCell } from "../lib/documents/clientGuide";
import { REQUIREMENT_NAME_TRANSLATIONS } from "../lib/documents/clientGuideNames";
import {
  CLIENT_GUIDE_TEXTS,
  NOTICE_TRANSLATIONS,
  SOURCE_HINT_TRANSLATIONS,
  procedureLabelOf,
  translateCaution,
} from "../lib/documents/clientGuideText";
import { buildDocx } from "../lib/documents/docx";
import { DEFAULT_LANG, LANGS, LANG_STORAGE_KEY, readStoredLang, storeLang, type Lang } from "../lib/documents/lang";
import { buildBlocks, footerLabel } from "../lib/documents/model";
import { FontSet, buildPdf } from "../lib/documents/pdf";
import { buildContent } from "../lib/documents/snapshot";
import { CLIENT_GUIDE_NOTICES, GENERATED_STATUS_LABELS, type GeneratedDocument } from "../lib/documents/types";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { HSP_EVIDENCE } from "../lib/hspPoints";
import { RULE_SETS, hspEvidenceRule } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, PROCEDURE_TYPES, REQUIREMENT_STATUS_LABELS, type CaseRecord } from "../lib/types";

const OTHER_LANGS = LANGS.filter((l): l is Exclude<Lang, "ja"> => l !== "ja");

const record: CaseRecord = {
  id: "c1",
  caseName: "テスト案件 在留期間更新",
  procedureType: "renewal",
  currentStatus: "技術・人文知識・国際業務",
  targetStatus: "",
  memo: "内部メモ",
  workflowStatus: "preparing",
  createdAt: "",
  updatedAt: "2026-10-01T00:00:00.000Z",
  applicant: { ...EMPTY_APPLICANT, legalName: "テスト 太郎" },
  employment: { ...EMPTY_EMPLOYMENT, category: "3", companyName: "株式会社テスト" },
  formDetails: { ...EMPTY_FORM_DETAILS },
  requirementStates: { passport_card: { status: "requested", dueDate: "2026-11-10" } },
  customRequirements: [{ id: "x1", name: "山田部長の在職証明（原本）", party: "organization", isRequired: true, status: "not_received" }],
  acceptedDate: "",
  plannedApplicationDate: "",
  checkMemo: "",
  checks: [],
  documents: [],
};

function make(c: CaseRecord = record, extra: Partial<GeneratedDocument> = {}): GeneratedDocument {
  return {
    id: "d1",
    caseId: c.id,
    outputFormat: "docx",
    documentType: "client_guide",
    title: "ご案内",
    version: 1,
    content: buildContent(c, "client_guide", new Date("2026-10-06T00:00:00Z"), [], { includeReceived: true }),
    status: "draft",
    createdAt: "",
    ...extra,
  };
}

function textOf(doc: GeneratedDocument, lang: Lang): string {
  return JSON.stringify(buildBlocks(doc, lang));
}

describe("訳表の網羅性（固定の文）", () => {
  it("英語・韓国語の、全ての固定の文に訳がある（空でなく、日本語のままでもない）", () => {
    const ja = CLIENT_GUIDE_TEXTS.ja;
    for (const lang of OTHER_LANGS) {
      const t = CLIENT_GUIDE_TEXTS[lang];
      expect(Object.keys(t).sort()).toEqual(Object.keys(ja).sort());
      for (const [key, jaValue] of Object.entries(ja)) {
        const v = t[key as keyof typeof t];
        if (key === "untranslatedMark" || key === "untranslatedNote") {
          expect(v, `${lang}.${key}`).not.toBe("");
          continue;
        }
        if (typeof jaValue === "string") {
          expect(typeof v, `${lang}.${key}`).toBe("string");
          expect((v as string).length, `${lang}.${key}`).toBeGreaterThan(0);
          // 区切り・日本語と同じ綴りでよい語を除き、日本語のままではないこと
          if (key !== "listSeparator") expect(v, `${lang}.${key}`).not.toBe(jaValue);
        } else if (typeof jaValue === "function") {
          const out = (v as (...a: string[]) => string)("ABC", "XYZ");
          const jaOut = (jaValue as (...a: string[]) => string)("ABC", "XYZ");
          expect(out, `${lang}.${key}`).toContain("ABC");
          expect(out, `${lang}.${key}`).not.toBe(jaOut);
        } else if (Array.isArray(jaValue)) {
          expect((v as string[]).length).toBe(jaValue.length);
          (v as string[]).forEach((x, i) => {
            expect(x.length, `${lang}.${key}[${i}]`).toBeGreaterThan(0);
            expect(x, `${lang}.${key}[${i}]`).not.toBe(jaValue[i]);
          });
        } else {
          // 入れ子（提出者・受領の状況・文書の状態・提出時の注意）
          expect(Object.keys(v as object).sort()).toEqual(Object.keys(jaValue as object).sort());
          for (const [k2, ja2] of Object.entries(jaValue as Record<string, unknown>)) {
            const v2 = (v as Record<string, unknown>)[k2];
            if (typeof ja2 === "function") {
              expect((v2 as (n: string) => string)("6")).toContain("6");
              expect((v2 as (n: string) => string)("6")).not.toBe((ja2 as (n: string) => string)("6"));
            } else {
              expect(typeof v2).toBe("string");
              expect((v2 as string).length, `${lang}.${key}.${k2}`).toBeGreaterThan(0);
              expect(v2, `${lang}.${key}.${k2}`).not.toBe(ja2);
            }
          }
        }
      }
    }
  });

  it("日本語の表は、既存の表示名（受領の状況・文書の状態）をそのまま使う", () => {
    expect(CLIENT_GUIDE_TEXTS.ja.requirementStatus).toEqual(REQUIREMENT_STATUS_LABELS);
    expect(CLIENT_GUIDE_TEXTS.ja.generatedStatus).toEqual(GENERATED_STATUS_LABELS);
  });

  it("取得先の目安、注意書き、手続の名称に、英語・韓国語の訳がある", () => {
    for (const source of [...SOURCE_HINTS.map(([, s]) => s), NO_SOURCE]) {
      for (const lang of OTHER_LANGS) expect(SOURCE_HINT_TRANSLATIONS[source]?.[lang], `${source} (${lang})`).toBeTruthy();
    }
    for (const n of CLIENT_GUIDE_NOTICES) for (const lang of OTHER_LANGS) expect(NOTICE_TRANSLATIONS[n]?.[lang]).toBeTruthy();
    for (const p of PROCEDURE_TYPES) for (const lang of OTHER_LANGS) expect(procedureLabelOf(p.label, lang)).not.toBe(p.label);
  });
});

describe("提出時の注意の定型文", () => {
  const cases: [string, string | undefined][] = [
    ["住民票の写し", undefined],
    ["証明書", "原本を提出。発行日から3か月以内のもの"],
    ["写真", "申請前6か月以内に撮影"],
  ];

  it("日本語は、従来の文のまま", () => {
    expect(cautionsOf("証明書", "原本を提出。発行日から3か月以内のもの")).toEqual(["原本で提出", "発行日から3か月以内のもの"]);
    expect(cautionsOf("写真", "申請前6か月以内に撮影")).toEqual(["申請前6か月以内に撮影したもの"]);
  });

  it("言語ごとの文を出し、数字（月数）はそのまま差し込む", () => {
    expect(cautionsOf("住民票の写し", undefined, "en")).toEqual(["Submit a copy"]);
    expect(cautionsOf("証明書", "発行日から12か月以内", "en")).toEqual(["Submit within 12 months of the issue date"]);
    expect(cautionsOf("写真", "申請前6か月以内に撮影", "ko")).toEqual(["신청 전 6개월 이내에 촬영한 것"]);
    expect(cautionsOf("証明書", "原本。発行日から3か月以内", "ko")).toEqual(["원본으로 제출", "발급일로부터 3개월 이내의 것"]);
  });

  it("保存済みの日本語の文を、表示の時点で訳しても、直接作った文と同じになる", () => {
    for (const [name, note] of cases) {
      const ja = cautionsOf(name, note);
      for (const lang of LANGS) expect(ja.map((x) => translateCaution(x, lang))).toEqual(cautionsOf(name, note, lang));
    }
  });

  it("定型文でない文は、原文のまま", () => {
    expect(translateCaution("担当者の指示どおり", "en")).toBe("担当者の指示どおり");
  });
});

describe("規則の書類名の訳", () => {
  const ruleNames = (() => {
    const names = new Map<string, string>();
    for (const s of RULE_SETS) for (const r of s.rules) if (r.id !== "application_form") names.set(r.id + "\n" + r.name, r.name);
    for (const mark of Object.keys(HSP_EVIDENCE)) {
      const r = hspEvidenceRule(mark);
      names.set(r.id + "\n" + r.name, r.name);
    }
    return [...names.entries()].map(([k, name]) => ({ id: k.split("\n")[0], name }));
  })();

  const untranslated = ruleNames.filter((r) => !REQUIREMENT_NAME_TRANSLATIONS[r.name]);

  it("訳がない書類名の一覧（案内書に載り得るもの）を出す", () => {
    // 一覧は、行政書士が訳文を確認・追加する際の手がかり。docs/client-guide-languages.md に、確認の手順を書いている
    console.info(`訳がない書類名：${untranslated.length} 件（規則の書類名は全部で ${ruleNames.length} 件）\n${untranslated.map((r) => `- ${r.name}`).join("\n")}`);
    expect(ruleNames.length).toBeGreaterThan(60);
  });

  it("訳がない書類名は、日本語の原文に「訳文は未確認」の目印を付ける（英語・韓国語）", () => {
    for (const r of untranslated) {
      for (const lang of OTHER_LANGS) {
        const cell = requirementNameCell(r.id, r.name, lang);
        expect(cell.untranslated).toBe(true);
        expect(cell.text.startsWith(r.name)).toBe(true);
        expect(cell.text).toContain(CLIENT_GUIDE_TEXTS[lang].untranslatedMark);
      }
      expect(requirementNameCell(r.id, r.name, "ja")).toEqual({ text: r.name, untranslated: false });
    }
  });

  it("目印は、画面・出力の構成（表と注記）に出る", () => {
    const base = make();
    const first = base.content.clientGuide!.items[0];
    const doc = make(record, {
      content: {
        ...base.content,
        clientGuide: { ...base.content.clientGuide!, items: [{ ...first, id: "photo", name: "新設の規則の書類（訳表にない）" }] },
      },
    });
    for (const lang of OTHER_LANGS) {
      const blocks = buildBlocks(doc, lang);
      const table = blocks.find((b) => b.kind === "table");
      expect(table?.kind === "table" && table.rows[0][0]).toBe(`新設の規則の書類（訳表にない）\n${CLIENT_GUIDE_TEXTS[lang].untranslatedMark}`);
      expect(blocks).toContainEqual({ kind: "note", text: CLIENT_GUIDE_TEXTS[lang].untranslatedNote });
    }
    expect(JSON.stringify(buildBlocks(doc, "ja"))).not.toContain("untranslated");
  });

  it("訳表の書類名は、現在の規則に実在する（規則の書類名を変えたときの、訳の取り残しを防ぐ）", () => {
    const current = new Set(ruleNames.map((r) => r.name));
    for (const name of Object.keys(REQUIREMENT_NAME_TRANSLATIONS)) expect(current.has(name), name).toBe(true);
  });

  it("訳表の訳は、空でなく、書類名と同じでもない", () => {
    for (const [name, [en, ko]] of Object.entries(REQUIREMENT_NAME_TRANSLATIONS)) {
      expect(en.length).toBeGreaterThan(0);
      expect(ko.length).toBeGreaterThan(0);
      expect(en).not.toBe(name);
      expect(ko).not.toBe(name);
    }
  });
});

/** 従来（言語の指定がなかった頃）の、ご案内書類の構成。日本語の出力が変わっていないことの確認用 */
function legacyBlocks(doc: GeneratedDocument) {
  const c = doc.content;
  const g = c.clientGuide;
  const party = { applicant: "申請人ご本人", organization: "所属機関" } as const;
  return [
    { kind: "eyebrow", text: "依頼者向けのご案内（行政書士の確認前は、下書きです）" },
    { kind: "title", text: "お願いする書類のご案内" },
    { kind: "subtitle", text: `${g?.addressee ?? c.case.caseName} 様` },
    {
      kind: "status",
      meta: `版：v${doc.version}　生成日時：${doc.content.generatedAt ? new Date(c.generatedAt).toISOString() : ""}`,
      label: "",
      confirmed: false,
      reviewed: "",
    },
    { kind: "heading", text: "ご案内" },
    { kind: "kv", rows: [["手続の名称", c.case.procedureLabel || "未入力"]] },
    { kind: "paragraph", text: `${c.case.procedureLabel || "手続"}を進めるため、次の書類のご用意をお願いします。期限までに、担当者へお渡しください。` },
    { kind: "heading", text: "お願いする書類" },
    { kind: "note", text: "受領済みの書類も載せています。受領の状況の欄をご確認ください。" },
    {
      kind: "table",
      widths: [28, 18, 11, 11, 12, 20],
      head: ["書類", "取得先・取得方法の目安", "提出者", "受領の状況", "期限", "提出時の注意"],
      rows: g!.items.map((i) => [
        i.name,
        i.source,
        party[i.party],
        REQUIREMENT_STATUS_LABELS[i.status],
        i.dueDate ? i.dueDate.replaceAll("-", "/") : "未設定",
        i.cautions.join("、"),
      ]),
    },
    { kind: "heading", text: "提出時のご注意" },
    {
      kind: "paragraph",
      text: "原本・写しの別や、発行日・撮影日の条件は、表の「提出時の注意」の欄に記載しています。記載のない書類や、ご不明な点は、下記の担当者へお問い合わせください。",
    },
    { kind: "heading", text: "連絡先" },
    {
      kind: "kv",
      rows: [
        ["事務所名", "　　　　　　　　　　　　　　"],
        ["担当者名", "　　　　　　　　　　　　　　"],
      ],
    },
    { kind: "notices", lines: c.notices },
  ];
}

describe("日本語は、従来の出力と同一", () => {
  it("言語の指定なし・日本語の指定のどちらも、従来の構成と同じ", () => {
    const doc = make();
    const legacy = legacyBlocks(doc);
    const now = buildBlocks(doc);
    // 状態の欄（日時は実行環境の時刻で表示される）だけ、別に確認する
    const strip = (bs: unknown[]) => bs.filter((b) => (b as { kind: string }).kind !== "status");
    expect(strip(now)).toEqual(strip(legacy));
    expect(buildBlocks(doc, "ja")).toEqual(now);
    const status = now.find((b) => b.kind === "status");
    expect(status).toMatchObject({ label: "行政書士確認前", confirmed: false, reviewed: "" });
    expect(status?.kind === "status" && status.meta).toMatch(/^版：v1　生成日時：\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it("確認済みの版の、状態の欄と、ページ下部の文言", () => {
    const doc = make(record, { status: "reviewed", reviewedAt: "2026-10-06T01:00:00.000Z", reviewedByName: "行政書士 花子" });
    const status = buildBlocks(doc, "ja").find((b) => b.kind === "status");
    expect(status).toMatchObject({ label: "行政書士確認済み", confirmed: true });
    expect(status?.kind === "status" && status.reviewed).toMatch(/^確認：行政書士 花子／\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(footerLabel(doc)).toBe("行政書士確認済み／依頼者向けのご案内");
    expect(footerLabel(doc, "ja")).toBe("行政書士確認済み／依頼者向けのご案内");
  });
});

describe("英語・韓国語の表示", () => {
  it("固定の文・受領の状況・提出時の注意が、言語ごとに変わる", () => {
    const doc = make();
    const en = textOf(doc, "en");
    expect(en).toContain("Guide to the Documents We Ask You to Prepare");
    expect(en).toContain("Requested");
    expect(en).toContain("Municipal office");
    expect(en).toContain("Application for Extension of Period of Stay");
    expect(en).toContain("2026/11/10");
    expect(en).not.toContain("お願いする書類のご案内");
    const ko = textOf(doc, "ko");
    expect(ko).toContain("준비해 주실 서류 안내");
    expect(ko).toContain("요청함");
    expect(ko).toContain("체류기간 갱신 허가 신청");
    expect(ko).not.toContain("お願いする書類のご案内");
  });

  it("規則の書類名は訳し、訳表にある書類には目印を付けない", () => {
    const en = JSON.stringify(buildBlocks(make(), "en"));
    expect(en).toContain("Passport and Residence Card (to be presented)");
    expect(en).not.toContain(CLIENT_GUIDE_TEXTS.en.untranslatedMark);
    expect(JSON.stringify(buildBlocks(make(), "ko"))).toContain("여권 및 재류카드(제시)");
  });

  it("自由記述（追加した書類名）・宛名・確認者の氏名は、翻訳せず、原文のまま。目印も付けない", () => {
    const doc = make(record, { status: "reviewed", reviewedAt: "2026-10-06T01:00:00.000Z", reviewedByName: "行政書士 花子" });
    for (const lang of OTHER_LANGS) {
      const blocks = buildBlocks(doc, lang);
      const table = blocks.find((b) => b.kind === "table");
      const custom = table?.kind === "table" ? table.rows.find((r) => r[0].includes("山田部長")) : undefined;
      expect(custom?.[0]).toBe("山田部長の在職証明（原本）");
      const subtitle = blocks.find((b) => b.kind === "subtitle");
      expect(subtitle?.kind === "subtitle" && subtitle.text).toContain("テスト 太郎");
      const status = blocks.find((b) => b.kind === "status");
      expect(status?.kind === "status" && status.reviewed).toContain("行政書士 花子");
      // 追加した書類の「提出時の注意」は、定型文なので、訳す
      expect(custom?.[5]).toBe(CLIENT_GUIDE_TEXTS[lang].cautions.original);
    }
  });

  it("宛名が、案件名の場合も、原文のまま", () => {
    const c: CaseRecord = { ...record, applicant: { ...EMPTY_APPLICANT } };
    const subtitle = buildBlocks(make(c), "en").find((b) => b.kind === "subtitle");
    expect(subtitle?.kind === "subtitle" && subtitle.text).toBe(`For: ${record.caseName}`);
  });

  it("手続の名称が未入力のときも、文が成り立つ", () => {
    const doc = make();
    const noProcedure: GeneratedDocument = { ...doc, content: { ...doc.content, case: { ...doc.content.case, procedureLabel: "" } } };
    expect(textOf(noProcedure, "en")).toContain("To proceed with the procedure");
    expect(textOf(noProcedure, "ko")).toContain("절차을(를)");
  });

  it("お願いする書類がない場合も、言語ごとの文になる", () => {
    const base = make();
    const empty: GeneratedDocument = { ...base, content: { ...base.content, clientGuide: { ...base.content.clientGuide!, items: [] } } };
    expect(textOf(empty, "en")).toContain(CLIENT_GUIDE_TEXTS.en.noItems);
    expect(textOf(empty, "ko")).toContain(CLIENT_GUIDE_TEXTS.ko.noItems);
  });

  it("言語を切り替えても、保存済みの内容（content_json）は変わらない", () => {
    const doc = make();
    const before = JSON.stringify(doc);
    for (const lang of LANGS) buildBlocks(doc, lang);
    expect(JSON.stringify(doc)).toBe(before);
    expect(before).not.toContain("Guide to the Documents");
    expect(JSON.stringify(buildContent(record, "client_guide"))).not.toMatch(/"lang"/);
  });

  it("ご案内書類以外の文書は、言語を指定しても、日本語のまま", () => {
    const doc: GeneratedDocument = { ...make(), documentType: "case_summary", content: buildContent(record, "case_summary") };
    expect(buildBlocks(doc, "en")).toEqual(buildBlocks(doc));
    expect(footerLabel(doc, "ko")).toBe(footerLabel(doc));
  });

  it("buildClientGuide の保存内容は、言語によらず、日本語", () => {
    const items = buildClientGuide(record).items;
    expect(items.some((i) => i.source === "お手元のものをご用意ください")).toBe(true);
  });
});

describe("言語の記憶（localStorage）", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("記憶した言語を読み、不正な値や未記憶は日本語にする", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
    });
    expect(readStoredLang()).toBe(DEFAULT_LANG);
    storeLang("ko");
    expect(store.get(LANG_STORAGE_KEY)).toBe("ko");
    expect(readStoredLang()).toBe("ko");
    store.set(LANG_STORAGE_KEY, "fr");
    expect(readStoredLang()).toBe("ja");
  });

  it("localStorage が使えなくても、例外を出さない", () => {
    vi.stubGlobal("window", {
      get localStorage(): never {
        throw new Error("blocked");
      },
    });
    expect(readStoredLang()).toBe("ja");
    expect(() => storeLang("en")).not.toThrow();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("quota");
        },
      },
    });
    expect(readStoredLang()).toBe("ja");
    expect(() => storeLang("ko")).not.toThrow();
  });
});

async function documentXml(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file("word/document.xml")!.async("string");
}

describe("Word の出力", () => {
  it("日本語は、従来どおり（Yu Gothic、言語の指定なし）", async () => {
    const blob = await buildDocx(make());
    const xml = await documentXml(blob);
    expect(xml).toContain("お願いする書類のご案内");
    expect(xml).toContain("Yu Gothic");
    expect(xml).not.toContain("Malgun");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const styles = await zip.file("word/styles.xml")!.async("string");
    expect(styles).not.toContain("ko-KR");
    expect(styles).not.toContain("en-US");
    expect(await documentXml(await buildDocx(make(), "ja"))).toBe(xml);
  });

  it("英語は、英語の文で出る。氏名は原文のまま", async () => {
    const xml = await documentXml(await buildDocx(make(), "en"));
    expect(xml).toContain("Guide to the Documents We Ask You to Prepare");
    expect(xml).toContain("テスト 太郎");
    expect(xml).not.toContain("お願いする書類のご案内");
  });

  it("韓国語は、ハングルを表示できる書体と、言語の指定を持つ", async () => {
    const blob = await buildDocx(make(), "ko");
    const xml = await documentXml(blob);
    expect(xml).toContain("준비해 주실 서류 안내");
    expect(xml).toContain('w:eastAsia="Malgun Gothic"');
    expect(xml).not.toContain("Yu Gothic");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const styles = await zip.file("word/styles.xml")!.async("string");
    expect(styles).toContain("ko-KR");
    expect(styles).toContain("Malgun Gothic");
    const footer = await Promise.all(
      Object.keys(zip.files)
        .filter((f) => f.startsWith("word/footer"))
        .map((f) => zip.file(f)!.async("string")),
    );
    expect(footer.join("")).toContain("의뢰인 안내");
  });
});

const jpFont = new Uint8Array(readFileSync("public/fonts/NotoSansJP-Regular.ttf"));
const krFont = new Uint8Array(readFileSync("public/fonts/NotoSansKR-Regular.ttf"));

describe("PDF の出力", () => {
  it("日本語・英語・韓国語のいずれも、PDF にできる", async () => {
    const doc = make();
    for (const lang of ["ja", "en"] as const) {
      const pdf = await PDFDocument.load(await (await buildPdf(doc, jpFont, lang)).arrayBuffer());
      expect(pdf.getPageCount()).toBeGreaterThan(0);
    }
    const ko = await PDFDocument.load(await (await buildPdf(doc, krFont, "ko", [jpFont])).arrayBuffer());
    expect(ko.getPageCount()).toBeGreaterThan(0);
  });

  it("埋め込まれたフォントの字形が壊れていない（絞り込みで字形が途中で切れると、文字が欠ける）", async () => {
    const blob = await buildPdf(make(), krFont, "ko", [jpFont]);
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    const fonts: Uint8Array[] = [];
    for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
      const ref = obj instanceof PDFDict ? obj.get(PDFName.of("FontFile2")) : undefined;
      const stream = ref ? pdf.context.lookup(ref) : undefined;
      if (stream instanceof PDFRawStream) fonts.push(decodePDFRawStream(stream).decode());
    }
    expect(fonts.length).toBe(2);
    const samples = ["가", "나", "한", "お", "願", "A", "d"];
    for (const bytes of fonts) {
      const f = fontkit.create(bytes as Buffer) as unknown as {
        glyphForCodePoint(cp: number): { path: { commands: unknown[] } };
        hasGlyphForCodePoint(cp: number): boolean;
      };
      for (const ch of samples) {
        const cp = ch.codePointAt(0)!;
        // そのフォントが持つ文字は、字形（輪郭）を読み出せること
        if (f.hasGlyphForCodePoint(cp)) expect(f.glyphForCodePoint(cp).path.commands.length, ch).toBeGreaterThan(0);
      }
    }
  });

  it("描いた全ての字形に、幅が登録されている（漏れると、数字の間隔が広がる）", async () => {
    const doc = make();
    const pdf = await PDFDocument.load(await (await buildPdf(doc, jpFont, "en")).arrayBuffer());
    // 登録された幅（/W 配列は、字形番号と [幅] の組）
    const registered = new Set<number>();
    for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
      const w = obj instanceof PDFDict ? obj.get(PDFName.of("W")) : undefined;
      const arr = w ? pdf.context.lookup(w) : undefined;
      if (!(arr instanceof PDFArray)) continue;
      // 形式は、「先頭の字形番号 [幅 幅 …]」または「先頭 末尾 幅」
      for (let i = 0; i < arr.size(); ) {
        const first = arr.lookup(i, PDFNumber).asNumber();
        const next = arr.lookup(i + 1);
        if (next instanceof PDFArray) {
          for (let k = 0; k < next.size(); k++) registered.add(first + k);
          i += 2;
        } else {
          const last = arr.lookup(i + 1, PDFNumber).asNumber();
          for (let g = first; g <= last; g++) registered.add(g);
          i += 3;
        }
      }
    }
    expect(registered.size).toBeGreaterThan(100);
    // ページの内容に描かれた字形（16進の文字列）
    const drawn = new Set<number>();
    for (const page of pdf.getPages()) {
      const contents = page.node.Contents();
      const streams = contents instanceof PDFRawStream ? [contents] : contents instanceof PDFArray ? contents.asArray().map((r) => pdf.context.lookup(r)) : [];
      for (const st of streams) {
        if (!(st instanceof PDFRawStream)) continue;
        const text = new TextDecoder().decode(decodePDFRawStream(st).decode());
        for (const m of text.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)) for (let i = 0; i + 4 <= m[1].length; i += 4) drawn.add(parseInt(m[1].slice(i, i + 4), 16));
      }
    }
    expect(drawn.size).toBeGreaterThan(20);
    expect([...drawn].filter((g) => !registered.has(g))).toEqual([]);
  });

  it("韓国語の文書の全ての文字を、2つのフォントのどちらかで描ける（文字化けしない）", async () => {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const kr = await pdf.embedFont(krFont, { subset: false });
    const jp = await pdf.embedFont(jpFont, { subset: false });
    const krSet = new Set(kr.getCharacterSet());
    const jpSet = new Set(jp.getCharacterSet());
    // 追加した書類名・氏名に、漢字・かな・ハングルが混ざる場合も含める
    const c: CaseRecord = { ...record, applicant: { ...EMPTY_APPLICANT, legalName: "김민준 山田 太郎" } };
    const texts: string[] = [];
    for (const b of buildBlocks(make(c), "ko")) {
      if (b.kind === "table") texts.push(...b.head, ...b.rows.flat());
      else if (b.kind === "kv") texts.push(...b.rows.flat());
      else if (b.kind === "notices") texts.push(...b.lines);
      else if (b.kind === "status") texts.push(b.meta, b.label, b.reviewed);
      else texts.push(b.text);
    }
    texts.push(footerLabel(make(c), "ko"));
    const missing = new Set<string>();
    for (const ch of texts.join("")) {
      if (ch === "\n" || ch === "　") continue;
      if (!krSet.has(ch.codePointAt(0)!) && !jpSet.has(ch.codePointAt(0)!)) missing.add(ch);
    }
    expect([...missing]).toEqual([]);
    // ハングルは韓国語のフォント、かな・漢字は日本語のフォントで描く
    const set = new FontSet([kr, jp]);
    expect(set.runs("김민준 山田").map((r) => r.font === kr)).toEqual([true, false]);
    expect(set.widthOfTextAtSize("김민준 山田", 10)).toBeGreaterThan(0);
  });
});
