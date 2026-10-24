import type { ApplicantIdentity, EijuuType, FormDetails, MedicalApplicantType, TeijushaType, TokuteiKatsudoType } from "../formDetails";
import { EIJUU_TYPES } from "../formDetails";
import { HSP_EVIDENCE } from "../hspPoints";
import type { EmploymentInfo, OrgCategory, ProcedureType } from "../types";
import {
  TEIJUSHA_INCOME_NAME,
  teijushaIncomeNote,
  teijushaResidenceName,
  teijushaTaxName,
  type TeijushaIncomeTarget,
  type TeijushaResidencePerson,
} from "./teijushaProcedureTexts";

// 必要書類の規則。プログラムから分離したデータとして保持し、改正時はここだけを修正する。
// 最終的な判断は行政書士が行う前提で、確認が不十分な項目は verify: true とする。

export type Party = "applicant" | "organization";
export type Category = Exclude<OrgCategory, "">;
/** 在留資格取得許可申請の取得の事由（formDetails.acquisitionCause の未選択以外の値） */
export type AcquisitionCause = Exclude<FormDetails["acquisitionCause"], "">;
export type { ApplicantIdentity, EijuuType, MedicalApplicantType, TeijushaType };

export interface RequirementRule {
  id: string;
  name: string;
  party: Party;
  /**
   * この書類が必要となるカテゴリー（軸 category を持つ規則集合のみ）。
   * basis が category（省略時）だけの規則集合では、省略すると、どのカテゴリーでも出さない（従来どおり）。
   * alsoBasis を持つ規則集合では、省略すると全カテゴリーで適用する
   */
  categories?: Category[];
  /** この書類が必要となる取得の事由（軸 acquisitionCause を持つ規則集合のみ。alsoBasis を持つ規則集合では、省略すると全事由で適用する） */
  causes?: AcquisitionCause[];
  /** この書類が必要となる申請人の区分（軸 applicantType を持つ規則集合のみ。省略時は全区分） */
  applicantTypes?: MedicalApplicantType[];
  /** この書類が必要となる定住者の区分（軸 teijushaType を持つ規則集合のみ。省略時は全区分） */
  teijushaTypes?: TeijushaType[];
  /** この書類が必要となる永住許可申請の提出書類一覧表の区分（軸 eijuuType を持つ規則集合のみ。省略時は全区分） */
  eijuuTypes?: EijuuType[];
  /** この書類が必要となる申請人の身分（軸 identity を持つ規則集合のみ。日本人の配偶者等。省略時は全身分） */
  identities?: ApplicantIdentity[];
  /** required：必要、check：必要となる場合があり確認を要する、optional：提出は必須でないが、実務では取得するのが通例（不足にも要確認にも数えない） */
  level: "required" | "check" | "optional";
  /** 入力された雇用・会社情報が真の場合のみ適用する条件 */
  when?: keyof Pick<EmploymentInfo, "withholdingSpecial">;
  note?: string;
  /** 内容の確認が不十分な項目（画面に「要確認」を表示） */
  verify?: boolean;
}

/** 判定の軸。category＝所属機関のカテゴリー（employment.category）、acquisitionCause＝取得の事由、applicantType＝医療の申請人の区分、identity＝日本人の配偶者等の申請人の身分、teijushaType＝定住者の区分、eijuuType＝永住許可申請の提出書類一覧表の区分（いずれも案件の入力） */
export type RuleAxis = "category" | "acquisitionCause" | "applicantType" | "identity" | "teijushaType" | "eijuuType";

export interface RuleSet {
  id: string;
  title: string;
  procedureType: ProcedureType;
  residenceStatus: string;
  /** true の場合、在留資格（希望する在留資格を含む）の種類・有無によらず手続種別だけで適用する */
  anyResidenceStatus?: boolean;
  /** この在留資格（の表記）には、residenceStatus に含まれていても適用しない。号によって手続の有無が異なる場合に使う */
  excludeStatuses?: string[];
  /**
   * 特定活動の種別。指定した規則集合は、在留資格が一致し、かつ案件の種別（formDetails.tokuteiKatsudoType）がこれと一致するときだけ選ばれる。
   * 省略時は種別を見ない（特定活動以外の既存の規則集合は、すべて省略）。種別の規則集合は RULE_SETS の末尾に足す（#299・#300）
   */
  subtype?: TokuteiKatsudoType;
  /** 規則の適用条件の基準（1つ目の軸）。省略時は所属機関のカテゴリー（employment.category） */
  basis?: RuleAxis;
  /**
   * 2つ目以降の判定の軸（Issue #402）。省略時は無し（basis だけで判定する。従来どおり）。
   * 指定した規則集合は、basis と alsoBasis の全ての軸で一致したときだけ規則を適用する。規則が軸の項目（categories・causes・applicantTypes）を省略したら、その軸の全ての値で適用する。
   * 未選択の軸があるときは、その軸の全ての値に共通の規則だけを出し、needsCategory・needsCause・needsApplicantType を立てる（複数立つことがある）。
   */
  alsoBasis?: RuleAxis[];
  /**
   * カテゴリー区分の定義（選べる範囲と、各区分の意味。日本語の原文）。省略時は、所属機関の区分（1〜4。CATEGORY_LABELS）。
   * 在留資格によって区分の範囲・意味が違う場合に指定する（例：教授＝1常勤・2非常勤）。規則の categories が ALL でも、定義の範囲内でだけ判定する。
   */
  categoryDefinition?: Partial<Record<Category, string>>;
  sources: RuleSource[];
  checkedAt: string;
  rules: RequirementRule[];
}

/** 出典の種類。page＝案内ページ（html）、pdf＝PDF（チェックシート・ガイドライン・改正概要など）、form＝申請書様式（xlsx・docx など） */
export type SourceKind = "page" | "pdf" | "form";

export interface RuleSource {
  title: string;
  url: string;
  /** 出典の種類（必須。URL の拡張子と矛盾しないこと。Issue #398） */
  kind: SourceKind;
  /** この出典の原文と突き合わせた日 "YYYY-MM-DD"（checkedAt と同じ書式）。照合していない出典は省略し、推測で入れない */
  comparedAt?: string;
}

/**
 * 規則集合の「原文と照合した日」。出典の comparedAt のうち最も新しい日を返す。1件もなければ undefined。
 * 画面の表示は `ruleSetComparedAt(rs) ?? rs.checkedAt`（照合日がなければ従来の checkedAt）にする想定。checkedAt 自体は変えない。
 */
export function ruleSetComparedAt(ruleSet: Pick<RuleSet, "sources">): string | undefined {
  let latest: string | undefined;
  for (const s of ruleSet.sources) {
    if (s.comparedAt && (latest === undefined || s.comparedAt > latest)) latest = s.comparedAt;
  }
  return latest;
}

export const ACQUISITION_CAUSE_LABELS: Record<AcquisitionCause, string> = {
  nationalityLoss: "国籍離脱・喪失",
  birth: "出生",
  other: "その他",
};

const ALL: Category[] = ["1", "2", "3", "4"];

export const CATEGORY_LABELS: Record<Category, string> = {
  "1": "カテゴリー1（上場企業・公共機関等）",
  "2": "カテゴリー2（前年の源泉徴収税額が1,000万円以上）",
  "3": "カテゴリー3（前年の法定調書合計表を提出した団体・個人）",
  "4": "カテゴリー4（上記以外）",
};

/** 規則集合のカテゴリー区分の定義（選べる区分 → 意味）。定義がなければ、所属機関の区分（1〜4） */
export function categoryLabelsOf(ruleSet: Pick<RuleSet, "categoryDefinition"> | null): Partial<Record<Category, string>> {
  return ruleSet?.categoryDefinition ?? CATEGORY_LABELS;
}

/** 規則集合で選べるカテゴリー（昇順） */
export function categoryRangeOf(ruleSet: Pick<RuleSet, "categoryDefinition"> | null): Category[] {
  return (Object.keys(categoryLabelsOf(ruleSet)) as Category[]).sort();
}

/** 申請書・写真・パスポート及び在留カードの提示は、在留資格によらず、手続の種類ごとに共通（Issue #291）。在留資格別の規則集合は、これを先頭に展開する */
export type CommonProcedure = "renewal" | "change" | "coe";

const COMMON_APPLICATION_FORM_NAMES: Record<CommonProcedure, string> = {
  renewal: "在留期間更新許可申請書",
  change: "在留資格変更許可申請書",
  coe: "在留資格認定証明書交付申請書",
};
const COMMON_PHOTO_NOTES: Record<CommonProcedure, string> = {
  renewal: "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。令和8年6月14日以降に交付される在留カードからは、1歳以上の方について写真の提出が必要。中長期在留者でない方の更新、3月以下の在留期間の更新も不要",
  change: "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。令和8年6月14日以降に交付される在留カードからは、1歳以上の方について写真の提出が必要。中長期在留者とならない在留資格への変更を希望される場合は不要",
  coe: "申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。裏面に申請人の氏名を記載し、申請書の写真欄に貼付する",
};

/**
 * 認定・変更・更新の共通書類。旅券は身分証情報として扱い、更新・変更は「パスポート及び在留カード（提示）」を必須、
 * 認定は海外からの呼び寄せで在留カードがなく旅券の提示も不要なため「旅券の写し」を任意にする（Issue #312）。
 * 取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が同じ項目（旅券の提示）を持つ。
 */
export function procedureCommonRules(procedure: CommonProcedure): RequirementRule[] {
  const rules: RequirementRule[] = [
    { id: "application_form", name: COMMON_APPLICATION_FORM_NAMES[procedure], party: "applicant", categories: ALL, level: "required" },
    { id: "photo", name: "写真（縦4cm×横3cm）", party: "applicant", categories: ALL, level: "required", note: COMMON_PHOTO_NOTES[procedure] },
  ];
  if (procedure === "coe") {
    rules.push({
      id: "passport_copy",
      name: "旅券（パスポート）の写し",
      party: "applicant",
      categories: ALL,
      level: "optional",
      note: "入管庁の案内では提示不要。実務では取得するのが通例。認定証明書上の氏名と旅券上の氏名の表記が異なる場合は、提出が可能であれば併せて提出する",
    });
  } else {
    rules.push({ id: "passport_card", name: "パスポート及び在留カード（提示）", party: "applicant", categories: ALL, level: "required" });
  }
  return rules;
}

// 技術・人文知識・国際業務（認定・変更・更新）。提出書類は、案内ページの本文と、チェックシート（PDF）5点（認定2・変更2・更新1）による。
// 照合済み（2026-10-18。docs/official/reconciliation/gijinkoku-2026-10-18.md）。認定・変更の○・△は、PDFと全行一致した。
// ページとチェックシートが食い違う書類は要確認（verify）とする: 専門士・高度専門士の書類のうち認定学科修了証明書（認定・変更。ページにあり、PDFにない）。
// 区分は、○は必須、△と条件付きの行は要確認。更新の「転職後の初回」の枠（No.8〜13）は、要確認とする。
const GIJIN_CHECKED_AT = "2026-10-18";
const GIJIN_PAGE_SOURCE: RuleSource = { title: "在留資格「技術・人文知識・国際業務」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/gijinkoku.html", kind: "page", comparedAt: "2026-10-18" };
const GIJIN_STATUTORY_REPORT_NAME = "前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）";
const GIJIN_LANGUAGE_NAME = "業務上使用する言語について、CEFR・B2相当の言語能力を有することを証する資料";
// ページの【お知らせ】注1（CEFR・B2相当の日本語能力とみなす場合）
const GIJIN_LANGUAGE_DEEMED_NOTE = "日本語の場合は、JLPT・N2以上、BJTビジネス日本語能力テスト400点以上、日本留学試験（日本語）200点以上、JPT日本語能力試験525点以上、中長期在留者として20年以上の在留、本邦の大学卒業又は高等専門学校・専修学校の専門課程・専攻科の修了、我が国の義務教育修了と高等学校卒業のいずれかに該当すれば、B2相当の日本語能力を有するものとみなす";
const GIJIN_VOCATIONAL_NAME = "専門士・高度専門士の称号を付与されたことを証明する文書（専攻科修了の場合は修了証明書）";
const GIJIN_VOCATIONAL_NOTE = "専門学校を卒業した場合のみ。外国人留学生キャリア形成促進プログラムの認定学科修了者は認定学科修了証明書。認定学科修了証明書は、案内ページにあるが、チェックシート（PDF）にはないため要確認";
const GIJIN_ONLINE_APPROVAL: RequirementRule = {
  id: "online_approval_proof",
  name: "在留申請オンラインシステムの利用申出の承認を証明する文書（承認のお知らせメール等）",
  party: "organization",
  categories: ["2"],
  level: "check",
  note: "カテゴリー2と同様の添付資料での申請を希望し、利用申出が承認された機関の場合のみ",
};
const GIJIN_CATEGORY1_PROOF: RequirementRule = {
  id: "category1_proof",
  name: "カテゴリー1に該当することを証明する文書（四季報の写し、上場を証明する文書の写し等）",
  party: "organization",
  categories: ["1"],
  level: "required",
  note: "公式案内に列挙された文書のうち、提出可能なものを提出する。提出可能な文書がなければカテゴリー4となる",
};
const GIJIN_STATUTORY_REPORT: RequirementRule = {
  id: "statutory_report_total",
  name: GIJIN_STATUTORY_REPORT_NAME,
  party: "organization",
  categories: ["2", "3"],
  level: "required",
  note: "カテゴリーを証明する文書として提出する",
};
const GIJIN_WITHHOLDING_EXEMPTION: RequirementRule = {
  id: "withholding_exemption",
  name: "源泉徴収の免除を受ける機関であることを明らかにする資料（外国法人の免除証明書等）",
  party: "organization",
  categories: ["4"],
  level: "check",
  note: "法定調書合計表を提出できない理由を明らかにする資料。源泉徴収の免除を受ける機関の場合のみ。この場合、下記の開設届出書等は別途確認すること",
};
const GIJIN_PAYROLL_NOTIFICATION: RequirementRule = {
  id: "payroll_office_notification",
  name: "給与支払事務所等の開設届出書の写し",
  party: "organization",
  categories: ["4"],
  level: "required",
  note: "法定調書合計表を提出できない理由を明らかにする資料（源泉徴収の免除を受ける機関を除く）",
};
const GIJIN_WITHHOLDING_RECEIPTS: RequirementRule = {
  id: "withholding_tax_receipts",
  name: "直近3か月分の所得税徴収高計算書の写し（領収日付印のあるもの）",
  party: "organization",
  categories: ["4"],
  level: "required",
  note: "公式案内では、これ又は納期の特例の承認を示す資料のいずれか",
};
const GIJIN_WITHHOLDING_SPECIAL: RequirementRule = {
  id: "withholding_special_approval",
  name: "源泉所得税の納期の特例の承認を受けていることを明らかにする資料",
  party: "organization",
  categories: ["4"],
  level: "required",
  when: "withholdingSpecial",
  note: "納期の特例の承認を受けている場合",
};

// 更新：チェックシートの No.8〜13 は、「カテゴリー3又は4の企業等に転職後の初回の更新許可申請の場合」の追加書類。カテゴリー3は、源泉徴収の資料（No.13）が不要。研究の更新と同じ扱い（要確認）にする。
const GIJIN_FIRST_RENEWAL_NOTE = "転職後、初回の更新許可申請の場合のみ";
const GIJIN_FIRST_RENEWAL_WITHHOLDING_NOTE = "転職後、初回の更新許可申請の場合のみ。カテゴリー3は源泉徴収の資料が不要";
const gijinFirstRenewalWithholding: RequirementRule[] = [GIJIN_WITHHOLDING_EXEMPTION, GIJIN_PAYROLL_NOTIFICATION, GIJIN_WITHHOLDING_RECEIPTS, GIJIN_WITHHOLDING_SPECIAL].map((r) => ({
  ...r,
  level: "check" as const,
  note:
    r.id === "payroll_office_notification" || r.id === "withholding_tax_receipts"
      ? GIJIN_FIRST_RENEWAL_WITHHOLDING_NOTE
      : `${GIJIN_FIRST_RENEWAL_WITHHOLDING_NOTE}。${r.id === "withholding_exemption" ? "源泉徴収の免除を受ける機関の場合のみ。この場合は、下の給与支払事務所等の開設届出書等は不要" : r.note}`,
}));

export const GIJINKOKU_RENEWAL: RuleSet = {
  id: "gijinkoku_renewal",
  title: "技術・人文知識・国際業務 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: "技術・人文知識・国際業務",
  checkedAt: GIJIN_CHECKED_AT,
  sources: [
    GIJIN_PAGE_SOURCE,
    { title: "提出書類のカテゴリー別一覧（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367009.pdf", kind: "pdf", comparedAt: "2026-10-18" },
  ],
  rules: [
    ...procedureCommonRules("renewal"),
    GIJIN_CATEGORY1_PROOF,
    GIJIN_STATUTORY_REPORT,
    GIJIN_ONLINE_APPROVAL,
    {
      id: "dispatch_documents",
      name: "派遣契約に基づいて就労する場合の資料（誓約書（派遣元用・派遣先用）、労働条件通知書、労働者派遣個別契約書、派遣元管理台帳、派遣先管理台帳、就業状況報告書）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "派遣形態で就労する場合（申請人が被派遣者の場合）のみ。直近の在留期間中の資料も提出する",
    },
    {
      id: "representative_declaration",
      name: "所属機関の代表者に関する申告書（参考様式）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "2026年4月15日以降の申請で提出する",
    },
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: ["3", "4"],
      level: "required",
      note: "直近1年分の総所得及び納税状況が記載されたもの",
    },
    {
      id: "employment_contract",
      name: "活動内容等を明らかにするいずれかの資料（労働条件を明示する文書、役員報酬を定める定款の写し等）",
      party: "organization",
      categories: ["3", "4"],
      level: "check",
      note: `${GIJIN_FIRST_RENEWAL_NOTE}。労働契約の場合は労働条件通知書等。役員就任・外国法人の日本支店への転勤の場合は、公式案内の資料を提出する`,
    },
    { id: "registry_certificate", name: "登記事項証明書", party: "organization", categories: ["3", "4"], level: "check", note: GIJIN_FIRST_RENEWAL_NOTE },
    {
      id: "business_description",
      name: "事業内容を明らかにする資料（会社案内等）",
      party: "organization",
      categories: ["3", "4"],
      level: "check",
      note: `${GIJIN_FIRST_RENEWAL_NOTE}。沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が記載されたもの、又はこれに準ずる文書`,
    },
    {
      id: "financial_statements",
      name: "直近年度の決算文書の写し",
      party: "organization",
      categories: ["3", "4"],
      level: "check",
      note: `${GIJIN_FIRST_RENEWAL_NOTE}。新規事業の場合は事業計画書`,
    },
    {
      id: "language_ability",
      name: GIJIN_LANGUAGE_NAME,
      party: "applicant",
      categories: ["3", "4"],
      level: "check",
      note: `言語能力を用いた対人業務に従事する場合。業務内容の変更や転職等により、言語能力を用いた対人業務等に主に従事することとなった場合は、更新時に提出が必要。以前から同様の業務に継続して従事している場合は不要（審査で求められる場合あり）。${GIJIN_LANGUAGE_DEEMED_NOTE}`,
    },
    ...gijinFirstRenewalWithholding,
  ],
};

// 在留資格認定証明書交付申請。カテゴリーは更新・変更と同じ所属機関の区分。
export const GIJINKOKU_COE: RuleSet = {
  id: "gijinkoku_coe",
  title: "技術・人文知識・国際業務 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: "技術・人文知識・国際業務",
  checkedAt: GIJIN_CHECKED_AT,
  sources: [
    GIJIN_PAGE_SOURCE,
    { title: "【認定】提出書類チェックシート（カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404131.pdf", kind: "pdf", comparedAt: "2026-10-18" },
    { title: "【認定】提出書類チェックシート（カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001437254.pdf", kind: "pdf", comparedAt: "2026-10-18" },
  ],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    {
      id: "category_proof",
      name: "所属機関がいずれのカテゴリーに該当するかを証明する文書",
      party: "organization",
      categories: ["1", "2", "3"],
      level: "required",
      note: "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。提出可能な書類がなければカテゴリー4となる",
    },
    GIJIN_ONLINE_APPROVAL,
    {
      id: "vocational_school_certificate",
      name: GIJIN_VOCATIONAL_NAME,
      party: "applicant",
      categories: ALL,
      level: "check",
      note: GIJIN_VOCATIONAL_NOTE,
      verify: true,
    },
    {
      id: "dispatch_documents",
      name: "派遣契約に基づいて就労する場合の資料（誓約書（派遣元用・派遣先用）、労働条件通知書、労働者派遣個別契約書）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "申請人が被派遣者の場合のみ",
    },
    {
      id: "activity_documents",
      name: "活動内容等を明らかにする資料（労働条件を明示する文書、役員報酬を定める定款の写し等）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "労働契約の場合は労働条件通知書等。役員就任・外国法人の日本支店への転勤の場合は、公式案内の資料を提出する",
    },
    {
      id: "career_documents",
      name: "学歴及び職歴その他経歴等を証明する文書（履歴書、卒業証明書又は在職証明書等）",
      party: "applicant",
      categories: ["3", "4"],
      level: "required",
      note: "履歴書と、学歴又は職歴を証明する文書。外国の文化に基盤を有する業務では、3年以上の実務経験を証明する文書など、業務内容により異なる",
    },
    { id: "registry_certificate", name: "登記事項証明書", party: "organization", categories: ["3", "4"], level: "required" },
    {
      id: "business_description",
      name: "事業内容を明らかにする資料（会社案内等）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が記載されたもの、又はこれに準ずる文書",
    },
    {
      id: "financial_statements",
      name: "直近年度の決算文書の写し",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "新規事業の場合は事業計画書",
    },
    {
      id: "representative_declaration",
      name: "所属機関の代表者に関する申告書（参考様式）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "2026年4月15日以降の申請で提出する",
    },
    {
      id: "language_ability",
      name: GIJIN_LANGUAGE_NAME,
      party: "applicant",
      categories: ["3", "4"],
      level: "check",
      note: `翻訳・通訳、接客等、言語能力を用いた対人業務に主に従事する場合。それ以外でも審査で求められる場合がある。${GIJIN_LANGUAGE_DEEMED_NOTE}`,
    },
    GIJIN_WITHHOLDING_EXEMPTION,
    GIJIN_PAYROLL_NOTIFICATION,
    GIJIN_WITHHOLDING_RECEIPTS,
    GIJIN_WITHHOLDING_SPECIAL,
  ],
};

// 在留資格変更許可申請（技術・人文知識・国際業務への変更）。カテゴリー2は、「留学」からの変更の3区分（案内ページの区分の表）も含む。
const C34: Category[] = ["3", "4"];

export const GIJINKOKU_CHANGE: RuleSet = {
  id: "gijinkoku_change",
  title: "技術・人文知識・国際業務 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: "技術・人文知識・国際業務",
  checkedAt: GIJIN_CHECKED_AT,
  sources: [
    GIJIN_PAGE_SOURCE,
    { title: "提出書類チェックシート（変更・カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367001.pdf", kind: "pdf", comparedAt: "2026-10-18" },
    { title: "提出書類チェックシート（変更・カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001437255.pdf", kind: "pdf", comparedAt: "2026-10-18" },
  ],
  rules: [
    ...procedureCommonRules("change"),
    GIJIN_CATEGORY1_PROOF,
    GIJIN_STATUTORY_REPORT,
    GIJIN_ONLINE_APPROVAL,
    {
      id: "omission_statement",
      name: "提出書類省略に関する説明書（「留学」から「技術・人文知識・国際業務」又は「研究」への変更）（参考様式）",
      party: "organization",
      categories: ["2"],
      level: "check",
      note: "「留学」からの変更で、カテゴリー2（大学・短大・大学院の卒業（予定）者等）として扱う場合。チェックシートでは、カテゴリーを証明する文書の選択肢の一つとして○。カテゴリー2として扱う「留学」からの変更は、a.本邦の大学院・大学・短大の卒業（予定）者、b.海外の優秀大学の卒業者（3つの世界ランキング中2つ以上で上位300位の外国の大学）、c.「留学」から就労資格に変更して就労し、その後当該所属機関において在留期間更新した者を現に受け入れている機関において就労する者",
    },
    {
      id: "vocational_school_certificate",
      name: GIJIN_VOCATIONAL_NAME,
      party: "applicant",
      categories: ALL,
      level: "check",
      note: GIJIN_VOCATIONAL_NOTE,
      verify: true,
    },
    {
      id: "dispatch_pledge",
      name: "申請人の派遣労働に関する誓約書（所属機関（派遣元）用・派遣先用）（参考様式）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "派遣契約に基づいて就労する場合（申請人が被派遣者の場合）のみ",
    },
    {
      id: "dispatch_contract_documents",
      name: "派遣先での活動内容及び派遣契約期間を明らかにする資料の写し（労働条件通知書（雇用契約書）、労働者派遣個別契約書）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "派遣形態で就労する場合のみ。更新と異なり、管理台帳・就業状況報告書は変更の案内に記載がない",
    },
    {
      id: "activity_documents",
      name: "申請人の活動の内容等を明らかにする資料（労働条件通知書・役員報酬を定める定款等）",
      party: "organization",
      categories: C34,
      level: "required",
      note: "労働契約を締結する場合は労働条件を明示する文書。役員就任・外国法人の日本支店への転勤等の場合は公式案内の文書",
    },
    {
      id: "career_documents",
      name: "申請人の学歴及び職歴その他経歴等を証明する文書（履歴書、卒業証明書、在職証明書等）",
      party: "applicant",
      categories: C34,
      level: "required",
      note: "履歴書と、卒業証明書・在職証明書等のいずれか。IT技術者は情報処理技術の資格証書、外国の文化に基づく業務は3年以上の実務経験の証明",
    },
    { id: "registry_certificate", name: "登記事項証明書", party: "organization", categories: C34, level: "required" },
    {
      id: "business_overview",
      name: "事業内容を明らかにする資料（沿革・役員・組織・事業内容が記載された案内書等）",
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "financial_statements",
      name: "直近年度の決算文書の写し",
      party: "organization",
      categories: C34,
      level: "required",
      note: "新規事業の場合は事業計画書",
    },
    {
      id: "representative_declaration",
      name: "所属機関の代表者に関する申告書（参考様式）",
      party: "organization",
      categories: C34,
      level: "required",
      note: "2026年4月15日以降の申請で提出する",
    },
    {
      id: "language_ability",
      name: GIJIN_LANGUAGE_NAME,
      party: "applicant",
      categories: C34,
      level: "check",
      note: `主に言語能力を用いて対人業務等に従事する場合（翻訳・通訳、接客等）。${GIJIN_LANGUAGE_DEEMED_NOTE}`,
    },
    GIJIN_WITHHOLDING_EXEMPTION,
    GIJIN_PAYROLL_NOTIFICATION,
    GIJIN_WITHHOLDING_RECEIPTS,
    GIJIN_WITHHOLDING_SPECIAL,
  ],
};

// 在留資格取得許可申請。必要書類は所属機関のカテゴリーではなく「取得の事由」で決まる。
// 出典は行政書士提供の実務資料（解説記事に基づく。入管庁の公式資料の逐語確認ではない）。
// そのため、すべて verify: true とし、行政書士が公式情報で確認した後に外す。根拠・確認事項は docs/requirements-research.md（取得編） を参照。
// 希望する在留資格（targetStatus）の種類・有無に依存しない（anyResidenceStatus）。
const ALL_CAUSES: AcquisitionCause[] = ["nationalityLoss", "birth", "other"];

export const ACQUISITION_BY_CAUSE: RuleSet = {
  id: "acquisition_by_cause",
  title: "在留資格取得許可申請（取得の事由別）",
  procedureType: "acquisition",
  residenceStatus: "",
  anyResidenceStatus: true,
  basis: "acquisitionCause",
  checkedAt: "2026-10-04",
  sources: [{ title: "在留資格取得許可申請書（別記第三十六号様式）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/930004121.xlsx", kind: "form" }],
  rules: [
    {
      id: "application_form",
      name: "在留資格取得許可申請書",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "事由が生じた日から30日以内に申請する（手数料は無料）",
      verify: true,
    },
    {
      id: "photo",
      name: "写真（縦4cm×横3cm）",
      party: "applicant",
      causes: ["nationalityLoss", "other"],
      level: "required",
      note: "行政書士提供の一覧で、出生には写真の記載がない（出生では必要書類に含めていない。実務での扱いは要確認）",
      verify: true,
    },
    {
      id: "passport_presentation",
      name: "旅券（提示）",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "提示のみで、提出書類としてコピーを付ける書類ではない",
      verify: true,
    },
    {
      id: "passport_reason_statement",
      name: "旅券を提示できない理由を記載した理由書",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "check",
      note: "旅券を提示できない場合のみ",
      verify: true,
    },
    {
      id: "agent_identity_document",
      name: "申請取次者の身分を証する文書等（提示）",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "check",
      note: "申請取次者が書類を提出する場合のみ",
      verify: true,
    },
    {
      id: "nationality_proof",
      name: "国籍を証する書類",
      party: "applicant",
      causes: ["nationalityLoss"],
      level: "required",
      verify: true,
    },
    {
      id: "cause_proof",
      name: "事由を証する書類",
      party: "applicant",
      causes: ["other"],
      level: "required",
      note: "主に日米地位協定による在留者が、協定上の地位を失った場合など",
      verify: true,
    },
    {
      id: "birth_certificate",
      name: "出生したことを証する書類",
      party: "applicant",
      causes: ["birth"],
      level: "required",
      verify: true,
    },
    {
      id: "parents_questionnaire",
      name: "両親の情報を記載した質問書",
      party: "applicant",
      causes: ["birth"],
      level: "required",
      verify: true,
    },
    {
      id: "household_residence_certificate",
      name: "世帯全員の住民票",
      party: "applicant",
      causes: ["birth"],
      level: "required",
      verify: true,
    },
    {
      id: "activity_materials",
      name: "日本での活動内容に応じた資料",
      party: "applicant",
      causes: ["nationalityLoss", "other"],
      level: "required",
      note: "希望する在留資格に応じた資料（別途 規則が整備されている在留資格ではその規則を参照）",
      verify: true,
    },
  ],
};

// 在留資格「経営・管理」。事業の形態（新規／既存）は入力項目にせず、所属機関のカテゴリー（1〜4）のみで判定する。
// 提出書類は案内ページの本文と、チェックシート（PDF）5点（認定2・変更2・更新1）による。照合済み（2026-10-18。docs/official/reconciliation/keiei-kanri-2026-10-18.md）。
// ページとチェックシートが食い違う書類は要確認とする: 更新のチェックシートだけにある JETRO の項目（category_proof）、案内ページだけにある本邦事業所の設置の委託（認定）、更新の案内ページ・チェックシートにない事務所用施設の資料（更新）。
const KEIEI_KANRI = "経営・管理";
const KEIEI_KANRI_SOURCE: RuleSource = { title: "在留資格「経営・管理」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/businessmanager.html", kind: "page", comparedAt: "2026-10-18" };
const KEIEI_KANRI_CHECKED_AT = "2026-10-18";

const KEIEI_CATEGORY_PROOF_NAME = "所属機関がいずれのカテゴリーに該当するかを証明する文書";
const KEIEI_STATUTORY_REPORT_NAME = "前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）";
const KEIEI_ACTIVITY_NAME = "申請人の活動の内容等を明らかにする資料（役員就任、日本法人への転勤・他団体の役員就任、管理者としての雇用のいずれか）";
const KEIEI_UNAVAILABLE_REASON_NAME = "前年分の職員の給与所得の源泉徴収票等の法定調書合計表を提出できない理由を明らかにする資料";
const KEIEI_DECLARATION_NAME = "所属機関の代表者に関する申告書（参考様式）";

// 改正概要（令和7年10月16日施行。docs/official/businessmanager-revision_2026-10-18.txt）による注記（照合表 11章の R-1〜R-8、人の判断で追加。#374）。注記の文言は、この原文に基づく。
const KEIEI_NOTE_STAFF = "常勤職員の対象は、日本人、特別永住者、法別表第二の在留資格（永住者・日本人の配偶者等・永住者の配偶者等・定住者）で在留する外国人。法別表第一の在留資格の外国人は対象外（日本語能力を立証する者としては含まれる）。複数名いる場合は、少なくとも1名が基準を満たすことを確認できる資料でよい";
const KEIEI_NOTE_BALANCE_SHEET = "最初の決算期が到来していない場合も、設立時又は設立後の任意の時点の貸借対照表を作成して提出する";
const KEIEI_NOTE_FINANCIAL = "個人事業主は、直近年度の決算文書に加え、必要に応じて事業経費などに関する領収書等を提出する";
const KEIEI_NOTE_JAPANESE = "申請人又は常勤職員のいずれかが、B2相当以上の日本語能力を有することが必要。日本人・特別永住者以外は、日本語能力試験（JLPT）N2以上、BJTビジネス日本語能力テスト400点以上、中長期在留者として20年以上の在留、本邦の大学等高等教育機関の卒業（高等専門学校・専門学校を含む。恒常的に外国語による授業を行う課程・通信課程を除く）、本邦の義務教育修了と高等学校卒業（中学校から編入した場合は該当しない）のいずれかに該当することを確認する。試験は合格証・成績証明書、その他は日本語能力を有する者の身分及び経歴を証する資料（住民票、卒業証明書等）。申請書（所属機関作成用1）3（11）の「内容」欄に具体的に記入する";
const KEIEI_NOTE_CAREER = "経営管理又は申請に係る事業の業務に必要な技術・知識に係る分野の博士・修士・専門職の学位（外国で授与された相当する学位を含む）、又は事業の経営・管理の3年以上の経験が必要。特定活動の起業準備活動の期間も経験に含む";
const KEIEI_NOTE_BUSINESS_PLAN = "事業計画書を評価する専門家は、日本の中小企業診断士・公認会計士・税理士の資格を持つ者（施行後に対象者が変わる場合は入管庁のホームページで告知される）。申請人の会社の役員・従業員は評価者として認められない（外部顧問は差し支えない）";
const KEIEI_NOTE_LICENSES = "在留許可を受けてからでないと取得できないなど、取得できないことに正当な理由が認められる場合は、取得できない具体的理由を説明した文書（様式自由）を提出する。取得状況は次回の在留期間更新許可申請時に確認される";
const KEIEI_NOTE_OFFICE = "自宅を事業所と兼ねることは、原則として認められない";
const KEIEI_NOTE_DUES_NHI = "社会保険への加入義務のない個人事業主でも、各職員の国民健康保険の加入状況は不要";

export const KEIEI_KANRI_RENEWAL: RuleSet = {
  id: "keiei_kanri_renewal",
  title: "経営・管理 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: KEIEI_KANRI,
  checkedAt: KEIEI_KANRI_CHECKED_AT,
  sources: [KEIEI_KANRI_SOURCE],
  rules: [
    ...procedureCommonRules("renewal"),
    {
      id: "category_proof",
      name: KEIEI_CATEGORY_PROOF_NAME,
      party: "organization",
      categories: ["1"],
      level: "required",
      note: "カテゴリー1：四季報の写し等のうち、提出可能な書類。日本貿易振興機構（JETRO）により対日投資支援企業として認定された企業であることを証明する文書は、更新のチェックシートのみに記載（案内ページには記載なし）。提出可能な書類がなければカテゴリー4となる",
      verify: true,
    },
    {
      id: "statutory_report_total",
      name: KEIEI_STATUTORY_REPORT_NAME,
      party: "organization",
      categories: ["2", "3"],
      level: "required",
      note: "カテゴリーを証明する文書として提出する",
    },
    {
      id: "financial_statements",
      name: "直近の年度の決算文書の写し",
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "registry_certificate",
      name: "登記事項証明書",
      party: "organization",
      categories: C34,
      level: "required",
      note: "事業を法人において行う場合のみ",
    },
    {
      id: "representative_declaration",
      name: KEIEI_DECLARATION_NAME,
      party: "organization",
      categories: C34,
      level: "check",
      note: "申請人が事業の管理に従事する場合のみ",
    },
    {
      id: "business_licenses",
      name: "事業を営むために必要な許認可の取得等をしていることを証する資料",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_LICENSES,
    },
    {
      id: "withholding_exemption_documents",
      name: "外国法人の源泉徴収に対する免除証明書その他の源泉徴収を要しないことを明らかにする資料",
      party: "organization",
      categories: ["4"],
      level: "required",
      note: "カテゴリー4のみ",
    },
    {
      id: "full_time_staff_documents",
      name: "常勤の職員が一人以上であることを明らかにする当該職員に係る賃金支払に関する文書及び住民票その他の資料",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_STAFF,
    },
    {
      id: "japanese_ability",
      name: "日本語能力を明らかにする資料",
      party: "applicant",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_JAPANESE,
    },
    {
      id: "activity_summary_document",
      name: "直近の在留期間における事業の経営又は管理に関する活動内容を具体的に説明する文書［任意の様式］（前回の在留申請時から変更がある場合はその理由の説明を含む）",
      party: "applicant",
      categories: C34,
      level: "required",
    },
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: C34,
      level: "required",
      note: "直近1年分の総所得及び納税状況が記載されたもの",
    },
    {
      id: "public_dues_documents",
      name: "所属機関における公租公課の履行状況を明らかにする資料",
      party: "organization",
      categories: C34,
      level: "required",
      note: "申請に当たっての説明書（参考様式）と、公租公課の履行を証する資料のうち該当する全て。所属機関が法人の場合は、労働保険・社会保険の加入状況及び料金の納付状況を証する文書、源泉所得税及び復興特別所得税・法人税・消費税及び地方消費税の納税証明書、法人住民税・法人事業税の納税証明書。所属機関が個人の場合は、労働保険・社会保険・国民健康保険の加入状況及び料金の納付状況を証する文書、源泉所得税及び復興特別所得税・申告所得税及び復興特別所得税・消費税及び地方消費税・相続税・贈与税の納税証明書、個人住民税・個人事業税の納税証明書。社会保険への加入義務のない個人事業主は、社会保険の強制適用事業所に該当しないことを説明する資料。" + KEIEI_NOTE_DUES_NHI,
    },
    {
      id: "office_facility_documents",
      name: "事務所用施設の存在を明らかにする資料（賃貸借契約書の写し等）",
      party: "organization",
      categories: C34,
      level: "check",
      note: "更新の案内ページ・チェックシートには記載なし",
      verify: true,
    },
  ],
};

export const KEIEI_KANRI_COE: RuleSet = {
  id: "keiei_kanri_coe",
  title: "経営・管理 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: KEIEI_KANRI,
  checkedAt: KEIEI_KANRI_CHECKED_AT,
  sources: [KEIEI_KANRI_SOURCE],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    {
      id: "category_proof",
      name: KEIEI_CATEGORY_PROOF_NAME,
      party: "organization",
      categories: ["1", "2", "3"],
      level: "required",
      note: "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。提出可能な書類がなければカテゴリー4となる",
    },
    {
      id: "activity_documents",
      name: KEIEI_ACTIVITY_NAME,
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "business_plan",
      name: "経営・管理に関する専門的な知識を有する者による評価を受けた事業計画書の写し",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_BUSINESS_PLAN,
    },
    {
      id: "business_description",
      name: "事業内容を明らかにする資料（登記事項証明書、事業内容の詳細資料等）",
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "financial_statements",
      name: "直近の年度の決算文書の写し",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_FINANCIAL,
    },
    {
      id: "representative_declaration",
      name: KEIEI_DECLARATION_NAME,
      party: "organization",
      categories: C34,
      level: "check",
      note: "申請人が事業の管理に従事する場合のみ（チェックシートで△）",
    },
    {
      id: "business_licenses",
      name: "事業を営むために必要な許認可の取得等を証する資料",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_LICENSES,
    },
    {
      id: "statutory_report_unavailable_reason",
      name: KEIEI_UNAVAILABLE_REASON_NAME,
      party: "organization",
      categories: ["4"],
      level: "required",
      note: "カテゴリー4のみ",
    },
    {
      id: "office_facility_documents",
      name: "事務所用施設の存在を明らかにする資料（不動産登記簿謄本、賃貸借契約書等）",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_OFFICE,
    },
    {
      id: "business_scale_documents",
      name: "事業規模を明らかにする資料（常勤職員の賃金支払・住民票、貸借対照表、登記事項証明書等）",
      party: "organization",
      categories: C34,
      level: "required",
      note: `${KEIEI_NOTE_STAFF}。${KEIEI_NOTE_BALANCE_SHEET}。事業内容を明らかにする資料（1）として登記事項証明書を提出済みの場合は不要`,
    },
    {
      id: "japanese_ability",
      name: "日本語能力を明らかにする資料",
      party: "applicant",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_JAPANESE,
    },
    {
      id: "career_documents",
      name: "経歴を明らかにする資料（学歴または職歴）",
      party: "applicant",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_CAREER,
    },
    {
      id: "office_commission_documents",
      name: "本邦事業所の設置について委託されていることが分かるもの（当該委託に係る契約書等）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "案内ページに記載あり（提示）、チェックシートには記載なし。本邦に新たに事業所を設置する場合で、事業所の経営者又は管理者が不在の間の事業所設置業務全般を任されている方が申請書類を提出するときのみ",
      verify: true,
    },
  ],
};

export const KEIEI_KANRI_CHANGE: RuleSet = {
  id: "keiei_kanri_change",
  title: "経営・管理 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: KEIEI_KANRI,
  checkedAt: KEIEI_KANRI_CHECKED_AT,
  sources: [KEIEI_KANRI_SOURCE],
  rules: [
    ...procedureCommonRules("change"),
    {
      id: "category_proof",
      name: KEIEI_CATEGORY_PROOF_NAME,
      party: "organization",
      categories: ["1", "2", "3"],
      level: "required",
      note: "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。提出可能な書類がなければカテゴリー4となる",
    },
    {
      id: "activity_documents",
      name: KEIEI_ACTIVITY_NAME,
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "business_plan",
      name: "経営・管理に関する専門的な知識を有する者による評価を受けた事業計画書の写し",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_BUSINESS_PLAN,
    },
    {
      id: "business_description",
      name: "事業内容を明らかにする資料（登記事項証明書、事業内容の詳細資料等）",
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "financial_statements",
      name: "直近の年度の決算文書の写し",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_FINANCIAL,
    },
    {
      id: "business_licenses",
      name: "事業を営むために必要な許認可の取得等を証する資料",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_LICENSES,
    },
    {
      id: "office_facility_documents",
      name: "事務所用施設の存在を明らかにする資料（不動産登記簿謄本、賃貸借契約書等）",
      party: "organization",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_OFFICE,
    },
    {
      id: "business_scale_documents",
      name: "事業規模を明らかにする資料（常勤職員の賃金支払・住民票、貸借対照表、登記事項証明書等）",
      party: "organization",
      categories: C34,
      level: "required",
      note: `${KEIEI_NOTE_STAFF}。事業内容を明らかにする資料（1）として登記事項証明書を提出済みの場合は不要`,
    },
    {
      id: "japanese_ability",
      name: "日本語能力を明らかにする資料",
      party: "applicant",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_JAPANESE,
    },
    {
      id: "career_documents",
      name: "経歴を明らかにする資料（学歴または職歴）",
      party: "applicant",
      categories: C34,
      level: "required",
      note: KEIEI_NOTE_CAREER,
    },
    {
      id: "representative_declaration",
      name: KEIEI_DECLARATION_NAME,
      party: "organization",
      categories: C34,
      level: "check",
      note: "申請人が事業の管理に従事する場合のみ",
    },
    {
      id: "statutory_report_unavailable_reason",
      name: KEIEI_UNAVAILABLE_REASON_NAME,
      party: "organization",
      categories: ["4"],
      level: "required",
    },
  ],
};

// 在留資格「高度専門職」。現時点で規則に載せているのは、手続共通の書類と、ポイント計算表・その疎明資料（Issue #186）。
// 申請書・写真・パスポート・在留カードは、手続共通の書類（procedureCommonRules。Issue #291）。それ以外の提出書類は、一覧の提供後に追加する（それまでは、一覧が全部ではないことを title に示す）。
// 手続ごとの提出の要否は、出入国在留管理庁の案内ページ（高度専門職）による。取得許可申請（Issue #212）は、取得の事由で判定する
// ACQUISITION_BY_CAUSE の書類に、ポイント計算表・疎明資料を足した HSP_ACQUISITION を、号の有無・種類を問わず適用する。
const HSP = "高度専門職";
const HSP_SOURCE: RuleSource = {
  title: "在留資格「高度専門職」ポイント計算表（出入国在留管理庁）",
  url: "https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html",
  kind: "page",
};
const HSP_PARTIAL = "（共通書類・ポイント計算表・疎明資料のみ整備。他の書類は未整備）";

/**
 * ポイント計算表で選んだ項目から導く、疎明資料の番号ごとの必要書類（Issue #186）。規則集合には載せず、evaluate が案件の入力から生成する。
 * 疎明資料は、ポイントの合計が70点以上あることを確認できれば足り、該当する全項目の資料は不要なため、一律に必要とはせず「要確認」とする。
 * 必要なものは、行政書士が「判断」で必要に切り替える。
 */
export const HSP_EVIDENCE_RULE_PREFIX = "hsp_point_evidence_";
/** 選んだ時点で、提出が必要な疎明資料の番号。資格（⑧）・投資運用業等（㉑）は、その資格・業務に就くことを証する資料がないと、加点の根拠がないため */
export const HSP_EVIDENCE_REQUIRED_MARKS = ["⑧", "㉑"];

export function hspEvidenceRule(mark: string): RequirementRule {
  const e = HSP_EVIDENCE[mark];
  const required = HSP_EVIDENCE_REQUIRED_MARKS.includes(mark);
  return {
    id: `${HSP_EVIDENCE_RULE_PREFIX}${mark}`,
    name: `疎明資料 ${mark}（${e.item}）：${e.document}`,
    party: "applicant",
    categories: ALL,
    level: required ? "required" : "check",
    note: required
      ? "ポイント計算表で選んだ項目（資格・投資運用業等）から導いた疎明資料。選んだ以上、証する資料の提出が必要"
      : "ポイント計算表で選んだ項目から導いた疎明資料。70点以上を確認できる資料があれば足りるため、提出するものを「判断」で必要に切り替える",
    verify: true,
  };
}

/** 疎明資料の番号（①〜㉑）と項目の対応は docs/hsp-point-evidence.md */
const hspPointRules = (tableNote: string): RequirementRule[] => [
  {
    id: "hsp_point_table",
    name: "ポイント計算表（高度専門職 第1号イ・ロ・ハのうち、活動の区分に応じたもの）",
    party: "applicant",
    categories: ALL,
    level: "required",
    note: `${tableNote}。合計70点以上が必要。年収が300万円に満たないときは、他の項目の合計が70点以上でも、高度専門職外国人としては認められない`,
    verify: true,
  },
  {
    id: "hsp_point_evidence",
    name: "ポイント計算表の疎明資料（ポイントの合計が70点以上あることを確認できる資料）",
    party: "applicant",
    categories: ALL,
    level: "required",
    note: "該当する全項目の資料は不要。審査の過程で、追加の資料を求められる場合がある。ポイント計算表の項目を選ぶと、その疎明資料の番号（①〜㉑）ごとの項目が、この下に出る（docs/hsp-point-evidence.md）",
    verify: true,
  },
];

/** 高度専門職2号には認定・更新の手続がないため、それらの規則（1号）には2号の表記を一致させない（Issue #212） */
const HSP_GRADE_2 = "高度専門職（2号）";

export const HSP_COE: RuleSet = {
  id: "hsp_coe",
  title: `高度専門職 在留資格認定証明書交付申請${HSP_PARTIAL}`,
  procedureType: "coe",
  residenceStatus: HSP,
  excludeStatuses: [HSP_GRADE_2],
  checkedAt: "2026-10-06",
  sources: [HSP_SOURCE],
  rules: [...procedureCommonRules("coe"), ...hspPointRules("1号イ・ロ・ハのうち、活動の区分に応じた1通")],
};

/**
 * 高度専門職2号の変更で、ポイント計算表のほかに求められる、所得・納税・公的年金・公的医療保険の書類（Issue #188）。
 * 日本で発行される証明書は、発行日から3か月以内のもの。
 * 点数（70点・80点）と在留期間による省略の分岐は、案件の入力項目にせず、各書類の注記で案内する。
 * 申請人の状況（住民税の特別徴収、年金・医療保険の制度、事業主かどうか）で要否が変わる書類は、推測せず「要確認」（check）とし、
 * 行政書士が判断する。
 */
const HSP2_PERIOD_NOTE = "70点以上を維持して3年以上継続在留している場合は、直近3年分でよい。80点以上を維持して1年以上継続在留している場合は、直近1年分でよい";
const hsp2Documents: RequirementRule[] = [
  {
    id: "hsp2_resident_tax_certificates",
    name: "住民税の課税（又は非課税）証明書及び納税証明書（各1通）",
    party: "applicant",
    categories: ALL,
    level: "required",
    note: `直近5年分の所得及び納税状況を証明する資料。${HSP2_PERIOD_NOTE}。発行日から3か月以内のもの`,
    verify: true,
  },
  {
    id: "hsp2_resident_tax_payment",
    name: "住民税の納付を証明する資料（通帳の写し、領収証書等）",
    party: "applicant",
    categories: ALL,
    level: "check",
    note: "直近3年間すべて特別徴収の場合は不要。提出が困難な場合は、その理由書を提出する",
    verify: true,
  },
  {
    id: "hsp2_resident_tax_reason",
    name: "住民税の資料の提出が困難な理由書",
    party: "applicant",
    categories: ALL,
    level: "check",
    note: "住民税の納付を証明する資料を提出できない場合のみ",
    verify: true,
  },
  {
    id: "hsp2_national_tax_certificates",
    name: "国税の納税証明書（その3）：源泉所得税及び復興特別所得税、申告所得税及び復興特別所得税、消費税及び地方消費税、相続税、贈与税の5税目",
    party: "applicant",
    categories: ALL,
    level: "required",
    note: "直近5年分の所得及び納税状況を証明する資料。発行日から3か月以内のもの",
    verify: true,
  },
  {
    id: "hsp2_income_proof",
    name: "所得を証明するもの（預貯金通帳の写しなど）",
    party: "applicant",
    categories: ALL,
    level: "required",
    note: "直近5年分の所得及び納税状況を証明する資料",
    verify: true,
  },
  {
    id: "hsp2_public_pension",
    name: "公的年金の保険料の納付状況を証明する資料（被保険者記録照会回答票等、ねんきん定期便、ねんきんネット、国民年金保険料領収証書など）",
    party: "applicant",
    categories: ALL,
    level: "required",
    note: "直近2年間。80点以上を維持して1年以上継続在留している場合は、直近1年分でよい。発行日から3か月以内のもの",
    verify: true,
  },
  {
    id: "hsp2_public_health_insurance",
    name: "公的医療保険の保険料の納付状況を証明する資料（健康保険被保険者証、国民健康保険の納付証明書・領収証書など）",
    party: "applicant",
    categories: ALL,
    level: "required",
    note: "直近2年間。80点以上を維持して1年以上継続在留している場合は、直近1年分でよい。発行日から3か月以内のもの",
    verify: true,
  },
  {
    id: "hsp2_employer_insurance",
    name: "事業所の保険料に関する資料（領収証書、社会保険料納入証明書等）",
    party: "applicant",
    categories: ALL,
    level: "check",
    note: "申請時に、社会保険適用事業所の事業主である場合のみ。80点以上を維持して1年以上継続在留している場合は、直近1年分でよい",
    verify: true,
  },
  {
    id: "hsp2_80points_evidence",
    name: "80点以上を確認できる資料",
    party: "applicant",
    categories: ALL,
    level: "check",
    note: "80点以上として、提出資料の一部の省略を希望する場合のみ",
    verify: true,
  },
];

/** 2号の変更は、HSP_CHANGE より先に照合する（RULE_SETS の並び順） */
export const HSP_CHANGE_2: RuleSet = {
  id: "hsp_change_2",
  title: `高度専門職2号への在留資格変更許可申請（共通書類・ポイント計算表・疎明資料・所得納税社会保険の書類のみ整備。他の書類は未整備）`,
  procedureType: "change",
  residenceStatus: "高度専門職（2号）",
  checkedAt: "2026-10-06",
  sources: [HSP_SOURCE],
  rules: [
    ...procedureCommonRules("change"),
    ...hspPointRules("1号イ・ロ・ハのいずれかのシート。要件：1号又は高度外国人材としての特定活動で3年以上在留し、70点以上であること"),
    ...hsp2Documents,
  ],
};

export const HSP_CHANGE: RuleSet = {
  id: "hsp_change",
  title: `高度専門職（1号）への在留資格変更許可申請${HSP_PARTIAL}`,
  procedureType: "change",
  residenceStatus: HSP,
  checkedAt: "2026-10-06",
  sources: [HSP_SOURCE],
  rules: [...procedureCommonRules("change"), ...hspPointRules("1号イ・ロ・ハのうち、活動の区分に応じた1通")],
};

/** 高度専門職2号は在留期限が無期限のため、更新の手続はない。更新は1号が対象 */
export const HSP_RENEWAL: RuleSet = {
  id: "hsp_renewal",
  title: `高度専門職（1号）の在留期間更新許可申請${HSP_PARTIAL}`,
  procedureType: "renewal",
  residenceStatus: HSP,
  excludeStatuses: [HSP_GRADE_2],
  checkedAt: "2026-10-06",
  sources: [HSP_SOURCE],
  rules: [...procedureCommonRules("renewal"), ...hspPointRules("1号イ・ロ・ハのうち、活動の区分に応じた1通")],
};

/**
 * 高度専門職（1号）の在留資格取得許可申請（Issue #212・#374 項目1）。号なし（号の未選択）にも適用し、2号は含めない（2号の取得は原文に記載がなく、取得の事由別の規則集合で扱う）。
 * 案内ページの取得の節（在留資格取得許可申請（高度専門職１号））と照合済み（2026-10-18。照合表は docs/official/reconciliation/acquisition-2026-10-18.md）。人の判断「原文に合わせる」で、R-1〜R-9 を反映した。
 * 取得の事由別の共通書類は、ACQUISITION_BY_CAUSE の規則を再利用する。ただし、ACQUISITION_BY_CAUSE は他の在留資格の取得も扱い（高度専門職以外の取得は、手続案内が各在留資格のページに委ねるため未照合）、
 * その文言は変えない。高度専門職の取得でのみ、原文に合わせて上書きする（写真・活動に応じた資料・申請取次者の書類・事由の証明）か、外す（旅券の理由書・出生の両親質問書・出生の世帯全員の住民票）。
 * 書類の追加はしない（原文にない書類は足さない）。`checkedAt` は変えない（reconciliation/README.md の2-2章）。
 */
const HSP_ACQUISITION_REMOVED_IDS = ["passport_reason_statement", "parents_questionnaire", "household_residence_certificate"];
// 取得の写真の注記（年齢）。高度専門職の取得と技人国の取得（#396 R-3）で共有する
const ACQUISITION_PHOTO_AGE_NOTE =
  "指定の規格を満たした写真を用意し、申請書に添付して提出する。規格を満たさない写真の場合は撮り直しになる。在留カードの交付の日において年齢が1歳に満たない方は、写真の提出は不要。令和8年6月13日以前は16歳未満の方が不要だったが、令和8年6月14日以降に交付される在留カードからは1歳以上の方について必要";
// 取得の申請取次者の書類の注記（申請人本人以外が提出する場合）。高度専門職の取得（R-5）と、技人国・家族滞在の取得（#396 R-6・R-15）で共有する
const ACQUISITION_AGENT_IDENTITY_NOTE = "申請人本人以外の方が提出する場合。提出する方の身分を証する文書（申請取次者証明書、戸籍謄本等）の提示";
const HSP_ACQUISITION_OVERRIDES: Record<string, Partial<RequirementRule>> = {
  // R-1・R-2：事由を問わず写真1葉。年齢の注記は原文のとおり
  photo: {
    causes: ALL_CAUSES,
    note: ACQUISITION_PHOTO_AGE_NOTE,
  },
  // R-5：申請人本人以外が提出する場合
  agent_identity_document: {
    note: ACQUISITION_AGENT_IDENTITY_NOTE,
  },
  // R-7：原文にない注記の例を外す
  cause_proof: { note: undefined },
  // R-3：事由を問わず、活動に応じた資料
  activity_materials: {
    causes: ALL_CAUSES,
    name: "本邦において行おうとする活動に応じた資料",
    note: "入管法施行規則別表第３の「教授」から「報道」まで又は「経営・管理」から「技能」までのいずれかの在留資格の項の下欄に掲げる資料（各在留資格の案内ページから提出書類を確認する）。その資料がカテゴリーにより分かれている場合は、当該カテゴリーに応じた資料",
  },
};
const HSP_ACQUISITION_POINT_TABLE_NOTE = "参考書式。活動の区分（高度専門職1号イ・ロ・ハ）に応じ、いずれかの分野のものを1通";
const HSP_ACQUISITION_EVIDENCE_NOTE = "ポイント計算表の各項目に関する疎明資料。ポイントの合計が70点以上あることを確認できる資料を提出すれば足り、該当する項目全ての疎明資料を提出する必要はない。ポイント計算表の項目を選ぶと、その疎明資料の番号（①〜㉑）ごとの項目が、この下に出る（docs/hsp-point-evidence.md）";
// 出典：高度専門職ページ（取得の節）と、取得許可申請の手続案内。どちらも 2026-10-18 に原文と照合済み。申請書の様式は記載事項を照合していないため、日付を入れない。
// HSP_SOURCE（ポイント計算表の題名）は、高度専門職の認定・変更・更新と共有し、それらは照合していないため、触らない
const HSP_ACQUISITION_SOURCES: RuleSource[] = [
  { title: "在留資格「高度専門職」在留資格取得許可申請（高度専門職１号）（出入国在留管理庁）", url: HSP_SOURCE.url, kind: "page", comparedAt: "2026-10-18" },
  { title: "在留資格取得許可申請の手続案内（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/procedures/16-10.html", kind: "page", comparedAt: "2026-10-18" },
  ...ACQUISITION_BY_CAUSE.sources,
];
export const HSP_ACQUISITION: RuleSet = {
  id: "hsp_acquisition",
  title: "高度専門職 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: HSP,
  excludeStatuses: [HSP_GRADE_2],
  basis: "acquisitionCause",
  checkedAt: "2026-10-07",
  sources: HSP_ACQUISITION_SOURCES,
  rules: [
    ...ACQUISITION_BY_CAUSE.rules
      .filter((r) => !HSP_ACQUISITION_REMOVED_IDS.includes(r.id))
      .map((r) => (HSP_ACQUISITION_OVERRIDES[r.id] ? { ...r, ...HSP_ACQUISITION_OVERRIDES[r.id] } : r)),
    {
      id: "hsp_point_table",
      name: "ポイント計算表（高度専門職 第1号イ・ロ・ハのうち、活動の区分に応じたもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: HSP_ACQUISITION_POINT_TABLE_NOTE,
      verify: true,
    },
    {
      id: "hsp_point_evidence",
      name: "ポイント計算表の疎明資料（ポイントの合計が70点以上あることを確認できる資料）",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "check",
      note: HSP_ACQUISITION_EVIDENCE_NOTE,
      verify: true,
    },
  ],
};

/**
 * 技術・人文知識・国際業務／家族滞在の在留資格取得許可申請（Issue #396。照合表は docs/official/reconciliation/acquisition-gijinkoku-kazokutaizai-2026-10-18.md）。
 * 両ページの取得の節（docs/official/gijinkoku_2026-10-18.txt・kazokutaizai_2026-10-18.txt）と、家族滞在の取得のチェックシート（人の転記）とに照合済み（2026-10-18）。
 * 人の判断「推奨のとおり」（2026-10-18）の R-2〜R-18・R-20 と、技人国のカテゴリー別の書類（R-1。#402）を反映した専用の規則集合。R-19（家族滞在の扶養者の書類の区分）は、人の判断（2026-10-18）で必須とし、R-10 の2行を1行にまとめた（案A）。
 * 上書きも削除もしない書類は、ACQUISITION_BY_CAUSE の規則をそのまま引き継ぐ。ACQUISITION_BY_CAUSE の文言は変えない（他の在留資格の取得は未照合）。HSP_ACQUISITION と同じく、在留資格を問わない ACQUISITION_BY_CAUSE より先に照合する。
 * `checkedAt` は新しい規則集合の作成日。
 */
const ACQUISITION_PAGE_COMPARED_AT = "2026-10-18";
const ACQUISITION_PROCEDURE_GUIDE_SOURCE: RuleSource = {
  title: "在留資格取得許可申請の手続案内（出入国在留管理庁）",
  url: "https://www.moj.go.jp/isa/applications/procedures/16-10.html",
  kind: "page",
  comparedAt: ACQUISITION_PAGE_COMPARED_AT,
};

// 技人国（R-2）：出生の3書類（出生したことを証する書類・両親の質問書・世帯全員の住民票）を外し、出生は「その事由を証する書類」として扱う。
// 出生の乳児が取得する実務の扱いは原文に記載がなく、推測しない（注記に「行政書士が確認」）。
// 技人国（R-5）：活動に応じた資料（activity_materials）も外す。取得の原文（docs/official/gijinkoku_2026-10-18.txt 346行からの「在留資格取得許可申請」の節）では、
// 活動に応じた資料はカテゴリー別の書類群（R-1。下の gijinkokuAcquisitionCategoryRules）に当たり、別の1行としての記載は無い。
// 技人国（R-7）：旅券の理由書（passport_reason_statement）も外す。取得の原文（同 346〜434行）は、パスポートの「提示」（378行）のみで、理由書の記載が無い。
// 高度専門職の取得（acquisition-2026-10-18.md の R-6）と同じく外す方を採った（照合表の推奨が、その扱いと同じとする）
const GIJINKOKU_ACQUISITION_REMOVED_IDS = ["birth_certificate", "parents_questionnaire", "household_residence_certificate", "activity_materials", "passport_reason_statement"];
// R-4：ACQUISITION_BY_CAUSE の注記の例（日米地位協定による在留者など）は、原文（gijinkoku_2026-10-18.txt 374〜376行。「（２）（１）以外の者で在留資格の取得を必要とするもの：その事由を証する書類」）に無いため外し、R-2 の注記だけにする
const GIJINKOKU_ACQUISITION_CAUSE_PROOF_NOTE = "出生の場合も、この「その事由を証する書類」として扱う（出生の乳児が取得する場合の実務の扱いは、案内ページに記載がないため、行政書士が確認する）";
// R-3：写真は事由の別なく1葉（出生も含む）。注記は原文（gijinkoku_2026-10-18.txt 371〜373行）の年齢の注記（高度専門職の取得と同じ文言）。
// 原文 373行の「中長期在留者とならない在留資格の取得では不要」は、技人国は中長期在留者となるため、人の判断（2026-10-18）で注記に書かない。
// 名称の大きさは、人の判断（2026-10-18）で申請書のとおりにする。申請書（docs/official/acquisition-application-form_930004121.xlsx の写真欄の図形。xl/drawings/drawing1.xml）の表記は「40mm×30mm」。
// 家族滞在の取得（R-13）も同じ名称にする
const ACQUISITION_FORM_PHOTO_NAME = "写真（40mm×30mm）";
const GIJINKOKU_ACQUISITION_OVERRIDES: Record<string, Partial<RequirementRule>> = {
  photo: { causes: ALL_CAUSES, name: ACQUISITION_FORM_PHOTO_NAME, note: ACQUISITION_PHOTO_AGE_NOTE },
  cause_proof: { causes: ["birth", "other"], note: GIJINKOKU_ACQUISITION_CAUSE_PROOF_NOTE },
  // R-6：原文（gijinkoku_2026-10-18.txt 434行）は「申請人本人以外の方が申請書類を提出する場合」で、例が「申請取次者証明書、戸籍謄本等」。名称は変えない
  agent_identity_document: { note: ACQUISITION_AGENT_IDENTITY_NOTE },
};

// 技人国（R-1。Issue #402）：取得も、所属機関のカテゴリー（1〜4）で提出書類が異なる。判定の軸を、取得の事由と所属機関のカテゴリーの2つにする（alsoBasis）。
// 事由別の書類（ACQUISITION_BY_CAUSE から引き継ぐもの）は categories を持たないため、全カテゴリーで適用する。カテゴリー別の書類は causes を持たないため、全事由で適用する。
// カテゴリー別の書類は、認定（GIJINKOKU_COE）の同名の書類を、取得の原文（docs/official/gijinkoku_2026-10-18.txt の「在留資格取得許可申請」の節）に合わせて写す。
// 返信用封筒は認定のみ（取得の節に無い）のため写さない。
// 割り当て（どの書類がどのカテゴリーか）は、認定のチェックシートと同じにした（人の判断。#402）。取得のチェックシートは無く、取得の原文のコピーには表の列の位置が無いため、
// 取得の列の位置そのものは未確認。また、学歴・職歴の書類の注「【共通】６の資料を提出している場合は不要」の【共通】６が指す書類は、原文から確定できず未確認（推測で決めない）。
const GIJINKOKU_ACQUISITION_CATEGORY_IDS = [
  "category_proof",
  "online_approval_proof",
  "vocational_school_certificate",
  "dispatch_documents",
  "activity_documents",
  "career_documents",
  "registry_certificate",
  "business_description",
  "financial_statements",
  "representative_declaration",
  "language_ability",
  "withholding_exemption",
  "payroll_office_notification",
  "withholding_tax_receipts",
  "withholding_special_approval",
];
// 認定の注記のうち、取得に合わないもの（認定のチェックシートとの食い違いの説明）と、取得の原文にだけある注（【共通】６）を差し替える
const GIJINKOKU_ACQUISITION_CATEGORY_OVERRIDES: Record<string, Partial<RequirementRule>> = {
  vocational_school_certificate: {
    note: "専門学校を卒業した場合のみ。外国人留学生キャリア形成促進プログラムの認定学科修了者は認定学科修了証明書",
    verify: undefined,
  },
  career_documents: {
    note: "履歴書と、学歴又は職歴を証明する文書。外国の文化に基盤を有する業務では、3年以上の実務経験を証明する文書など、業務内容により異なる。IT技術者の資格証書は、案内ページに「【共通】６の資料を提出している場合は不要」とあるが、【共通】６が指す書類は未確認（行政書士が確認する）",
    verify: true,
  },
};
const gijinkokuAcquisitionCategoryRules: RequirementRule[] = GIJINKOKU_ACQUISITION_CATEGORY_IDS.map((id) => {
  const rule = GIJINKOKU_COE.rules.find((r) => r.id === id);
  if (!rule) throw new Error(`GIJINKOKU_COE に規則 ${id} がない`);
  const merged: RequirementRule = { ...rule, ...GIJINKOKU_ACQUISITION_CATEGORY_OVERRIDES[id] };
  if (merged.verify === undefined) delete merged.verify;
  return merged;
});

export const GIJINKOKU_ACQUISITION: RuleSet = {
  id: "gijinkoku_acquisition",
  title: "技術・人文知識・国際業務 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "技術・人文知識・国際業務",
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  checkedAt: "2026-10-18",
  sources: [
    {
      title: "在留資格「技術・人文知識・国際業務」在留資格取得許可申請（出入国在留管理庁）",
      url: "https://www.moj.go.jp/isa/applications/status/gijinkoku.html",
      kind: "page",
      comparedAt: ACQUISITION_PAGE_COMPARED_AT,
    },
    ACQUISITION_PROCEDURE_GUIDE_SOURCE,
    ...ACQUISITION_BY_CAUSE.sources,
  ],
  rules: [
    ...ACQUISITION_BY_CAUSE.rules
      .filter((r) => !GIJINKOKU_ACQUISITION_REMOVED_IDS.includes(r.id))
      .map((r) => (GIJINKOKU_ACQUISITION_OVERRIDES[r.id] ? { ...r, ...GIJINKOKU_ACQUISITION_OVERRIDES[r.id] } : r)),
    ...gijinkokuAcquisitionCategoryRules,
  ],
};

// 家族滞在（R-8〜R-15・R-17〜R-20）。原文（kazokutaizai_2026-10-18.txt 152〜194行）はカテゴリーによる区分が無く、事由は国籍離脱・出生・その他の3区分
const KAZOKU_RELATIONSHIP_NAME = "申請人と扶養者との身分関係を証する文書（戸籍謄本・婚姻届受理証明書・結婚証明書の写し・出生証明書の写しのいずれか、又はこれらに準ずる文書）";
const KAZOKU_SUPPORTER_CARD_NAME = "扶養者の在留カード又は旅券の写し";
// R-10 で(1)(2)の2行に分けて足し、R-19 の人の判断（2026-10-18）で、必須の1行にまとめた（案A）。
// 根拠は原文（kazokutaizai_2026-10-18.txt 178〜189行。(2)は「適宜」）と、チェックシート No.8（○。(1)(2)のどちらかを出す形）。
// 画面に扶養者の活動を入力する項目が無いため、(1)(2)のどちらを出すかは注記に書く
const KAZOKU_INCOME_NAME = "扶養者の職業及び収入を証する文書";
const KAZOKU_INCOME_NOTE =
  "扶養者の活動により、次の(1)(2)のどちらかを提出する（チェックシート No.8 は○）。" +
  "(1)扶養者が収入を伴う事業を運営する活動又は報酬を受ける活動を行っている場合：在職証明書又は営業許可書の写し等（扶養者の職業がわかる証明書）1通、住民税の課税（又は非課税）証明書及び納税証明書 各1通。1年間の総所得と納税状況の両方が記載された証明書であれば、課税（非課税）証明書と納税証明書のいずれか一方でよい。入国後間もない場合などは、最寄りの地方出入国在留管理官署に問い合わせる。" +
  "(2)(1)以外の活動を行っている場合：扶養者名義の預金残高証明書又は給付金額及び給付期間を明示した奨学金給付に関する証明書（適宜）、又は、これらに準ずるもので申請人の生活費用を支弁できることを証するもの（適宜）";
const KAZOKU_RESIDENCE_CERTIFICATE_NOTE =
  "必要書類ではないが、提出すると、許可後の在留カードに住民票の住居地が記載される。個人番号（マイナンバー）は省略し、他の事項は省略のないもの。住民票があれば許可後の市区町村での住居地の届出は不要（入管法第19条の8第4項）で、なければ許可後14日以内の届出が必要（同条第1項）";
const KAZOKU_QUESTIONNAIRE_NOTE =
  "出生した者の申請である場合（チェックシートでは△。案内ページは事由の別なく「質問書」を列挙しており、チェックシートに合わせて出生のみ要確認とする）。質問書の様式・記載内容は未確認";
const KAZOKU_NEW_RULES: RequirementRule[] = [
  {
    id: "family_relationship_proof",
    name: KAZOKU_RELATIONSHIP_NAME,
    party: "applicant",
    causes: ALL_CAUSES,
    level: "required",
    note: "次のいずれか。(1)戸籍謄本 1通 (2)婚姻届受理証明書 1通 (3)結婚証明書（写し）1通 (4)出生証明書（写し）1通 (5)(1)〜(4)に準ずる文書（適宜）",
    verify: true,
  },
  {
    id: "supporter_card_or_passport_copy",
    name: KAZOKU_SUPPORTER_CARD_NAME,
    party: "applicant",
    causes: ALL_CAUSES,
    level: "required",
    note: "1通",
    verify: true,
  },
  {
    id: "supporter_income_proof",
    name: KAZOKU_INCOME_NAME,
    party: "applicant",
    causes: ALL_CAUSES,
    level: "required",
    note: KAZOKU_INCOME_NOTE,
    verify: true,
  },
];
// R-13・R-18：写真は事由の別なく1葉（出生も含む。原文 161行・チェックシート No.2 とも事由の別なし）。
// 注記は、ページ（原文 161〜163行）の年齢の注記（技人国・高度専門職の取得と同じ文言）に、チェックシート（No.2）の規格を足す。
// 原文 163行の「中長期在留者とならない在留資格の取得では不要」は、技人国（R-3）と同じく、人の判断（2026-10-18）で注記に書かない。
// 名称は、技人国（R-3）と同じく申請書のとおり（チェックシートの「縦４cm×横３cm」ではなく「40mm×30mm」）
const KAZOKU_PHOTO_NOTE = `${ACQUISITION_PHOTO_AGE_NOTE}。チェックシートでは、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なものとし、写真の裏面に申請人の氏名を記載して、申請書の写真欄に貼付する`;
// R-14：旅券の理由書（原文に記載なし。パスポートは「提示」のみ。原文 169行）と、活動に応じた資料（家族滞在では、身分関係・扶養者の書類〔R-8〜R-10〕がこれに当たる）を外す。
// 旅券の理由書は、技人国（R-7）・高度専門職の取得（acquisition-2026-10-18.md の R-6）と同じ扱い
const KAZOKU_ACQUISITION_REMOVED_IDS = ["passport_reason_statement", "activity_materials"];
const KAZOKU_ACQUISITION_OVERRIDES: Record<string, Partial<RequirementRule>> = {
  photo: { causes: ALL_CAUSES, name: ACQUISITION_FORM_PHOTO_NAME, note: KAZOKU_PHOTO_NOTE },
  // R-15・R-20：原文（194行）は「申請人本人以外の方が申請書類を提出する場合」で、例が「申請取次者証明書、戸籍謄本等」。名称は変えない。チェックシートに行が無い点は注記に書かない
  agent_identity_document: { note: ACQUISITION_AGENT_IDENTITY_NOTE },
  // R-15：原文（167行）は「その事由を証する書類」のみ。原文に無い注記の例（日米地位協定）を外す
  cause_proof: { note: undefined },
  // R-17：チェックシートに合わせ、出生のみ要確認（△）。R-11：名称は原文（176行）・チェックシート（No.6）のとおり「質問書」（「両親の情報」は原文に無い）。
  // R-11 の「全事由に載せる」は、R-17 の判断（出生のみ）を優先し、採らない
  parents_questionnaire: { level: "check", name: "質問書", note: KAZOKU_QUESTIONNAIRE_NOTE },
  // R-12：全事由に載せ、任意（推奨）。名称は「住民票」
  household_residence_certificate: { causes: ALL_CAUSES, level: "optional", name: "住民票", note: KAZOKU_RESIDENCE_CERTIFICATE_NOTE },
};
export const KAZOKUTAIZAI_ACQUISITION: RuleSet = {
  id: "kazokutaizai_acquisition",
  title: "家族滞在 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "家族滞在",
  basis: "acquisitionCause",
  checkedAt: "2026-10-18",
  sources: [
    {
      title: "在留資格「家族滞在」在留資格取得許可申請（出入国在留管理庁）",
      url: "https://www.moj.go.jp/isa/applications/status/dependent.html",
      kind: "page",
      comparedAt: ACQUISITION_PAGE_COMPARED_AT,
    },
    ACQUISITION_PROCEDURE_GUIDE_SOURCE,
    ...ACQUISITION_BY_CAUSE.sources,
  ],
  // 身分関係・扶養者の書類は、出生の書類（事由別の書類の次）の後ろに入れる
  rules: ACQUISITION_BY_CAUSE.rules.flatMap((r) => {
    if (KAZOKU_ACQUISITION_REMOVED_IDS.includes(r.id)) return [];
    const rule = KAZOKU_ACQUISITION_OVERRIDES[r.id] ? { ...r, ...KAZOKU_ACQUISITION_OVERRIDES[r.id] } : r;
    return r.id === "birth_certificate" ? [rule, ...KAZOKU_NEW_RULES] : [rule];
  }),
};

// 在留資格「介護」。入管庁の案内ページに所属機関のカテゴリー（1〜4）による区分はなく、全書類を全カテゴリー共通（ALL）とする（Issue #297）。
// 提出書類は案内ページの本文による。チェックシート（PDF）3点（認定・変更・更新）の○・△は、2026-10-18 に照合済み（照合表は docs/official/reconciliation/kaigo-2026-10-18.md、Issue #333）。申請書は様式N（認定・変更・更新とも）。取得は、介護の取得の規則集合（KAIGO_ACQUISITION。照合表は acquisition-kaigo-2026-10-19.md）が扱う。
// 更新の「派遣先での活動内容の資料」は、チェックシートで△、案内ページに記載なし（要確認で足した。#312 の規則に基づく人の判断）。技能移転に係る申告書は、更新の案内ページ・チェックシートにない。
const KAIGO = "介護";
const KAIGO_SOURCE: RuleSource = { title: "在留資格「介護」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/nursingcare.html", kind: "page", comparedAt: "2026-10-18" };
const KAIGO_CHECKED_AT = "2026-10-07";

// 認定・変更・更新で共通に使う書類（手続別の規則集合が、必要なものを選んで並べる）
const kaigoRegistration: RequirementRule = {
  id: "care_worker_registration",
  name: "介護福祉士登録証（写し）",
  party: "applicant",
  categories: ALL,
  level: "required",
};
const kaigoWorkingConditions: RequirementRule = {
  id: "working_conditions_document",
  name: "労働条件を明示する文書（労働基準法第15条第1項・同法施行規則第5条に基づき交付されるもの）",
  party: "organization",
  categories: ALL,
  level: "required",
};
const kaigoDispatch: RequirementRule = {
  id: "dispatch_documents",
  name: "派遣先での活動内容を明らかにする資料（労働条件通知書（雇用契約書）等）",
  party: "organization",
  categories: ALL,
  level: "check",
  note: "派遣契約に基づいて就労する場合（申請人が被派遣者の場合）のみ",
};
const kaigoOrganizationOverview: RequirementRule = {
  id: "organization_overview",
  name: "所属機関の概要を明らかにする文書（沿革・役員・組織・事業内容等が記載された案内書、又はこれに準ずる文書）",
  party: "organization",
  categories: ALL,
  level: "required",
};
const kaigoRepresentativeDeclaration: RequirementRule = {
  id: "representative_declaration",
  name: "所属機関の代表者に関する申告書（参考様式）",
  party: "organization",
  categories: ALL,
  level: "required",
  note: "2026年4月15日以降の申請で提出する",
};
const kaigoSkillTransferDeclaration: RequirementRule = {
  id: "skill_transfer_declaration",
  name: "技能移転に係る申告書（参考様式）",
  party: "applicant",
  categories: ALL,
  level: "check",
  note: "「技能実習」の在留資格で在留していたことがある場合のみ",
};

export const KAIGO_COE: RuleSet = {
  id: "kaigo_coe",
  title: "介護 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: KAIGO,
  excludeStatuses: ["特定技能"],
  checkedAt: KAIGO_CHECKED_AT,
  sources: [KAIGO_SOURCE],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    kaigoRegistration,
    kaigoWorkingConditions,
    kaigoDispatch,
    kaigoOrganizationOverview,
    kaigoRepresentativeDeclaration,
    kaigoSkillTransferDeclaration,
  ],
};

export const KAIGO_CHANGE: RuleSet = {
  id: "kaigo_change",
  title: "介護 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: KAIGO,
  excludeStatuses: ["特定技能"],
  checkedAt: KAIGO_CHECKED_AT,
  sources: [KAIGO_SOURCE],
  rules: [
    ...procedureCommonRules("change"),
    kaigoRegistration,
    kaigoWorkingConditions,
    kaigoDispatch,
    kaigoOrganizationOverview,
    kaigoRepresentativeDeclaration,
    kaigoSkillTransferDeclaration,
  ],
};

export const KAIGO_RENEWAL: RuleSet = {
  id: "kaigo_renewal",
  title: "介護 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: KAIGO,
  excludeStatuses: ["特定技能"],
  checkedAt: KAIGO_CHECKED_AT,
  sources: [KAIGO_SOURCE],
  rules: [
    ...procedureCommonRules("renewal"),
    kaigoRepresentativeDeclaration,
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: ALL,
      level: "required",
      note: "直近1年分の総所得及び納税状況が記載されたもの。1年間の総所得及び納税状況（税金を納めているかどうか）の両方が記載されている証明書であれば、いずれか一方でかまわない",
    },
    { ...kaigoWorkingConditions, level: "check", note: "転職後、初回の更新許可申請の場合のみ" },
    { ...kaigoDispatch, note: "派遣契約に基づいて就労する場合（申請人が被派遣者の場合）のみ。チェックシートで△。ページには記載なし" },
    { ...kaigoOrganizationOverview, level: "check", note: "転職後、初回の更新許可申請の場合のみ" },
  ],
};

// 在留資格「法律・会計業務」。入管庁の案内ページに所属機関のカテゴリー（1〜4）による区分はなく、全書類を全カテゴリー共通（ALL）とする（Issue #301）。
// 提出書類は案内ページの本文と、チェックシート（PDF）3点（認定・変更・更新）による。照合済み（2026-10-18。照合表は docs/official/reconciliation/houmu-kaikei-2026-10-18.md、Issue #333。書類の食い違いはなかった）。申請書は様式U（認定・変更・更新とも）。取得は HOUMU_KAIKEI_ACQUISITION（原文の取得の節に照合済み、2026-10-19）。
// 更新は、共通書類（申請書・写真・パスポート及び在留カードの提示）以外の書類が案内ページにない。
const HOUMU_KAIKEI = "法律・会計業務";
const HOUMU_KAIKEI_SOURCE: RuleSource = { title: "在留資格「法律・会計業務」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/legalaccountingservices.html", kind: "page", comparedAt: "2026-10-18" };
const HOUMU_KAIKEI_CHECKED_AT = "2026-10-07";

const houmuKaikeiLicense: RequirementRule = {
  id: "legal_accounting_license",
  name: "日本の法律・会計の資格を有することを証明する文書（免許書、証明書等の写し）",
  party: "applicant",
  categories: ALL,
  level: "required",
  note: "弁護士、司法書士、土地家屋調査士、外国法事務弁護士、公認会計士、外国公認会計士、税理士、社会保険労務士、弁理士、海事代理士、行政書士のいずれか",
};

export const HOUMU_KAIKEI_COE: RuleSet = {
  id: "houmu_kaikei_coe",
  title: "法律・会計業務 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: HOUMU_KAIKEI,
  checkedAt: HOUMU_KAIKEI_CHECKED_AT,
  sources: [HOUMU_KAIKEI_SOURCE],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    houmuKaikeiLicense,
  ],
};

export const HOUMU_KAIKEI_CHANGE: RuleSet = {
  id: "houmu_kaikei_change",
  title: "法律・会計業務 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: HOUMU_KAIKEI,
  checkedAt: HOUMU_KAIKEI_CHECKED_AT,
  sources: [HOUMU_KAIKEI_SOURCE],
  rules: [...procedureCommonRules("change"), houmuKaikeiLicense],
};

export const HOUMU_KAIKEI_RENEWAL: RuleSet = {
  id: "houmu_kaikei_renewal",
  title: "法律・会計業務 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: HOUMU_KAIKEI,
  checkedAt: HOUMU_KAIKEI_CHECKED_AT,
  sources: [HOUMU_KAIKEI_SOURCE],
  rules: [...procedureCommonRules("renewal")],
};

// 在留資格「教授」。所属機関のカテゴリーは、1＝常勤職員・2＝非常勤職員の2区分（会社の1〜4区分とは別。categoryDefinition）。
// 提出書類は、案内ページと、認定・変更・更新のチェックシート（PDF）の表（○の位置まで）による。2026-10-07 に照合済み（Issue #292）。申請書は様式 I（認定・変更・更新とも）。取得は、教授の取得の規則集合（PROFESSOR_ACQUISITION。照合表は acquisition-kyoju-2026-10-24.md）が扱う。
const PROFESSOR = "教授";
const PROFESSOR_CHECKED_AT = "2026-10-07";
const PROFESSOR_PAGE_SOURCE: RuleSource = { title: "在留資格「教授」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/professor.html", kind: "page" };
const PROFESSOR_CATEGORIES: Partial<Record<Category, string>> = {
  "1": "カテゴリー1（常勤職員）",
  "2": "カテゴリー2（非常勤職員）",
};
const PROFESSOR_PART_TIME: Category[] = ["2"];

const professorActivityProof: RequirementRule = {
  id: "activity_proof_document",
  name: "大学等又は大学等以外の機関が作成する、申請人の大学等における活動の内容、期間、地位及び報酬を証明する文書",
  party: "organization",
  categories: PROFESSOR_PART_TIME,
  level: "required",
};

export const PROFESSOR_COE: RuleSet = {
  id: "professor_coe",
  title: "教授 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: PROFESSOR,
  categoryDefinition: PROFESSOR_CATEGORIES,
  checkedAt: PROFESSOR_CHECKED_AT,
  sources: [
    PROFESSOR_PAGE_SOURCE,
    { title: "「教授」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404120.pdf", kind: "pdf" },
  ],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    professorActivityProof,
  ],
};

export const PROFESSOR_CHANGE: RuleSet = {
  id: "professor_change",
  title: "教授 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: PROFESSOR,
  categoryDefinition: PROFESSOR_CATEGORIES,
  checkedAt: PROFESSOR_CHECKED_AT,
  sources: [
    PROFESSOR_PAGE_SOURCE,
    { title: "「教授」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001368410.pdf", kind: "pdf" },
  ],
  rules: [...procedureCommonRules("change"), professorActivityProof],
};

export const PROFESSOR_RENEWAL: RuleSet = {
  id: "professor_renewal",
  title: "教授 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: PROFESSOR,
  categoryDefinition: PROFESSOR_CATEGORIES,
  checkedAt: PROFESSOR_CHECKED_AT,
  sources: [
    PROFESSOR_PAGE_SOURCE,
    { title: "「教授」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001368411.pdf", kind: "pdf" },
  ],
  rules: [
    ...procedureCommonRules("renewal"),
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: PROFESSOR_PART_TIME,
      level: "required",
      note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）",
    },
    {
      ...professorActivityProof,
      level: "check",
      note: "常勤職員として「教授」で在留していた方が、更新申請時点で転職等により非常勤職員となっている場合のみ",
    },
  ],
};

// 在留資格「医療」。入管庁の案内ページ・チェックシートの「カテゴリー1・2」は、所属機関のカテゴリー（1〜4）ではなく、申請人の区分
// （カテゴリー1＝医師・歯科医師、カテゴリー2＝医師・歯科医師以外の者）。
// 提出書類は、案内ページの本文と、チェックシート（PDF）3点（認定・変更・更新）による。照合済み（2026-10-18。照合表は docs/official/reconciliation/iryo-2026-10-18.md、Issue #333）。ページとチェックシートが食い違う書類は「要確認」にしている。この区分は formDetails.medicalApplicantType に持ち、basis: "applicantType" で判定する（Issue #310。
// 所属機関のカテゴリーには依存しないため、categories は ALL のまま）。区分が未選択の間は、区分で要否が分かれる書類を要確認（check）で表示する（Issue #302 と同じ）。申請書は様式U（認定・変更・更新とも）。取得は、医療の取得の規則集合（IRYO_ACQUISITION。照合表は acquisition-iryou-2026-10-19.md）が扱う。
const IRYO = "医療";
const IRYO_SOURCE: RuleSource = { title: "在留資格「医療」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/medicalservices.html", kind: "page", comparedAt: "2026-10-18" };
const IRYO_CHECKED_AT = "2026-10-07";
const IRYO_DOCTOR_NOTE = "医師・歯科医師の場合のみ（入管庁の案内の「カテゴリー1」。所属機関のカテゴリーではなく、申請人の区分）";
const IRYO_OTHER_NOTE = "医師・歯科医師以外の場合のみ（入管庁の案内の「カテゴリー2」）";

const iryoDoctorLicense: RequirementRule = {
  id: "medical_license_doctor",
  name: "医師又は歯科医師の日本の資格を有することを証明する文書（免状又は証明書等の写し）",
  party: "applicant",
  categories: ALL,
  applicantTypes: ["doctor"],
  level: "required",
  note: IRYO_DOCTOR_NOTE,
};
const iryoOtherLicense: RequirementRule = {
  id: "medical_license_other",
  name: "医療に係る日本の資格を有することを証明する文書（免状又は証明書等の写し）",
  party: "applicant",
  categories: ALL,
  applicantTypes: ["other"],
  level: "required",
  note: "医師・歯科医師以外の場合のみ（入管庁の案内の「カテゴリー2」）。薬剤師、保健師、助産師、看護師、准看護師、歯科衛生士、診療放射線技師、理学療法士、作業療法士、視能訓練士、臨床工学技士、義肢装具士のいずれか",
};
const iryoFacilityOverview: RequirementRule = {
  id: "facility_overview",
  name: "勤務する機関の概要を明らかにする資料（病院、診療所等設立に許可を受けることを要する機関の場合は、当該許可を受けた年月日を明示したもの）",
  party: "organization",
  categories: ALL,
  level: "check",
  // 認定・変更：チェックシートは、カテゴリー2（医師・歯科医師以外）だけ○。ページは区分を読み取れないため、両区分に要確認で出す（照合表 M-1）
  note: "医師・歯科医師以外の場合のみ（入管庁の案内の「カテゴリー2」）。チェックシートでは医師・歯科医師以外のみ○",
};

export const IRYO_COE: RuleSet = {
  id: "iryo_coe",
  basis: "applicantType",
  title: "医療 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: IRYO,
  checkedAt: IRYO_CHECKED_AT,
  sources: [IRYO_SOURCE],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    iryoDoctorLicense,
    iryoOtherLicense,
    iryoFacilityOverview,
  ],
};

export const IRYO_CHANGE: RuleSet = {
  id: "iryo_change",
  basis: "applicantType",
  title: "医療 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: IRYO,
  checkedAt: IRYO_CHECKED_AT,
  sources: [IRYO_SOURCE],
  rules: [...procedureCommonRules("change"), iryoDoctorLicense, iryoOtherLicense, iryoFacilityOverview],
};

export const IRYO_RENEWAL: RuleSet = {
  id: "iryo_renewal",
  basis: "applicantType",
  title: "医療 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: IRYO,
  checkedAt: IRYO_CHECKED_AT,
  sources: [IRYO_SOURCE],
  rules: [
    ...procedureCommonRules("renewal"),
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: ALL,
      level: "required",
      note: "直近1年分の総所得及び納税状況が記載されたもの",
    },
    {
      id: "employment_certificate",
      name: "従事する職務の内容及び報酬を証明する在職証明書その他の所属機関の文書",
      party: "organization",
      categories: ALL,
      applicantTypes: ["other"],
      level: "required",
      note: IRYO_OTHER_NOTE,
    },
    {
      ...iryoOtherLicense,
      level: "check",
      // 更新の案内ページには、資格を証明する文書の記載がない。チェックシートは、転職後の初回の更新で、医師・歯科医師以外の方に○（照合表 M-2）
      note: "チェックシートで○（医師・歯科医師以外）。案内ページには記載なし",
      verify: true,
    },
    { ...iryoFacilityOverview, applicantTypes: ["other"], note: "医師・歯科医師以外の方が、転職後の初回の更新許可申請を行う場合のみ" },
  ],
};

// 在留資格「研究」。所属機関のカテゴリー（1〜4）は、技術・人文知識・国際業務と同じ区分で、書類もカテゴリーごとに異なる（Issue #296）。
// 提出書類は案内ページの本文と、チェックシート（PDF）による。カテゴリー1・2は「その他の資料は原則不要」、3は4のうち源泉徴収に関する資料が不要。
// チェックシートの○・△の位置は、認定・変更・更新の5つのPDF（カテゴリー共通と、令和8年4月15日以降のカテゴリー3・4）すべてと照合済み（2026-10-18。照合表は docs/official/reconciliation/kenkyu-2026-10-18.md、Issue #333）。
// ページとチェックシートが食い違う書類は「要確認」にし、ページにない書類は足さない（Issue #312 の規則）。食い違いの判断（K-1〜K-9）は、照合表の「食い違い一覧」に記録している。
// 申請書は様式N（認定・変更・更新とも）。「転勤」は様式Lで、出力は別 Issue で扱う（ここでは書類のみ「要確認」で案内）。取得は KENKYU_ACQUISITION（原文の取得の節に照合済み、2026-10-19。docs/official/reconciliation/acquisition-kenkyu-2026-10-19.md）。
const KENKYU = "研究";
const KENKYU_CHECKED_AT = "2026-10-07";
const KENKYU_SOURCE: RuleSource = { title: "在留資格「研究」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/researcher.html", kind: "page", comparedAt: "2026-10-18" };
const KENKYU_EXCLUDE = ["特定活動"]; // 「特定活動（研究活動等）」は別の在留資格（Issue #299）

const kenkyuCategoryProof: RequirementRule = {
  id: "category_proof",
  name: "所属機関のカテゴリーを証明する文書",
  party: "organization",
  categories: ["1", "2", "3"],
  level: "required",
  note: "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。カテゴリー2は、オンライン利用申出の承認を受けている場合はその承認を示す文書。提出可能な書類がなければカテゴリー4となる。チェックシートでは、変更・更新に「受付印のあるものの写し」とある",
};
const kenkyuOnlineApproval: RequirementRule = {
  id: "online_approval_proof",
  name: "在留申請オンラインシステムの利用申出の承認を証明する文書（承認のお知らせメール等）",
  party: "organization",
  categories: ["2"],
  level: "check",
  note: "カテゴリー2と同様の添付資料での申請を希望し、利用申出が承認された機関の場合のみ",
};
const kenkyuDispatch: RequirementRule = {
  id: "dispatch_documents",
  name: "派遣先での活動内容を明らかにする資料（労働条件通知書（雇用契約書）等）",
  party: "organization",
  categories: ALL,
  level: "check",
  note: "派遣契約に基づいて就労する場合（申請人が被派遣者の場合）のみ",
};
const kenkyuActivityDocuments: RequirementRule = {
  id: "activity_documents",
  name: "活動内容等を明らかにする資料（労働条件を明示する文書、役員報酬を定める定款の写し等）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "労働契約の場合は労働条件通知書等。日本法人の役員に就任する場合は役員報酬を定める定款の写し又は株主総会議事録の写し。外国法人の日本支店への転勤・会社以外の団体の役員に就任する場合は、地位（担当業務）、期間及び報酬額を明らかにする所属団体の文書",
};
const kenkyuCareerDocuments: RequirementRule = {
  id: "career_documents",
  name: "学歴及び職歴その他経歴等を証明する文書（履歴書、卒業証明書又は研究の経験期間を証明する文書等）",
  party: "applicant",
  categories: ["3", "4"],
  level: "required",
  note: "履歴書（関連する職務に従事した機関、活動の内容及び期間を明示したもの）と、大学等の卒業証明書（同等以上の教育又は高度専門士の称号を証明する文書でもよい）又は研究の経験期間を証明する文書（大学院・大学での研究期間を含む）",
};
const kenkyuTransferDocuments: RequirementRule = {
  id: "transfer_documents",
  name: "転勤の場合の資料（転勤直前の外国の機関の文書、転勤前後の事業所の関係を示す資料）",
  party: "organization",
  categories: ["3", "4"],
  level: "check",
  note: "「研究（転勤）」の場合のみ（申請書は様式L）。過去1年間の業務内容・地位・報酬を明示した転勤直前の機関の文書と、支店の登記事項証明書又は出資・資本関係を明らかにする資料",
};
const kenkyuBusinessMaterials: RequirementRule = {
  id: "business_description",
  name: "事業内容を明らかにする資料（会社案内等）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が詳細に記載された案内書、これに準ずる文書、又は登記事項証明書のいずれか",
};
// カテゴリー4の決算文書は、ページとチェックシートの読み方が食い違うため、認定・変更・更新とも「要確認」（照合表 K-2〜K-4）。
//   ページ：カテゴリー4は必要で、カテゴリー3のみ「転勤して研究を行う業務に従事する場合に限る」。
//   チェックシート：行全体（カテゴリー3・4）に「転勤して研究を行う業務に従事する場合に限る」が付く。記号は、認定が○、変更・更新が△。
const kenkyuFinancialStatementsNote = (mark: string) =>
  `新規事業の場合は事業計画書。ページの読み方は、カテゴリー4は必要（カテゴリー3のみ「転勤して研究を行う業務に従事する場合に限る」）。チェックシートの読み方は、行全体（カテゴリー3・4）に「転勤して研究を行う業務に従事する場合に限る」が付き、記号は${mark}。両者が食い違うため要確認`;
const kenkyuFinancialStatements: RequirementRule = {
  id: "financial_statements",
  name: "直近年度の決算文書の写し",
  party: "organization",
  categories: ["4"],
  level: "check",
  note: kenkyuFinancialStatementsNote("○（認定）"),
  verify: true,
};
const kenkyuFinancialStatementsCat3: RequirementRule = {
  ...kenkyuFinancialStatements,
  id: "financial_statements_transfer",
  categories: ["3"],
  level: "check",
  note: "カテゴリー3は、転勤して研究を行う業務に従事する場合に限る。新規事業の場合は事業計画書",
  verify: undefined,
};
const kenkyuRepresentativeDeclaration: RequirementRule = {
  id: "representative_declaration",
  name: "所属機関の代表者に関する申告書（参考様式）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "2026年4月15日以降の申請で提出する",
};
// カテゴリー4：前年分の法定調書合計表を提出できない理由を明らかにする資料
const kenkyuWithholdingRules: RequirementRule[] = [
  {
    id: "withholding_exemption_certificate",
    name: "外国法人の源泉徴収に対する免除証明書その他の源泉徴収を要しないことを明らかにする資料",
    party: "organization",
    categories: ["4"],
    level: "check",
    note: "源泉徴収の免除を受ける機関の場合のみ。この場合は、下の給与支払事務所等の開設届出書等は不要",
  },
  { id: "payroll_office_notification", name: "給与支払事務所等の開設届出書の写し", party: "organization", categories: ["4"], level: "required" },
  { id: "withholding_tax_receipts", name: "直近3か月分の所得税徴収高計算書の写し", party: "organization", categories: ["4"], level: "required" },
  {
    id: "withholding_special_approval",
    name: "源泉所得税の納期の特例の承認を受けていることを明らかにする資料",
    party: "organization",
    categories: ["4"],
    level: "required",
    when: "withholdingSpecial",
    note: "納期の特例の承認を受けている場合",
  },
];

export const KENKYU_COE: RuleSet = {
  id: "kenkyu_coe",
  title: "研究 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: KENKYU,
  excludeStatuses: KENKYU_EXCLUDE,
  checkedAt: KENKYU_CHECKED_AT,
  sources: [KENKYU_SOURCE],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    kenkyuCategoryProof,
    kenkyuOnlineApproval,
    kenkyuDispatch,
    kenkyuActivityDocuments,
    kenkyuCareerDocuments,
    kenkyuTransferDocuments,
    kenkyuBusinessMaterials,
    kenkyuFinancialStatements,
    kenkyuFinancialStatementsCat3,
    kenkyuRepresentativeDeclaration,
    ...kenkyuWithholdingRules,
  ],
};

export const KENKYU_CHANGE: RuleSet = {
  id: "kenkyu_change",
  title: "研究 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: KENKYU,
  excludeStatuses: KENKYU_EXCLUDE,
  checkedAt: KENKYU_CHECKED_AT,
  sources: [KENKYU_SOURCE],
  rules: [
    ...procedureCommonRules("change"),
    kenkyuCategoryProof,
    kenkyuOnlineApproval,
    {
      id: "omission_statement",
      name: "提出書類省略に関する説明書（「留学」から「技術・人文知識・国際業務」又は「研究」への変更）（参考様式）",
      party: "organization",
      categories: ["2"],
      level: "check",
      note: "「留学」からの変更で、カテゴリー2（大学・短大・大学院の卒業（予定）者等）として扱う場合。チェックシートでは、カテゴリーを証明する文書の選択肢の一つとして○",
    },
    kenkyuDispatch,
    kenkyuActivityDocuments,
    kenkyuCareerDocuments,
    kenkyuTransferDocuments,
    kenkyuBusinessMaterials,
    // 案内ページはカテゴリー4に必要とするが、チェックシート（変更）は△（条件付き）。食い違うため要確認
    { ...kenkyuFinancialStatements, note: kenkyuFinancialStatementsNote("△（変更）") },
    kenkyuFinancialStatementsCat3,
    kenkyuRepresentativeDeclaration,
    ...kenkyuWithholdingRules,
  ],
};

// 更新は、案内ページの「転職後の初回の更新申請」の資料（活動内容・事業内容・決算文書・代表者申告書）を、カテゴリー3・4の「要確認」とする。
// 決算文書は、ページとチェックシートで「転勤の場合に限る」の範囲の読み方が食い違うため要確認。カテゴリー3の「提出書類10は不要」は、チェックシートでは「提出資料11は不要」で、代表者申告書（No.10）に係る食い違いとして扱う（決算文書はNo.9）。
// チェックシート（更新）では、決算文書は△（条件付き）、代表者申告書は○、源泉徴収の資料（11）はカテゴリー4のみで、いずれも転職後の初回の枠内。
const KENKYU_FIRST_RENEWAL_NOTE = "転職後、初回の更新許可申請の場合のみ";
const kenkyuFirstRenewalWithholding: RequirementRule[] = kenkyuWithholdingRules.map((r) => ({
  ...r,
  level: "check",
  note: r.note ? `${KENKYU_FIRST_RENEWAL_NOTE}。${r.note}` : KENKYU_FIRST_RENEWAL_NOTE,
}));
export const KENKYU_RENEWAL: RuleSet = {
  id: "kenkyu_renewal",
  title: "研究 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: KENKYU,
  excludeStatuses: KENKYU_EXCLUDE,
  checkedAt: KENKYU_CHECKED_AT,
  sources: [KENKYU_SOURCE],
  rules: [
    ...procedureCommonRules("renewal"),
    kenkyuCategoryProof,
    kenkyuOnlineApproval,
    kenkyuDispatch,
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: ["3", "4"],
      level: "required",
      note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）",
    },
    { ...kenkyuActivityDocuments, level: "check", note: KENKYU_FIRST_RENEWAL_NOTE },
    { ...kenkyuBusinessMaterials, level: "check", note: KENKYU_FIRST_RENEWAL_NOTE },
    { ...kenkyuFinancialStatements, note: `${KENKYU_FIRST_RENEWAL_NOTE}。${kenkyuFinancialStatementsNote("△（更新）")}` },
    {
      ...kenkyuFinancialStatementsCat3,
      note: "転職後、初回の更新許可申請で、転勤して研究を行う業務に従事する場合に限る。チェックシート（更新）は△（条件付き）のため要確認",
      verify: true,
    },
    {
      ...kenkyuRepresentativeDeclaration,
      level: "check",
      note: `${KENKYU_FIRST_RENEWAL_NOTE}。カテゴリー3は、ページは「提出書類10は不要」、チェックシート（PDF）は「提出資料11は不要」で、代表者申告書（No.10）は○のため要確認`,
      verify: true,
    },
    ...kenkyuFirstRenewalWithholding,
  ],
};

// 在留資格「教育」。所属機関のカテゴリーは、1＝小学校〜特別支援学校に常勤・2＝左記以外の教育機関に常勤・3＝非常勤の3区分（会社の1〜4区分とは別。categoryDefinition）。
// 提出書類は、案内ページと、認定・変更・更新のチェックシート（PDF）の表（○・△の位置まで）による。2026-10-07 に照合済み（Issue #293）。
// 申請書は様式 I（認定・変更・更新とも。公式の教育の様式は、教授と同じファイル）。取得は、教育の取得の規則集合（EDUCATION_ACQUISITION。照合表は acquisition-kyoiku-2026-10-24.md）が扱う。
const EDUCATION = "教育";
const EDUCATION_CHECKED_AT = "2026-10-07";
const EDUCATION_PAGE_SOURCE: RuleSource = { title: "在留資格「教育」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/instructor.html", kind: "page" };
const EDUCATION_CATEGORIES: Partial<Record<Category, string>> = {
  "1": "カテゴリー1（小学校・中学校・高等学校・中等教育学校・特別支援学校に常勤）",
  "2": "カテゴリー2（上記以外の教育機関に常勤）",
  "3": "カテゴリー3（非常勤）",
};
const EDUCATION_ALL: Category[] = ["1", "2", "3"];
const EDUCATION_CAT_2_3: Category[] = ["2", "3"];
const EDUCATION_CAT_3: Category[] = ["3"];

const educationActivityDocuments: RequirementRule = {
  id: "activity_content_documents",
  name: "申請人の活動内容等を明らかにする資料（労働契約の場合は労働条件を明示する文書、雇用以外の契約の場合は業務従事に係る契約書の写し）",
  party: "organization",
  categories: EDUCATION_CAT_2_3,
  level: "required",
  note: "労働基準法第15条第1項・同法施行規則第5条に基づき交付される文書。雇用以外の契約で複数の機関と契約する場合は、すべての機関との間の契約書の写し",
};
const educationCareerDocuments: RequirementRule = {
  id: "career_documents",
  name: "申請人の履歴を証明する資料（履歴書と、学歴又は職歴等を証明する文書）",
  party: "applicant",
  categories: EDUCATION_CAT_2_3,
  level: "required",
  note: "履歴書は、関連する職務に従事した機関と活動の内容・期間を明示したもの。学歴又は職歴等は、大学等の卒業証明書等（専修学校の専攻科は専攻科の修了証明）、免許証等資格の写し、外国語教育の場合は当該外国語による12年以上の教育の証明、外国語以外の科目の場合は当該科目の5年以上の実務経験の証明のいずれか",
};
const educationBusinessDocuments: RequirementRule = {
  id: "business_content_documents",
  name: "事業内容を明らかにする資料（勤務先等の案内書、これに準ずる文書、登記事項証明書）",
  party: "organization",
  categories: EDUCATION_CAT_2_3,
  level: "required",
  note: "案内書は、勤務先等の沿革、役員、組織、事業内容等が詳細に記載されたもの",
};
const educationFinancialStatements: RequirementRule = {
  id: "financial_statements",
  name: "直近の年度の決算文書の写し",
  party: "organization",
  categories: EDUCATION_CAT_3,
  level: "required",
  note: "新規事業の場合は事業計画書",
};

export const EDUCATION_COE: RuleSet = {
  id: "education_coe",
  title: "教育 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: EDUCATION,
  categoryDefinition: EDUCATION_CATEGORIES,
  checkedAt: EDUCATION_CHECKED_AT,
  sources: [
    EDUCATION_PAGE_SOURCE,
    { title: "「教育」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404130.pdf", kind: "pdf" },
  ],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: EDUCATION_ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    educationActivityDocuments,
    educationCareerDocuments,
    educationBusinessDocuments,
    educationFinancialStatements,
  ],
};

export const EDUCATION_CHANGE: RuleSet = {
  id: "education_change",
  title: "教育 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: EDUCATION,
  categoryDefinition: EDUCATION_CATEGORIES,
  checkedAt: EDUCATION_CHECKED_AT,
  sources: [
    EDUCATION_PAGE_SOURCE,
    { title: "「教育」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367667.pdf", kind: "pdf" },
  ],
  rules: [
    ...procedureCommonRules("change"),
    educationActivityDocuments,
    educationCareerDocuments,
    educationBusinessDocuments,
    educationFinancialStatements,
  ],
};

// 更新：チェックシートの「転職後の初回の更新許可申請の場合」の資料（表の6〜8）は、区分2・3の方のみ。区分2は、決算文書（8）は不要。
const EDUCATION_FIRST_RENEWAL_AFTER_JOB_CHANGE = "転職後の初回の更新許可申請の場合のみ";
export const EDUCATION_RENEWAL: RuleSet = {
  id: "education_renewal",
  title: "教育 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: EDUCATION,
  categoryDefinition: EDUCATION_CATEGORIES,
  checkedAt: EDUCATION_CHECKED_AT,
  sources: [
    EDUCATION_PAGE_SOURCE,
    { title: "「教育」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367669.pdf", kind: "pdf" },
  ],
  rules: [
    ...procedureCommonRules("renewal"),
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: EDUCATION_CAT_2_3,
      level: "required",
      note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）",
    },
    {
      id: "non_employment_contract_copy",
      name: "業務従事に係る契約書の写し（雇用以外の契約に基づいて業務に従事する場合）",
      party: "organization",
      categories: EDUCATION_CAT_2_3,
      level: "check",
      verify: true,
      note: "チェックシートに△の凡例がないため要確認。複数の機関との契約に基づいて業務に従事する場合は、そのすべての機関との間の契約書の写し",
    },
    { ...educationActivityDocuments, level: "check", note: EDUCATION_FIRST_RENEWAL_AFTER_JOB_CHANGE },
    { ...educationBusinessDocuments, level: "check", note: EDUCATION_FIRST_RENEWAL_AFTER_JOB_CHANGE },
    { ...educationFinancialStatements, level: "check", note: `${EDUCATION_FIRST_RENEWAL_AFTER_JOB_CHANGE}（新規事業の場合は事業計画書）` },
  ],
};

// 在留資格「報道」。所属機関のカテゴリーは、1＝外務省報道官から外国記者登録証を発行された者を雇用する外国の報道機関に雇用される場合・2＝それ以外の団体・個人の2区分（会社の1〜4区分とは別。categoryDefinition）。
// 提出書類は、案内ページと、認定・変更・更新のチェックシート（PDF）の表（○の位置まで）による。2026-10-12 に照合済み（Issue #294）。
// 食い違いは更新の「外国の報道機関の概要」だけ（案内ページには転職後初回の資料にあるが、チェックシート（更新）にはない）。この1件は要確認とした。
// 申請書は様式L（認定・変更・更新とも）。取得は、報道の取得の規則集合（HODO_ACQUISITION。照合表は acquisition-hodo-2026-10-24.md）が扱う。
const HODO = "報道";
const HODO_CHECKED_AT = "2026-10-12";
const HODO_PAGE_SOURCE: RuleSource = { title: "在留資格「報道」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/journalist.html", kind: "page" };
const HODO_CATEGORIES: Partial<Record<Category, string>> = {
  "1": "カテゴリー1（外務省報道官から外国記者登録証を発行された者を雇用する外国の報道機関に雇用される場合）",
  "2": "カテゴリー2（上記に該当しない団体・個人）",
};
const HODO_CAT_1: Category[] = ["1"];
const HODO_CAT_2: Category[] = ["2"];
const HODO_FIRST_RENEWAL_NOTE = "転職後、初回の更新許可申請の場合のみ";

const hodoRegisteredEmployerProof: RequirementRule = {
  id: "registered_employer_proof",
  name: "申請人を雇用する外国の報道機関が、外務省報道官から外国記者登録証を発行された社員を雇用していることを証明する文書",
  party: "organization",
  categories: HODO_CAT_1,
  level: "required",
};
const hodoActivityDocuments: RequirementRule = {
  id: "activity_documents",
  name: "申請人の活動の内容等を明らかにする資料（次のいずれか）",
  party: "organization",
  categories: HODO_CAT_2,
  level: "required",
  note: "(1)外国の報道機関から派遣される場合：その機関が作成した活動の内容、派遣期間、地位及び報酬を証明する文書／(2)外国の報道機関に日本で雇用される場合：労働基準法第15条第1項・同法施行規則第5条に基づき交付される労働条件を明示する文書／(3)雇用以外の契約に基づいて活動する場合（フリーランサー等）：その契約書（活動の内容、期間、地位及び報酬のいずれかの記載がないときは、その事項を記載した外国の報道機関の文書）",
};
const hodoOrganizationOverview: RequirementRule = {
  id: "organization_overview",
  name: "外国の報道機関の概要（代表者名、沿革、組織、施設、職員数、報道実績等）を明らかにする資料",
  party: "organization",
  categories: HODO_CAT_2,
  level: "required",
};

export const HODO_COE: RuleSet = {
  id: "hodo_coe",
  title: "報道 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: HODO,
  checkedAt: HODO_CHECKED_AT,
  categoryDefinition: HODO_CATEGORIES,
  sources: [
    HODO_PAGE_SOURCE,
    { title: "「報道」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404123.pdf", kind: "pdf" },
  ],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: [...HODO_CAT_1, ...HODO_CAT_2],
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    hodoRegisteredEmployerProof,
    hodoActivityDocuments,
    hodoOrganizationOverview,
  ],
};

export const HODO_CHANGE: RuleSet = {
  id: "hodo_change",
  title: "報道 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: HODO,
  checkedAt: HODO_CHECKED_AT,
  categoryDefinition: HODO_CATEGORIES,
  sources: [
    HODO_PAGE_SOURCE,
    { title: "「報道」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001365757.pdf", kind: "pdf" },
  ],
  rules: [...procedureCommonRules("change"), hodoRegisteredEmployerProof, hodoActivityDocuments, hodoOrganizationOverview],
};

export const HODO_RENEWAL: RuleSet = {
  id: "hodo_renewal",
  title: "報道 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: HODO,
  checkedAt: HODO_CHECKED_AT,
  categoryDefinition: HODO_CATEGORIES,
  sources: [
    HODO_PAGE_SOURCE,
    { title: "「報道」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001365760.pdf", kind: "pdf" },
  ],
  rules: [
    ...procedureCommonRules("renewal"),
    { id: "press_registration_copy", name: "外務省報道官が発行した外国記者登録証の写し", party: "applicant", categories: HODO_CAT_1, level: "required" },
    {
      id: "employment_certificate",
      name: "外国の報道機関の作成した在職証明書等（引き続き派遣され、雇用され、又は契約により活動していることを証明する文書）",
      party: "organization",
      categories: HODO_CAT_2,
      level: "required",
      note: "在職証明書は、所属機関の名称、所在地及び電話番号が記載されているものに限る",
    },
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: HODO_CAT_2,
      level: "required",
      note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、最寄りの出入国在留管理官署に問い合わせる",
    },
    { ...hodoRegisteredEmployerProof, level: "check", note: HODO_FIRST_RENEWAL_NOTE },
    { ...hodoActivityDocuments, level: "check", note: `${HODO_FIRST_RENEWAL_NOTE}。${hodoActivityDocuments.note}` },
    {
      ...hodoOrganizationOverview,
      level: "check",
      note: `${HODO_FIRST_RENEWAL_NOTE}。案内ページには記載があるが、チェックシート（更新）にはないため要確認`,
      verify: true,
    },
  ],
};

// 在留資格「技能」。所属機関のカテゴリー（1〜4）は、技術・人文知識・国際業務と同じ区分で、書類もカテゴリーごとに異なる（Issue #298）。
// 案内ページは「調理師」と「調理師以外」の2ページに分かれ、書類の違いは職歴を証明する文書のみ（職種別）。案件情報に職種の入力欄がないため、職歴の証明は職種ごとに要確認（check）とし、注記に職種を示す。
// 職種の入力欄は、Issue #298 に提案として書く。提出書類は案内ページの本文による。チェックシート（認定・変更のカテゴリー3・4と、更新。変更のカテゴリー共通2点を含む）の○・△の位置は、案内ページと一致することを確認した（2026-10-18。照合表は docs/official/reconciliation/gino-change-2026-10-18.md。認定・更新は照合済み）。
// 研究の定義との共用: online_approval_proof・dispatch_documents・business_description・representative_declaration は研究の定義をそのまま使う（研究側を直すと技能も変わるため、tests/evaluateGino.test.ts で内容を固定している）。category_proof（受付印の注記を除く）と financial_statements（必須・注記のみ）は、技能のPDF・ページに合わせて上書きしている。源泉徴収の資料（withholding_*）は、納期の特例の名称を含め研究と同じ（G-1）。
// 申請書は様式N（認定・変更・更新とも）。取得は、技能の取得の規則集合（GINO_ACQUISITION。照合表は acquisition-ginou-chouri-2026-10-19.md・acquisition-gino-sonota-2026-10-19.md）が扱う。
const GINO = "技能";
const GINO_CHECKED_AT = "2026-10-12";
const GINO_SOURCES: RuleSource[] = [
  { title: "在留資格「技能」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/skilledlabor.html", kind: "page" },
  { title: "在留資格「技能」調理師としての活動の場合（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/skilledlabor01.html", kind: "page" },
  { title: "在留資格「技能」調理師以外の活動の場合（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/skilledlabor02.html", kind: "page" },
];
// 変更だけ、2026-10-18 に案内ページ（調理師・調理師以外）の原文と照合した（照合表は gino-change-2026-10-18.md）。認定・更新は今回の照合の対象外のため、日付を入れない。
// 総合のページ（skilledlabor.html）は原文を保存していないため、日付を入れない
const GINO_SOURCES_CHANGE: RuleSource[] = GINO_SOURCES.map((x) => (x.url.endsWith("skilledlabor.html") ? x : { ...x, comparedAt: "2026-10-18" }));
// 「特定技能」「技能実習」は、在留資格名に「技能」を含むが、別の在留資格
const GINO_EXCLUDE = ["特定技能", "技能実習"];

const ginoWorkContent: RequirementRule = {
  id: "work_content_document",
  name: "従事する業務の内容を証明する所属機関の文書",
  party: "organization",
  categories: ALL,
  level: "required",
};
const ginoResume: RequirementRule = {
  id: "skill_resume",
  name: "申請に係る技能を要する業務に従事した機関及び内容並びに期間を明示した履歴書",
  party: "applicant",
  categories: ALL,
  level: "required",
};
// 職歴を証明する文書（カテゴリー3・4）。職種によって異なるため、案件情報に職種の入力欄ができるまでは、職種ごとに要確認とする
const GINO_CAREER_NOTE = "職種によって提出する文書が異なる（案内ページの「職歴を証明する文書」）。該当する職種の場合のみ";
const ginoCareerRules: RequirementRule[] = [
  {
    id: "career_cook",
    name: "料理人（タイ料理人を除く）の職歴を証明する文書（在職証明書等）",
    party: "applicant",
    categories: ["3", "4"],
    level: "check",
    note: `${GINO_CAREER_NOTE}（調理師）。所属していた機関の在職証明書（機関の名称、所在地及び電話番号が記載されたもの）等で、技能を要する業務に従事した期間を証明する文書（外国の教育機関で当該業務に係る科目を専攻した期間を含む）。公的機関が発行する証明書がある場合はその写し（中華料理人は戸口簿及び職業資格証明書）`,
  },
  {
    id: "career_thai_cook",
    name: "タイ料理人の職歴・技能水準を証明する文書",
    party: "applicant",
    categories: ["3", "4"],
    level: "check",
    note: `${GINO_CAREER_NOTE}（タイ料理人）。タイ料理人として5年以上の実務経験を証明する文書（タイ労働省が発行するタイ料理人としての技能水準に関する証明書を取得するための要件を満たすために教育機関において教育を受けた期間を含む）、初級以上のタイ料理人としての技能水準に関する証明書、申請の直前1年間にタイでタイ料理人として妥当な報酬を受けていたことを証明する文書`,
  },
  {
    id: "career_special_skill",
    name: "外国特有の建築技術者等の職歴を証明する文書（在職証明書等）",
    party: "applicant",
    categories: ["3", "4"],
    level: "check",
    note: `${GINO_CAREER_NOTE}（外国特有の建築技術者、外国特有の製品製造者、動物の調教師、海底掘削・探査技術者、宝石・貴金属・毛皮加工技能者）。所属していた機関の在職証明書（機関の名称、所在地及び電話番号が記載されたもの）等で、技能を要する業務に従事した期間を証明する文書（外国の教育機関で当該業務に係る科目を専攻した期間を含む）`,
  },
  {
    id: "career_pilot",
    name: "パイロットの250時間以上の飛行経歴を証明する所属機関の文書",
    party: "applicant",
    categories: ["3", "4"],
    level: "check",
    note: `${GINO_CAREER_NOTE}（パイロット）`,
  },
  {
    id: "career_sports_instructor",
    name: "スポーツ指導者の実務経験及び国際競技会への出場を証明する文書",
    party: "applicant",
    categories: ["3", "4"],
    level: "check",
    note: `${GINO_CAREER_NOTE}（スポーツ指導者）。指導の実務に従事していたことを証明する文書（外国の教育機関で当該スポーツの指導に係る科目を専攻した期間及び報酬を受けて当該スポーツに従事していた期間を含む）と、選手としてオリンピック大会、世界選手権大会その他国際的な競技会に出場したことを証明する文書`,
  },
  {
    id: "career_sommelier",
    name: "ソムリエの実務経験及び国際ソムリエコンクールの成績又は資格を証明する文書",
    party: "applicant",
    categories: ["3", "4"],
    level: "check",
    note: `${GINO_CAREER_NOTE}（ソムリエ）。在職証明書でワイン鑑定等の実務経験を証明する文書（外国の教育機関でワイン鑑定等に係る科目を専攻した期間を含む）と、次の(ア)又は(イ)の資料（所持しない場合は(ウ)）：(ア)国際ソムリエコンクールで優秀な成績を収めたことを証明する文書、(イ)国際ソムリエコンクールで国の代表となったことを証明する文書（出場者が1国につき1名に制限されているものに限る）、(ウ)ワイン鑑定等に係る技能について、国又は地方公共団体等が認定する資格で法務大臣が告示で定めるものを有することを証明する文書`,
  },
];
const ginoActivityDocuments: RequirementRule = {
  id: "activity_documents",
  name: "活動内容等を明らかにする資料（労働条件を明示する文書、役員報酬を定める定款の写し等）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "労働契約の場合は、労働条件を明示する文書（労働基準法第15条第1項・同法施行規則第5条に基づき交付されるもの）。日本法人の役員に就任する場合は、役員報酬を定める定款の写し又は役員報酬を決議した株主総会の議事録の写し",
};
// 決算文書は、案内ページ・チェックシートとも、カテゴリー3・4の両方に必要（カテゴリー3は源泉徴収の理由書類のみ不要）
// 研究の決算文書の判断（#333 K-2〜K-4）は技能に及ばない。技能のPDF・ページには「転勤の場合に限る」が無く、カテゴリー3・4とも必要（変更の照合で確認）。そのため、研究の「要確認＋verify」を外して必須にしている。
const ginoFinancialStatements: RequirementRule = {
  ...kenkyuFinancialStatements,
  categories: ["3", "4"],
  level: "required",
  note: "新規事業の場合は事業計画書",
  verify: undefined,
};
const ginoCategoryProof: RequirementRule = { ...kenkyuCategoryProof, note: kenkyuCategoryProof.note?.replace("。チェックシートでは、変更・更新に「受付印のあるものの写し」とある", "") };
// 源泉徴収の資料は、研究と同じ（納期の特例の名称は、ページ・PDFの原文に合わせたもの。#333 K-7・G-1）
const ginoWithholdingRules: RequirementRule[] = kenkyuWithholdingRules;

export const GINO_COE: RuleSet = {
  id: "gino_coe",
  title: "技能 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: GINO,
  excludeStatuses: GINO_EXCLUDE,
  checkedAt: GINO_CHECKED_AT,
  sources: GINO_SOURCES,
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    ginoCategoryProof,
    kenkyuOnlineApproval,
    ginoWorkContent,
    ginoResume,
    kenkyuDispatch,
    ...ginoCareerRules,
    ginoActivityDocuments,
    kenkyuBusinessMaterials,
    ginoFinancialStatements,
    kenkyuRepresentativeDeclaration,
    ...ginoWithholdingRules,
  ],
};

export const GINO_CHANGE: RuleSet = {
  id: "gino_change",
  title: "技能 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: GINO,
  excludeStatuses: GINO_EXCLUDE,
  checkedAt: GINO_CHECKED_AT,
  sources: GINO_SOURCES_CHANGE,
  rules: [
    ...procedureCommonRules("change"),
    ginoCategoryProof,
    kenkyuOnlineApproval,
    ginoWorkContent,
    ginoResume,
    kenkyuDispatch,
    ...ginoCareerRules,
    ginoActivityDocuments,
    kenkyuBusinessMaterials,
    ginoFinancialStatements,
    kenkyuRepresentativeDeclaration,
    ...ginoWithholdingRules,
  ],
};

// 更新は、案内ページの「転職後の初回の更新申請」の資料（活動内容・事業内容・決算文書・源泉徴収の理由書類）を、カテゴリー3・4の要確認とする。
// カテゴリー3は、案内ページの「提出書類11（源泉徴収の理由書類）は不要」により、源泉徴収の資料が不要（カテゴリー4のみ）。
const GINO_FIRST_RENEWAL_NOTE = "転職後、初回の更新許可申請の場合のみ";
export const GINO_RENEWAL: RuleSet = {
  id: "gino_renewal",
  title: "技能 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: GINO,
  excludeStatuses: GINO_EXCLUDE,
  checkedAt: GINO_CHECKED_AT,
  sources: GINO_SOURCES,
  rules: [
    ...procedureCommonRules("renewal"),
    ginoCategoryProof,
    kenkyuOnlineApproval,
    kenkyuDispatch,
    kenkyuRepresentativeDeclaration,
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: ["3", "4"],
      level: "required",
      note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）",
    },
    { ...ginoActivityDocuments, level: "check", note: GINO_FIRST_RENEWAL_NOTE },
    { ...kenkyuBusinessMaterials, level: "check", note: GINO_FIRST_RENEWAL_NOTE },
    { ...ginoFinancialStatements, level: "check", note: `${GINO_FIRST_RENEWAL_NOTE}。新規事業の場合は事業計画書` },
    ...ginoWithholdingRules.map((r) => ({
      ...r,
      level: "check" as const,
      note: r.note ? `${GINO_FIRST_RENEWAL_NOTE}。${r.note}` : GINO_FIRST_RENEWAL_NOTE,
    })),
  ],
};

/**
 * 医療・技能・介護の在留資格取得許可申請（Issue #420。照合表は docs/official/reconciliation/ の
 * acquisition-iryou-2026-10-19.md〔#425〕・acquisition-ginou-chouri-2026-10-19.md と acquisition-gino-sonota-2026-10-19.md〔#430〕・acquisition-kaigo-2026-10-19.md〔#428〕）。
 * 人の判断「推奨のとおり」（2026-10-19）の全ての R を反映した専用の規則集合。技人国の取得（GIJINKOKU_ACQUISITION）と同じく、在留資格を問わない ACQUISITION_BY_CAUSE より先に照合する。
 * ACQUISITION_BY_CAUSE の文言・checkedAt・出典は変えない（README 2-2章）。`checkedAt` は新しい規則集合の作成日。
 */
const ACQUISITION_SET2_COMPARED_AT = "2026-10-19";
// 事由別の書類（3つの照合表で共通）。技人国の取得と同じ扱いにする：
// 出生の3書類を外し、出生は「その事由を証する書類」で扱う（医療 R-4・技能 R-2・介護 R-2）。注記は GIJINKOKU_ACQUISITION_CAUSE_PROOF_NOTE で、日米地位協定の例は外す（医療 R-6・技能 R-4・介護 R-4）。
// 写真は「写真（40mm×30mm）」を全事由の必須にし、注記は年齢の注記のみ（中長期在留者の注記は書かない。医療 R-5・技能 R-3・介護 R-3）。
// 活動に応じた資料は外す（各資格の書類群がこれに当たる。医療 R-7・技能 R-5・介護 R-5）。申請取次者の書類の注記は原文のとおり（医療 R-8・技能 R-6・介護 R-6）。
// 旅券の理由書は原文に無いため外す（医療 R-9・技能 R-7・介護 R-7）
const acquisitionSet2CauseRules: RequirementRule[] = ACQUISITION_BY_CAUSE.rules
  .filter((r) => !GIJINKOKU_ACQUISITION_REMOVED_IDS.includes(r.id))
  .map((r) => (GIJINKOKU_ACQUISITION_OVERRIDES[r.id] ? { ...r, ...GIJINKOKU_ACQUISITION_OVERRIDES[r.id] } : r));

// 医療（R-1〜R-10）。取得でも、申請人の区分（カテゴリー1＝医師・歯科医師、カテゴリー2＝医師・歯科医師以外）で提出書類が異なる（medicalservices_2026-10-18.txt 131〜133行）。
// 判定の軸を、取得の事由と申請人の区分の2つにする（R-1。alsoBasis）。区分が未選択の間は、区分に共通の書類だけを出す（技人国の取得のカテゴリーと同じ挙動）。
// 資格の文書（R-2）・勤務する機関の概要（R-3。両区分の要確認。iryo-2026-10-18.md の M-1 と同じ）は、取得の節（147〜161行）が変更の節と一字一句同じため、認定・変更と共有の定義をそのまま使う。
// 所属機関のカテゴリー（1〜4）は使わない（alsoBasis に category は付けない）。出典の医療のページは IRYO_SOURCE を書き換えず、取得の節の照合日を入れた写しを置く（R-10）
export const IRYO_ACQUISITION: RuleSet = {
  id: "iryo_acquisition",
  title: "医療 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: IRYO,
  basis: "acquisitionCause",
  alsoBasis: ["applicantType"],
  checkedAt: ACQUISITION_SET2_COMPARED_AT,
  sources: [{ ...IRYO_SOURCE, comparedAt: ACQUISITION_SET2_COMPARED_AT }, ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: [...acquisitionSet2CauseRules, iryoDoctorLicense, iryoOtherLicense, iryoFacilityOverview],
};

// 技能（調理師 R-1〜R-9・調理師以外 R-1〜R-8。同じ規則集合のため、両方の判断をそろえて反映した）。取得でも、所属機関のカテゴリー（1〜4）で提出書類が異なる（R-1。alsoBasis）。
// カテゴリー別の書類は、取得の節と同じ文言の変更の節の規則（GINO_CHANGE から procedureCommonRules を除いたもの）を、割り当て・区分・注記を変えずに写す。返信用封筒は写さない。
// 取得のチェックシートは無く、取得の原文のコピーには表の列の位置が無いため、列の位置（カテゴリーの割り当て）が変更と同じことは「変更の節と同文」を根拠とし、未確認とする。
// 職歴を証明する文書は、職種の入力欄が無いため、変更と同じく職種ごとの6行を要確認で写す（調理師 R-8。調理師の2行は調理師以外のページに無いが、在留資格が1つのため残す）。
// 出典（調理師 R-9・調理師以外 R-8）：調理師・調理師以外のページは、取得の節の照合日を入れる。総合のページ（skilledlabor.html）は原文を保存していないため日付を入れない
export const GINO_ACQUISITION: RuleSet = {
  id: "gino_acquisition",
  title: "技能 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: GINO,
  excludeStatuses: GINO_EXCLUDE,
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  checkedAt: ACQUISITION_SET2_COMPARED_AT,
  sources: [
    ...GINO_SOURCES.map((x) => (x.url.endsWith("skilledlabor.html") ? x : { ...x, comparedAt: ACQUISITION_SET2_COMPARED_AT })),
    ACQUISITION_PROCEDURE_GUIDE_SOURCE,
    ...ACQUISITION_BY_CAUSE.sources,
  ],
  rules: [
    ...acquisitionSet2CauseRules,
    ginoCategoryProof,
    kenkyuOnlineApproval,
    ginoWorkContent,
    ginoResume,
    kenkyuDispatch,
    ...ginoCareerRules,
    ginoActivityDocuments,
    kenkyuBusinessMaterials,
    ginoFinancialStatements,
    kenkyuRepresentativeDeclaration,
    ...ginoWithholdingRules,
  ],
};

// 介護（R-1〜R-8）。カテゴリーによる区分は無く、判定は取得の事由だけ（alsoBasis は付けない）。
// 介護の書類群（R-1）は、取得の節（nursingcare_2026-10-18.txt 138〜147行）が変更の節と同じ文言・並びのため、KAIGO_CHANGE の6書類を同じ名称・区分・注記で、
// categories の代わりに causes: ALL_CAUSES（全事由）にして載せる。「特定技能（介護）」と区別するため、認定・変更・更新と同じ除外を付ける。
// 出典は KAIGO_SOURCE を書き換えず、取得の節の照合日を入れた写しを置く（R-8）
const kaigoAcquisitionRule = (r: RequirementRule): RequirementRule => {
  const rule: RequirementRule = { ...r, causes: ALL_CAUSES };
  delete rule.categories;
  return rule;
};
export const KAIGO_ACQUISITION: RuleSet = {
  id: "kaigo_acquisition",
  title: "介護 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: KAIGO,
  excludeStatuses: ["特定技能"],
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET2_COMPARED_AT,
  sources: [{ ...KAIGO_SOURCE, comparedAt: ACQUISITION_SET2_COMPARED_AT }, ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: [
    ...acquisitionSet2CauseRules,
    ...[
      kaigoRegistration,
      kaigoWorkingConditions,
      kaigoDispatch,
      kaigoOrganizationOverview,
      kaigoRepresentativeDeclaration,
      kaigoSkillTransferDeclaration,
    ].map(kaigoAcquisitionRule),
  ],
};

// 在留資格「企業内転勤」。所属機関のカテゴリーは、技術・人文知識・国際業務と同じ1〜4区分（CATEGORY_LABELS）。
// 提出書類は、案内ページと、認定・変更・更新のチェックシート（PDF）の表（○の位置まで）による。2026-10-12 に照合済み（Issue #295）。
// 案内ページの原文とPDF7点を照合済み（2026-10-18。docs/official/reconciliation/kigyonai-2026-10-18.md。Issue #333・#373）。名称は原文に合わせた（E-1〜E-3）。
// 案内ページとチェックシートの食い違いはなかったため、要確認（verify）の項目はない。
// 「在留資格『企業内転勤』の提出書類の変更について（令和8年4月1日運用開始）」（001457117.pdf）は、認定・変更の表2の9から「(3)登記事項証明書」を削除した（取り消し線）。10の登記事項証明書は引き続き必要で、提出する書類の範囲は変わらない。
// 申請書は様式L（認定・変更・更新とも）。取得は KIGYONAI_ACQUISITION（原文の取得の節に照合済み、2026-10-19。docs/official/reconciliation/acquisition-kigyounai-tenkin-2026-10-19.md）。
const KIGYONAI = "企業内転勤";
const KIGYONAI_CHECKED_AT = "2026-10-12";
const KIGYONAI_PAGE_SOURCE: RuleSource = { title: "在留資格「企業内転勤」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/intracompanytransfee.html", kind: "page", comparedAt: "2026-10-18" };

const kigyonaiCategoryProof: RequirementRule = {
  id: "category_proof",
  name: "所属機関がいずれのカテゴリーに該当するかを証明する文書",
  party: "organization",
  categories: ["1", "2", "3"],
  level: "required",
  note: "カテゴリー1：四季報の写し又は日本の証券取引所に上場していることを証明する文書（写し）／主務官庁から設立の許可を受けたことを証明する文書（写し）／イノベーション創出企業であることを証明する文書（例：補助金交付決定通知書の写し）／「一定の条件を満たす企業等」であることを証明する文書（例：認定証等の写し）のうち、提出可能なもの／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。カテゴリー2は、オンライン利用申出の承認を受けている場合はその承認を示す文書。提出可能な書類がなければカテゴリー4となる",
};
const kigyonaiOnlineApproval: RequirementRule = {
  id: "online_approval_proof",
  name: "在留申請オンラインシステムの利用申出の承認を証明する文書（承認のお知らせメール等）",
  party: "organization",
  categories: ["2"],
  level: "check",
  note: "カテゴリー2と同様の添付資料での申請を希望し、利用申出が承認された機関の場合のみ",
};
// 認定・変更：カテゴリー3・4（チェックシートの表2、5〜12）
const kigyonaiActivityDocuments: RequirementRule = {
  id: "activity_documents",
  name: "申請人の活動の内容等を明らかにする資料（活動内容、期間、地位及び報酬を含む。次のいずれか）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "(1)法人を異にしない転勤の場合：転勤命令書の写し・辞令等の写し／(2)法人を異にする転勤の場合：労働基準法第15条第1項・同法施行規則第5条に基づき交付される労働条件を明示する文書／(3)役員等労働者に該当しない者：会社の場合は役員報酬を定める定款の写し又は役員報酬を決議した株主総会の議事録（報酬委員会が設置されている会社は同委員会の議事録）の写し、会社以外の団体の場合は地位（担当業務）、期間及び支払われる報酬額を明らかにする所属団体の文書",
};
const kigyonaiWorkplaceRelation: RequirementRule = {
  id: "workplace_relation_documents",
  name: "転勤前に勤務していた事業所と転勤後の事業所の関係を示す資料（次のいずれか）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "(1)同一の法人内の転勤の場合：外国法人の支店の登記事項証明書等、当該法人が日本に事業所を有することを明らかにする資料／(2)日本法人への出向の場合：当該日本法人と出向元の外国法人との出資関係を明らかにする資料／(3)日本に事務所を有する外国法人への出向の場合：当該外国法人の支店の登記事項証明書等（日本に事務所を有することを明らかにする資料）と、当該外国法人と出向元の法人との資本関係を明らかにする資料",
};
const kigyonaiPreviousWorkplace: RequirementRule = {
  id: "previous_workplace_existence",
  name: "転勤前に勤務していた事業所の存在を明らかにする資料（次のいずれか）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "(1)公的機関から発行された法人登記に関する資料／(2)納税状況、取引実績、船荷証券、輸出入許可書、広告等",
};
const kigyonaiCareerDocuments: RequirementRule = {
  id: "career_documents",
  name: "申請人の経歴を証明する文書",
  party: "applicant",
  categories: ["3", "4"],
  level: "required",
  note: "(1)関連する業務に従事した機関及び内容並びに期間を明示した履歴書／(2)過去1年間に従事した業務内容及び地位、報酬を明示した、転勤の直前に勤務した外国の機関の文書（社会保険加入証明、戸口簿等）。転勤の直前1年以内に企業内転勤の在留資格で本邦に在留していた期間がある場合は、その期間に勤務していた本邦の機関を含む",
};
const kigyonaiBusinessDescription: RequirementRule = {
  id: "business_description",
  name: "事業内容を明らかにする資料（会社案内等）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が詳細に記載された案内書、又はこれに準ずる勤務先等の作成した文書のいずれか",
};
const kigyonaiRegistryCertificate: RequirementRule = {
  id: "registry_certificate",
  name: "登記事項証明書",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "商業・法人登記",
};
const kigyonaiWorkplaceExistence: RequirementRule = {
  id: "workplace_existence",
  name: "申請人が活動する事業所の存在を明らかにする資料（不動産登記簿、事務所の写真・平面図等）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
};
const kigyonaiFinancialStatements: RequirementRule = {
  id: "financial_statements",
  name: "直近年度の決算文書の写し",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "新規事業の場合は事業計画書",
};
// カテゴリー4：前年分の法定調書合計表を提出できない理由を明らかにする資料（表2の13）
const kigyonaiWithholdingRules: RequirementRule[] = [
  {
    id: "withholding_exemption_certificate",
    name: "外国法人の源泉徴収に対する免除証明書その他の源泉徴収を要しないことを明らかにする資料",
    party: "organization",
    categories: ["4"],
    level: "check",
    note: "源泉徴収の免除を受ける機関の場合のみ。この場合は、下の給与支払事務所等の開設届出書等は不要",
  },
  { id: "payroll_office_notification", name: "給与支払事務所等の開設届出書の写し", party: "organization", categories: ["4"], level: "required" },
  { id: "withholding_tax_receipts", name: "直近3か月分の所得税徴収高計算書の写し（領収日付印のあるもの）", party: "organization", categories: ["4"], level: "required" },
  {
    id: "withholding_special_approval",
    name: "源泉所得税の納期の特例の承認を受けていることを明らかにする資料",
    party: "organization",
    categories: ["4"],
    level: "required",
    when: "withholdingSpecial",
    note: "納期の特例の承認を受けている場合",
  },
];
// 認定・変更の、カテゴリー別の書類（チェックシートの番号順）
const kigyonaiCategoryRules: RequirementRule[] = [
  kigyonaiCategoryProof,
  kigyonaiOnlineApproval,
  kigyonaiActivityDocuments,
  kigyonaiWorkplaceRelation,
  kigyonaiPreviousWorkplace,
  kigyonaiCareerDocuments,
  kigyonaiBusinessDescription,
  kigyonaiRegistryCertificate,
  kigyonaiWorkplaceExistence,
  kigyonaiFinancialStatements,
  ...kigyonaiWithholdingRules,
];

export const KIGYONAI_COE: RuleSet = {
  id: "kigyonai_coe",
  title: "企業内転勤 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: KIGYONAI,
  checkedAt: KIGYONAI_CHECKED_AT,
  sources: [
    KIGYONAI_PAGE_SOURCE,
    { title: "「企業内転勤」に係る提出書類一覧（在留資格認定証明書交付申請用・カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404133.pdf", kind: "pdf", comparedAt: "2026-10-18" },
    { title: "「企業内転勤」に係る提出書類一覧（在留資格認定証明書交付申請用・カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001366542.pdf", kind: "pdf", comparedAt: "2026-10-18" },
    { title: "「企業内転勤」に係る提出書類の変更について（令和8年4月1日運用開始）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001457117.pdf", kind: "pdf", comparedAt: "2026-10-18" },
  ],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    ...kigyonaiCategoryRules,
  ],
};

export const KIGYONAI_CHANGE: RuleSet = {
  id: "kigyonai_change",
  title: "企業内転勤 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: KIGYONAI,
  checkedAt: KIGYONAI_CHECKED_AT,
  sources: [
    KIGYONAI_PAGE_SOURCE,
    { title: "「企業内転勤」に係る提出書類一覧（在留資格変更許可申請用・カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001366563.pdf", kind: "pdf", comparedAt: "2026-10-18" },
    { title: "「企業内転勤」に係る提出書類一覧（在留資格変更許可申請用・カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001366564.pdf", kind: "pdf", comparedAt: "2026-10-18" },
    { title: "「企業内転勤」に係る提出書類の変更について（令和8年4月1日運用開始）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001457117.pdf", kind: "pdf", comparedAt: "2026-10-18" },
  ],
  rules: [...procedureCommonRules("change"), ...kigyonaiCategoryRules],
};

export const KIGYONAI_RENEWAL: RuleSet = {
  id: "kigyonai_renewal",
  title: "企業内転勤 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: KIGYONAI,
  checkedAt: KIGYONAI_CHECKED_AT,
  sources: [
    KIGYONAI_PAGE_SOURCE,
    { title: "「企業内転勤」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001366562.pdf", kind: "pdf", comparedAt: "2026-10-18" },
    { title: "「企業内転勤」に係る提出書類の変更について（令和8年4月1日運用開始）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001457117.pdf", kind: "pdf", comparedAt: "2026-10-18" },
  ],
  rules: [
    ...procedureCommonRules("renewal"),
    kigyonaiCategoryProof,
    kigyonaiOnlineApproval,
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: ["3", "4"],
      level: "required",
      note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、最寄りの出入国在留管理官署に問い合わせる。提出できない場合は、給与について申告済みであることを明らかにする資料を提出する",
    },
  ],
};

/**
 * 経営・管理／研究／企業内転勤の在留資格取得許可申請（Issue #420。照合表は docs/official/reconciliation/ の
 * acquisition-keiei-kanri-2026-10-19.md（#423）・acquisition-kenkyu-2026-10-19.md（#426）・acquisition-kigyounai-tenkin-2026-10-19.md（#427））。
 * 各ページの取得の節（原文の控え）と照合済み（2026-10-19）。人の判断「推奨のとおり」（2026-10-19）で、経営・管理 R-1〜R-10、研究 R-1〜R-13、企業内転勤 R-1〜R-8 を反映した専用の規則集合。
 * 事由別の書類は、技人国の取得（GIJINKOKU_ACQUISITION）と同じく ACQUISITION_BY_CAUSE から引き継ぎ、同じ上書き・削除をする
 * （R-2 出生の3書類を外し、出生を cause_proof の対象に／R-3 写真「写真（40mm×30mm）」を全事由の必須、注記は年齢のみ／R-4 日米地位協定の例を外す／
 * R-5 activity_materials を外す／R-6 申請取次者の注記を原文のとおり／R-7 旅券の理由書を外す）。ACQUISITION_BY_CAUSE の文言は変えない。
 * カテゴリー別の書類（R-1）は、各在留資格の変更の規則集合（チェックシートで照合済み）の書類を、同じ割り当てで写す（取得の節の書類の部分は、変更の節と同じ文言のため）。
 * 取得のチェックシートは無く、取得の列の位置そのものは未確認。判定の軸は、取得の事由と所属機関のカテゴリー（alsoBasis）。カテゴリーが未選択の間は、共通の書類だけを出す。
 * `checkedAt` は新しい規則集合の作成日。ACQUISITION_BY_CAUSE より先に照合する（RULE_SETS の並び順）。
 */
const ACQ_SET1_COMPARED_AT = "2026-10-19";
const ACQ_SET1_CHECKED_AT = "2026-10-19";
// 事由別の書類（R-2〜R-7）。技人国の取得と同じ削除・上書き
const acqSet1CauseRules: RequirementRule[] = ACQUISITION_BY_CAUSE.rules
  .filter((r) => !GIJINKOKU_ACQUISITION_REMOVED_IDS.includes(r.id))
  .map((r) => (GIJINKOKU_ACQUISITION_OVERRIDES[r.id] ? { ...r, ...GIJINKOKU_ACQUISITION_OVERRIDES[r.id] } : r));
// 出典（経営・管理 R-10・研究 R-13・企業内転勤 R-8）：各ページ（取得の節。2026-10-19 に照合）・手続案内・申請書様式（記載事項は未照合のため日付なし）
const acqSet1Sources = (status: string, url: string): RuleSource[] => [
  { title: `在留資格「${status}」在留資格取得許可申請（出入国在留管理庁）`, url, kind: "page", comparedAt: ACQ_SET1_COMPARED_AT },
  ACQUISITION_PROCEDURE_GUIDE_SOURCE,
  ...ACQUISITION_BY_CAUSE.sources,
];
const acqSet1CopyRules = (from: RuleSet, ids: string[]): RequirementRule[] =>
  ids.map((id) => {
    const rule = from.rules.find((r) => r.id === id);
    if (!rule) throw new Error(`${from.id} に規則 ${id} がない`);
    return rule;
  });

// 経営・管理（R-1）：KEIEI_KANRI_CHANGE のカテゴリー別の書類12件を、同じ割り当てで写す。返信用封筒・本邦事業所の設置の委託は認定のみのため写さない。
// R-9：改正概要による注記（KEIEI_NOTE_*）は、そのまま引き継ぐ
const KEIEI_KANRI_ACQUISITION_CATEGORY_IDS = [
  "category_proof",
  "activity_documents",
  "business_plan",
  "business_description",
  "financial_statements",
  "business_licenses",
  "office_facility_documents",
  "business_scale_documents",
  "japanese_ability",
  "career_documents",
  "representative_declaration",
  "statutory_report_unavailable_reason",
];
// R-8：取得では、活動内容の資料の名称の括弧内を原文（businessmanager_2026-10-18.txt 363行「外国法人内の日本支店に転勤する場合及び会社以外の団体の役員に就任する場合」）に合わせる。
// 認定・変更の同じ定数（KEIEI_ACTIVITY_NAME）は変えない（別件で判断）
const KEIEI_ACQUISITION_ACTIVITY_NAME = "申請人の活動の内容等を明らかにする資料（役員就任、外国法人内の日本支店への転勤・会社以外の団体の役員就任、管理者としての雇用のいずれか）";
const KEIEI_KANRI_ACQUISITION_CATEGORY_OVERRIDES: Record<string, Partial<RequirementRule>> = {
  activity_documents: { name: KEIEI_ACQUISITION_ACTIVITY_NAME },
};
export const KEIEI_KANRI_ACQUISITION: RuleSet = {
  id: "keiei_kanri_acquisition",
  title: "経営・管理 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: KEIEI_KANRI,
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  checkedAt: ACQ_SET1_CHECKED_AT,
  sources: acqSet1Sources(KEIEI_KANRI, KEIEI_KANRI_SOURCE.url),
  rules: [
    ...acqSet1CauseRules,
    ...acqSet1CopyRules(KEIEI_KANRI_CHANGE, KEIEI_KANRI_ACQUISITION_CATEGORY_IDS).map((r) =>
      KEIEI_KANRI_ACQUISITION_CATEGORY_OVERRIDES[r.id] ? { ...r, ...KEIEI_KANRI_ACQUISITION_CATEGORY_OVERRIDES[r.id] } : r,
    ),
  ],
};

// 研究（R-1）：KENKYU_CHANGE のカテゴリー別の書類を、同じ割り当てで写す。返信用封筒は認定のみのため写さない。
// R-8：提出書類省略に関する説明書（omission_statement）は、変更の節にだけあり取得の節に無いため写さない
// R-9：カテゴリーの証明の注記から、変更・更新のチェックシートの「受付印」の1文を外す
const kenkyuAcquisitionCategoryProof: RequirementRule = {
  ...kenkyuCategoryProof,
  note: kenkyuCategoryProof.note?.replace("。チェックシートでは、変更・更新に「受付印のあるものの写し」とある", ""),
};
// R-10：取得の申請書は1種類（researcher_2026-10-18.txt 327〜330行）のため「申請書は様式L」を外し、条件は原文（365行）のとおりにする
const kenkyuAcquisitionTransferDocuments: RequirementRule = {
  ...kenkyuTransferDocuments,
  note: "基準省令ただし書きの適用を受ける者（転勤）の場合のみ。過去1年間の業務内容・地位・報酬を明示した転勤直前の機関の文書と、支店の登記事項証明書又は出資・資本関係を明らかにする資料",
};
// R-11：カテゴリー4は要確認のまま（K-2 の判断）。注記から変更のチェックシートの記号を外し、取得のチェックシートが無いことを書く
const kenkyuAcquisitionFinancialStatements: RequirementRule = {
  ...kenkyuFinancialStatements,
  note: "新規事業の場合は事業計画書。取得の案内ページの読み方は、カテゴリー4は必要（カテゴリー3のみ「転勤して研究を行う業務に従事する場合に限る」）。取得のチェックシートは無い。認定・変更のチェックシートでは行全体（カテゴリー3・4）に転勤の条件が付くため要確認",
};
export const KENKYU_ACQUISITION: RuleSet = {
  id: "kenkyu_acquisition",
  title: "研究 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: KENKYU,
  // R-12：「特定活動（研究活動等）」の取得には出さない
  excludeStatuses: KENKYU_EXCLUDE,
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  checkedAt: ACQ_SET1_CHECKED_AT,
  sources: acqSet1Sources(KENKYU, KENKYU_SOURCE.url),
  rules: [
    ...acqSet1CauseRules,
    kenkyuAcquisitionCategoryProof,
    kenkyuOnlineApproval,
    kenkyuDispatch,
    kenkyuActivityDocuments,
    kenkyuCareerDocuments,
    kenkyuAcquisitionTransferDocuments,
    kenkyuBusinessMaterials,
    kenkyuAcquisitionFinancialStatements,
    kenkyuFinancialStatementsCat3,
    kenkyuRepresentativeDeclaration,
    ...kenkyuWithholdingRules,
  ],
};

// 企業内転勤（R-1）：取得の 38〜86行は変更の節と1行ずつ同じ文言のため、KIGYONAI_CHANGE の kigyonaiCategoryRules を、名称・注記・割り当て・区分のまま写す。
// R-8：ページの URL は KIGYONAI_PAGE_SOURCE と同じ intracompanytransfee.html（人が 2026-10-19 に確認した）
export const KIGYONAI_ACQUISITION: RuleSet = {
  id: "kigyonai_acquisition",
  title: "企業内転勤 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: KIGYONAI,
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  checkedAt: ACQ_SET1_CHECKED_AT,
  sources: acqSet1Sources(KIGYONAI, KIGYONAI_PAGE_SOURCE.url),
  rules: [...acqSet1CauseRules, ...kigyonaiCategoryRules],
};

// 在留資格「特定活動」のうち、特定研究等活動（告示36号）の本人（種別 tokuteiKenkyu。Issue #299）。カテゴリー区分はなく、すべての書類がどのカテゴリーでも同じ。
// 提出書類は、入管庁の案内ページ（designatedactivities07）の原文による（2026-10-12 に原文を確認。認定・変更・更新のチェックシートは案内ページに掲載がなく、照合していない）。逐語の原文（docs/official/designatedactivities11_2026-10-18.txt）との照合も済み、チェックシートの掲載がないことも確認した（2026-10-18。照合表は docs/official/reconciliation/tokutei-katsudo-2026-10-18.md、Issue #333）。逐語の原文（docs/official/designatedactivities07_2026-10-18.txt）との照合も済み、チェックシートの掲載がないことも確認した（2026-10-18。照合表は docs/official/reconciliation/tokutei-katsudo-2026-10-18.md、Issue #333）。
// 範囲外：特定研究等活動の家族は種別「その他」。取得は TOKUTEI_KENKYU_ACQUISITION（原文の取得の節に照合済み、2026-10-19）。申請書は様式N（認定・変更・更新とも）。
const TOKUTEI_KENKYU_STATUS = "特定活動";
const TOKUTEI_KENKYU_CHECKED_AT = "2026-10-12";
const TOKUTEI_KENKYU_PAGE_SOURCE: RuleSource = { title: "在留資格「特定活動」（特定研究等活動）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/designatedactivities07.html", kind: "page", comparedAt: "2026-10-18" };

const tokuteiKenkyuOrganizationRules: RequirementRule[] = [
  {
    id: "organization_brochure",
    name: "申請人と契約を結んだ本邦の機関の概要及び事業活動を明らかにする資料：案内書（パンフレット等）",
    party: "organization",
    categories: ALL,
    level: "required",
    note: "申請人が研究、研究の指導又は教育と関連する事業を自ら経営する活動を行う場合も、案内書・登記事項証明書・これらに準ずる文書を提出する",
  },
  { id: "registry_certificate", name: "登記事項証明書", party: "organization", categories: ALL, level: "required", note: "商業・法人登記" },
  {
    id: "organization_equivalent_documents",
    name: "上記の案内書及び登記事項証明書に準ずる文書",
    party: "organization",
    categories: ALL,
    level: "check",
    note: "適宜。案内書・登記事項証明書だけでは機関の概要・事業活動が明らかにならない場合に提出する",
  },
  {
    id: "foreign_staff_list",
    name: "外国人社員リスト",
    party: "organization",
    categories: ALL,
    level: "required",
    note: "国籍・氏名・性別・生年月日・入社年月日・在留資格・在留期間・在留期間満了日・職務内容を含んだもの",
  },
  {
    id: "consent_form",
    name: "同意書",
    party: "organization",
    categories: ALL,
    level: "required",
    note: "用紙は地方出入国在留管理官署に用意されている",
  },
];
const tokuteiKenkyuActivityDocuments: RequirementRule = {
  id: "activity_documents",
  name: "活動の内容、期間、地位及び報酬を証する文書（次のいずれか）",
  party: "organization",
  categories: ALL,
  level: "required",
  note: "(1)受入れ機関（本邦の機関）との雇用契約書の写し／(2)辞令の写し／(3)採用通知書の写し／(4)上記(1)〜(3)に準ずる文書",
};
const tokuteiKenkyuCareerDocuments: RequirementRule = {
  id: "career_documents",
  name: "卒業証明書及び職歴その他経歴を証する文書",
  party: "applicant",
  categories: ALL,
  level: "required",
  note: "卒業証明書、在職証明書、履歴書（各1通）",
};
const tokuteiKenkyuResidentTax: RequirementRule = {
  id: "resident_tax_certificates",
  name: "住民税の課税（又は非課税）証明書及び納税証明書",
  party: "applicant",
  categories: ALL,
  level: "required",
  note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、最寄りの出入国在留管理官署に問い合わせる",
};

export const TOKUTEI_KENKYU_COE: RuleSet = {
  id: "tokutei_kenkyu_coe",
  title: "特定活動（特定研究等活動） 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: TOKUTEI_KENKYU_STATUS,
  subtype: "tokuteiKenkyu",
  checkedAt: TOKUTEI_KENKYU_CHECKED_AT,
  sources: [TOKUTEI_KENKYU_PAGE_SOURCE],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    ...tokuteiKenkyuOrganizationRules,
    tokuteiKenkyuActivityDocuments,
    tokuteiKenkyuCareerDocuments,
  ],
};

export const TOKUTEI_KENKYU_CHANGE: RuleSet = {
  id: "tokutei_kenkyu_change",
  title: "特定活動（特定研究等活動） 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: TOKUTEI_KENKYU_STATUS,
  subtype: "tokuteiKenkyu",
  checkedAt: TOKUTEI_KENKYU_CHECKED_AT,
  sources: [TOKUTEI_KENKYU_PAGE_SOURCE],
  rules: [
    ...procedureCommonRules("change"),
    ...tokuteiKenkyuOrganizationRules,
    tokuteiKenkyuActivityDocuments,
    tokuteiKenkyuCareerDocuments,
    {
      id: "resignation_certificate",
      name: "前雇用先機関が作成した退職証明書（退職日を明記したもの）",
      party: "applicant",
      categories: ALL,
      level: "check",
      note: "転職した場合のみ",
    },
    { ...tokuteiKenkyuResidentTax, level: "check", note: `転職した場合のみ。${tokuteiKenkyuResidentTax.note}` },
  ],
};

export const TOKUTEI_KENKYU_RENEWAL: RuleSet = {
  id: "tokutei_kenkyu_renewal",
  title: "特定活動（特定研究等活動） 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: TOKUTEI_KENKYU_STATUS,
  subtype: "tokuteiKenkyu",
  checkedAt: TOKUTEI_KENKYU_CHECKED_AT,
  sources: [TOKUTEI_KENKYU_PAGE_SOURCE],
  rules: [
    ...procedureCommonRules("renewal"),
    tokuteiKenkyuActivityDocuments,
    tokuteiKenkyuResidentTax,
    {
      id: "profit_loss_statement",
      name: "研究、研究の指導又は教育と関連する事業に係る事業所の損益計算書の写し",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "「特定研究等活動」で、研究、研究の指導又は教育と関連する事業を自ら経営する活動を行っている場合のみ（1通）。入管庁の案内ページでは「その他（転職した場合）」の項に記載されている",
    },
  ],
};

// 在留資格「特定活動」のうち、本邦大学等卒業者（告示46号）の本人（種別 daigakuSotsugyo。Issue #300）。カテゴリー区分はなく、すべての書類がどのカテゴリーでも同じ。
// 提出書類は、入管庁の案内ページ（designatedactivities11）の「本邦大学等卒業者の場合に必要な書類」の列の原文による（2026-10-12 に原文を確認。認定・変更・更新のチェックシートは案内ページに掲載がなく、照合していない）。
// 告示の番号は、案内ページ・様式Nの注記とも「告示46号」（Issue #300 の依頼文の「44号」「45号」とは異なる）。
// 範囲外：本邦大学等卒業者の家族（案内ページの家族の列）は種別「その他」（取得も対象外で、ACQUISITION_BY_CAUSE のまま）。本人の取得は DAIGAKU_SOTSUGYO_ACQUISITION（原文の取得の節に照合済み、2026-10-19）。申請書は様式N（認定・変更・更新とも）。
const DAIGAKU_SOTSUGYO_STATUS = "特定活動";
const DAIGAKU_SOTSUGYO_CHECKED_AT = "2026-10-12";
const DAIGAKU_SOTSUGYO_PAGE_SOURCE: RuleSource = { title: "在留資格「特定活動」（本邦大学等卒業者及びその配偶者等）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/designatedactivities11.html", kind: "page", comparedAt: "2026-10-18" };

const daigakuSotsugyoLaborConditions: RequirementRule = {
  id: "labor_conditions_document",
  name: "申請人の労働基準法第15条第1項及び同法施行規則第5条に基づき、労働者に交付される労働条件を明示する文書（写し）",
  party: "organization",
  categories: ALL,
  level: "required",
};
const daigakuSotsugyoEmploymentReason: RequirementRule = {
  id: "employment_reason",
  name: "雇用理由書",
  party: "organization",
  categories: ALL,
  level: "check",
  note: "労働条件を明示する文書の内容から、日本語を用いた業務等、本制度に該当する業務に従事することが明らかな場合は提出不要。所属機関が作成したものが必要で、様式は自由（所属機関名及び代表者の記名をお願いします）",
};
const daigakuSotsugyoEducation: RequirementRule = {
  id: "education_documents",
  name: "申請人の学歴等を証明する文書（次のいずれか）",
  party: "applicant",
  categories: ALL,
  level: "required",
  note: "(1)本邦の大学卒業者又は大学院修了者：卒業（修了）証書（写し）又は卒業（修了）証明書（学位の確認が可能なものに限る）／(2)本邦の短期大学若しくは高等専門学校を卒業又は専門職大学の前期課程を修了し、独立行政法人大学改革支援・学位授与機構が行う審査に合格して学士の学位を授与された者：ア 短期大学又は高等専門学校卒業者は卒業証書（写し）又は卒業証明書、専門職大学前期課程修了者は修了証書（写し）又は修了証明書、イ 同機構が交付した学位記（写し）又は学位授与証明書／(3)外国人留学生キャリア形成促進プログラムとして認定を受けた専修学校専門課程や専攻科の学科を修了し、高度専門士の称号を付与された者：高度専門士の称号を付与されたことを証明する文書",
};
const daigakuSotsugyoJapanese: RequirementRule = {
  id: "japanese_ability",
  name: "申請人の日本語能力を証明する文書",
  party: "applicant",
  categories: ALL,
  level: "required",
  note: "日本語能力試験N1又はBJTビジネス日本語能力テスト480点以上の成績証明書（写し）。外国の大学において日本語を専攻した方は、当該大学の卒業証書（写し）又は卒業証明書",
};
const daigakuSotsugyoBusiness: RequirementRule = {
  id: "business_description",
  name: "事業内容を明らかにする資料（次のいずれか）",
  party: "organization",
  categories: ALL,
  level: "required",
  note: "(1)勤務先の沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が記載された案内書／(2)その他の勤務先等の作成した(1)に準ずる文書／(3)勤務先のホームページの写し（トップページのみで可）／(4)登記事項証明書",
};
const daigakuSotsugyoRepresentative: RequirementRule = {
  id: "representative_declaration",
  name: "所属機関の代表者に関する申告書（参考様式）",
  party: "organization",
  categories: ALL,
  level: "required",
  note: "2026年4月15日以降の申請から提出する（家族としての活動の場合は添付不要）",
};
const daigakuSotsugyoResidentTax: RequirementRule = {
  id: "resident_tax_certificates",
  name: "住民税の課税（又は非課税）証明書及び納税証明書",
  party: "applicant",
  categories: ALL,
  level: "required",
  note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、源泉徴収票及び当該期間の給与明細書の写し、賃金台帳の写し等を提出する",
};
const daigakuSotsugyoApplicationRules: RequirementRule[] = [
  daigakuSotsugyoLaborConditions,
  daigakuSotsugyoEmploymentReason,
  daigakuSotsugyoEducation,
  daigakuSotsugyoJapanese,
  daigakuSotsugyoBusiness,
  daigakuSotsugyoRepresentative,
];

export const DAIGAKU_SOTSUGYO_COE: RuleSet = {
  id: "daigaku_sotsugyo_coe",
  title: "特定活動（本邦大学卒業者） 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: DAIGAKU_SOTSUGYO_STATUS,
  subtype: "daigakuSotsugyo",
  checkedAt: DAIGAKU_SOTSUGYO_CHECKED_AT,
  sources: [DAIGAKU_SOTSUGYO_PAGE_SOURCE],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    ...daigakuSotsugyoApplicationRules,
  ],
};

export const DAIGAKU_SOTSUGYO_CHANGE: RuleSet = {
  id: "daigaku_sotsugyo_change",
  title: "特定活動（本邦大学卒業者） 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: DAIGAKU_SOTSUGYO_STATUS,
  subtype: "daigakuSotsugyo",
  checkedAt: DAIGAKU_SOTSUGYO_CHECKED_AT,
  sources: [DAIGAKU_SOTSUGYO_PAGE_SOURCE],
  rules: [...procedureCommonRules("change"), ...daigakuSotsugyoApplicationRules],
};

export const DAIGAKU_SOTSUGYO_RENEWAL: RuleSet = {
  id: "daigaku_sotsugyo_renewal",
  title: "特定活動（本邦大学卒業者） 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: DAIGAKU_SOTSUGYO_STATUS,
  subtype: "daigakuSotsugyo",
  checkedAt: DAIGAKU_SOTSUGYO_CHECKED_AT,
  sources: [DAIGAKU_SOTSUGYO_PAGE_SOURCE],
  rules: [...procedureCommonRules("renewal"), daigakuSotsugyoRepresentative, daigakuSotsugyoResidentTax],
};

// 在留資格「特定活動」のうち、特定情報処理活動（告示37号）の本人（種別 tokuteiJoho。Issue #334）。カテゴリー区分はなく、すべての書類がどのカテゴリーでも同じ。
// 提出書類は、入管庁の案内ページ（designatedactivities08。ページ名「在留資格「特定活動」（特定情報処理活動）」）による（2026-10-17 に確認）。
// 確認：入管庁のサイトは機械的な取得（curl）を拒否するため、案内ページは本文の要約の取得（2回、内容は一致）で確認した（2026-10-17）。その後、人がコピーした逐語の原文（docs/official/designatedactivities08_2026-10-18.txt）との照合が済んだ（2026-10-18。照合表は docs/official/reconciliation/tokutei-katsudo-2026-10-18.md）。
//   案内ページに認定・変更・更新のチェックシートの掲載はなく、照合していない。入管庁の案内にない書類は足していない。
// 旅券・申請書・写真は共通ルール（procedureCommonRules）に任せ、ここには書かない。案内ページに「任意」の区分に当たる書類（提示不要だが実務では取得するのが通例）の記載はなく、
// 「任意」は、認定の旅券の写し（共通ルール）のみ。
// 案内ページの36号（designatedactivities07）との差：変更に「卒業証明書、在職証明書、履歴書」の記載がない（36号の変更には記載あり）。足さないと決めた（原文にない書類は足さない）。
// 範囲外：特定情報処理活動の家族は種別「その他」。取得は TOKUTEI_JOHO_ACQUISITION（原文の取得の節に照合済み、2026-10-19）。申請書は様式N（認定・変更・更新とも。lib/hspForm.ts の FORM_N_TOKUTEI_TYPES）。
const TOKUTEI_JOHO_STATUS = "特定活動";
const TOKUTEI_JOHO_CHECKED_AT = "2026-10-17";
const TOKUTEI_JOHO_PAGE_SOURCE: RuleSource = { title: "在留資格「特定活動」（特定情報処理活動）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/designatedactivities08.html", kind: "page", comparedAt: "2026-10-18" };

const tokuteiJohoOrganizationRules: RequirementRule[] = [
  { id: "organization_brochure", name: "契約機関の概要及び事業活動を明らかにする資料：案内書（パンフレット等）", party: "organization", categories: ALL, level: "required" },
  { id: "registry_certificate", name: "登記事項証明書", party: "organization", categories: ALL, level: "required", note: "商業・法人登記" },
  {
    id: "organization_equivalent_documents",
    name: "上記の案内書及び登記事項証明書に準ずる文書",
    party: "organization",
    categories: ALL,
    level: "check",
    note: "適宜。案内書・登記事項証明書だけでは機関の概要・事業活動が明らかにならない場合に提出する",
  },
  {
    id: "foreign_staff_list",
    name: "外国人社員リスト",
    party: "organization",
    categories: ALL,
    level: "required",
    note: "国籍・氏名・性別・生年月日・入社年月日・在留資格・在留期間・在留期間満了日・職務内容を含んだもの",
  },
  { id: "consent_form", name: "同意書", party: "organization", categories: ALL, level: "required", note: "用紙は地方出入国在留管理官署に用意されている" },
];
const tokuteiJohoActivityDocuments: RequirementRule = {
  id: "activity_documents",
  name: "活動の内容、期間、地位及び報酬を証する文書（次のいずれか）",
  party: "organization",
  categories: ALL,
  level: "required",
  note: "(1)雇用契約書の写し／(2)辞令の写し／(3)採用通知書の写し／(4)上記(1)〜(3)に準ずる文書",
};
// 更新の原文は「(1)在職証明書／(2)辞令の写し／(3)雇用契約書の写し／(4)上記(1)〜(3)に準ずる文書」のいずれか（採用通知書は無い）。認定・変更と選択肢が違うため、更新だけ別の行にする。
const tokuteiJohoRenewalActivityDocuments: RequirementRule = {
  ...tokuteiJohoActivityDocuments,
  note: "(1)在職証明書／(2)辞令の写し／(3)雇用契約書の写し／(4)上記(1)〜(3)に準ずる文書",
};
const tokuteiJohoCareerDocuments: RequirementRule = {
  id: "career_documents",
  name: "卒業証明書及び職歴その他経歴を証する文書",
  party: "applicant",
  categories: ALL,
  level: "required",
  note: "卒業証明書、在職証明書、履歴書（各1通）",
};
const tokuteiJohoDispatch: RequirementRule = {
  id: "dispatch_documents",
  name: "派遣で就労する場合：派遣の根拠となる契約書及び派遣先の事業活動を明らかにする資料",
  party: "organization",
  categories: ALL,
  level: "check",
  note: "派遣で就労する場合のみ。派遣先の事業活動を明らかにする資料は、契約機関の資料（案内書・登記事項証明書・それらに準ずる文書・外国人社員リスト。同意書を除く）に当たるもの",
};
const tokuteiJohoResidentTax: RequirementRule = {
  id: "resident_tax_certificates",
  name: "住民税の課税（又は非課税）証明書及び納税証明書",
  party: "applicant",
  categories: ALL,
  level: "required",
  note: "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、最寄りの出入国在留管理官署に問い合わせる",
};

export const TOKUTEI_JOHO_COE: RuleSet = {
  id: "tokutei_joho_coe",
  title: "特定活動（特定情報処理活動） 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: TOKUTEI_JOHO_STATUS,
  subtype: "tokuteiJoho",
  checkedAt: TOKUTEI_JOHO_CHECKED_AT,
  sources: [TOKUTEI_JOHO_PAGE_SOURCE],
  rules: [
    ...procedureCommonRules("coe"),
    {
      id: "return_envelope",
      name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）",
      party: "organization",
      categories: ALL,
      level: "required",
      note: "申請結果（認定証明書等）の返送に使用する",
    },
    ...tokuteiJohoOrganizationRules,
    tokuteiJohoActivityDocuments,
    tokuteiJohoCareerDocuments,
    tokuteiJohoDispatch,
  ],
};

export const TOKUTEI_JOHO_CHANGE: RuleSet = {
  id: "tokutei_joho_change",
  title: "特定活動（特定情報処理活動） 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: TOKUTEI_JOHO_STATUS,
  subtype: "tokuteiJoho",
  checkedAt: TOKUTEI_JOHO_CHECKED_AT,
  sources: [TOKUTEI_JOHO_PAGE_SOURCE],
  rules: [
    ...procedureCommonRules("change"),
    ...tokuteiJohoOrganizationRules,
    tokuteiJohoActivityDocuments,
    tokuteiJohoDispatch,
    {
      id: "resignation_certificate",
      name: "前雇用先機関が作成した退職証明書（退職日を明記したもの）",
      party: "applicant",
      categories: ALL,
      level: "check",
      note: "契約機関が変更された場合のみ",
    },
    { ...tokuteiJohoResidentTax, level: "check", note: `契約機関が変更された場合のみ。${tokuteiJohoResidentTax.note}` },
  ],
};

export const TOKUTEI_JOHO_RENEWAL: RuleSet = {
  id: "tokutei_joho_renewal",
  title: "特定活動（特定情報処理活動） 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: TOKUTEI_JOHO_STATUS,
  subtype: "tokuteiJoho",
  checkedAt: TOKUTEI_JOHO_CHECKED_AT,
  sources: [TOKUTEI_JOHO_PAGE_SOURCE],
  rules: [...procedureCommonRules("renewal"), tokuteiJohoRenewalActivityDocuments, tokuteiJohoResidentTax],
};

// ===== 在留資格取得許可申請（芸術・宗教・法律・会計業務・短期滞在・特定活動〔07・08・11〕。Issue #421・#422・#424・#431・#432） =====
// 照合表は docs/official/reconciliation/acquisition-geijutsu・acquisition-shukyo・acquisition-houmu-kaikei・acquisition-tanki-taizai・
// acquisition-tokutei-katsudou-07/08/11（いずれも 2026-10-19）。人の判断「推奨のとおり」（2026-10-19）の R 項目をすべて反映した。
// 興行（#429。acquisition-kogyo-2026-10-19.md）は、ページに取得の節が無く、ACQUISITION_BY_CAUSE のまま（人の判断：推奨のとおり、変更なし）。
// 共通の扱いは技人国の取得（#396）と同じ：出生の3書類・活動に応じた資料・旅券の理由書を外し、出生は「その事由を証する書類」として扱い、
// 写真は「写真（40mm×30mm）」を全事由の必須（注記は年齢の注記のみ）、申請取次者の書類の注記は原文のとおり（ACQUISITION_AGENT_IDENTITY_NOTE）。
// ACQUISITION_BY_CAUSE の文言・checkedAt は変えない。上書きも削除もしない書類は、ACQUISITION_BY_CAUSE の規則をそのまま引き継ぐ。
const ACQUISITION_SET3_COMPARED_AT = "2026-10-19";
const ACQUISITION_SET3_CHECKED_AT = "2026-10-19";

/** ACQUISITION_BY_CAUSE の規則に、技人国の取得（#396）と同じ削除・上書きを当て、資格ごとの上書き（extra）を重ねる。removeIds は追加で外す書類 */
function acquisitionSet3BaseRules(extra: Record<string, Partial<RequirementRule>> = {}, removeIds: string[] = []): RequirementRule[] {
  return ACQUISITION_BY_CAUSE.rules
    .filter((r) => !GIJINKOKU_ACQUISITION_REMOVED_IDS.includes(r.id) && !removeIds.includes(r.id))
    .map((r) => {
      const over = { ...GIJINKOKU_ACQUISITION_OVERRIDES[r.id], ...extra[r.id] };
      return Object.keys(over).length > 0 ? { ...r, ...over } : r;
    });
}

/** 認定・変更の規則（categories: ALL）を、取得の事由で判定する規則集合に流用する。事由で判定する規則集合では causes が無いと出ないため、全事由を付ける */
function asAcquisitionRule(rule: RequirementRule, over: Partial<RequirementRule> = {}): RequirementRule {
  const out: RequirementRule = { ...rule, causes: ALL_CAUSES, ...over };
  delete out.categories;
  return out;
}

function changeRuleOf(set: RuleSet, id: string): RequirementRule {
  const rule = set.rules.find((r) => r.id === id);
  if (!rule) throw new Error(`${set.id} に規則 ${id} がない`);
  return rule;
}

// 芸術・宗教のページの URL は未記録（照合表 R-10。推測で書かない）。出典の名称に「URL 未記録」と書き、リンク先は「在留資格から探す」の一覧とする
const ACQUISITION_STATUS_PAGES_UNRECORDED_SOURCE: RuleSource = {
  title: "入管庁『在留資格から探す』の各ページ（URL 未記録）",
  url: "https://www.moj.go.jp/isa/applications/status/index.html",
  kind: "page",
  comparedAt: ACQUISITION_SET3_COMPARED_AT,
};

// 芸術（#421。原文 geijutsu_2026-10-18.txt 135〜164行）
const GEIJUTSU_ACQUISITION_PASSPORT_NOTE = "提示のみで、提出書類としてコピーを付ける書類ではない。案内ページの原文は「パスポート及び在留カード 提示」";
export const GEIJUTSU_ACQUISITION: RuleSet = {
  id: "geijutsu_acquisition",
  title: "芸術 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "芸術",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET3_CHECKED_AT,
  sources: [ACQUISITION_STATUS_PAGES_UNRECORDED_SOURCE, ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: [
    // R-6：名称・区分は変えず、注記に原文の「パスポート及び在留カード 提示」を書く
    ...acquisitionSet3BaseRules({ passport_presentation: { note: GEIJUTSU_ACQUISITION_PASSPORT_NOTE } }),
    // R-1：契約の有無で(1)(2)のいずれか。必須の1行にまとめ、(1)(2)の別と「適宜」を注記に書く
    {
      id: "geijutsu_activity_documents",
      name: "申請人の活動の内容等を明らかにする資料",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "次のいずれか。(1)公私の機関又は個人との契約に基づいて活動を行う場合：活動の内容、期間、地位及び報酬を証明する文書 1通 (2)公私の機関又は個人との契約に基づかないで活動を行う場合：申請人が作成する具体的な活動の内容、期間及び行おうとする活動から生じる収入の見込額を記載した文書（適宜の様式） 適宜",
      verify: true,
    },
    // R-2：履歴書（必須）と、業績の資料（必須。5種のいずれか）
    { id: "geijutsu_resume", name: "芸術上の活動歴を詳細に記載した履歴書", party: "applicant", causes: ALL_CAUSES, level: "required", note: "1通", verify: true },
    {
      id: "geijutsu_achievements",
      name: "芸術活動上の業績を明らかにすることができるもの",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "次のいずれか。関係団体からの推薦状 1通／過去の活動に関する報道 適宜／入賞、入選等の実績 適宜／過去の作品等の目録 適宜／これらに準ずるもの 適宜",
      verify: true,
    },
  ],
};

// 宗教（#422。原文 shukyo_2026-10-18.txt 118〜138行）
export const SHUKYO_ACQUISITION: RuleSet = {
  id: "shukyo_acquisition",
  title: "宗教 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "宗教",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET3_CHECKED_AT,
  sources: [ACQUISITION_STATUS_PAGES_UNRECORDED_SOURCE, ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: [
    ...acquisitionSet3BaseRules(),
    // R-1・R-2：必須。「適宜」は数量の指定のため注記に書く
    {
      id: "shukyo_dispatch_letter",
      name: "外国の宗教団体からの派遣状等の写し等派遣機関からの派遣期間、地位及び報酬を証明する文書",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "適宜",
      verify: true,
    },
    {
      id: "shukyo_organization_overview",
      name: "派遣機関及び受入機関の概要（宗派、沿革、代表者名、組織、施設、信者数等）を明らかにする資料",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "適宜",
      verify: true,
    },
    // R-3：条件付きのため要確認。原文 137行の「提示」と「提出」の違いは推測せず、名称に「（提示）」を付けない
    {
      id: "shukyo_status_career",
      name: "宗教家としての地位及び職歴を証明する文書",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "check",
      note: "適宜。派遣機関からの証明書等で、申請人の宗教家としての地位、職歴を証明する。派遣状等に地位・職歴が記載されていれば不要",
      verify: true,
    },
  ],
};

// 法律・会計業務（#424。原文 legalaccountingservices_2026-10-18.txt 84〜102行）。R-1：認定・変更と同じ資格の証明文書を、全事由の必須で流用する
export const HOUMU_KAIKEI_ACQUISITION: RuleSet = {
  id: "houmu_kaikei_acquisition",
  title: "法律・会計業務 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: HOUMU_KAIKEI,
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET3_CHECKED_AT,
  sources: [
    { title: "在留資格「法律・会計業務」在留資格取得許可申請（出入国在留管理庁）", url: HOUMU_KAIKEI_SOURCE.url, kind: "page", comparedAt: ACQUISITION_SET3_COMPARED_AT },
    ACQUISITION_PROCEDURE_GUIDE_SOURCE,
    ...ACQUISITION_BY_CAUSE.sources,
  ],
  rules: [...acquisitionSet3BaseRules(), asAcquisitionRule(houmuKaikeiLicense)],
};

// 短期滞在（#431。原文 tanki-taizai_2026-10-18.txt 83〜94行）。原文の5項目と一対一（照合表の補足）。
// R-2：事由別の書類（国籍を証する書類・事由を証する書類）も外す（原文に「区分により、それぞれ定める書類」の項目が無い）。
// R-3：写真は外す（例外。原文に項目が無く、短期滞在は中長期在留者とならない在留資格〔入管法第19条の3第2号〕。#396 の「写真（40mm×30mm）を全事由に必須」は適用しない）。
// R-7：ページの URL は人が確認してから出典に入れる（推測で書かない）。それまでは手続案内と申請書様式のみ
const TANKI_TAIZAI_ACQUISITION_RULES: RequirementRule[] = [
  { id: "tanki_reason_statement", name: "「短期滞在」の取得を必要とする理由書（書式自由）", party: "applicant", causes: ALL_CAUSES, level: "required", note: "1通", verify: true },
  {
    id: "tanki_departure_transport",
    name: "出国するために必要な交通手段を確保していることを明らかにする資料（航空券等）",
    party: "applicant",
    causes: ALL_CAUSES,
    level: "check",
    note: "適宜。提示",
    verify: true,
  },
];
export const TANKI_TAIZAI_ACQUISITION: RuleSet = {
  id: "tanki_taizai_acquisition",
  title: "短期滞在 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "短期滞在",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET3_CHECKED_AT,
  sources: [ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  // 原文の並び（申請書・パスポート提示・理由書・交通手段の資料・申請取次者の書類）に合わせ、旅券の提示の後ろに入れる
  rules: acquisitionSet3BaseRules({}, ["photo", "nationality_proof", "cause_proof"]).flatMap((r) => (r.id === "passport_presentation" ? [r, ...TANKI_TAIZAI_ACQUISITION_RULES] : [r])),
};

// 特定活動（#432）。種別（subtype）を持つ規則集合は、在留資格と種別の両方が合うときだけ選ばれる（evaluate.ts の matchRuleSet）。
// 種別が未選択・その他（家族を含む）の特定活動の取得は、ACQUISITION_BY_CAUSE のまま。認定・変更の規則は causes を持たないため、ALL_CAUSES を付けて流用する（asAcquisitionRule）
// 特定研究等活動（07。原文 designatedactivities07_2026-10-18.txt 125〜164行）。R-1：変更と同じ書類・区分。R-8：転職した場合の2行（要確認）。R-9：番号を書かない既存の注記のまま
export const TOKUTEI_KENKYU_ACQUISITION: RuleSet = {
  id: "tokutei_kenkyu_acquisition",
  title: "特定活動（特定研究等活動） 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: TOKUTEI_KENKYU_STATUS,
  subtype: "tokuteiKenkyu",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET3_CHECKED_AT,
  sources: [
    { title: "在留資格「特定活動」（特定研究等活動）在留資格取得許可申請（出入国在留管理庁）", url: TOKUTEI_KENKYU_PAGE_SOURCE.url, kind: "page", comparedAt: ACQUISITION_SET3_COMPARED_AT },
    ACQUISITION_PROCEDURE_GUIDE_SOURCE,
    ...ACQUISITION_BY_CAUSE.sources,
  ],
  rules: [
    ...acquisitionSet3BaseRules(),
    ...[
      ...tokuteiKenkyuOrganizationRules,
      tokuteiKenkyuActivityDocuments,
      tokuteiKenkyuCareerDocuments,
      changeRuleOf(TOKUTEI_KENKYU_CHANGE, "resignation_certificate"),
      changeRuleOf(TOKUTEI_KENKYU_CHANGE, "resident_tax_certificates"),
    ].map((r) => asAcquisitionRule(r)),
  ],
};

// 本邦大学等卒業者（11。原文 designatedactivities11_2026-10-18.txt 215〜273行。本人の列のみ。R-9：家族の列は対象外のまま）。R-1：認定・変更と同じ6件。
// R-8：この資格の取得の節は「パスポート及び在留カード 提示」（234行）のため、名称を原文のとおりにする
const DAIGAKU_SOTSUGYO_ACQUISITION_PASSPORT: Partial<RequirementRule> = {
  name: "パスポート及び在留カード（提示）",
  note: "提示のみで、提出書類としてコピーを付ける書類ではない。在留カードを持たない場合の扱いは、案内ページに記載がないため行政書士が確認する",
};
export const DAIGAKU_SOTSUGYO_ACQUISITION: RuleSet = {
  id: "daigaku_sotsugyo_acquisition",
  title: "特定活動（本邦大学卒業者） 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: DAIGAKU_SOTSUGYO_STATUS,
  subtype: "daigakuSotsugyo",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET3_CHECKED_AT,
  sources: [
    { title: "在留資格「特定活動」（本邦大学等卒業者）在留資格取得許可申請（出入国在留管理庁）", url: DAIGAKU_SOTSUGYO_PAGE_SOURCE.url, kind: "page", comparedAt: ACQUISITION_SET3_COMPARED_AT },
    ACQUISITION_PROCEDURE_GUIDE_SOURCE,
    ...ACQUISITION_BY_CAUSE.sources,
  ],
  rules: [...acquisitionSet3BaseRules({ passport_presentation: DAIGAKU_SOTSUGYO_ACQUISITION_PASSPORT }), ...daigakuSotsugyoApplicationRules.map((r) => asAcquisitionRule(r))],
};

// 特定情報処理活動（08。原文 designatedactivities08_2026-10-18.txt 120〜156行）。R-1：変更と同じ書類・区分（活動の内容等は認定・変更の選択肢）。
// R-8：派遣の資料（要確認）。R-9：契約機関の変更があった場合の2行（要確認）。退職証明書の名称は原文のとおり「前契約機関」（変更の名称は変えない）
export const TOKUTEI_JOHO_ACQUISITION: RuleSet = {
  id: "tokutei_joho_acquisition",
  title: "特定活動（特定情報処理活動） 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: TOKUTEI_JOHO_STATUS,
  subtype: "tokuteiJoho",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET3_CHECKED_AT,
  sources: [
    { title: "在留資格「特定活動」（特定情報処理活動）在留資格取得許可申請（出入国在留管理庁）", url: TOKUTEI_JOHO_PAGE_SOURCE.url, kind: "page", comparedAt: ACQUISITION_SET3_COMPARED_AT },
    ACQUISITION_PROCEDURE_GUIDE_SOURCE,
    ...ACQUISITION_BY_CAUSE.sources,
  ],
  rules: [
    ...acquisitionSet3BaseRules(),
    ...[...tokuteiJohoOrganizationRules, tokuteiJohoActivityDocuments, tokuteiJohoDispatch].map((r) => asAcquisitionRule(r)),
    asAcquisitionRule(changeRuleOf(TOKUTEI_JOHO_CHANGE, "resignation_certificate"), { name: "前契約機関が作成した退職証明書（退職日を明記したもの）" }),
    asAcquisitionRule(changeRuleOf(TOKUTEI_JOHO_CHANGE, "resident_tax_certificates")),
  ],
};
// ===== ここまで（取得：芸術・宗教・法律・会計業務・短期滞在・特定活動〔07・08・11〕） =====

/**
 * 教授／教育／報道の在留資格取得許可申請（Issue #420。照合表は docs/official/reconciliation/ の
 * acquisition-kyoju-2026-10-24.md・acquisition-kyoiku-2026-10-24.md・acquisition-hodo-2026-10-24.md）。
 * 各ページの取得の節（原文の控え kyoju_/kyoiku_/hodo_2026-10-24.txt）と照合済み（2026-10-24）。人の判断「推奨のとおり」（2026-10-24）で、
 * 教授 KJ-1〜KJ-9、教育 KI-1〜KI-9、報道 HD-1〜HD-9 を反映した専用の規則集合。
 * 事由別の書類は、技人国の取得と同じく ACQUISITION_BY_CAUSE から引き継ぎ、同じ上書き・削除をする（acqSet1CauseRules。出生の3書類・活動に応じた資料・旅券の理由書を外す／
 * 写真「写真（40mm×30mm）」を全事由の必須／日米地位協定の例を外す／申請取次者の注記を原文のとおり）。ACQUISITION_BY_CAUSE の文言は変えない。
 * カテゴリー別の書類は、各在留資格の認定・変更の規則集合（チェックシートで照合済み）の書類を、同じ割り当てで写す（取得の節の書類は、変更〔または認定〕の節と同じ文言のため）。
 * 取得のチェックシートは無く、取得の列の位置そのものは未確認。判定の軸は、取得の事由と所属機関のカテゴリー（alsoBasis）。カテゴリーが未選択の間は、共通の書類だけを出す。
 * 3つのページの URL は、控えには未提示だが、人が確認した（2026-10-24）。出典は、研究・経営・管理などの取得（acqSet1Sources）と同じ形で、各ページの URL
 * （professor.html・instructor.html・journalist.html。認定・変更・更新の出典 PROFESSOR_PAGE_SOURCE 等と同じ URL）と照合日（2026-10-24）を書く。
 * `checkedAt` は新しい規則集合の作成日。ACQUISITION_BY_CAUSE より先に照合する（RULE_SETS の並び順）。
 */
const ACQ_KYOJU_COMPARED_AT = "2026-10-24";
const ACQ_KYOJU_CHECKED_AT = "2026-10-24";
// 出典（KJ-9・KI-8・HD-9）：各ページ（取得の節。2026-10-24 に照合。URL は人が確認〔2026-10-24〕）・手続案内・申請書様式（日付なし）
const acqKyojuSources = (status: string, url: string): RuleSource[] => [
  { title: `在留資格「${status}」在留資格取得許可申請（出入国在留管理庁）`, url, kind: "page", comparedAt: ACQ_KYOJU_COMPARED_AT },
  ACQUISITION_PROCEDURE_GUIDE_SOURCE,
  ...ACQUISITION_BY_CAUSE.sources,
];

// 教授（KJ-1〜KJ-9。原文 kyoju_2026-10-24.txt 86〜103行）。
// KJ-2：活動に応じた資料は、変更の professorActivityProof（カテゴリー2のみ・必須）を写す。カテゴリー1は「その他の資料は原則不要」で書類を足さない
// KJ-6：旅券の提示の注記の末尾に、原文 102行の注意を足す／KJ-7：申請取次者の注記は、原文 103行のとおり教授だけの文言にする
const PROFESSOR_ACQUISITION_ACTIVITY_NOTE =
  "取得の案内ページでは「日本での活動内容に応じた資料（在留資格変更許可申請と同様の資料）」とある。カテゴリー1（常勤職員）は、その他の資料は原則不要";
const PROFESSOR_ACQUISITION_PASSPORT_NOTE = "提示のみで、提出書類としてコピーを付ける書類ではない。申請人以外の方が申請書類を提出する場合も、提示が必要";
const PROFESSOR_ACQUISITION_AGENT_NOTE =
  "代理人が申請する場合や申請人本人以外の方が提出する場合。提出する方の身分を証する文書（申請取次者証明書、戸籍謄本等）の提示";
export const PROFESSOR_ACQUISITION: RuleSet = {
  id: "professor_acquisition",
  title: "教授 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: PROFESSOR,
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  categoryDefinition: PROFESSOR_CATEGORIES,
  checkedAt: ACQ_KYOJU_CHECKED_AT,
  sources: acqKyojuSources(PROFESSOR, PROFESSOR_PAGE_SOURCE.url),
  rules: [
    ...acqSet1CauseRules.map((r) =>
      r.id === "passport_presentation"
        ? { ...r, note: PROFESSOR_ACQUISITION_PASSPORT_NOTE }
        : r.id === "agent_identity_document"
          ? { ...r, note: PROFESSOR_ACQUISITION_AGENT_NOTE }
          : r,
    ),
    { ...professorActivityProof, note: PROFESSOR_ACQUISITION_ACTIVITY_NOTE },
  ],
};

// 教育（KI-1〜KI-9。原文 kyoiku_2026-10-24.txt 107〜127行）。
// KI-1：認定・変更の部品4つを、名称・注記・割り当て・区分のまま写す。返信用封筒は認定のみのため写さない。
// KI-9：取得の節のカテゴリー2・3の書類は、控えでは「認定と同文」の書き込み（124行）。人が同文であることを確かめた記録として扱う
export const EDUCATION_ACQUISITION: RuleSet = {
  id: "education_acquisition",
  title: "教育 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: EDUCATION,
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  categoryDefinition: EDUCATION_CATEGORIES,
  checkedAt: ACQ_KYOJU_CHECKED_AT,
  sources: acqKyojuSources(EDUCATION, EDUCATION_PAGE_SOURCE.url),
  rules: [...acqSet1CauseRules, educationActivityDocuments, educationCareerDocuments, educationBusinessDocuments, educationFinancialStatements],
};

// 報道（HD-1〜HD-9。原文 hodo_2026-10-24.txt 98〜124行）。
// HD-1：報道に固有の書類3点は、変更の部品を、名称・注記・区分のまま写す。返信用封筒は認定のみのため写さない。
// HD-2：記者登録証の社員を雇用していることの証明文書は、変更と同じくカテゴリー1のみ・必須（カテゴリー1の機関のときだけ出す）。
// 控えの4行目の人の注の読み方は、人がページの表で確かめる。取得のチェックシートは無く、取得の列の位置は未確認
export const HODO_ACQUISITION: RuleSet = {
  id: "hodo_acquisition",
  title: "報道 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: HODO,
  basis: "acquisitionCause",
  alsoBasis: ["category"],
  categoryDefinition: HODO_CATEGORIES,
  checkedAt: ACQ_KYOJU_CHECKED_AT,
  sources: acqKyojuSources(HODO, HODO_PAGE_SOURCE.url),
  rules: [...acqSet1CauseRules, hodoRegisteredEmployerProof, hodoActivityDocuments, hodoOrganizationOverview],
};

// ===== 在留資格取得許可申請（公用・技能実習・留学。Issue #420） =====
// 照合表は docs/official/reconciliation/acquisition-koyo-2026-10-24.md・acquisition-ginoujisshu-2026-10-24.md・acquisition-ryugaku-2026-10-24.md（いずれも照合日 2026-10-24）。
// 人の判断（2026-10-24）：各照合表の推奨のとおり、全件を反映した。認定・変更・更新の規則集合は無く、取得だけを先に作る（芸術 R-10 と同じ）。
// 共通の扱いは技人国の取得（#396）と同じ（acquisitionSet3BaseRules）。ページの URL は未記録のため、出典は URL 未記録の一覧・手続案内・申請書様式とする（推測で書かない）。
// ACQUISITION_BY_CAUSE の文言・checkedAt は変えない。
const ACQUISITION_SET4_COMPARED_AT = "2026-10-24";
const ACQUISITION_SET4_CHECKED_AT = "2026-10-24";
const ACQUISITION_SET4_SOURCES: RuleSource[] = [
  { ...ACQUISITION_STATUS_PAGES_UNRECORDED_SOURCE, comparedAt: ACQUISITION_SET4_COMPARED_AT },
  ACQUISITION_PROCEDURE_GUIDE_SOURCE,
  ...ACQUISITION_BY_CAUSE.sources,
];

// 公用（acquisition-koyo-2026-10-24.md。原文 koyo_2026-10-18.txt 102〜116行）。原文の項目と一対一になる：申請書・事由別の書類・旅券の提示・口上書等・申請取次者の書類。
// KO-1：口上書等を全事由の必須で足す。KO-2：写真は外す（原文に項目が無く、公用は中長期在留者とならない在留資格。#396 の写真の扱いは適用しない）。
const KOYO_ACQUISITION_RULES: RequirementRule[] = [
  {
    id: "koyo_diplomatic_note",
    name: "口上書その他外国政府又は国際機関が発行した身分及び用務を証する文書",
    party: "applicant",
    causes: ALL_CAUSES,
    level: "required",
    note: "1通",
    verify: true,
  },
];
export const KOYO_ACQUISITION: RuleSet = {
  id: "koyo_acquisition",
  title: "公用 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "公用",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET4_CHECKED_AT,
  sources: ACQUISITION_SET4_SOURCES,
  // 原文の並び（申請書・事由別の書類・旅券の提示・口上書等・申請取次者の書類）に合わせ、旅券の提示の後ろに入れる
  rules: acquisitionSet3BaseRules({}, ["photo"]).flatMap((r) => (r.id === "passport_presentation" ? [r, ...KOYO_ACQUISITION_RULES] : [r])),
};

// 技能実習（acquisition-ginoujisshu-2026-10-24.md。原文 ginoujisshu_2026-10-24.txt 67〜87行）。
// GJ-1：技能実習計画認定通知書等の写しを全事由の必須で足す。GJ-9：号・企業単独型／団体監理型の入力欄は足さず、区分の違いは注記で案内する（82行の例は書かない）。
// GJ-2：住民税の証明書を全事由の必須で足す（名称は教育の更新と同じ）。GJ-4：写真は技人国の取得と同じ（年齢の注記）。
const GINOU_JISSHU_ACQUISITION_RULES: RequirementRule[] = [
  {
    id: "ginou_jisshu_plan_certificate",
    name: "技能実習計画認定通知書及び認定の申請書の写し",
    party: "applicant",
    causes: ALL_CAUSES,
    level: "required",
    note: "1通。技能実習法第8条第1項の認定（変更の認定があったときは変更後のもの）を受けた技能実習計画に係るもの。申請する在留資格の技能実習の区分（1号〜3号、企業単独型・団体監理型）に対応する計画のもの",
    verify: true,
  },
  {
    id: "resident_tax_certificates",
    name: "住民税の課税（又は非課税）証明書及び納税証明書",
    party: "applicant",
    causes: ALL_CAUSES,
    level: "required",
    note: "各1通。1年間の総所得及び納税状況が記載されたもの。1月1日現在の住所地の市区町村から発行される。総所得及び納税状況（税金を納めているかどうか）の両方が記載されている証明書であれば、いずれか一方でよい。入国後間もない場合や転居等により発行されない場合は、最寄りの地方出入国在留管理官署に問い合わせる",
    verify: true,
  },
];
export const GINOU_JISSHU_ACQUISITION: RuleSet = {
  id: "ginou_jisshu_acquisition",
  title: "技能実習 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "技能実習",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET4_CHECKED_AT,
  sources: ACQUISITION_SET4_SOURCES,
  // 固有の書類は、旅券の提示の後ろに入れる
  rules: acquisitionSet3BaseRules().flatMap((r) => (r.id === "passport_presentation" ? [r, ...GINOU_JISSHU_ACQUISITION_RULES] : [r])),
};

// 留学（acquisition-ryugaku-2026-10-24.md。原文 ryugaku_2026-10-24.txt 114〜137行）。
// RY-1：教育機関の種類・適正校の区分ごとの提出書類一覧表（PDF）は未入手のため、書類の名前は出さず、要確認の1行で一覧表を案内する（RY-7：活動に応じた資料はこの行に置き換える）。
// RY-3：留意事項・別表・経費支弁書・奨学金の証明書一覧は別行にせず、RY-1 の注記に書名だけ書く。RY-11：教育機関の種類・適正校の区分の入力欄は足さない。
// RY-2：各種確認書（別紙）は要確認の1行（教育機関が作成する）。
const RYUGAKU_ACQUISITION_RULES: RequirementRule[] = [
  {
    id: "ryugaku_document_list",
    name: "教育機関の種類と適正校の区分に応じた提出書類一覧表に掲げる資料",
    party: "applicant",
    causes: ALL_CAUSES,
    level: "check",
    note: "提出書類は、教育機関の種類（(1)大学・大学に準ずる機関・高等専門学校 (2)専修学校・各種学校等 (3)告示日本語教育機関・認定日本語教育機関 (4)高等学校・中学校・小学校）と、適正校の区分（クラスⅠ・クラスⅡ・通知を受けていない機関）ごとの一覧表による。取得では、一覧表を「１在留資格取得許可申請書及び３申請時の在留資格に該当する活動に関する資料を除いて準用」する。取得の節に「申請に当たっての留意事項・別表・経費支弁書・奨学金の給付に関する証明書一覧」のリンクがある。一覧表は入管庁の留学のページで確認する（画面には書類の名前を載せていない）",
    verify: true,
  },
  {
    id: "ryugaku_confirmation_form",
    name: "各種確認書（別紙）",
    party: "organization",
    causes: ALL_CAUSES,
    level: "check",
    note: "在籍予定又は在籍中の教育機関が作成する（申請人本人が作成するものではない）。最新様式を使用する。(1)専修学校又は各種学校で日本語教育以外の教育を受ける方、(2)高等学校で教育を受ける方、(3)専ら日本語教育を受ける方（日本語別科を含む）で別表に掲げる国・地域の国籍を有し外国の高等教育機関（大学等）の卒業証書等を提出する方、(4)前回の在留諸申請から在籍する教育機関に変更がない方（専ら日本語教育を受けていた方が、他の教育を同じ教育機関で受ける場合を除く）は提出不要。令和8年6月以前に申請する場合は従前の各種確認書でよい",
    verify: true,
  },
];
export const RYUGAKU_ACQUISITION: RuleSet = {
  id: "ryugaku_acquisition",
  title: "留学 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "留学",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET4_CHECKED_AT,
  sources: ACQUISITION_SET4_SOURCES,
  // 固有の書類は、旅券の提示の後ろに入れる
  rules: acquisitionSet3BaseRules().flatMap((r) => (r.id === "passport_presentation" ? [r, ...RYUGAKU_ACQUISITION_RULES] : [r])),
};
// ===== ここまで（取得：公用・技能実習・留学） =====

// ===== 在留資格取得許可申請（文化活動・日本人の配偶者等。Issue #420） =====
// 照合表は docs/official/reconciliation/acquisition-bunkakatsudo-2026-10-24.md・acquisition-nihonjinhaigusha-2026-10-24.md（いずれも 2026-10-24）。
// 人の判断「推奨のとおり」（2026-10-24）の R 項目（BK-1〜BK-12・NH-1〜NH-20）をすべて反映した。取得だけを先に作る（認定・変更・更新は未整備）。
// ACQUISITION_BY_CAUSE の文言・checkedAt は変えない。ページの URL は控えに無く、推測して書かない（「URL 未記録」の出典）。
const ACQUISITION_SET4_PAGES_SOURCE: RuleSource = { ...ACQUISITION_STATUS_PAGES_UNRECORDED_SOURCE, comparedAt: ACQUISITION_SET4_COMPARED_AT };

// 文化活動（BK-1〜BK-12。原文 bunkakatsudo1-acquisition_2026-10-24.txt 12〜47行・bunkakatsudo2-acquisition_2026-10-24.txt 11〜50行）。
// 共通の扱いは技人国の取得（#396）と同じ（BK-2 出生の3書類を外し事由の証明に含める・BK-3 写真・BK-4 注記の例を外す・BK-9 活動に応じた資料を外す・BK-10 申請取次者の注記・BK-11 旅券の理由書を外す）。
// BK-1：ページ１とページ２の違いは、ページ２だけにある専門家の経歴及び業績の資料の1行のみ。活動の種類を入力する欄は足さず、この1行を「専門家の指導を受ける場合のみ」の要確認にする（案B）
const BUNKA_KATSUDO_EXPENSE_NOTE =
  "(1)申請人本人が経費を支弁する場合は、次のいずれか：給付金額及び給付期間を明示した奨学金給付に関する証明書 1通／申請人本人名義の銀行等における預金残高証明書／これらに準ずる文書（適宜）。" +
  "(2)申請人本人以外の者が経費を支弁する場合は、経費負担者に係る次の資料：住民税の課税（又は非課税）証明書及び納税証明書（1年間の総所得及び納税状況が記載されたもの） 各1通（1年間の総所得及び納税状況の両方が記載されていれば、いずれか一方でよい）／経費支弁者が外国にいる場合は、経費支弁者名義の銀行等における預金残高証明書（適宜）／これらに準ずる文書（適宜）";
export const BUNKA_KATSUDO_ACQUISITION: RuleSet = {
  id: "bunka_katsudo_acquisition",
  title: "文化活動 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "文化活動",
  basis: "acquisitionCause",
  checkedAt: ACQUISITION_SET4_COMPARED_AT,
  sources: [ACQUISITION_SET4_PAGES_SOURCE, ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: [
    ...acquisitionSet3BaseRules(),
    // BK-5：必須。(1)(2)とも出す
    {
      id: "bunka_activity_documents",
      name: "具体的な活動の内容、期間及び当該活動を行おうとする機関の概要を明らかにする資料",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "(1)申請人本人又は受入れ機関が作成した日本での活動内容及びその期間を明らかにする文書 1通 (2)申請人本人が当該活動を行おうとする機関の概要を明らかにする資料（パンフレット等） 適宜",
      verify: true,
    },
    // BK-6：必須（5種のいずれか）
    {
      id: "bunka_achievements",
      name: "学術上又は芸術上の業績を明らかにする資料",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "次のいずれか。関係団体からの推薦状 1通／過去の活動に関する報道 適宜／入賞、入選等の実績 適宜／過去の論文、作品等の目録 適宜／これらに準ずる文書 適宜",
      verify: true,
    },
    // BK-7 案A：支弁者により(1)(2)。必須の1行にまとめ、中身の違いは注記に書く
    {
      id: "bunka_expense_capacity",
      name: "申請人の日本滞在中の経費支弁能力を証する文書",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: BUNKA_KATSUDO_EXPENSE_NOTE,
      verify: true,
    },
    // BK-1・BK-8：ページ２（専門家の指導を受けて修得する場合）だけの書類。要確認
    {
      id: "bunka_expert_career",
      name: "当該専門家の経歴及び業績を明らかにする資料",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "check",
      note: "専門家の指導を受けて修得する場合（文化活動２）のみ。次のいずれか。免許等の写し 1通／論文、作品集等 適宜／履歴書 1通",
      verify: true,
    },
  ],
};

// 日本人の配偶者等（NH-1〜NH-20。原文 nihonjinhaigusha-spouse-acquisition_2026-10-24.txt 6〜54行・nihonjinhaigusha-child-acquisition_2026-10-24.txt 6〜51行）。
// 取得の提出書類のチェックシート（PDF）は両ページにある。配偶者は PDF 001426543、子（日本人の実子・特別養子）は PDF 001426551 に照合済み（いずれも差分なし。NH-19）。
// NH-1：判定の軸を、取得の事由と申請人の身分（配偶者／実子・特別養子。formDetails.applicantIdentity）の2つにする（alsoBasis）。身分が未選択の間は、身分に共通の書類だけを出す。
// NH-2：原文は事由を3区分（国籍離脱・出生・それ以外）で書くため、出生したことを証する書類（birth_certificate）は外さない（家族滞在の取得と同じ）。
// NH-6・NH-8：旅券の理由書・活動に応じた資料は外す（活動に応じた資料は、NH-11〜NH-16 の書類群がこれに当たる）
const NIHONJIN_HAIGUSHA_ACQUISITION_REMOVED_IDS = ["passport_reason_statement", "activity_materials"];
const NIHONJIN_HAIGUSHA_QUESTIONNAIRE_NOTE =
  "1通。配偶者の場合は、配偶者のページの質問書（平成29年6月6日に様式を改訂しているため、新様式で提出する。英語など10の言語の版がある）。実子・特別養子の場合は、実子・特別養子のページの質問書（配偶者の質問書とは別の様式）。配偶者の場合は PDF 001426543、実子・特別養子の場合は PDF 001426551 の取得のチェックシートに、この項目がある";
const NIHONJIN_HAIGUSHA_RESIDENCE_CERTIFICATE_NOTE =
  "1通。個人番号（マイナンバー）は省略し、他の事項は省略のないもの。配偶者の場合は、配偶者（日本人）の世帯全員の記載のある住民票の写しで、発行日から3か月以内のもの。実子・特別養子の場合は、日本人の方（申請人の親又は養親）の世帯全員の記載があるもの";
const NIHONJIN_HAIGUSHA_ACQUISITION_OVERRIDES: Record<string, Partial<RequirementRule>> = {
  // NH-3：技人国の取得（R-3）と同じ。全事由の必須、名称は申請書のとおり、注記は年齢の注記
  photo: { causes: ALL_CAUSES, name: ACQUISITION_FORM_PHOTO_NAME, note: ACQUISITION_PHOTO_AGE_NOTE },
  // NH-4：原文は「その事由を証する書類」のみ。原文に無い注記の例（日米地位協定）を外す
  cause_proof: { note: undefined },
  // NH-7：原文は「申請人本人以外の方が申請書類を提出する場合」。名称は変えない
  agent_identity_document: { note: ACQUISITION_AGENT_IDENTITY_NOTE },
  // NH-5：配偶者のページは「パスポート 提示」。申請人以外の方が提出する場合でも提示が必要（実子・特別養子は別の行）
  passport_presentation: {
    identities: ["spouse"],
    note: "提示のみで、提出書類としてコピーを付ける書類ではない。申請人以外の方が申請書類を提出する場合であっても、提示が必要",
  },
  // NH-9：全事由の必須。名称は原文のとおり「質問書」（家族滞在 R-11 と同じ）
  parents_questionnaire: { causes: ALL_CAUSES, name: "質問書", note: NIHONJIN_HAIGUSHA_QUESTIONNAIRE_NOTE },
  // NH-10：全事由の必須。誰の住民票かは身分で違うため、名称は両方を併記し、違いは注記に書く
  household_residence_certificate: {
    causes: ALL_CAUSES,
    name: "日本人の方（配偶者又は親・養親）の世帯全員の記載のある住民票",
    note: NIHONJIN_HAIGUSHA_RESIDENCE_CERTIFICATE_NOTE,
  },
};
const NIHONJIN_HAIGUSHA_NEW_RULES: Record<string, RequirementRule> = {
  // NH-11：戸籍謄本。配偶者と実子・特別養子で書類が違うため、身分ごとの2行
  spouse_family_register: {
    id: "nihonjin_spouse_family_register",
    name: "配偶者（日本人）の方の戸籍謄本（全部事項証明書）",
    party: "applicant",
    causes: ALL_CAUSES,
    identities: ["spouse"],
    level: "required",
    note: "1通。申請人との婚姻事実の記載があるもの。婚姻事実の記載がない場合は、戸籍謄本に加え婚姻届出受理証明書を提出する。発行日から3か月以内のもの",
    verify: true,
  },
  child_family_register: {
    id: "nihonjin_child_family_register",
    name: "日本人の方（申請人の親又は養親）の戸籍謄本又は除籍謄本（全部事項証明書）",
    party: "applicant",
    causes: ALL_CAUSES,
    identities: ["child"],
    level: "required",
    note: "1通",
    verify: true,
  },
  // NH-12：配偶者のみ
  marriage_certificate: {
    id: "nihonjin_marriage_certificate",
    name: "申請人の国籍国（外国）の機関から発行された結婚証明書",
    party: "applicant",
    causes: ALL_CAUSES,
    identities: ["spouse"],
    level: "required",
    note: "1通。申請人が韓国籍等で戸籍謄本が発行される場合は、お二方の婚姻が記載された外国機関発行の戸籍謄本の提出でもよい",
    verify: true,
  },
  // NH-13 案A：実子・特別養子のみ。3つの場合ごとの「次のいずれか」を、必須の1行にまとめる
  child_birth_or_adoption: {
    id: "nihonjin_child_birth_or_adoption",
    name: "出生又は特別養子縁組を証する文書（日本で出生／海外で出生／特別養子の場合ごとに、次のいずれか）",
    party: "applicant",
    causes: ALL_CAUSES,
    identities: ["child"],
    level: "required",
    note:
      "該当する場合ごとに、次のいずれか1通。日本で出生した場合：(1)出生届受理証明書 (2)認知届受理証明書（発行日から3か月以内のもの。(2)は日本の役所に届出をしている場合のみ）。" +
      "海外で出生した場合：(1)出生国の機関から発行された出生証明書 (2)出生国の機関から発行された申請人の認知に係る証明書（認知に係る証明書がある方のみ）。" +
      "特別養子の場合：(1)特別養子縁組届出受理証明書 (2)日本の家庭裁判所発行の養子縁組に係る審判書謄本及び確定証明書。" +
      "出生の事由の「出生したことを証する書類」と同じ文書で足りるかは、案内ページに記載がないため、行政書士が確認する",
    verify: true,
  },
  // NH-14：(1)(2)のどちらか。必須の1行にまとめる（家族滞在 R-19 案A と同じ形）
  stay_expense: {
    id: "nihonjin_stay_expense",
    name: "日本での滞在費用を証明する資料",
    party: "applicant",
    causes: ALL_CAUSES,
    level: "required",
    note:
      "(1)を提出する。入国後間もない場合や転居等で(1)の資料では滞在費用を証明できない場合は、(2)の資料などを提出する。" +
      "(1)申請人の滞在費用を支弁する方の直近1年分の住民税の課税（又は非課税）証明書及び納税証明書（1年間の総所得及び納税状況が記載されたもの） 各1通。1月1日現在の住所の市区町村が発行する。1年間の総所得及び納税状況の両方が記載されていれば、いずれか一方でよい。発行日から3か月以内のもの。実子・特別養子の場合は、複数の方が扶養するときは収入の多い方。" +
      "(2)その他：預貯金通帳の写し（適宜。Web通帳の画面の写し等〔取引履歴が分かるもの〕でもよいが、加工等できない状態で印刷したものに限り、Excelファイル等は不可）／雇用予定証明書又は採用内定通知書（日本の会社発行のもの。適宜）／これらに準ずるもの（適宜）",
    verify: true,
  },
  // NH-15：両ページ共通の必須。身元保証人は身分で違うため注記に書く
  guarantee_letter: {
    id: "nihonjin_guarantee_letter",
    name: "身元保証書",
    party: "applicant",
    causes: ALL_CAUSES,
    level: "required",
    note: "1通（様式は案内ページにある日本語版・英語版）。身元保証人は、配偶者の場合は日本に居住する配偶者(日本人)、実子・特別養子の場合は日本に居住する日本人の方（申請人の親又は養親）等",
    verify: true,
  },
  // NH-16：配偶者のみ
  spouse_exchange: {
    id: "nihonjin_spouse_exchange",
    name: "夫婦間の交流が確認できる資料",
    party: "applicant",
    causes: ALL_CAUSES,
    identities: ["spouse"],
    level: "required",
    note: "スナップ写真（お二人で写っており、容姿がはっきりと確認できるもの。アプリ加工したものは不可） 2〜3葉。その他、提出できるもの：SNS記録、通話記録",
    verify: true,
  },
  // NH-5 案A：実子・特別養子のページの取得の節には旅券の項が無い。確認が必要な書類として出す
  child_passport_presentation: {
    id: "nihonjin_child_passport_presentation",
    name: "旅券（提示）",
    party: "applicant",
    causes: ALL_CAUSES,
    identities: ["child"],
    level: "check",
    note: "このページ（日本人の実子・特別養子の取得の節）には記載が無い。提示の要否は、行政書士が確認する",
    verify: true,
  },
};
// 原文の並び（申請書・写真・事由別の書類・身分関係の書類・滞在費用・身元保証書・住民票・質問書・夫婦間の交流・旅券・申請取次者の書類）に合わせる
const nihonjinHaigushaBaseById = Object.fromEntries(
  ACQUISITION_BY_CAUSE.rules
    .filter((r) => !NIHONJIN_HAIGUSHA_ACQUISITION_REMOVED_IDS.includes(r.id))
    .map((r) => [r.id, NIHONJIN_HAIGUSHA_ACQUISITION_OVERRIDES[r.id] ? { ...r, ...NIHONJIN_HAIGUSHA_ACQUISITION_OVERRIDES[r.id] } : r]),
) as Record<string, RequirementRule>;
const nihonjinHaigushaRules: RequirementRule[] = [
  nihonjinHaigushaBaseById.application_form,
  nihonjinHaigushaBaseById.photo,
  nihonjinHaigushaBaseById.nationality_proof,
  nihonjinHaigushaBaseById.birth_certificate,
  nihonjinHaigushaBaseById.cause_proof,
  NIHONJIN_HAIGUSHA_NEW_RULES.spouse_family_register,
  NIHONJIN_HAIGUSHA_NEW_RULES.child_family_register,
  NIHONJIN_HAIGUSHA_NEW_RULES.marriage_certificate,
  NIHONJIN_HAIGUSHA_NEW_RULES.child_birth_or_adoption,
  NIHONJIN_HAIGUSHA_NEW_RULES.stay_expense,
  NIHONJIN_HAIGUSHA_NEW_RULES.guarantee_letter,
  nihonjinHaigushaBaseById.household_residence_certificate,
  nihonjinHaigushaBaseById.parents_questionnaire,
  NIHONJIN_HAIGUSHA_NEW_RULES.spouse_exchange,
  nihonjinHaigushaBaseById.passport_presentation,
  NIHONJIN_HAIGUSHA_NEW_RULES.child_passport_presentation,
  nihonjinHaigushaBaseById.agent_identity_document,
];
// NH-20：チェックシートは配偶者・子とも照合済み（差分なし）。題名は「一部のみ整備」
export const NIHONJIN_HAIGUSHA_ACQUISITION: RuleSet = {
  id: "nihonjin_haigusha_acquisition",
  title: "日本人の配偶者等 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "日本人の配偶者等",
  basis: "acquisitionCause",
  alsoBasis: ["identity"],
  checkedAt: ACQUISITION_SET4_COMPARED_AT,
  sources: [ACQUISITION_SET4_PAGES_SOURCE, ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: nihonjinHaigushaRules,
};
// ===== ここまで（取得：文化活動・日本人の配偶者等） =====

// ===== 在留資格取得許可申請（永住者の配偶者等・定住者。Issue #420） =====
// 照合表は docs/official/reconciliation/acquisition-eijushahaigusha-2026-10-24.md・acquisition-teijusha-2026-10-24.md（照合日 2026-10-24）。
// 人の判断（2026-10-24）：各照合表の「判断」欄の推奨のとおり（全件）。取得のチェックシート（PDF）は、永住者の配偶者等は照合済み（001426557。差分なし）、定住者も照合済み（12ページ分。差分なし）。案内ページの本文で作った。
// 永住者の配偶者等・定住者には、認定・変更・更新の規則集合が無い（取得だけを先に作る）。共通の扱いは技人国の取得（#396）と同じ：
// 旅券の理由書・活動に応じた資料を外し、写真は「写真（40mm×30mm）」を全事由の必須（注記は年齢の注記のみ）、申請取次者の書類の注記は原文のとおり。
// ACQUISITION_BY_CAUSE の文言・checkedAt は変えない。出典のページの URL は控えに無いため推測せず、「URL 未記録」の出典（2026-10-24 の版）を置く。
const EIJUSHA_TEIJUSHA_ACQUISITION_COMPARED_AT = "2026-10-24";
const EIJUSHA_TEIJUSHA_UNRECORDED_SOURCE: RuleSource = { ...ACQUISITION_STATUS_PAGES_UNRECORDED_SOURCE, comparedAt: EIJUSHA_TEIJUSHA_ACQUISITION_COMPARED_AT };

// 永住者の配偶者等（EH-1〜EH-14。原文 eijushahaigusha-acquisition_2026-10-24.txt の取得の節 11〜55行）。判定は取得の事由だけ（alsoBasis なし）。
// 該当範囲は「永住者等の配偶者」と「本邦で出生した永住者等の子」。取得の節の書類は配偶者向けだけで事由の別が無いため（EH-1 案A）、
// 結婚証明書（EH-4）・夫婦間の交流（EH-9）は出生では出さず、身元保証書・住民票・質問書（EH-6〜EH-8）は出生のときは要確認にして「行政書士が確認」と書く。
// 事由を証する書類（EH-3）は事由「その他」のまま注記を外す。出生したことを証する書類（23行）・国籍を証する書類（21〜22行）は残す。旅券の理由書（EH-12）・活動に応じた資料（EH-10）は外す。
const EIJUSHA_HAIGUSHA_ACQUISITION_REMOVED_IDS = ["passport_reason_statement", "activity_materials", "parents_questionnaire", "household_residence_certificate"];
const EIJUSHA_HAIGUSHA_ACQUISITION_OVERRIDES: Record<string, Partial<RequirementRule>> = {
  photo: GIJINKOKU_ACQUISITION_OVERRIDES.photo,
  agent_identity_document: GIJINKOKU_ACQUISITION_OVERRIDES.agent_identity_document,
  cause_proof: { note: undefined },
};
const EIJUSHA_HAIGUSHA_BIRTH_NOTE = "このページには、出生で取得する子の場合の記載が無い（取得の節の書類は配偶者向け）。出生の場合の扱いは、行政書士が確認する";
const EIJUSHA_HAIGUSHA_SPOUSE_NOTE = "配偶者の場合の書類（国籍離脱・その他の場合）";
export const EIJUSHA_HAIGUSHA_ACQUISITION: RuleSet = {
  id: "eijusha_haigusha_acquisition",
  title: "永住者の配偶者等 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "永住者の配偶者等",
  basis: "acquisitionCause",
  checkedAt: EIJUSHA_TEIJUSHA_ACQUISITION_COMPARED_AT,
  sources: [EIJUSHA_TEIJUSHA_UNRECORDED_SOURCE, ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: [
    ...ACQUISITION_BY_CAUSE.rules
      .filter((r) => !EIJUSHA_HAIGUSHA_ACQUISITION_REMOVED_IDS.includes(r.id))
      .map((r) => (EIJUSHA_HAIGUSHA_ACQUISITION_OVERRIDES[r.id] ? { ...r, ...EIJUSHA_HAIGUSHA_ACQUISITION_OVERRIDES[r.id] } : r)),
    // EH-4：配偶者向け。出生では出さない
    {
      id: "marriage_certificate",
      name: "配偶者（永住者）及び申請人の国籍国（外国）の機関から発行された結婚証明書",
      party: "applicant",
      causes: ["nationalityLoss", "other"],
      level: "required",
      note: "1通。韓国籍等で戸籍謄本が発行される場合は、婚姻が記載された外国機関発行の戸籍謄本でもよい。日本の役所に届け出ている場合は、婚姻届出受理証明書を提出する",
      verify: true,
    },
    // EH-5 案A：(1)(2)を必須の1行にまとめ、中身は注記に書く
    {
      id: "stay_cost_documents",
      name: "日本での滞在費用を証明する資料",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "(1)滞在費用を支弁する方の直近1年分の住民税の課税（又は非課税）証明書及び納税証明書 各1通（1年間の総所得及び納税状況の両方が記載されていれば一方でよい。発行日から3か月以内）。入国後間もない場合や転居等で(1)で証明できない場合は、(2)預貯金通帳の写し（Web通帳の画面の写し等も可。加工できない状態で印刷したもの）、雇用予定証明書又は採用内定通知書（日本の会社発行）、これらに準ずるもの（各適宜）",
      verify: true,
    },
    // EH-6：身元保証人は日本に居住する配偶者（永住者）。出生は要確認
    {
      id: "identity_guarantee",
      name: "配偶者（永住者）の身元保証書",
      party: "applicant",
      causes: ["nationalityLoss", "other"],
      level: "required",
      note: `1通。身元保証人は、日本に居住する配偶者（永住者）。様式は日本語版・英語版がある。${EIJUSHA_HAIGUSHA_SPOUSE_NOTE}`,
      verify: true,
    },
    {
      id: "identity_guarantee_birth",
      name: "配偶者（永住者）の身元保証書",
      party: "applicant",
      causes: ["birth"],
      level: "check",
      note: `1通。身元保証人は、日本に居住する配偶者（永住者）。${EIJUSHA_HAIGUSHA_BIRTH_NOTE}`,
      verify: true,
    },
    // EH-7：原文のとおりの名称。出生は要確認
    {
      id: "household_residence_certificate",
      name: "配偶者（永住者）の世帯全員の記載のある住民票",
      party: "applicant",
      causes: ["nationalityLoss", "other"],
      level: "required",
      note: `1通。個人番号（マイナンバー）は省略し、他の事項は省略のないもの。${EIJUSHA_HAIGUSHA_SPOUSE_NOTE}`,
      verify: true,
    },
    {
      id: "household_residence_certificate_birth",
      name: "配偶者（永住者）の世帯全員の記載のある住民票",
      party: "applicant",
      causes: ["birth"],
      level: "check",
      note: `1通。個人番号（マイナンバー）は省略し、他の事項は省略のないもの。${EIJUSHA_HAIGUSHA_BIRTH_NOTE}`,
      verify: true,
    },
    // EH-8：名称は原文のとおり「質問書」（家族滞在 R-11 と同じ）。出生は要確認
    {
      id: "questionnaire",
      name: "質問書",
      party: "applicant",
      causes: ["nationalityLoss", "other"],
      level: "required",
      note: `1通。平成29年6月6日改訂の新様式で提出する。日本語のほか、英語・中国語・韓国語などの版がある。様式の記載内容は未確認。${EIJUSHA_HAIGUSHA_SPOUSE_NOTE}`,
      verify: true,
    },
    {
      id: "questionnaire_birth",
      name: "質問書",
      party: "applicant",
      causes: ["birth"],
      level: "check",
      note: `1通。平成29年6月6日改訂の新様式で提出する。様式の記載内容は未確認。${EIJUSHA_HAIGUSHA_BIRTH_NOTE}`,
      verify: true,
    },
    // EH-9：配偶者向け。出生では出さない
    {
      id: "marital_exchange_materials",
      name: "夫婦間の交流が確認できる資料",
      party: "applicant",
      causes: ["nationalityLoss", "other"],
      level: "required",
      note: "スナップ写真（お二人で写っており、容姿がはっきりと確認できるもの。アプリ加工したものは不可）2〜3葉。その他、提出できるもの（SNS記録・通話記録）",
      verify: true,
    },
  ],
};

// 定住者（TJ-1〜TJ-32。原文 teijusha*-acquisition_2026-10-24.txt の12ページ。種類1〜5）。判定は取得の事由と「定住者の区分」（alsoBasis: teijushaType。TJ-1・TJ-3 案A）。
// 区分が未選択の間は、全区分に共通の書類（申請書・写真・旅券・申請取次者・身元保証書）だけを出す。
// 配偶者の仕事（会社勤め・自営業・無職）を選ぶ欄は足さず、収入の書類を必須の1行にまとめて仕事ごとの違いを注記に書く（TJ-2・TJ-15）。
// 日系人のときだけの3書類（4-1。TJ-25）・日本語能力の証明書（5年を希望する場合のみ。TJ-20）・ページに記載の無い書類（5-1 の事由別の書類〔TJ-4〕、5-2 の住民税・住民票・質問書〔TJ-29〕）は、要確認にして条件を注記に書く。
// 新しい書類の party は、扶養者・配偶者・祖父母の書類も applicant とする（所属機関の書類ではないため）。出生の事由の「出生したことを証する書類」と、実子・養子等の出生証明書は別の行（TJ-24）。
const TJ_N3: TeijushaType = "nikkei3";
const TJ_N2S: TeijushaType = "nikkei2Spouse";
const TJ_N3S: TeijushaType = "nikkei3Spouse";
const TJ_C1: TeijushaType = "childPermanent";
const TJ_C2: TeijushaType = "childJapaneseSpouse";
const TJ_C3: TeijushaType = "childPermanentSpouse";
const TJ_A1: TeijushaType = "adoptedJapanese";
const TJ_A2: TeijushaType = "adoptedPermanent";
const TEIJUSHA_NOT_LISTED_NOTE = "このページには記載が無い（他の定住者の区分・認定・変更にはある）。行政書士が確認する";
const TEIJUSHA_BANK_BOOK_NOTE = "預貯金通帳の写し 適宜（Web通帳の画面の写し等も可。加工できない状態で印刷したもの。Excel等は不可）";
const TEIJUSHA_TAX_FOOTNOTE = "1月1日現在の住所の市区町村が発行する。総所得と納税状況の両方が記載されていれば一方でよい。発行されない場合は地方出入国在留管理官署に問い合わせる";
const TEIJUSHA_TAX_NOTE = `各1通。${TEIJUSHA_TAX_FOOTNOTE}`;
const TEIJUSHA_RESIDENCE_NOTE = "1通。個人番号（マイナンバー）は省略し、他の事項は省略のないもの";
const TEIJUSHA_ACQUISITION_OVERRIDES: Record<string, Partial<RequirementRule>> = {
  photo: GIJINKOKU_ACQUISITION_OVERRIDES.photo,
  agent_identity_document: GIJINKOKU_ACQUISITION_OVERRIDES.agent_identity_document,
  cause_proof: { note: undefined },
};
const TEIJUSHA_ACQUISITION_REMOVED_IDS = ["passport_reason_statement", "activity_materials", "parents_questionnaire", "household_residence_certificate"];
// 事由別の3書類（国籍を証する書類・出生したことを証する書類・事由を証する書類）は、5-1 以外の7区分では原文どおりの区分、5-1 では原文に無いため要確認の別の行にする（TJ-4）
const TEIJUSHA_CAUSE_RULE_IDS = ["nationality_proof", "cause_proof", "birth_certificate"];
const TEIJUSHA_WITHOUT_A1: TeijushaType[] = [TJ_N3, TJ_N2S, TJ_N3S, TJ_C1, TJ_C2, TJ_C3, TJ_A2];
const teijushaCauseRules: RequirementRule[] = ACQUISITION_BY_CAUSE.rules
  .filter((r) => !TEIJUSHA_ACQUISITION_REMOVED_IDS.includes(r.id))
  .flatMap((r) => {
    const base = TEIJUSHA_ACQUISITION_OVERRIDES[r.id] ? { ...r, ...TEIJUSHA_ACQUISITION_OVERRIDES[r.id] } : r;
    if (!TEIJUSHA_CAUSE_RULE_IDS.includes(r.id)) return [base];
    return [
      { ...base, teijushaTypes: TEIJUSHA_WITHOUT_A1 },
      {
        ...base,
        id: `${r.id}_adopted_japanese`,
        teijushaTypes: [TJ_A1],
        level: "check" as const,
        note: `この区分（日本人が扶養する6歳未満の養子）の取得の案内には、事由の区分ごとの書類の記載がない。${TEIJUSHA_NOT_LISTED_NOTE}`,
      },
    ];
  });
export const TEIJUSHA_ACQUISITION: RuleSet = {
  id: "teijusha_acquisition",
  title: "定住者 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: "定住者",
  basis: "acquisitionCause",
  alsoBasis: ["teijushaType"],
  checkedAt: EIJUSHA_TEIJUSHA_ACQUISITION_COMPARED_AT,
  sources: [EIJUSHA_TEIJUSHA_UNRECORDED_SOURCE, ACQUISITION_PROCEDURE_GUIDE_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: [
    ...teijushaCauseRules,
    // TJ-23：全区分の必須。身元保証人は区分による
    {
      id: "teijusha_identity_guarantee",
      name: "身元保証書",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "required",
      note: "1通。身元保証人は区分による。通常、日系3世は日本に居住している日本人又は永住者／日系2世の配偶者は2世の方／日系3世の配偶者は3世の方／実子（永住者・定住者・特別永住者が扶養）は扶養者／実子（日本人の配偶者が扶養）・養子（日本人が扶養）は日本人（申請人の扶養者）／実子（永住者の配偶者が扶養）は永住者の方（申請人の扶養者）／養子（永住者・定住者・特別永住者が扶養）は申請人の扶養者",
      verify: true,
    },
    // TJ-11：名称は原文のとおり。5-2 は原文に無いため要確認の別の行（TJ-29）
    {
      id: "teijusha_questionnaire",
      name: "質問書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3, TJ_N2S, TJ_N3S, TJ_C1, TJ_C2, TJ_C3, TJ_A1],
      level: "required",
      note: "1通。日系2世の配偶者・日系3世の配偶者は、平成29年6月6日改訂の新様式で提出する。様式の記載内容は未確認",
      verify: true,
    },
    {
      id: "teijusha_questionnaire_adopted_permanent",
      name: "質問書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_A2],
      level: "check",
      note: TEIJUSHA_NOT_LISTED_NOTE,
      verify: true,
    },
    // TJ-12：住民票。対象者が区分で違う。5-2 は原文に無いため要確認
    {
      id: "teijusha_residence_certificate",
      name: "申請人の住民票（世帯全員の記載があるもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3, TJ_N2S, TJ_N3S, TJ_C1, TJ_A1],
      level: "required",
      note: TEIJUSHA_RESIDENCE_NOTE,
      verify: true,
    },
    {
      id: "teijusha_residence_certificate_japanese",
      name: "日本人の方の住民票（世帯全員の記載があるもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_C2],
      level: "required",
      note: `${TEIJUSHA_RESIDENCE_NOTE}。発行日から3か月以内のもの`,
      verify: true,
    },
    {
      id: "teijusha_residence_certificate_permanent",
      name: "永住者又は永住者の配偶者の方の住民票（世帯全員の記載があるもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_C3],
      level: "required",
      note: TEIJUSHA_RESIDENCE_NOTE,
      verify: true,
    },
    {
      id: "teijusha_residence_certificate_adopted_permanent",
      name: "住民票（世帯全員の記載があるもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_A2],
      level: "check",
      note: TEIJUSHA_NOT_LISTED_NOTE,
      verify: true,
    },
    // TJ-13：住民税の課税・納税証明書。対象者が区分で違う。日系3世は滞在費用（TJ-14）、5-2 は要確認
    {
      id: "teijusha_tax_certificates",
      name: "直近1年分の住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N2S, TJ_N3S, TJ_C1, TJ_C2, TJ_C3, TJ_A1],
      level: "required",
      note: `${TEIJUSHA_TAX_NOTE}。対象者は区分による：日系2世の配偶者は2世の方又は申請人（収入の多い方）／日系3世の配偶者は3世の方又は申請人（収入の多い方）／実子（永住者・定住者・特別永住者が扶養）は扶養者／実子（日本人の配偶者が扶養）は日本人又は日本人の配偶者の方（収入の多い方。戸籍謄本・住民票とともに発行日から3か月以内のもの）／実子（永住者の配偶者が扶養）は永住者又は永住者の配偶者の方（収入の多い方）／養子（日本人が扶養）は日本人の方`,
      verify: true,
    },
    {
      id: "teijusha_tax_certificates_adopted_permanent",
      name: "直近1年分の住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_A2],
      level: "check",
      note: TEIJUSHA_NOT_LISTED_NOTE,
      verify: true,
    },
    // TJ-14：日系3世の滞在費用。(1)(2)を必須の1行にまとめる（家族滞在 R-19 案A）
    {
      id: "teijusha_stay_cost_documents",
      name: "日本での滞在費用を証明するもの",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3],
      level: "required",
      note: `次のいずれか。(1)申請人が自ら証明する場合：預貯金残高証明書（申請人名義のもの）適宜、雇用予定証明書又は採用内定通知書（日本の会社発行のもの）1通 (2)申請人に代わって滞在費用支弁者が日本にいる場合：滞在費用支弁者の方の直近1年分の住民税の課税（又は非課税）証明書及び納税証明書 各1通（${TEIJUSHA_TAX_FOOTNOTE}）`,
      verify: true,
    },
    // TJ-2・TJ-15：職業・収入の書類。会社勤務・自営業等・無職の別は入力せず、必須の1行にまとめる
    {
      id: "teijusha_income_documents",
      name: "職業・収入を証明するもの",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N2S, TJ_N3S, TJ_C1, TJ_C2, TJ_C3, TJ_A1, TJ_A2],
      level: "required",
      note: `次のいずれか（仕事の別による）。会社に勤務：在職証明書 1通／自営業等：確定申告書の控えの写し 1通・営業許可書の写し（ある場合）1通（自ら職業等について立証する）／無職：${TEIJUSHA_BANK_BOOK_NOTE}。対象者は区分による：日系2世・3世の配偶者は2世・3世の方又は申請人（収入の多い方）／実子（永住者・定住者・特別永住者が扶養）・養子（永住者・定住者・特別永住者が扶養）は扶養者／実子（日本人の配偶者が扶養）は日本人又は日本人の配偶者の方（収入の多い方）／実子（永住者の配偶者が扶養）は永住者又は永住者の配偶者の方（収入の多い方）／養子（日本人が扶養）は日本人の方`,
      verify: true,
    },
    // TJ-16：日系3世の身分関係の書類（市区町村）
    {
      id: "teijusha_grandparent_family_register",
      name: "祖父母（日本人）の戸籍謄本又は除籍謄本（全部事項証明書）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3],
      level: "required",
      note: "1通",
      verify: true,
    },
    {
      id: "teijusha_marriage_notification_grandparents",
      name: "婚姻届出受理証明書（祖父母と両親のもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3],
      level: "check",
      note: "各1通。日本の役所に届出をしている場合のみ",
      verify: true,
    },
    {
      id: "teijusha_birth_notification_applicant",
      name: "出生届出受理証明書（申請人のもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3],
      level: "check",
      note: "1通。日本の役所に届出をしている場合のみ。出生の事由の「出生したことを証する書類」と同じ文書で足りるかは、行政書士が確認する",
      verify: true,
    },
    {
      id: "teijusha_death_notification",
      name: "死亡届出受理証明書（祖父母と両親のもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3],
      level: "check",
      note: "各1通。日本の役所に届出をしている場合のみ",
      verify: true,
    },
    // TJ-17：日系3世の本国の結婚・出生証明書
    {
      id: "teijusha_foreign_marriage_certificates",
      name: "祖父母及び両親の本国（外国）の機関から発行された結婚証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3],
      level: "required",
      note: "各1通",
      verify: true,
    },
    {
      id: "teijusha_foreign_birth_certificates_family",
      name: "両親及び申請人の本国（外国）の機関から発行された出生証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3],
      level: "required",
      note: "各1通",
      verify: true,
    },
    // TJ-18：認知に係る証明書（日系3世と実子）。ある方のみ
    {
      id: "teijusha_recognition_certificate",
      name: "申請人の本国（外国）の機関から発行された認知に係る証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3, TJ_C1, TJ_C2, TJ_C3],
      level: "check",
      note: "1通。認知に係る証明書がある方のみ。日系3世の案内ページの原文は「(5)については、認知に係る証明書がある方のみ」と書く（(5)は出生証明書、認知の証明書は(6)）。原文のとおり記録する",
      verify: true,
    },
    // TJ-19・TJ-21・TJ-25：犯罪経歴証明書・実在の公的資料・本人であることの公的資料。実子（永住者・定住者・特別永住者が扶養）は日系人のときだけ（要確認）
    {
      id: "teijusha_criminal_record",
      name: "申請人の犯罪経歴証明書（本国の機関から発行されたもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3, TJ_N3S],
      level: "required",
      note: "1通",
      verify: true,
    },
    {
      id: "teijusha_criminal_record_nikkei_supported",
      name: "申請人の犯罪経歴証明書（本国の機関から発行されたもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_C1],
      level: "check",
      note: "1通。申請人が「定住者」の方の扶養を受ける日系人である場合のみ",
      verify: true,
    },
    {
      id: "teijusha_ancestors_existence",
      name: "祖父母及び父母が実在していたことを証明する公的な資料",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3],
      level: "required",
      note: "適宜（例：祖父母及び父母の旅券、死亡証明書、運転免許証等）",
      verify: true,
    },
    {
      id: "teijusha_ancestors_existence_nikkei_supported",
      name: "祖父母及び父母が実在していたことを証明する公的な資料",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_C1],
      level: "check",
      note: "適宜（例：祖父母及び父母の旅券、死亡証明書、運転免許証等）。申請人が「定住者」の方の扶養を受ける日系人である場合のみ",
      verify: true,
    },
    {
      id: "teijusha_identity_proof",
      name: "申請人が本人であることを証明する公的な資料",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3, TJ_N3S],
      level: "required",
      note: "適宜（例：身分証明書（IDカード）、運転免許証、軍役証明書、選挙人手帳等）",
      verify: true,
    },
    {
      id: "teijusha_identity_proof_nikkei_supported",
      name: "申請人が本人であることを証明する公的な資料",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_C1],
      level: "check",
      note: "適宜（例：身分証明書（IDカード）、運転免許証、軍役証明書、選挙人手帳等）。申請人が「定住者」の方の扶養を受ける日系人である場合のみ",
      verify: true,
    },
    // TJ-21・TJ-22：日系2世・3世の配偶者の婚姻・身分の書類と夫婦間の交流
    {
      id: "teijusha_marriage_notification",
      name: "婚姻届出受理証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N2S, TJ_N3S],
      level: "check",
      note: "1通。日本の役所に届出ている場合のみ",
      verify: true,
    },
    {
      id: "teijusha_applicant_marriage_certificate",
      name: "申請人の本国（外国）の機関から発行された結婚証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N2S, TJ_N3S],
      level: "required",
      note: "1通",
      verify: true,
    },
    {
      id: "teijusha_marital_exchange_materials",
      name: "夫婦間の交流が確認できる資料",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N2S, TJ_N3S],
      level: "required",
      note: "スナップ写真（お二人で写っており、容姿がはっきりと確認できるもの。アプリ加工したものは不可）2〜3葉。その他、提出できるもの（SNS記録・通話記録）",
      verify: true,
    },
    // TJ-20：日本語能力の証明書。在留期間「5年」を希望する場合のみ必要（希望の在留期間の欄とは連動させない）
    {
      id: "teijusha_japanese_proficiency",
      name: "一定の日本語能力があることを証明する証明書（次のいずれか）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3, TJ_N2S, TJ_N3S],
      level: "check",
      note: "在留期間「5年」を希望する場合に提出が必要（未成年者を除く）。次のいずれか：法務大臣が告示で定める日本語教育機関において6月以上の日本語教育を受けたことを証明する文書／「日本語教育の参照枠」におけるB1相当以上の日本語能力を有していることを証明する文書（日本語能力試験N2に合格したことを証明する文書、N3に合格し総合得点が104点以上であることを証明する文書、又はBJTビジネス日本語能力テストで400点以上を取得したことを証明する文書）／学校教育法第1条に規定する学校（幼稚園を除く）において1年以上の教育を受けたことを証明する文書",
      verify: true,
    },
    // TJ-24・TJ-27：実子・養子の書類
    {
      id: "teijusha_support_reason_statement",
      name: "理由書（扶養を受けなければならないことを説明したもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_C1, TJ_C2, TJ_C3, TJ_A2],
      level: "required",
      note: "1通。適宜の様式",
      verify: true,
    },
    {
      id: "teijusha_japanese_family_register",
      name: "日本人の方の戸籍謄本（全部事項証明書）",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_C2, TJ_A1],
      level: "required",
      note: "1通。発行日から3か月以内のもの。養子（日本人が扶養）で養子縁組事実の記載がない場合は、戸籍謄本に加え養子縁組届出受理証明書も提出する",
      verify: true,
    },
    {
      id: "teijusha_birth_notification_child",
      name: "申請人の出生届出受理証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_C1, TJ_C3],
      level: "check",
      note: "1通。日本の役所に届出をしている場合のみ。出生の事由の「出生したことを証する書類」と同じ文書で足りるかは、行政書士が確認する",
      verify: true,
    },
    {
      id: "teijusha_foreign_birth_certificate",
      name: "申請人の本国（外国）の機関から発行された出生証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_N3S, TJ_C1, TJ_C2, TJ_C3, TJ_A1, TJ_A2],
      level: "required",
      note: "1通。出生の事由の「出生したことを証する書類」とは別の行。同じ文書で足りるかは、行政書士が確認する",
      verify: true,
    },
    // TJ-28：養子（永住者・定住者・特別永住者が扶養）の書類
    {
      id: "teijusha_adoption_court_permission",
      name: "養子縁組に係る家庭裁判所の許可書謄本",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_A2],
      level: "check",
      note: "1通。日本において養子縁組を成立させた場合のみ",
      verify: true,
    },
    {
      id: "teijusha_adoption_foreign_certificate",
      name: "申請人と養子縁組が成立していることを証明する本国（外国）の機関から発行された証明書",
      party: "applicant",
      causes: ALL_CAUSES,
      teijushaTypes: [TJ_A2],
      level: "required",
      note: "1通",
      verify: true,
    },
  ],
};
// ===== ここまで（取得：永住者の配偶者等・定住者） =====

// ===== 定住者の在留資格認定証明書交付申請・在留資格変更許可申請・在留期間更新許可申請（Issue #420） =====
// 照合表は docs/official/reconciliation/coe-change-renewal-teijusha-2026-10-24.md（照合日 2026-10-24）。
// 提出書類は、入管庁の「提出書類一覧」（チェックシート。docs/official/teijusha-{coe|change|renewal}-checksheet-*.pdf）のとおり。案内ページの控えは取得の節だけで、認定・変更・更新の節は無い。シートにない書類は足さない。
// 判定は「定住者の区分」（teijushaType。取得と同じ8区分）だけ。取得の事由・所属機関のカテゴリーは使わない（basis: teijushaType）。区分が未選択の間は、全区分に共通の書類（申請書・写真・パスポート及び在留カードの提示）だけを出す。
// 3手続に共通の書類は、下の TEIJUSHA_DOCS に1回だけ書き、手続ごとに対象の区分を割り当てる。取得の TEIJUSHA_ACQUISITION の規則は書き換えない（同じ書類は、同じ id・書類名にして訳を共有する）。
// 日系2世の配偶者・日系3世の配偶者は、各手続とも同じ内容のシートが3枚ある（バイト列が同一）。シートの中身は仕事（会社勤務・自営業等・無職）の3通りを1枚に並べたもので、3枚の違いは無い。
// 日系3世の更新用シートは、提供された資料に無い（TJ-CR-1）。要確認の行を1行だけ置く。
const TEIJUSHA_PROCEDURE_COMPARED_AT = "2026-10-24";
type TeijushaProcedure = "coe" | "change" | "renewal";
const TJ_ALL_TYPES: TeijushaType[] = [TJ_N3, TJ_N2S, TJ_N3S, TJ_C1, TJ_C2, TJ_C3, TJ_A1, TJ_A2];
const TJ_NIKKEI_SPOUSES: TeijushaType[] = [TJ_N2S, TJ_N3S];
// 手続ごとの対象の区分の割り当て（省略した手続には出さない）
type TeijushaTypesByProcedure = Partial<Record<TeijushaProcedure, TeijushaType[]>>;
const tjCoeChange = (types: TeijushaType[]): TeijushaTypesByProcedure => ({ coe: types, change: types });
const tjAll3 = (types: TeijushaType[]): TeijushaTypesByProcedure => ({ coe: types, change: types, renewal: types });
interface TeijushaDoc {
  rule: Omit<RequirementRule, "party" | "causes" | "categories" | "teijushaTypes">;
  types: TeijushaTypesByProcedure;
}
const tjDoc = (rule: TeijushaDoc["rule"], types: TeijushaTypesByProcedure): TeijushaDoc => ({ rule, types });

const TJ_NOTIFIED_NOTE = "日本の役所に届出している場合のみ提出する";
const TJ_NIKKEI_SUPPORTED_NOTE = "申請人が「定住者」の方の扶養を受ける日系人の場合のみ";
const TJ_NEVER_SUBMITTED_NOTE = "一度も入管当局へ提出したことがない方のみ";
const TJ_CRIMINAL_RECORD_NAME = "申請人の犯罪経歴証明書（本国の機関から発行されたもの）";
const TJ_ANCESTORS_NAME = "祖父母及び父母が実在していたことを証明する公的な資料";
const TJ_ANCESTORS_NOTE = "例：祖父母及び父母の旅券、死亡証明書、運転免許証等";
const TJ_IDENTITY_PROOF_NAME = "申請人が本人であることを証明する公的な資料";
const TJ_IDENTITY_PROOF_NOTE = "例：身分証明書（IDカード）、運転免許証、軍役証明書、選挙人手帳等";
const TJ_TAX_NOTE = "1年間の総所得及び納税状況が記載されたもの";

// 対象者が区分と手続で違う書類（住民票・住民税の証明書・職業収入）は、対象者ごとに1行にして、対象の区分と手続を割り当てる
const tjResidence = (person: TeijushaResidencePerson, types: TeijushaTypesByProcedure, level: RequirementRule["level"] = "required", note?: string): TeijushaDoc =>
  tjDoc({ id: person === "applicant" ? "teijusha_residence_certificate" : `teijusha_residence_certificate_${person}`, name: teijushaResidenceName(person), level, ...(note ? { note } : {}) }, types);
const tjTax = (target: TeijushaIncomeTarget, types: TeijushaTypesByProcedure): TeijushaDoc =>
  tjDoc({ id: `teijusha_tax_certificates_${target}`, name: teijushaTaxName(target), level: "required", note: TJ_TAX_NOTE }, types);
const tjIncome = (target: TeijushaIncomeTarget, types: TeijushaTypesByProcedure): TeijushaDoc =>
  tjDoc({ id: `teijusha_income_documents_${target}`, name: TEIJUSHA_INCOME_NAME, level: "required", note: teijushaIncomeNote(target) }, types);

const TEIJUSHA_DOCS: TeijushaDoc[] = [
  // 認定のみ（全区分）
  tjDoc({ id: "return_envelope", name: "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）", level: "required" }, { coe: TJ_ALL_TYPES }),
  // 日系3世の身分関係の書類（TJ-CR-2）
  tjDoc({ id: "teijusha_grandparent_family_register", name: "祖父母（日本人）の戸籍謄本又は除籍謄本（全部事項証明書）", level: "required" }, tjCoeChange([TJ_N3])),
  tjDoc({ id: "teijusha_marriage_notification_grandparents", name: "婚姻届出受理証明書（祖父母と両親のもの）", level: "check", note: TJ_NOTIFIED_NOTE }, tjCoeChange([TJ_N3])),
  tjDoc({ id: "teijusha_birth_notification_applicant", name: "出生届出受理証明書（申請人のもの）", level: "check", note: TJ_NOTIFIED_NOTE }, tjCoeChange([TJ_N3])),
  tjDoc({ id: "teijusha_death_notification", name: "死亡届出受理証明書（祖父母と両親のもの）", level: "check", note: TJ_NOTIFIED_NOTE }, tjCoeChange([TJ_N3])),
  tjDoc({ id: "teijusha_foreign_marriage_certificates", name: "祖父母及び両親の本国（外国）の機関から発行された結婚証明書", level: "required" }, tjCoeChange([TJ_N3])),
  tjDoc({ id: "teijusha_foreign_birth_certificates_family", name: "両親及び申請人の本国（外国）の機関から発行された出生証明書", level: "required" }, tjCoeChange([TJ_N3])),
  // 住民票（TJ-CR-3：誰の住民票かは、区分と手続による）
  tjResidence("applicant", { change: [TJ_N3, TJ_N2S, TJ_N3S, TJ_C1, TJ_A1, TJ_A2], renewal: [TJ_N2S, TJ_N3S, TJ_C1, TJ_C2, TJ_C3, TJ_A1, TJ_A2] }),
  tjResidence("nikkei2", { coe: [TJ_N2S] }),
  tjResidence("nikkei3", { coe: [TJ_N3S] }),
  tjResidence("japanese", { coe: [TJ_C2, TJ_A1], change: [TJ_C2] }),
  tjResidence("permanentOrSpouse", { coe: [TJ_C3], change: [TJ_C3] }),
  tjResidence("supporter", { coe: [TJ_C1, TJ_A2] }),
  tjDoc(
    { id: "teijusha_cohabitant_residence_certificate", name: "本邦における同居者の住民票（世帯全員の記載があるもの）", level: "check", note: "本邦に居住する方と同居する場合のみ提出する" },
    { coe: [TJ_N3] },
  ),
  // 住民税の課税・納税証明書（日系3世は滞在費用の行にある）
  tjTax("nikkei2", { coe: [TJ_N2S] }),
  tjTax("nikkei2OrApplicant", { change: [TJ_N2S], renewal: [TJ_N2S] }),
  tjTax("nikkei3", { coe: [TJ_N3S] }),
  tjTax("nikkei3OrApplicant", { change: [TJ_N3S], renewal: [TJ_N3S] }),
  tjTax("supporter", tjAll3([TJ_C1, TJ_A2])),
  tjTax("japaneseOrSpouse", tjAll3([TJ_C2])),
  tjTax("permanentOrSpouse", tjAll3([TJ_C3])),
  tjTax("japanese", tjAll3([TJ_A1])),
  // 職業・収入を証明するもの。会社勤務・自営業等・無職の別は入力せず、必須の1行にまとめる（取得 TJ-2・TJ-15 と同じ）
  tjIncome("nikkei2", { coe: [TJ_N2S] }),
  tjIncome("nikkei2OrApplicant", { change: [TJ_N2S], renewal: [TJ_N2S] }),
  tjIncome("nikkei3", { coe: [TJ_N3S] }),
  tjIncome("nikkei3OrApplicant", { change: [TJ_N3S], renewal: [TJ_N3S] }),
  tjIncome("supporter", tjAll3([TJ_C1, TJ_A2])),
  tjIncome("japaneseOrSpouse", tjAll3([TJ_C2])),
  tjIncome("permanentOrSpouse", tjAll3([TJ_C3])),
  tjIncome("japanese", tjAll3([TJ_A1])),
  // 日系3世：申請人が自ら証明するか、滞在費用支弁者が証明する（(1)(2)を必須の1行にまとめる。取得 TJ-14 と同じ）
  tjDoc(
    {
      id: "teijusha_stay_cost_documents",
      name: TEIJUSHA_INCOME_NAME,
      level: "required",
      note: "次のいずれか。(1)申請人が自ら証明する場合：預貯金残高証明書（申請人名義のもの。変更用のシートでは「預貯金通帳残高証明書」と記載）及び雇用予定証明書又は採用内定通知書（日本の会社発行のもの）／(2)申請人に代わって滞在費用支弁者が日本にいる場合：滞在費用支弁者の直近1年分の住民税の課税（又は非課税）証明書及び納税証明書（1年間の総所得及び納税状況が記載されたもの）",
    },
    tjCoeChange([TJ_N3]),
  ),
  // 身元保証書（身元保証人は区分による。日系3世の更新用シートは無い）
  tjDoc(
    {
      id: "teijusha_identity_guarantee",
      name: "身元保証書",
      level: "required",
      note: "1通。身元保証人は区分による。通常、日系3世は日本に居住している日本人又は永住者／日系2世の配偶者は2世の方／日系3世の配偶者は3世の方／実子（永住者・定住者・特別永住者が扶養）は扶養者／実子（日本人の配偶者が扶養）・養子（日本人が扶養）は日本人（申請人の扶養者）／実子（永住者の配偶者が扶養）は永住者の方（申請人の扶養者）／養子（永住者・定住者・特別永住者が扶養）は申請人の扶養者",
    },
    { coe: TJ_ALL_TYPES, change: TJ_ALL_TYPES, renewal: TJ_ALL_TYPES.filter((t) => t !== TJ_N3) },
  ),
  // 犯罪経歴証明書（区分と手続で条件が違う）
  tjDoc({ id: "teijusha_criminal_record", name: TJ_CRIMINAL_RECORD_NAME, level: "required" }, tjCoeChange([TJ_N3, TJ_N3S])),
  tjDoc({ id: "teijusha_criminal_record_renewal", name: TJ_CRIMINAL_RECORD_NAME, level: "check", note: TJ_NEVER_SUBMITTED_NOTE }, { renewal: [TJ_N3S] }),
  tjDoc({ id: "teijusha_criminal_record_nikkei_supported", name: TJ_CRIMINAL_RECORD_NAME, level: "check", note: TJ_NIKKEI_SUPPORTED_NOTE }, tjCoeChange([TJ_C1])),
  tjDoc(
    { id: "teijusha_criminal_record_nikkei_supported_renewal", name: TJ_CRIMINAL_RECORD_NAME, level: "check", note: "申請人が「定住者」の方の扶養を受ける日系人の場合で、一度も入管当局へ提出したことがない方のみ" },
    { renewal: [TJ_C1] },
  ),
  // 実在の公的資料・本人であることの公的資料（日系3世は必須、日系人の扶養を受ける実子は日系人のときだけ）
  tjDoc({ id: "teijusha_ancestors_existence", name: TJ_ANCESTORS_NAME, level: "required", note: TJ_ANCESTORS_NOTE }, tjCoeChange([TJ_N3])),
  tjDoc({ id: "teijusha_ancestors_existence_nikkei_supported", name: TJ_ANCESTORS_NAME, level: "check", note: `${TJ_ANCESTORS_NOTE}。${TJ_NIKKEI_SUPPORTED_NOTE}` }, tjCoeChange([TJ_C1])),
  tjDoc({ id: "teijusha_identity_proof", name: TJ_IDENTITY_PROOF_NAME, level: "required", note: TJ_IDENTITY_PROOF_NOTE }, tjCoeChange([TJ_N3, TJ_N3S])),
  tjDoc({ id: "teijusha_identity_proof_nikkei_supported", name: TJ_IDENTITY_PROOF_NAME, level: "check", note: `${TJ_IDENTITY_PROOF_NOTE}。${TJ_NIKKEI_SUPPORTED_NOTE}` }, tjCoeChange([TJ_C1])),
  // 認知に係る証明書（ある方のみ）
  tjDoc(
    { id: "teijusha_recognition_certificate", name: "申請人の本国（外国）の機関から発行された認知に係る証明書", level: "check", note: "認知に係る証明書がある方のみ提出する" },
    tjCoeChange([TJ_N3, TJ_C1, TJ_C2, TJ_C3]),
  ),
  // 日系2世・3世の配偶者の婚姻・夫婦の書類
  tjDoc({ id: "teijusha_marriage_notification", name: "婚姻届出受理証明書", level: "check", note: TJ_NOTIFIED_NOTE }, tjCoeChange(TJ_NIKKEI_SPOUSES)),
  tjDoc({ id: "teijusha_applicant_marriage_certificate", name: "申請人の本国（外国）の機関から発行された結婚証明書", level: "required" }, tjCoeChange(TJ_NIKKEI_SPOUSES)),
  tjDoc({ id: "teijusha_questionnaire", name: "質問書", level: "required", note: "様式の記載内容は未確認", verify: true }, tjCoeChange(TJ_NIKKEI_SPOUSES)),
  tjDoc(
    {
      id: "teijusha_marital_exchange_materials",
      name: "夫婦間の交流が確認できる資料",
      level: "required",
      note: "スナップ写真（お二人で写っており、容姿がはっきりと確認できるもの。アプリ加工したものは不可）2〜3葉。その他、提出できるもの（SNS記録・通話記録）",
    },
    tjCoeChange(TJ_NIKKEI_SPOUSES),
  ),
  tjDoc({ id: "teijusha_marriage_continuation", name: "お二方の婚姻が継続していることを証明する資料", level: "required" }, { renewal: TJ_NIKKEI_SPOUSES }),
  // 日本語能力（在留期間「5年」を希望する場合のみ。希望の在留期間の欄とは連動させない。取得 TJ-20 と同じ）
  tjDoc(
    {
      id: "teijusha_japanese_proficiency",
      name: "一定の日本語能力があることを証明する文書",
      level: "check",
      note: "在留期間「5年」を希望する場合に提出が必要（未成年者を除く）。例：日本語能力試験N2に合格したことを証明する文書",
    },
    { coe: [TJ_N3, TJ_N2S, TJ_N3S], change: [TJ_N3, TJ_N2S, TJ_N3S], renewal: TJ_NIKKEI_SPOUSES },
  ),
  // 実子・養子の書類
  tjDoc(
    { id: "teijusha_support_reason_statement", name: "理由書（扶養を受けなければならないことを説明したもの）", level: "required", note: "適宜の様式" },
    tjCoeChange([TJ_C1, TJ_C2, TJ_C3, TJ_A2]),
  ),
  tjDoc({ id: "teijusha_japanese_family_register", name: "日本人の方の戸籍謄本（全部事項証明書）", level: "required" }, tjAll3([TJ_C2, TJ_A1])),
  tjDoc({ id: "teijusha_birth_notification_child", name: "申請人の出生届出受理証明書", level: "required" }, tjCoeChange([TJ_C1, TJ_C3])),
  tjDoc({ id: "teijusha_foreign_birth_certificate", name: "申請人の本国（外国）の機関から発行された出生証明書", level: "required" }, tjCoeChange([TJ_N3S, TJ_C1, TJ_C2, TJ_C3, TJ_A1, TJ_A2])),
  tjDoc(
    { id: "teijusha_adoption_notification_adopted_japanese", name: "養子縁組届出受理証明書", level: "check", note: "日本人の方の戸籍謄本に養子縁組事実の記載がない場合のみ提出する" },
    tjCoeChange([TJ_A1]),
  ),
  tjDoc({ id: "teijusha_adoption_notification", name: "申請人の養子縁組届出受理証明書", level: "required" }, tjCoeChange([TJ_A2])),
  tjDoc({ id: "teijusha_adoption_court_permission", name: "養子縁組に係る家庭裁判所の許可書謄本", level: "check", note: "日本において養子縁組を成立させた場合のみ提出する" }, { change: [TJ_A2] }),
  tjDoc(
    { id: "teijusha_adoption_foreign_certificate", name: "申請人と養子縁組が成立していることを証明する本国（外国）の機関から発行された証明書", level: "required" },
    tjCoeChange([TJ_A2]),
  ),
  // 日系3世の更新用シートは無い（TJ-CR-1）。書類の行ではなく、行政書士が確認することを知らせる行
  tjDoc(
    {
      id: "teijusha_renewal_nikkei3_no_checksheet",
      name: "日系3世の方の在留期間更新許可申請の提出書類一覧は、提供された資料に無い",
      level: "check",
      note: "認定・変更・取得にはあるが、更新用の提出書類一覧（チェックシート）は提供された資料にない。申請書・写真・パスポート及び在留カードの提示のほかの書類は、行政書士が確認する",
      verify: true,
    },
    { renewal: [TJ_N3] },
  ),
];

const TEIJUSHA_PROCEDURE_SHEET_SOURCES: Record<TeijushaProcedure, RuleSource> = {
  coe: {
    title: "「定住者」に係る提出書類一覧（在留資格認定証明書交付申請用。区分ごとに別のPDFで、日系3世の方の分を掲載）（出入国在留管理庁）",
    url: "https://www.moj.go.jp/isa/content/001426562.pdf",
    kind: "pdf",
    comparedAt: TEIJUSHA_PROCEDURE_COMPARED_AT,
  },
  change: {
    title: "「定住者」に係る提出書類一覧（在留資格変更許可申請用。区分ごとに別のPDFで、日系3世の方の分を掲載）（出入国在留管理庁）",
    url: "https://www.moj.go.jp/isa/content/001426564.pdf",
    kind: "pdf",
    comparedAt: TEIJUSHA_PROCEDURE_COMPARED_AT,
  },
  renewal: {
    title: "「定住者」に係る提出書類一覧（在留期間更新許可申請用。区分ごとに別のPDFで、日系2世の方の配偶者の分を掲載）（出入国在留管理庁）",
    url: "https://www.moj.go.jp/isa/content/001426582.pdf",
    kind: "pdf",
    comparedAt: TEIJUSHA_PROCEDURE_COMPARED_AT,
  },
};

function teijushaProcedureRules(procedure: TeijushaProcedure): RequirementRule[] {
  const docs = TEIJUSHA_DOCS.flatMap((d): RequirementRule[] => {
    const types = d.types[procedure];
    return types ? [{ ...d.rule, party: "applicant", teijushaTypes: types }] : [];
  });
  // 申請書・写真・旅券等は、手続ごとの共通の書類（procedureCommonRules）。シートの末尾の「パスポート及び在留カードの提示」（変更・更新）に当たる
  return [...procedureCommonRules(procedure), ...docs];
}

export const TEIJUSHA_COE: RuleSet = {
  id: "teijusha_coe",
  title: "定住者 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: "定住者",
  basis: "teijushaType",
  checkedAt: TEIJUSHA_PROCEDURE_COMPARED_AT,
  sources: [TEIJUSHA_PROCEDURE_SHEET_SOURCES.coe],
  rules: teijushaProcedureRules("coe"),
};
export const TEIJUSHA_CHANGE: RuleSet = {
  id: "teijusha_change",
  title: "定住者 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: "定住者",
  basis: "teijushaType",
  checkedAt: TEIJUSHA_PROCEDURE_COMPARED_AT,
  sources: [TEIJUSHA_PROCEDURE_SHEET_SOURCES.change],
  rules: teijushaProcedureRules("change"),
};
export const TEIJUSHA_RENEWAL: RuleSet = {
  id: "teijusha_renewal",
  title: "定住者 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: "定住者",
  basis: "teijushaType",
  checkedAt: TEIJUSHA_PROCEDURE_COMPARED_AT,
  sources: [TEIJUSHA_PROCEDURE_SHEET_SOURCES.renewal],
  rules: teijushaProcedureRules("renewal"),
};
// ===== ここまで（定住者の認定・変更・更新） =====

// ===== 永住許可申請（手続種別 permanent。Issue #420） =====
// 照合表は docs/official/reconciliation/eijuu-2026-10-24.md（照合日 2026-10-24）。人の判断は未了（各行「推奨(未判断)」）。推奨のとおりに実装した。
// 照合元は、提出書類一覧表（xlsx）4点：日本人の配偶者（001422063）・日本人の実子・特別養子（001422064）・永住者等の配偶者（001422065）・永住者等の実子（001422066）。
// 一覧表にない書類（旅券・在留カードの提示、申請取次者の書類、所得の預貯金通帳、セルフチェックシートなど。照合表 EJ-4〜EJ-8）は足さない。
// 手続（EJ-1）：永住許可申請を手続種別 permanent として足した。規則を引く在留資格は、取得・変更・認定と違い、現在の在留資格（statusForRules の既定）。
// 区分（EJ-2）：現在の在留資格（日本人の配偶者等／永住者の配偶者等）ごとに規則集合を作り、一覧表の区分（配偶者／実子）は軸 eijuuType（basis）で判定する。
// 区分が未選択の間は、区分に共通の書類（eijuuTypes を省略した行）だけを出す。
// level（EJ-3）：一覧表の「●」で条件の記載がない書類は required。「〜の方は」「〜場合」など該当者のみの書類は check（注記に条件）。一覧表に「できれば」の書類は無く、optional は使わない。
// 一覧表の「申請人」「配偶者（扶養する方）」の列は、書類を用意する人の別。規則の party は applicant のまま、注記の先頭に「申請人及び配偶者の分」と書く。
// 配偶者向け（spouse）と実子向け（child）で、年数・留意事項が違う行は、区分ごとに別の行にする（id の末尾 _spouse／_child）。
const EIJUU_COMPARED_AT = "2026-10-24";
const EIJUU_PAGE_SOURCE: RuleSource = {
  title: "入管庁『手続の種類から探す』永住許可申請・永住許可申請１（URL 未記録）",
  url: "https://www.moj.go.jp/isa/index.html",
  kind: "page",
  comparedAt: EIJUU_COMPARED_AT,
};
const eijuuChecklistSource = (title: string, fileId: string): RuleSource => ({
  title,
  url: `https://www.moj.go.jp/isa/content/${fileId}.xlsx`,
  kind: "form",
  comparedAt: EIJUU_COMPARED_AT,
});
const EIJUU_CERT_NOTE = "日本で発行される証明書は、発行日から3か月以内のもの";

/** 永住許可申請の規則集合が扱う提出書類一覧表の区分（規則に書かれた区分の和集合。EIJUU_TYPES の順）。案件の入力欄の選択肢に使う */
export function eijuuTypesOf(ruleSet: Pick<RuleSet, "rules">): EijuuType[] {
  const used = new Set<EijuuType>();
  for (const r of ruleSet.rules) r.eijuuTypes?.forEach((t) => used.add(t));
  return EIJUU_TYPES.filter((t) => used.has(t));
}

type EijuuFamily = "nihonjin" | "eijusha";
type EijuuGroup = "spouse" | "child";

function eijuuRulesOf(family: EijuuFamily): RequirementRule[] {
  const spouseType: EijuuType = family === "nihonjin" ? "nihonjinSpouse" : "eijushaSpouse";
  const childType: EijuuType = family === "nihonjin" ? "nihonjinChild" : "eijushaChild";
  const typeOf = (g: EijuuGroup): EijuuType => (g === "spouse" ? spouseType : childType);
  const rule = (id: string, name: string, level: RequirementRule["level"], note: string | undefined, types?: EijuuType[]): RequirementRule => ({
    id,
    name,
    party: "applicant",
    level,
    ...(note ? { note } : {}),
    ...(types ? { eijuuTypes: types } : {}),
  });
  // 配偶者向け・実子向けで中身が違う行。年数は、配偶者は住民税3年・年金等2年、実子は1年・1年（一覧表のとおり）
  const group = (g: EijuuGroup) => {
    const tax = g === "spouse" ? 3 : 1;
    const ins = g === "spouse" ? 2 : 1;
    const who = g === "spouse" ? "申請人及び配偶者の分。" : "申請人及び申請人を扶養する方（同一世帯の方）の分。";
    const t = [typeOf(g)];
    const sfx = `_${g}`;
    return {
      occupation: rule(
        `eijuu_occupation${sfx}`,
        "申請人又は申請人を扶養する方の職業を証明するいずれかの資料",
        "required",
        `${who}(1)会社等に勤務している場合：在職証明書／(2)自営業等である場合：確定申告書控えの写し、営業許可書の写し（ある場合）。自営業等の方は、自ら職業等について立証する必要がある（登記事項証明書等）／(3)その他の場合：職業に係る説明書（書式自由）及びその立証資料。申請人及び配偶者の方お二方とも無職の場合も、その旨を説明書（書式自由）に記載して提出する`,
        t,
      ),
      taxCertificate: rule(
        `eijuu_resident_tax_certificate${sfx}`,
        `直近${tax}年分の住民税の課税（又は非課税）証明書（1年間の総所得及び納税状況が記載されたもの）`,
        "required",
        `${who}お住まいの市区町村から発行される。1年間の総所得及び納税状況（税金を納めているかどうか）の両方が記載されている証明書であれば、いずれか一方でよい。${
          g === "spouse"
            ? "市区町村において直近3年分の証明書が発行されない場合は、発行される最長期間分を提出する。入国後間もない場合や転居等により市区町村から発行されない場合は、最寄りの地方出入国在留管理官署に問い合わせる。"
            : "入国から1年後に永住許可申請を行う場合など、この証明書が提出できない場合は、これに代えて、給与所得の源泉徴収票（写し）又は給与明細書（写し）等の資料を提出する。"
        }未納・遅延納付がないことを確認する。${EIJUU_CERT_NOTE}`,
        t,
      ),
      taxPayment: rule(
        `eijuu_resident_tax_payment${sfx}`,
        `直近${tax}年分の住民税の納税証明書（1年間の総所得及び納税状況が記載されたもの）`,
        "required",
        `${who}課税（又は非課税）証明書に総所得及び納税状況の両方が記載されている場合は、いずれか一方でよい（課税証明書の行の留意事項）。${EIJUU_CERT_NOTE}`,
        t,
      ),
      taxTimely: rule(
        `eijuu_resident_tax_timely${sfx}`,
        `直近${tax}年間において住民税を適正な時期に納めていることを証明する資料（通帳の写し、領収証書等）`,
        "check",
        `${who}直近${tax}年間において住民税が特別徴収（給与から天引き）されていない期間がある方は、当該期間分について提出する。直近${tax}年間の全ての期間で特別徴収されている方は不要（課税証明書・納税証明書のみ提出する）。Web通帳の画面の写し等（取引履歴が分かるもの）でもよい。提出が困難な方は、その理由を記載した理由書（任意の様式に作成者と作成年月日を記載したもの）を提出する。未納・遅延納付がないことを確認する`,
        t,
      ),
      nationalTax: rule(
        `eijuu_national_tax_certificate${sfx}`,
        "源泉所得税及び復興特別所得税、申告所得税及び復興特別所得税、消費税及び地方消費税、相続税、贈与税に係る納税証明書（その３）",
        "required",
        `${who}住所地を管轄する税務署から発行される。納税証明書（その３）は、証明日現在で未納がないことを証明するもので、対象期間の指定は不要。5税目全てに係る納税証明書を提出する。未納がないことを確認する。${EIJUU_CERT_NOTE}`,
        t,
      ),
      pension: rule(
        `eijuu_pension_record${sfx}`,
        "年金事務所発行の「被保険者記録照会回答票」、「被保険者記録照会（納付Ⅰ）」及び「被保険者記録照会（納付Ⅱ）」",
        "required",
        `${who}最寄りの年金事務所の窓口又は電話に問い合わせる。このほか、ア「ねんきん定期便」（全期間の年金記録情報が表示されているもの）、イ ねんきんネットの「各月の年金記録」の印刷画面、ウ 国民年金保険料領収証書（写し）を提出することも可能（基礎年金番号部分は黒塗りする）。イの提出で、申請時の直近${ins}年間に国民年金の被保険者であった期間がある方は、「国民年金の年金記録（各月の納付状況）」の印刷画面も併せて提出する。「ねんきん定期便」は、35・45・59歳の誕生月に封書で送付されたものが使える（毎年送付されるハガキ形式のものは不可）。直近${ins}年間に国民年金に加入していた期間がある方は、当該期間分の領収証書（写し）を全て提出する。直近${ins}年間の全ての期間で国民年金に加入し、直近${ins}年間（${ins * 12}月分）の領収証書（写し）を提出できる場合は、年金事務所発行の資料は提出不要。提出が困難な方は、その理由を記載した理由書（任意の様式に作成者と作成年月日を記載したもの）を提出する。未納・遅延納付がないことを確認する`,
        t,
      ),
      healthCard: rule(
        `eijuu_health_insurance_card${sfx}`,
        "世帯全員分の健康保険被保険者証（写し）",
        "check",
        `${who}保険者番号及び被保険者等記号・番号を黒塗りしたものを提出する。現在、健康保険に加入している方は提出する。直近${ins}年間の全ての期間において引き続き健康保険に加入している方は、国民健康保険に関する3つの資料（被保険者証・納付証明書・領収証書）は不要`,
        t,
      ),
      nhiCard: rule(
        `eijuu_national_health_insurance_card${sfx}`,
        "世帯全員分の国民健康保険被保険者証（写し）",
        "check",
        `${who}保険者番号及び被保険者等記号・番号を黒塗りしたものを提出する。現在、国民健康保険に加入している方は提出する`,
        t,
      ),
      nhiPayment: rule(
        `eijuu_nhi_payment_certificate${sfx}`,
        `直近${ins}年間の国民健康保険料（税）納付証明書`,
        "check",
        `${who}保険者番号及び被保険者等記号・番号を黒塗りしたものを提出する。直近${ins}年間において国民健康保険に加入していた期間がある方は提出する。未納・遅延納付がないことを確認する`,
        t,
      ),
      nhiReceipt: rule(
        `eijuu_nhi_receipt${sfx}`,
        `直近${ins}年間の国民健康保険料（税）領収証書（写し）`,
        "check",
        `${who}保険者番号及び被保険者等記号・番号を黒塗りしたものを提出する。直近${ins}年間において国民健康保険に加入していた期間がある方は、当該期間分の領収書（写し）を全て提出する。提出が困難な方は、その理由を記載した理由書（任意の様式に作成者と作成年月日を記載したもの）を提出する。未納・遅延納付がないことを確認する`,
        t,
      ),
      socialReceipt: rule(
        `eijuu_social_insurance_receipt${sfx}`,
        `直近${ins}年間の健康保険・厚生年金保険料領収証書（写し）`,
        "check",
        `${who}申請時の直近${ins}年間において社会保険適用事業所の事業主である期間がある方は、この資料か、次の行の社会保険料納入証明書等のいずれかを提出する。未納・遅延納付がないことを確認する`,
        t,
      ),
      socialCertificate: rule(
        `eijuu_social_insurance_certificate${sfx}`,
        `直近${ins}年間の社会保険料納入証明書又は社会保険料納入確認（申請）書（いずれも未納の有無を証明・確認する場合）`,
        "check",
        `${who}申請時の直近${ins}年間において社会保険適用事業所の事業主である期間がある方は、前の行の領収証書（写し）か、この資料のいずれかを提出する`,
        t,
      ),
    };
  };
  const sp = group("spouse");
  const ch = group("child");
  // 身分関係の書類（一覧表の3番）。区分ごとに書類が違う
  const identityDocs: RequirementRule[] =
    family === "nihonjin"
      ? [
          rule("eijuu_spouse_family_register", "配偶者の戸籍謄本（全部事項証明書）", "required", EIJUU_CERT_NOTE, [spouseType]),
          rule("eijuu_spouse_marriage_certificate", "申請人の国籍国の機関から発行された婚姻証明書", "required", "外国語で作成されている場合は、訳文（日本語）を添付する", [spouseType]),
          rule("eijuu_child_family_register", "日本人親の戸籍謄本（全部事項証明書）", "required", EIJUU_CERT_NOTE, [childType]),
        ]
      : [
          rule("eijuu_marriage_proof", "婚姻関係を証明する資料（次のいずれか）", "required", "a.配偶者との婚姻証明書／b.上記aに準ずる文書（申請人と配偶者の方の身分関係を証するもの）。外国語で作成されている場合は、訳文（日本語）を添付する", [spouseType]),
          rule("eijuu_parentage_proof", "親子関係を証明する資料（次のいずれか）", "required", "a.出生証明書／b.上記aに準ずる文書（申請人と永住者又は特別永住者との身分関係を証するもの）。外国語で作成されている場合は、訳文（日本語）を添付する", [childType]),
        ];
  const pairs = <K extends keyof typeof sp>(k: K) => [sp[k], ch[k]];
  return [
    rule("eijuu_application_form", "永住許可申請書", "required", "出入国在留管理庁のホームページからダウンロードできる。必要な事項が全て記載されていることを確認する"),
    rule(
      "eijuu_photo",
      "写真（縦4cm×横3cm）",
      "required",
      "申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。写真の裏面に申請人の氏名を記載して、永住許可申請書の写真欄に貼付して提出する。1歳に満たない方は、写真の提出は不要（令和8年6月13日以前は16歳未満の方が不要だったが、令和8年6月14日以降に交付される在留カードからは、1歳以上の方について写真の提出が必要）",
    ),
    ...identityDocs,
    rule("eijuu_household_residence_certificate", "申請人を含む家族全員（世帯）の住民票", "required", `個人番号（マイナンバー）は省略し、他の事項については省略のないもの。${EIJUU_CERT_NOTE}`),
    ...pairs("occupation"),
    ...pairs("taxCertificate"),
    ...pairs("taxPayment"),
    ...pairs("taxTimely"),
    ...pairs("nationalTax"),
    ...pairs("pension"),
    ...pairs("healthCard"),
    ...pairs("nhiCard"),
    ...pairs("nhiPayment"),
    ...pairs("nhiReceipt"),
    ...pairs("socialReceipt"),
    ...pairs("socialCertificate"),
    // 親族一覧表：一覧表では配偶者の区分だけにある（案内ページ：「実子又は特別養子を除く」）
    rule("eijuu_relatives_list", "親族一覧表", "required", "案内ページでは、申請人が「日本人の配偶者等」又は「永住者の配偶者等」（実子又は特別養子を除く。）の在留資格である場合に提出する", [spouseType]),
    rule("eijuu_identity_guarantee", "身元保証書", "required", "身元保証人には、通常、日本に居住する日本人、永住者又は特別永住者の方になっていただく"),
    rule("eijuu_identity_guarantee_documents", "身元保証書に係る資料", "required", "身元保証人の身分事項を明らかにする書類（運転免許証、在留カードの写し等）"),
    rule("eijuu_written_acknowledgment", "了解書", "required", "出入国在留管理庁のホームページからダウンロードできる"),
  ];
}

export const EIJUU_NIHONJIN_HAIGUSHA: RuleSet = {
  id: "eijuu_nihonjin_haigusha",
  title: "日本人の配偶者等 永住許可申請（一部のみ整備）",
  procedureType: "permanent",
  residenceStatus: "日本人の配偶者等",
  basis: "eijuuType",
  checkedAt: EIJUU_COMPARED_AT,
  sources: [
    EIJUU_PAGE_SOURCE,
    eijuuChecklistSource("永住許可申請に係る提出書類一覧表（日本人の配偶者の方）", "001422063"),
    eijuuChecklistSource("永住許可申請に係る提出書類一覧表（日本人の実子（特別養子縁組含む。）の方）", "001422064"),
  ],
  rules: eijuuRulesOf("nihonjin"),
};

export const EIJUU_EIJUSHA_HAIGUSHA: RuleSet = {
  id: "eijuu_eijusha_haigusha",
  title: "永住者の配偶者等 永住許可申請（一部のみ整備）",
  procedureType: "permanent",
  residenceStatus: "永住者の配偶者等",
  basis: "eijuuType",
  checkedAt: EIJUU_COMPARED_AT,
  sources: [
    EIJUU_PAGE_SOURCE,
    eijuuChecklistSource("永住許可申請に係る提出書類一覧表（永住者又は特別永住者の配偶者の方）", "001422065"),
    eijuuChecklistSource("永住許可申請に係る提出書類一覧表（永住者又は特別永住者の実子の方）", "001422066"),
  ],
  rules: eijuuRulesOf("eijusha"),
};
// ===== ここまで（永住許可申請） =====

export const RULE_SETS: RuleSet[] = [
  GIJINKOKU_RENEWAL,
  GIJINKOKU_CHANGE,
  GIJINKOKU_COE,
  KEIEI_KANRI_RENEWAL,
  KEIEI_KANRI_CHANGE,
  KEIEI_KANRI_COE,
  // 高度専門職2号の変更は、1号（HSP_CHANGE）より先に照合する
  HSP_CHANGE_2,
  HSP_CHANGE,
  HSP_COE,
  HSP_RENEWAL,
  // 高度専門職の取得は、在留資格を問わない ACQUISITION_BY_CAUSE より先に照合する
  HSP_ACQUISITION,
  // 技人国・家族滞在の取得（Issue #396）も、ACQUISITION_BY_CAUSE より先に照合する
  GIJINKOKU_ACQUISITION,
  KAZOKUTAIZAI_ACQUISITION,
  // 経営・管理・研究・企業内転勤の取得（Issue #420。#423・#426・#427）も、ACQUISITION_BY_CAUSE より先に照合する
  KEIEI_KANRI_ACQUISITION,
  KENKYU_ACQUISITION,
  KIGYONAI_ACQUISITION,
  // 医療・技能・介護の取得（Issue #420）も、ACQUISITION_BY_CAUSE より先に照合する
  IRYO_ACQUISITION,
  GINO_ACQUISITION,
  KAIGO_ACQUISITION,
  // 永住者の配偶者等・定住者の取得（Issue #420）も、ACQUISITION_BY_CAUSE より先に照合する
  EIJUSHA_HAIGUSHA_ACQUISITION,
  TEIJUSHA_ACQUISITION,
  // 定住者の認定・変更・更新（Issue #420。チェックシートによる）
  TEIJUSHA_COE,
  TEIJUSHA_CHANGE,
  TEIJUSHA_RENEWAL,
  // 教授・教育・報道の取得（Issue #420）も、ACQUISITION_BY_CAUSE より先に照合する
  PROFESSOR_ACQUISITION,
  EDUCATION_ACQUISITION,
  HODO_ACQUISITION,
  ACQUISITION_BY_CAUSE,
  // 取得：芸術・宗教・法律・会計業務・短期滞在（Issue #421・#422・#424・#431）。在留資格に固有の規則集合は、
  // 在留資格を問わない ACQUISITION_BY_CAUSE より先に選ばれる（並び順によらない。matchRuleSet）
  // 取得：文化活動・日本人の配偶者等（Issue #420）
  BUNKA_KATSUDO_ACQUISITION,
  NIHONJIN_HAIGUSHA_ACQUISITION,
  GEIJUTSU_ACQUISITION,
  SHUKYO_ACQUISITION,
  HOUMU_KAIKEI_ACQUISITION,
  TANKI_TAIZAI_ACQUISITION,
  // 取得：公用・技能実習・留学（Issue #420。照合 2026-10-24）
  KOYO_ACQUISITION,
  GINOU_JISSHU_ACQUISITION,
  RYUGAKU_ACQUISITION,
  // 永住許可申請（Issue #420。照合 2026-10-24）
  EIJUU_NIHONJIN_HAIGUSHA,
  EIJUU_EIJUSHA_HAIGUSHA,
  // 介護（Issue #297）
  KAIGO_RENEWAL,
  KAIGO_CHANGE,
  KAIGO_COE,
  // 法律・会計業務（Issue #301）
  HOUMU_KAIKEI_RENEWAL,
  HOUMU_KAIKEI_CHANGE,
  HOUMU_KAIKEI_COE,
  // 教授（Issue #292）
  PROFESSOR_RENEWAL,
  PROFESSOR_CHANGE,
  PROFESSOR_COE,
  // 医療（Issue #302）
  IRYO_RENEWAL,
  IRYO_CHANGE,
  IRYO_COE,
  // 研究（Issue #296）
  KENKYU_RENEWAL,
  KENKYU_CHANGE,
  KENKYU_COE,
  // 教育（Issue #293）
  EDUCATION_RENEWAL,
  EDUCATION_CHANGE,
  EDUCATION_COE,
  // 報道（Issue #294）
  HODO_RENEWAL,
  HODO_CHANGE,
  HODO_COE,
  // 技能（Issue #298）
  GINO_RENEWAL,
  GINO_CHANGE,
  GINO_COE,
  // 企業内転勤（Issue #295）
  KIGYONAI_RENEWAL,
  KIGYONAI_CHANGE,
  KIGYONAI_COE,
  // 特定活動（特定研究等活動。Issue #299）
  TOKUTEI_KENKYU_RENEWAL,
  TOKUTEI_KENKYU_CHANGE,
  TOKUTEI_KENKYU_COE,
  // 特定活動（本邦大学卒業者。Issue #300）
  DAIGAKU_SOTSUGYO_RENEWAL,
  DAIGAKU_SOTSUGYO_CHANGE,
  DAIGAKU_SOTSUGYO_COE,
  // 特定活動（特定情報処理活動。Issue #334）
  TOKUTEI_JOHO_RENEWAL,
  TOKUTEI_JOHO_CHANGE,
  TOKUTEI_JOHO_COE,
  // 特定活動〔07・08・11〕の取得（Issue #432）。種別つきの規則集合のため末尾に置く
  TOKUTEI_KENKYU_ACQUISITION,
  DAIGAKU_SOTSUGYO_ACQUISITION,
  TOKUTEI_JOHO_ACQUISITION,
];
