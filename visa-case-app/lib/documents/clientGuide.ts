import { formatDate } from "../format";
import { evaluate } from "../requirements/evaluate";
import { isCollected } from "../requirements/progress";
import type { CaseRecord } from "../types";
import { isRuleItemId, translatedRequirementName } from "./clientGuideNames";
import {
  CLIENT_GUIDE_TEXTS,
  noticeText,
  procedureLabelOf,
  renderCaution,
  sourceHintText,
  translateCaution,
} from "./clientGuideText";
import type { Lang } from "./lang";
import type { Block } from "./model";
import type { ClientGuideContent, GeneratedDocument } from "./types";

// 依頼者向けの「ご案内書類」（お願いする書類のご案内）。案件の必要書類の判定から、依頼者へお願いする書類を抜き出す。
// 審査の見込み・許可の可否を示す表現は入れない。

/** 申請書そのものは事務所が作成するため、依頼者へのお願いには載せない */
const OFFICE_PREPARED_IDS = new Set(["application_form"]);

export const NO_SOURCE = "担当者へお尋ねください";

/** 書類名から、取得先・取得方法の目安を決める。該当がなければ、担当者への確認を案内する */
export const SOURCE_HINTS: [RegExp, string][] = [
  [/国税/, "税務署"],
  [/住民税|住民票/, "市区町村の窓口"],
  [/登記事項証明書|登記簿/, "法務局"],
  [/源泉徴収票|法定調書|決算文書|所得税徴収高/, "勤務先・所属機関"],
  [/写真/, "撮影（規格は、書類名のとおり）"],
  [/パスポート|旅券|在留カード/, "お手元のものをご用意ください"],
  [/返信用封筒/, "ご用意ください（書き方は、担当者がご案内します）"],
];

export function sourceHintOf(name: string): string {
  return SOURCE_HINTS.find(([re]) => re.test(name))?.[1] ?? NO_SOURCE;
}

/** 規則の書類名・備考に書かれている、提出時の条件（写し・原本・発行日・撮影日）を抜き出す */
export function cautionsOf(name: string, note?: string, lang: Lang = "ja"): string[] {
  const text = `${name}\n${note ?? ""}`;
  const out: string[] = [];
  if (/写し/.test(name)) out.push(renderCaution("copy", undefined, lang));
  if (/原本/.test(text)) out.push(renderCaution("original", undefined, lang));
  const issued = text.match(/発行日から\s*(\d+)か月以内/);
  if (issued) out.push(renderCaution("issued", issued[1], lang));
  const taken = text.match(/申請前\s*(\d+)か月以内/);
  if (taken) out.push(renderCaution("taken", taken[1], lang));
  return out;
}

/**
 * 案件から、ご案内書類の内容を作る。
 * 対象は、「必要」と判定された書類のうち、未受領・依頼済みのもの。
 * includeReceived が true の場合は、受領済み・確認済みの書類も載せる。不要とされた書類は載せない。
 */
export function buildClientGuide(c: CaseRecord, includeReceived = false): ClientGuideContent {
  const ev = evaluate(c);
  const items: ClientGuideContent["items"] = [
    ...ev.items
      .filter((i) => i.effective === "required" && !OFFICE_PREPARED_IDS.has(i.rule.id))
      .map((i) => ({
        id: i.rule.id,
        name: i.rule.name,
        party: i.rule.party,
        source: sourceHintOf(i.rule.name),
        status: i.state.status,
        dueDate: i.state.dueDate,
        cautions: cautionsOf(i.rule.name, i.rule.note),
      })),
    ...c.customRequirements
      .filter((r) => r.isRequired)
      .map((r) => ({
        id: r.id,
        name: r.name,
        party: r.party,
        source: sourceHintOf(r.name),
        status: r.status,
        dueDate: r.dueDate,
        cautions: cautionsOf(r.name),
      })),
  ].filter((i) => includeReceived || !isCollected(i.status));
  return { addressee: c.applicant.legalName || c.caseName, includeReceived, items };
}

/**
 * 書類名を、指定の言語で表示する形にする（画面・Word・PDF で共通。併記の書式は、ここだけで決める）。
 * 規則の書類名は、役所の窓口などで日本語の名称を伝えられるよう、訳文のあとに日本語の原文を併記する。
 * - 訳がある：「訳文（原文）」
 * - 訳がない：「原文（Not translated）」（目印は、言語ごと）
 * 日本語を選んだ場合と、行政書士が追加した書類名（自由記述）は、翻訳せず、原文のまま載せる。
 */
export function requirementNameCell(id: string, name: string, lang: Lang): { text: string; untranslated: boolean } {
  if (lang === "ja" || !isRuleItemId(id)) return { text: name, untranslated: false };
  const t = translatedRequirementName(name, lang);
  if (t) return { text: `${t}（${name}）`, untranslated: false };
  return { text: `${name}（${CLIENT_GUIDE_TEXTS[lang].untranslatedMark}）`, untranslated: true };
}

/** Word・PDF・画面で共通に使う、ご案内書類の構成。保存済みの content_json だけから作る。lang は、表示・出力の言語（保存はしない） */
export function buildClientGuideBlocks(doc: GeneratedDocument, eyebrow: string, statusBlock: Block, lang: Lang = "ja"): Block[] {
  const c = doc.content;
  const g = c.clientGuide;
  const t = CLIENT_GUIDE_TEXTS[lang];
  const procedure = procedureLabelOf(c.case.procedureLabel, lang);
  const out: Block[] = [
    { kind: "eyebrow", text: eyebrow },
    { kind: "title", text: t.title },
    // 宛名・氏名は、翻訳せず、原文のまま
    { kind: "subtitle", text: t.addressee(g?.addressee ?? c.case.caseName) },
    statusBlock,
    { kind: "heading", text: t.guideHeading },
    { kind: "kv", rows: [[t.procedureNameLabel, procedure || t.notEntered]] },
    { kind: "paragraph", text: t.intro(procedure || t.procedureFallback) },
    { kind: "heading", text: t.itemsHeading },
  ];
  if (!g || g.items.length === 0) {
    out.push({ kind: "paragraph", text: t.noItems });
  } else {
    if (g.includeReceived) out.push({ kind: "note", text: t.includeReceivedNote });
    const names = g.items.map((i) => requirementNameCell(i.id, i.name, lang));
    out.push({
      kind: "table",
      widths: [28, 18, 11, 11, 12, 20],
      head: [...t.tableHead],
      rows: g.items.map((i, n) => [
        names[n].text,
        sourceHintText(i.source, lang),
        t.party[i.party],
        t.requirementStatus[i.status],
        i.dueDate ? formatDate(i.dueDate) : t.notSet,
        i.cautions.map((x) => translateCaution(x, lang)).join(t.listSeparator),
      ]),
    });
    if (names.some((n) => n.untranslated)) out.push({ kind: "note", text: t.untranslatedNote });
  }
  out.push({ kind: "heading", text: t.cautionsHeading });
  out.push({ kind: "paragraph", text: t.cautionsBody });
  out.push({ kind: "heading", text: t.contactHeading });
  out.push({
    kind: "kv",
    rows: [
      [t.officeName, "　　　　　　　　　　　　　　"],
      [t.staffName, "　　　　　　　　　　　　　　"],
    ],
  });
  out.push({ kind: "notices", lines: c.notices.map((n) => noticeText(n, lang)) });
  return out;
}
