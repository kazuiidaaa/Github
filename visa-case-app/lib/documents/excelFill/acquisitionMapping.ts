import { formatDate } from "../../format";
import type { FormDetails } from "../../formDetails";
import type { Applicant } from "../../types";

/**
 * 公式の在留資格取得許可申請書（別記第三十六号様式・Excel）の「入力欄」のセル座標と、案件DBの対応表。
 *
 * 座標は、テンプレート（docs/official/acquisition-application-form_930004121.xlsx）の
 * ロック解除セルを機械的に列挙して特定した（手順は docs/phase11-fill-engines.md（更新編））。
 * 項目番号・取得元は docs/official-forms-research.md（取得編） の対応表と、FORM_LAYOUTS.acquisition に合わせている。
 * 対象外の項目・設計判断は docs/phase11-fill-engines.md（取得編） に記録している。
 * 取得様式は雇用情報を前提にしないため、入力に EmploymentInfo は含めない。
 */

export interface AcquisitionCtx {
  a: Applicant;
  f: FormDetails;
  /** 案件の「希望する在留資格」（CaseRecord.targetStatus）。未指定なら空文字 */
  targetStatus: string;
}

export interface AcquisitionFillItem {
  /** 公式様式の項目番号 */
  no: string;
  label: string;
  sheet: string;
  /** 結合セルは左上のセル */
  cell: string;
  /** 空文字なら書き込まない（テンプレートの元の状態のまま） */
  get: (c: AcquisitionCtx) => string;
}

/** 「該当する選択肢を残す」方式の項目（性別・配偶者の有無）。値が空なら何も変更しない */
export interface AcquisitionPickItem {
  no: string;
  label: string;
  sheet: string;
  get: (c: AcquisitionCtx) => string;
  /** 値 → { セル: 書き込む文字列 }（空文字は、セルを空にする） */
  writes: Record<string, Record<string, string>>;
}

/** 実際のシート名は「取得 (反映)」。照合は sheetKey（renewalMapping）で、全角半角・空白を無視する */
export const SHEET_ACQUISITION = "取得 (反映)";
const S = SHEET_ACQUISITION;

const date = (v: string) => (v ? formatDate(v) : "");

/** YYYY-MM-DD の、年・月・日の部分。先頭のゼロは除く */
function datePart(v: string, part: "y" | "m" | "d"): string {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(v.trim());
  if (!m) return "";
  const s = part === "y" ? m[1] : part === "m" ? m[2] : m[3];
  return s ? String(Number(s)) : "";
}

const item = (no: string, label: string, cell: string, get: (c: AcquisitionCtx) => string): AcquisitionFillItem => ({
  no,
  label,
  sheet: S,
  cell,
  get,
});

const dateItems = (no: string, label: string, cells: { y: string; m: string; d: string }, get: (c: AcquisitionCtx) => string): AcquisitionFillItem[] => [
  item(no, `${label}（年）`, cells.y, (c) => datePart(get(c), "y")),
  item(no, `${label}（月）`, cells.m, (c) => datePart(get(c), "m")),
  item(no, `${label}（日）`, cells.d, (c) => datePart(get(c), "d")),
];

/** 15 在日親族及び同居者の欄は4行（2行ずつの結合セル） */
const RELATIVE_ROWS = [56, 58, 60, 62];
export const MAX_RELATIVES = RELATIVE_ROWS.length;

const relativeItems: AcquisitionFillItem[] = RELATIVE_ROWS.flatMap((row, i) => {
  const r = (c: AcquisitionCtx) => (c.f.relativesPresent === "yes" ? c.f.relatives[i] : undefined);
  const label = `在日親族（${i + 1}人目）`;
  return [
    item("15", `${label} 続柄`, `A${row}`, (c) => r(c)?.relationship ?? ""),
    item("15", `${label} 氏名`, `D${row}`, (c) => r(c)?.name ?? ""),
    item("15", `${label} 生年月日`, `M${row}`, (c) => date(r(c)?.dateOfBirth ?? "")),
    item("15", `${label} 国籍・地域`, `Q${row}`, (c) => r(c)?.nationality ?? ""),
    item("15", `${label} 勤務先・通学先`, `X${row}`, (c) => r(c)?.workplace ?? ""),
    item("15", `${label} 在留カード番号・特別永住者証明書番号`, `AE${row}`, (c) => r(c)?.cardNumber ?? ""),
  ];
});

/** 13 希望する在留資格のうち、チェックボックスがある4つ。これ以外は「その他（ ）」の入力欄へ書く */
export const ACQUISITION_CHECKBOX_STATUSES = ["永住者の配偶者等", "日本人の配偶者等", "定住者", "家族滞在"];

export const ACQUISITION_FILL_ITEMS: AcquisitionFillItem[] = [
  item("1", "国籍・地域", "G14", (c) => c.a.nationality),
  ...dateItems("2", "生年月日", { y: "R14", m: "X14", d: "AB14" }, (c) => c.a.dateOfBirth),
  item("3", "氏名", "E17", (c) => c.a.legalName),
  item("5", "出生地", "O21", (c) => c.f.placeOfBirth),
  item("7", "職業", "E24", (c) => c.f.occupation),
  item("8", "本国における居住地", "V24", (c) => c.f.homeAddress),
  item("9", "住居地", "G27", (c) => c.a.address),
  item("9", "電話番号", "F30", (c) => c.f.phone),
  item("9", "携帯電話番号", "X30", (c) => c.f.mobilePhone),
  item("10", "旅券（1）番号", "H33", (c) => c.f.passportNumber),
  ...dateItems("10", "旅券（2）有効期限", { y: "X33", m: "AD33", d: "AH33" }, (c) => c.f.passportExpiry),
  item("11", "在留資格取得の事由 その他（内容）", "Z36", (c) => (c.f.acquisitionCause === "other" ? c.f.acquisitionCauseOther : "")),
  item("12", "在留の理由", "F39", (c) => c.f.stayPurpose),
  item("13", "希望する在留資格 その他（内容）", "Q44", (c) => {
    const s = c.targetStatus.trim();
    return s && !ACQUISITION_CHECKBOX_STATUSES.includes(s) ? s : "";
  }),
  item("13", "在留期間", "AF42", (c) => c.f.desiredPeriod),
  item("14", "犯罪を理由とする処分（具体的内容）", "I47", (c) => (c.f.criminalRecord === "yes" ? c.f.criminalDetail : "")),
  ...relativeItems,
  item("16", "在日身元保証人（1）氏名", "F65", (c) => c.f.guarantorName),
  item("16", "在日身元保証人（2）本人との関係", "AC65", (c) => c.f.guarantorRelationship),
  item("16", "在日身元保証人（3）住所", "F67", (c) => c.f.guarantorAddress),
  item("16", "在日身元保証人 電話番号", "G70", (c) => c.f.guarantorPhone),
  item("16", "在日身元保証人 携帯電話番号", "Y70", (c) => c.f.guarantorMobilePhone),
  item("17", "代理人（1）氏名", "F74", (c) => c.f.legalRepName),
  item("17", "代理人（2）本人との関係", "AC74", (c) => c.f.legalRepRelationship),
  item("17", "代理人（3）住所", "F76", (c) => c.f.legalRepAddress),
  item("17", "代理人 電話番号", "G79", (c) => c.f.legalRepPhone),
  // 17 代理人の携帯電話番号（Y79）は、案件DBに項目がないため対象外（別Issue）
  item("取次者", "取次者（1）氏名", "E96", (c) => c.f.agentName),
  item("取次者", "取次者（2）住所", "T96", (c) => c.f.agentAddress),
  item("取次者", "取次者（3）所属機関等", "C101", (c) => c.f.agentAffiliation),
  item("取次者", "取次者 電話番号", "Z101", (c) => c.f.agentPhone),
];

/** 「有・無」のうち、未選択（空文字）はそのまま。選ばれた側だけを PickItem の writes キーとして使う */
function yesNoLabel(v: "" | "yes" | "no"): "" | "有" | "無" {
  return v === "yes" ? "有" : v === "no" ? "無" : "";
}

/** 11「在留資格取得の事由」の□（J36 出生・N36 国籍離脱・喪失・V36 その他） */
const CAUSE_CHECKBOX_LABELS: Record<string, string> = { birth: "出生", nationalityLoss: "国籍離脱・喪失", other: "その他" };

export const ACQUISITION_PICK_ITEMS: AcquisitionPickItem[] = [
  {
    no: "4",
    label: "性別",
    sheet: S,
    get: (c) => c.a.gender,
    // E21「男」・F21「・」・G21「女」。選ばれなかった側と「・」を空にする
    writes: {
      男: { E21: "男", F21: "", G21: "" },
      女: { E21: "", F21: "", G21: "女" },
    },
  },
  {
    no: "6",
    label: "配偶者の有無",
    sheet: S,
    get: (c) => (c.f.maritalStatus === "married" ? "有" : c.f.maritalStatus === "single" ? "無" : ""),
    // AH21「有」・AI21「・」・AJ21「無」（別々のセル）。選ばれなかった側と「・」を空にする
    writes: {
      有: { AH21: "有", AI21: "", AJ21: "" },
      無: { AH21: "", AI21: "", AJ21: "無" },
    },
  },
  {
    no: "11",
    label: "在留資格取得の事由",
    sheet: S,
    get: (c) => CAUSE_CHECKBOX_LABELS[c.f.acquisitionCause] ?? "",
    writes: {
      出生: { J36: "■" },
      "国籍離脱・喪失": { N36: "■" },
      その他: { V36: "■" },
    },
  },
  {
    no: "13",
    label: "希望する在留資格",
    sheet: S,
    get: (c) => {
      const s = c.targetStatus.trim();
      if (!s) return "";
      return ACQUISITION_CHECKBOX_STATUSES.includes(s) ? s : "その他";
    },
    // H42 永住者の配偶者等・P42 日本人の配偶者等・X42 定住者・H44 家族滞在・M44 その他
    writes: {
      永住者の配偶者等: { H42: "■" },
      日本人の配偶者等: { P42: "■" },
      定住者: { X42: "■" },
      家族滞在: { H44: "■" },
      その他: { M44: "■" },
    },
  },
  {
    no: "14",
    label: "犯罪を理由とする処分の有無",
    sheet: S,
    get: (c) => yesNoLabel(c.f.criminalRecord === "yes" ? "yes" : c.f.criminalRecord === "none" ? "no" : ""),
    // C47「有」・D47「（具体的内容」・AG47「）」・AH47「・」・AI47「無」（別々のセル。具体的内容はI47へ別途書く）
    writes: {
      有: { AH47: "", AI47: "" },
      無: { C47: "", D47: "", AG47: "", AH47: "" },
    },
  },
  ...RELATIVE_ROWS.map(
    (row, i): AcquisitionPickItem => ({
      no: "15",
      label: `在日親族（${i + 1}人目） 同居`,
      sheet: S,
      get: (c) => {
        const r = c.f.relativesPresent === "yes" ? c.f.relatives[i] : undefined;
        return yesNoLabel(r?.livesTogether ?? "");
      },
      // U{row}（結合セル1つ）は「はい・いいえ」。選ばれた方だけにする
      writes: { 有: { [`U${row}`]: "はい" }, 無: { [`U${row}`]: "いいえ" } },
    }),
  ),
];
