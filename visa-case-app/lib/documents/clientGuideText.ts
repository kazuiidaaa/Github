import { REQUIREMENT_STATUS_LABELS, type RequirementStatus } from "../types";
import { CLIENT_GUIDE_NOTICES, GENERATED_STATUS_LABELS, type GeneratedDocumentStatus } from "./types";
import type { Lang } from "./lang";

// 依頼者向けのご案内書類の、固定の文の訳表（日本語・英語・韓国語）。外部の翻訳サービスは使わない。
// 自由記述（備考など）・宛名・連絡先・氏名は翻訳せず、原文のまま載せる。
// 訳文は、行政書士が依頼者へお渡しする前に確認する（docs/client-guide-languages.md）。
// 書類名の訳表は、clientGuideNames.ts。

export interface ClientGuideTexts {
  eyebrow: string;
  title: string;
  addressee: (name: string) => string;
  guideHeading: string;
  procedureNameLabel: string;
  /** 手続の名称が未入力のときの、文中の呼び方 */
  procedureFallback: string;
  notEntered: string;
  intro: (procedure: string) => string;
  itemsHeading: string;
  noItems: string;
  includeReceivedNote: string;
  tableHead: [string, string, string, string, string, string];
  notSet: string;
  /** 提出時の注意を並べるときの区切り */
  listSeparator: string;
  cautionsHeading: string;
  cautionsBody: string;
  contactHeading: string;
  officeName: string;
  staffName: string;
  party: { applicant: string; organization: string };
  requirementStatus: Record<RequirementStatus, string>;
  generatedStatus: Record<GeneratedDocumentStatus, string>;
  meta: (version: number, generatedAt: string) => string;
  reviewed: (name: string, at: string) => string;
  footer: (statusLabel: string) => string;
  /** Word の文書の説明 */
  docDescription: string;
  /** 訳がない書類名に付ける目印 */
  untranslatedMark: string;
  untranslatedNote: string;
  cautions: {
    copy: string;
    original: string;
    issued: (months: string) => string;
    taken: (months: string) => string;
  };
}

export const CLIENT_GUIDE_TEXTS: Record<Lang, ClientGuideTexts> = {
  ja: {
    eyebrow: "依頼者向けのご案内（行政書士の確認前は、下書きです）",
    title: "お願いする書類のご案内",
    addressee: (name) => `${name} 様`,
    guideHeading: "ご案内",
    procedureNameLabel: "手続の名称",
    procedureFallback: "手続",
    notEntered: "未入力",
    intro: (p) => `${p}を進めるため、次の書類のご用意をお願いします。期限までに、担当者へお渡しください。`,
    itemsHeading: "お願いする書類",
    noItems: "現在、お願いする書類はありません。",
    includeReceivedNote: "受領済みの書類も載せています。受領の状況の欄をご確認ください。",
    tableHead: ["書類", "取得先・取得方法の目安", "提出者", "受領の状況", "期限", "提出時の注意"],
    notSet: "未設定",
    listSeparator: "、",
    cautionsHeading: "提出時のご注意",
    cautionsBody:
      "原本・写しの別や、発行日・撮影日の条件は、表の「提出時の注意」の欄に記載しています。記載のない書類や、ご不明な点は、下記の担当者へお問い合わせください。",
    contactHeading: "連絡先",
    officeName: "事務所名",
    staffName: "担当者名",
    party: { applicant: "申請人ご本人", organization: "所属機関" },
    requirementStatus: REQUIREMENT_STATUS_LABELS,
    generatedStatus: GENERATED_STATUS_LABELS,
    meta: (v, at) => `版：v${v}　生成日時：${at}`,
    reviewed: (name, at) => `確認：${name}／${at}`,
    footer: (s) => `${s}／依頼者向けのご案内`,
    docDescription: "依頼者向けのご案内",
    untranslatedMark: "",
    untranslatedNote: "",
    cautions: {
      copy: "写しで提出",
      original: "原本で提出",
      issued: (n) => `発行日から${n}か月以内のもの`,
      taken: (n) => `申請前${n}か月以内に撮影したもの`,
    },
  },
  en: {
    eyebrow: "Guidance for clients (a draft until it is reviewed by the administrative scrivener)",
    title: "Guide to the Documents We Ask You to Prepare",
    addressee: (name) => `For: ${name}`,
    guideHeading: "Guide",
    procedureNameLabel: "Procedure",
    procedureFallback: "the procedure",
    notEntered: "Not entered",
    intro: (p) =>
      `To proceed with ${p}, please prepare the documents listed below. Please hand them to the person in charge by the due date.`,
    itemsHeading: "Documents We Ask You to Prepare",
    noItems: "There are no documents we ask you to prepare at this time.",
    includeReceivedNote: "Documents that have already been received are also listed. Please check the \"Status\" column.",
    tableHead: [
      "Document",
      "Where to obtain it / how to prepare it (guide)",
      "Submitted by",
      "Status",
      "Due date",
      "Notes for submission",
    ],
    notSet: "Not set",
    listSeparator: ", ",
    cautionsHeading: "Notes for Submission",
    cautionsBody:
      "Whether to submit the original or a copy, and the conditions on the issue date or the date a photo was taken, are given in the \"Notes for submission\" column of the table. If a document has no note, or if you have any questions, please contact the person in charge below.",
    contactHeading: "Contact",
    officeName: "Office name",
    staffName: "Person in charge",
    party: { applicant: "The applicant", organization: "Affiliated organization (employer)" },
    requirementStatus: { not_received: "Not received", requested: "Requested", received: "Received", reviewed: "Checked" },
    generatedStatus: {
      draft: "Before review by the scrivener",
      reviewed: "Reviewed by the scrivener",
      submitted: "Submitted",
      archived: "Archived",
    },
    meta: (v, at) => `Version: v${v}　Generated: ${at}`,
    reviewed: (name, at) => `Reviewed by: ${name} / ${at}`,
    footer: (s) => `${s} / Guidance for clients`,
    docDescription: "Guidance for clients",
    untranslatedMark: "(Japanese original. The translation has not been verified.)",
    untranslatedNote:
      "For items marked \"The translation has not been verified\", the Japanese original is shown. Please ask the person in charge about these items.",
    cautions: {
      copy: "Submit a copy",
      original: "Submit the original",
      issued: (n) => `Submit within ${n} months of the issue date`,
      taken: (n) => `Photo taken within ${n} months before applying`,
    },
  },
  ko: {
    eyebrow: "의뢰인 안내(행정서사(行政書士)의 확인 전에는 초안입니다)",
    title: "준비해 주실 서류 안내",
    addressee: (name) => `${name} 님`,
    guideHeading: "안내",
    procedureNameLabel: "절차 명칭",
    procedureFallback: "절차",
    notEntered: "미입력",
    intro: (p) => `${p}을(를) 진행하기 위해 다음 서류를 준비해 주시기 바랍니다. 기한까지 담당자에게 전달해 주십시오.`,
    itemsHeading: "준비해 주실 서류",
    noItems: "현재 준비해 주실 서류는 없습니다.",
    includeReceivedNote: "이미 수령한 서류도 함께 기재했습니다. '수령 상태' 열을 확인해 주십시오.",
    tableHead: ["서류", "발급처·준비 방법(안내)", "제출자", "수령 상태", "기한", "제출 시 유의사항"],
    notSet: "미설정",
    listSeparator: ", ",
    cautionsHeading: "제출 시 유의사항",
    cautionsBody:
      "원본·사본의 구분, 발급일·촬영일의 조건은 표의 '제출 시 유의사항' 열에 기재했습니다. 기재가 없는 서류나 궁금하신 점은 아래 담당자에게 문의해 주십시오.",
    contactHeading: "연락처",
    officeName: "사무소명",
    staffName: "담당자명",
    party: { applicant: "신청인 본인", organization: "소속 기관" },
    requirementStatus: { not_received: "미수령", requested: "요청함", received: "수령 완료", reviewed: "확인 완료" },
    generatedStatus: { draft: "행정서사 확인 전", reviewed: "행정서사 확인 완료", submitted: "제출 완료", archived: "보관" },
    meta: (v, at) => `버전: v${v}　생성 일시: ${at}`,
    reviewed: (name, at) => `확인: ${name} / ${at}`,
    footer: (s) => `${s} / 의뢰인 안내`,
    docDescription: "의뢰인 안내",
    untranslatedMark: "(일본어 원문, 번역 미확인)",
    untranslatedNote:
      "'번역 미확인'으로 표시된 항목은 일본어 원문을 그대로 기재했습니다. 해당 항목은 담당자에게 문의해 주십시오.",
    cautions: {
      copy: "사본으로 제출",
      original: "원본으로 제출",
      issued: (n) => `발급일로부터 ${n}개월 이내의 것`,
      taken: (n) => `신청 전 ${n}개월 이내에 촬영한 것`,
    },
  },
};

/**
 * 手続の名称（日本語の原文）の訳。lib/types.ts の PROCEDURE_TYPES の表示名がキー。
 * 訳がなければ、原文のまま使う。
 */
const PROCEDURE_LABEL_TRANSLATIONS: Record<string, { en: string; ko: string }> = {
  在留期間更新許可申請: { en: "Application for Extension of Period of Stay", ko: "체류기간 갱신 허가 신청" },
  在留資格変更許可申請: { en: "Application for Change of Status of Residence", ko: "체류자격 변경 허가 신청" },
  在留資格認定証明書交付申請: { en: "Application for Certificate of Eligibility", ko: "체류자격 인정 증명서 교부 신청" },
  在留資格取得許可申請: { en: "Application for Permission to Acquire Status of Residence", ko: "체류자격 취득 허가 신청" },
  その他: { en: "Other", ko: "기타" },
};

export function procedureLabelOf(label: string, lang: Lang): string {
  if (lang === "ja") return label;
  return PROCEDURE_LABEL_TRANSLATIONS[label]?.[lang] ?? label;
}

/** 取得先・取得方法の目安（clientGuide.ts の SOURCE_HINTS、NO_SOURCE）の訳。キーは日本語の原文 */
export const SOURCE_HINT_TRANSLATIONS: Record<string, { en: string; ko: string }> = {
  税務署: { en: "Tax office", ko: "세무서" },
  市区町村の窓口: { en: "Municipal office (city, ward, town, or village hall)", ko: "시·구·정·촌 청사 창구" },
  法務局: { en: "Legal Affairs Bureau", ko: "법무국(法務局)" },
  "勤務先・所属機関": { en: "Your employer / affiliated organization", ko: "근무처·소속 기관" },
  "撮影（規格は、書類名のとおり）": {
    en: "Take the photo (follow the specification in the document name)",
    ko: "촬영(규격은 서류명에 기재된 대로)",
  },
  お手元のものをご用意ください: { en: "Please prepare the one you already have", ko: "소지하고 계신 것을 준비해 주십시오" },
  "ご用意ください（書き方は、担当者がご案内します）": {
    en: "Please prepare it (the person in charge will explain how to fill it in)",
    ko: "준비해 주십시오(작성 방법은 담당자가 안내해 드립니다)",
  },
  担当者へお尋ねください: { en: "Please ask the person in charge", ko: "담당자에게 문의해 주십시오" },
};

export function sourceHintText(source: string, lang: Lang): string {
  if (lang === "ja") return source;
  return SOURCE_HINT_TRANSLATIONS[source]?.[lang] ?? source;
}

/** 保存済みのご案内書の注意書き（CLIENT_GUIDE_NOTICES）の訳。キーは日本語の原文 */
export const NOTICE_TRANSLATIONS: Record<string, { en: string; ko: string }> = {
  [CLIENT_GUIDE_NOTICES[0]]: {
    en: "This document is guidance issued before review by the administrative scrivener. Its contents may change when the review is carried out.",
    ko: "이 서류는 행정서사의 확인 전 안내입니다. 내용은 확인 과정에서 변경될 수 있습니다.",
  },
  [CLIENT_GUIDE_NOTICES[1]]: {
    en: "This document does not indicate whether an application will be approved, the prospects of approval, or a final decision on the required documents.",
    ko: "이 서류는 신청의 가부, 허가의 전망, 필요 서류의 최종 판단을 나타내는 것이 아닙니다.",
  },
};

export function noticeText(line: string, lang: Lang): string {
  if (lang === "ja") return line;
  return NOTICE_TRANSLATIONS[line]?.[lang] ?? line;
}

/** 提出時の注意の種類。cautionsOf（clientGuide.ts）が作る定型文と、1対1に対応する */
export type CautionKey = "copy" | "original" | "issued" | "taken";

export function renderCaution(key: CautionKey, months: string | undefined, lang: Lang): string {
  const c = CLIENT_GUIDE_TEXTS[lang].cautions;
  switch (key) {
    case "copy":
      return c.copy;
    case "original":
      return c.original;
    case "issued":
      return c.issued(months ?? "");
    case "taken":
      return c.taken(months ?? "");
  }
}

/**
 * 保存済みの提出時の注意（日本語の定型文）を、指定の言語へ直す。
 * 定型文に当たらないものは、原文のまま返す。数字（月数）は、そのまま差し込む。
 */
export function translateCaution(ja: string, lang: Lang): string {
  if (lang === "ja") return ja;
  if (ja === CLIENT_GUIDE_TEXTS.ja.cautions.copy) return renderCaution("copy", undefined, lang);
  if (ja === CLIENT_GUIDE_TEXTS.ja.cautions.original) return renderCaution("original", undefined, lang);
  const issued = ja.match(/^発行日から(\d+)か月以内のもの$/);
  if (issued) return renderCaution("issued", issued[1], lang);
  const taken = ja.match(/^申請前(\d+)か月以内に撮影したもの$/);
  if (taken) return renderCaution("taken", taken[1], lang);
  return ja;
}
