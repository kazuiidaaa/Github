import type { FormDetails, Relative, WorkEntry } from "./formDetails";
import type { Applicant, EmploymentInfo } from "./types";

// 日本語の入力欄で、半角の文字を全角へそろえる規則（Issue #223）。
// 変換は、入力の確定時（IME の確定 compositionend と、欄を離れたとき blur）のみ。入力途中は書き換えない。
// 既存の保存済みデータは、一括では変換しない。表示時にも変換しない（画面で編集して保存したときのみ変わる）。

/**
 * full：日本語の文章の欄。半角のカナ・英数字・記号・空白をすべて全角にする。
 * kana：半角のカナのみ全角にする（氏名・国籍・出生地など、ローマ字で書かれることがある欄）。英数字・記号・空白は、そのまま。
 * none：変換しない（番号・電話・日付・数量・ローマ字氏名など。既定）。
 */
export type ZenkakuMode = "full" | "kana" | "none";

// 半角カナの範囲（U+FF61 ｡ から U+FF9F ﾟ まで）。濁点・半濁点（ﾞ ﾟ）を含む
const HALFWIDTH_KANA = /[｡-ﾟ]+/g;
// ハイフンに見える文字。すべて全角のハイフン「－」（U+FF0D）にそろえる。長音「ー」・全角のダッシュ「―」は、対象外
const HYPHENS = /[-‐‑‒–−]/g;

/** 半角のカナを全角にする。濁点・半濁点は、直前の文字と結合する（ｶﾞ → ガ、ﾊﾟ → パ、ｳﾞ → ヴ） */
export function toZenkakuKana(text: string): string {
  // 互換正規化は、半角カナの部分だけに適用する（全角の英数字を半角へ戻さないため）
  return text.replace(HALFWIDTH_KANA, (s) => s.normalize("NFKC"));
}

/**
 * 半角のカナ・英数字・記号・空白を、すべて全角にする。
 * - 半角カナ：全角カナ（濁点・半濁点を結合）、｡｢｣､･ｰ は 。「」、・ー
 * - 半角の英数字・記号（U+0021〜U+007E）：全角（U+FF01〜U+FF5E）。ハイフンは「－」（U+FF0D）
 * - 半角の空白：全角の空白（U+3000）
 * - 改行・タブは、そのまま
 */
export function toZenkaku(text: string): string {
  return toZenkakuKana(text)
    .replace(HYPHENS, "－")
    .replace(/[!-~]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0))
    .replace(/ /g, "　");
}

/** 欄の種類に応じて変換する */
export function applyZenkaku(text: string, mode: ZenkakuMode): string {
  if (mode === "full") return toZenkaku(text);
  if (mode === "kana") return toZenkakuKana(text);
  return text;
}

/**
 * 入力の確定時の変換。IME の変換中（composing が true）は、入力途中の文字を書き換えないため、そのまま返す。
 */
export function commitZenkaku(text: string, mode: ZenkakuMode, composing = false): string {
  return composing ? text : applyZenkaku(text, mode);
}

/** 補った住所（郵便番号から）や、住所の欄に通す変換 */
export const normalizeAddress = (address: string): string => toZenkaku(address);

// ---- 変換する欄の一覧。ここに無い欄は、変換しない（none） ----
// 変換しない欄：番号（在留カード・旅券・法人番号・雇用保険・職業コード）、電話、メール、日付、郵便番号、
// ローマ字の氏名（Applicant.legalName）、数量・期間（資本金・従業員数・月額給与・契約期間・在留期間・回数など）、パスワード。

export const APPLICANT_ZENKAKU = {
  nationality: "kana",
  address: "full",
  workRestriction: "full",
} as const satisfies Partial<Record<keyof Applicant, ZenkakuMode>>;

export const EMPLOYMENT_ZENKAKU = {
  companyName: "full",
  companyAddress: "full",
  industry: "full",
  jobDescription: "full",
  employmentType: "full",
} as const satisfies Partial<Record<keyof EmploymentInfo, ZenkakuMode>>;

type FormDetailsTextKey = {
  [K in keyof FormDetails]: FormDetails[K] extends string ? K : never;
}[keyof FormDetails];

export const FORM_DETAILS_ZENKAKU = {
  // 申請人等作成用1
  placeOfBirth: "kana",
  occupation: "full",
  homeAddress: "full",
  contactInJapan: "full",
  portOfEntry: "full",
  visaApplicationPlace: "full",
  renewalReason: "full",
  changeReason: "full",
  criminalDetail: "full",
  stayPurpose: "full",
  acquisitionCauseOther: "full",
  // 申請人等作成用2
  branchName: "full",
  schoolName: "full",
  majorField: "full",
  itQualification: "full",
  legalRepName: "kana",
  legalRepRelationship: "full",
  legalRepAddress: "full",
  guarantorName: "kana",
  guarantorRelationship: "full",
  guarantorAddress: "full",
  agentName: "kana",
  agentAddress: "full",
  agentAffiliation: "full",
  // 所属機関等作成用
  positionTitle: "full",
  dispatchName: "full",
  dispatchBranchName: "full",
  dispatchAddress: "full",
} as const satisfies Partial<Record<FormDetailsTextKey, ZenkakuMode>>;

export const RELATIVE_ZENKAKU = {
  relationship: "full",
  name: "kana",
  nationality: "kana",
  workplace: "full",
} as const satisfies Partial<Record<keyof Relative, ZenkakuMode>>;

export const WORK_ENTRY_ZENKAKU = {
  employer: "full",
} as const satisfies Partial<Record<keyof WorkEntry, ZenkakuMode>>;

/** 案件メモ（案件情報・新規案件） */
export const CASE_MEMO_ZENKAKU: ZenkakuMode = "full";

/** 欄の名前から、変換の種類を引く（一覧に無ければ none） */
export function zenkakuModeOf(table: Partial<Record<string, ZenkakuMode>>, key: string): ZenkakuMode {
  return table[key] ?? "none";
}

// ---- 入力欄への組み込み ----

type EditableEl = HTMLInputElement | HTMLTextAreaElement;

/** 入力欄が受け取る、変換用のイベントの処理（確定時のみ） */
export interface ZenkakuHandlers {
  onCompositionStart?: (e: { currentTarget: EditableEl }) => void;
  onCompositionEnd?: (e: { currentTarget: EditableEl }) => void;
  onBlur?: (e: { currentTarget: EditableEl }) => void;
}

// IME で変換中の入力欄。変換中に欄を離れても、確定（compositionend）まで書き換えない
const composing = new WeakSet<object>();

/**
 * 入力欄に付ける、確定時の変換。変換する欄（none 以外）でなければ、何も付けない。
 * - compositionend：IME で確定したとき。ブラウザーによって、確定後の入力イベントの前に届くため、1 回待ってから、欄の値を読む。
 * - blur：欄を離れたとき（IME を使わない入力も、ここで変換する）。
 * 値が変わらないときは、何もしない。変えるときは、カーソルの位置を保つ。
 * commit には、変換後の値を渡す（保存の処理は、呼び出し側）。
 */
export function zenkakuHandlers(mode: ZenkakuMode, commit: (value: string) => void): ZenkakuHandlers {
  if (mode === "none") return {};

  function apply(el: EditableEl) {
    if (composing.has(el)) return; // 変換中は書き換えない
    const value = el.value;
    const next = commitZenkaku(value, mode);
    if (next === value) return;
    // 変換後に、カーソルが元と同じ文字の後ろにあるよう、位置を求める
    const caret = el.selectionStart === null ? null : commitZenkaku(value.slice(0, el.selectionStart), mode).length;
    commit(next);
    if (caret !== null && typeof document !== "undefined" && document.activeElement === el) {
      requestAnimationFrame(() => {
        try {
          el.setSelectionRange(caret, caret);
        } catch {
          // 種類によっては、位置を指定できない。そのままにする
        }
      });
    }
  }

  return {
    onCompositionStart: (e) => {
      composing.add(e.currentTarget);
    },
    onCompositionEnd: (e) => {
      const el = e.currentTarget;
      composing.delete(el);
      setTimeout(() => apply(el), 0);
    },
    onBlur: (e) => apply(e.currentTarget),
  };
}
