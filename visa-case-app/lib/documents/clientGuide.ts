import { formatDate } from "../format";
import { evaluate } from "../requirements/evaluate";
import { isCollected } from "../requirements/progress";
import { REQUIREMENT_STATUS_LABELS, type CaseRecord } from "../types";
import type { Block } from "./model";
import type { ClientGuideContent, GeneratedDocument } from "./types";

// 依頼者向けの「ご案内書類」（お願いする書類のご案内）。案件の必要書類の判定から、依頼者へお願いする書類を抜き出す。
// 審査の見込み・許可の可否を示す表現は入れない。

/** 申請書そのものは事務所が作成するため、依頼者へのお願いには載せない */
const OFFICE_PREPARED_IDS = new Set(["application_form"]);

const NO_SOURCE = "担当者へお尋ねください";

/** 書類名から、取得先・取得方法の目安を決める。該当がなければ、担当者への確認を案内する */
const SOURCE_HINTS: [RegExp, string][] = [
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
export function cautionsOf(name: string, note?: string): string[] {
  const text = `${name}\n${note ?? ""}`;
  const out: string[] = [];
  if (/写し/.test(name)) out.push("写しで提出");
  if (/原本/.test(text)) out.push("原本で提出");
  const issued = text.match(/発行日から\s*\d+か月以内/);
  if (issued) out.push(`${issued[0].replace(/\s/g, "")}のもの`);
  const taken = text.match(/申請前\s*\d+か月以内/);
  if (taken) out.push(`${taken[0].replace(/\s/g, "")}に撮影したもの`);
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

const PARTY_LABELS = { applicant: "申請人ご本人", organization: "所属機関" } as const;

/** Word・PDF・画面で共通に使う、ご案内書類の構成。保存済みの content_json だけから作る */
export function buildClientGuideBlocks(doc: GeneratedDocument, eyebrow: string, statusBlock: Block): Block[] {
  const c = doc.content;
  const g = c.clientGuide;
  const out: Block[] = [
    { kind: "eyebrow", text: eyebrow },
    { kind: "title", text: "お願いする書類のご案内" },
    { kind: "subtitle", text: `${g?.addressee ?? c.case.caseName} 様` },
    statusBlock,
    { kind: "heading", text: "ご案内" },
    { kind: "kv", rows: [["手続の名称", c.case.procedureLabel || "未入力"]] },
    {
      kind: "paragraph",
      text: `${c.case.procedureLabel || "手続"}を進めるため、次の書類のご用意をお願いします。期限までに、担当者へお渡しください。`,
    },
    { kind: "heading", text: "お願いする書類" },
  ];
  if (!g || g.items.length === 0) {
    out.push({ kind: "paragraph", text: "現在、お願いする書類はありません。" });
  } else {
    if (g.includeReceived) out.push({ kind: "note", text: "受領済みの書類も載せています。受領の状況の欄をご確認ください。" });
    out.push({
      kind: "table",
      widths: [28, 18, 11, 11, 12, 20],
      head: ["書類", "取得先・取得方法の目安", "提出者", "受領の状況", "期限", "提出時の注意"],
      rows: g.items.map((i) => [
        i.name,
        i.source,
        PARTY_LABELS[i.party],
        REQUIREMENT_STATUS_LABELS[i.status],
        i.dueDate ? formatDate(i.dueDate) : "未設定",
        i.cautions.join("、"),
      ]),
    });
  }
  out.push({ kind: "heading", text: "提出時のご注意" });
  out.push({
    kind: "paragraph",
    text: "原本・写しの別や、発行日・撮影日の条件は、表の「提出時の注意」の欄に記載しています。記載のない書類や、ご不明な点は、下記の担当者へお問い合わせください。",
  });
  out.push({ kind: "heading", text: "連絡先" });
  out.push({
    kind: "kv",
    rows: [
      ["事務所名", "　　　　　　　　　　　　　　"],
      ["担当者名", "　　　　　　　　　　　　　　"],
    ],
  });
  out.push({ kind: "notices", lines: c.notices });
  return out;
}
