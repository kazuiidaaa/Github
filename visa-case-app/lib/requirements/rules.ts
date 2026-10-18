import type { FormDetails, MedicalApplicantType, TokuteiKatsudoType } from "../formDetails";
import { HSP_EVIDENCE } from "../hspPoints";
import type { EmploymentInfo, OrgCategory, ProcedureType } from "../types";

// 必要書類の規則。プログラムから分離したデータとして保持し、改正時はここだけを修正する。
// 最終的な判断は行政書士が行う前提で、確認が不十分な項目は verify: true とする。

export type Party = "applicant" | "organization";
export type Category = Exclude<OrgCategory, "">;
/** 在留資格取得許可申請の取得の事由（formDetails.acquisitionCause の未選択以外の値） */
export type AcquisitionCause = Exclude<FormDetails["acquisitionCause"], "">;
export type { MedicalApplicantType };

export interface RequirementRule {
  id: string;
  name: string;
  party: Party;
  /** この書類が必要となるカテゴリー（basis が acquisitionCause の規則集合では使わない） */
  categories?: Category[];
  /** この書類が必要となる取得の事由（basis が acquisitionCause の規則集合のみ） */
  causes?: AcquisitionCause[];
  /** この書類が必要となる申請人の区分（basis が applicantType の規則集合のみ。省略時は全区分） */
  applicantTypes?: MedicalApplicantType[];
  /** required：必要、check：必要となる場合があり確認を要する、optional：提出は必須でないが、実務では取得するのが通例（不足にも要確認にも数えない） */
  level: "required" | "check" | "optional";
  /** 入力された雇用・会社情報が真の場合のみ適用する条件 */
  when?: keyof Pick<EmploymentInfo, "withholdingSpecial">;
  note?: string;
  /** 内容の確認が不十分な項目（画面に「要確認」を表示） */
  verify?: boolean;
}

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
  /** 規則の適用条件の基準。省略時は所属機関のカテゴリー（employment.category） */
  basis?: "category" | "acquisitionCause" | "applicantType";
  /**
   * カテゴリー区分の定義（選べる範囲と、各区分の意味。日本語の原文）。省略時は、所属機関の区分（1〜4。CATEGORY_LABELS）。
   * 在留資格によって区分の範囲・意味が違う場合に指定する（例：教授＝1常勤・2非常勤）。規則の categories が ALL でも、定義の範囲内でだけ判定する。
   */
  categoryDefinition?: Partial<Record<Category, string>>;
  sources: { title: string; url: string }[];
  checkedAt: string;
  rules: RequirementRule[];
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
const GIJIN_PAGE_SOURCE = { title: "在留資格「技術・人文知識・国際業務」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/gijinkoku.html" };
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
    { title: "提出書類のカテゴリー別一覧（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367009.pdf" },
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
    { title: "【認定】提出書類チェックシート（カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404131.pdf" },
    { title: "【認定】提出書類チェックシート（カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001437254.pdf" },
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
    { title: "提出書類チェックシート（変更・カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367001.pdf" },
    { title: "提出書類チェックシート（変更・カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001437255.pdf" },
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
  sources: [{ title: "在留資格取得許可申請書（別記第三十六号様式）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/930004121.xlsx" }],
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
const KEIEI_KANRI_SOURCE = { title: "在留資格「経営・管理」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/businessmanager.html" };
const KEIEI_KANRI_CHECKED_AT = "2026-10-18";

const KEIEI_CATEGORY_PROOF_NAME = "所属機関がいずれのカテゴリーに該当するかを証明する文書";
const KEIEI_STATUTORY_REPORT_NAME = "前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）";
const KEIEI_ACTIVITY_NAME = "申請人の活動の内容等を明らかにする資料（役員就任、日本法人への転勤・他団体の役員就任、管理者としての雇用のいずれか）";
const KEIEI_UNAVAILABLE_REASON_NAME = "前年分の職員の給与所得の源泉徴収票等の法定調書合計表を提出できない理由を明らかにする資料";
const KEIEI_DECLARATION_NAME = "所属機関の代表者に関する申告書（参考様式）";

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
    },
    {
      id: "japanese_ability",
      name: "日本語能力を明らかにする資料",
      party: "applicant",
      categories: C34,
      level: "required",
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
      note: "申請に当たっての説明書（参考様式）と、公租公課の履行を証する資料のうち該当する全て。所属機関が法人の場合は、労働保険・社会保険の加入状況及び料金の納付状況を証する文書、源泉所得税及び復興特別所得税・法人税・消費税及び地方消費税の納税証明書、法人住民税・法人事業税の納税証明書。所属機関が個人の場合は、労働保険・社会保険・国民健康保険の加入状況及び料金の納付状況を証する文書、源泉所得税及び復興特別所得税・申告所得税及び復興特別所得税・消費税及び地方消費税・相続税・贈与税の納税証明書、個人住民税・個人事業税の納税証明書。社会保険への加入義務のない個人事業主は、社会保険の強制適用事業所に該当しないことを説明する資料",
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
    },
    {
      id: "business_scale_documents",
      name: "事業規模を明らかにする資料（常勤職員の賃金支払・住民票、貸借対照表、登記事項証明書等）",
      party: "organization",
      categories: C34,
      level: "required",
      note: "事業内容を明らかにする資料（1）として登記事項証明書を提出済みの場合は不要",
    },
    {
      id: "japanese_ability",
      name: "日本語能力を明らかにする資料",
      party: "applicant",
      categories: C34,
      level: "required",
    },
    {
      id: "career_documents",
      name: "経歴を明らかにする資料（学歴または職歴）",
      party: "applicant",
      categories: C34,
      level: "required",
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
    },
    {
      id: "business_licenses",
      name: "事業を営むために必要な許認可の取得等を証する資料",
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "office_facility_documents",
      name: "事務所用施設の存在を明らかにする資料（不動産登記簿謄本、賃貸借契約書等）",
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "business_scale_documents",
      name: "事業規模を明らかにする資料（常勤職員の賃金支払・住民票、貸借対照表、登記事項証明書等）",
      party: "organization",
      categories: C34,
      level: "required",
      note: "事業内容を明らかにする資料（1）として登記事項証明書を提出済みの場合は不要",
    },
    {
      id: "japanese_ability",
      name: "日本語能力を明らかにする資料",
      party: "applicant",
      categories: C34,
      level: "required",
    },
    {
      id: "career_documents",
      name: "経歴を明らかにする資料（学歴または職歴）",
      party: "applicant",
      categories: C34,
      level: "required",
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
const HSP_SOURCE = {
  title: "在留資格「高度専門職」ポイント計算表（出入国在留管理庁）",
  url: "https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html",
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
 * 高度専門職の在留資格取得許可申請（Issue #212）。号の有無・種類（1号イ・ロ・ハ、2号、号なしの旧データ）によらず適用する。
 * 取得の事由別の共通書類は、ACQUISITION_BY_CAUSE の規則をそのまま再利用する（文言は変えない）。
 * 取得の高度専門職の具体的な提出書類は、入管庁の案内ページ（HTML）で確認できていないため、ポイント計算表・疎明資料のみを「要確認」で足す。
 */
const HSP_ACQUISITION_NOTE = "ポイント制の案内では、1号は70点以上、2号は別途要件がある。取得でポイント計算表が必要かは、入管庁の案内で確認できていないため要確認";
export const HSP_ACQUISITION: RuleSet = {
  id: "hsp_acquisition",
  title: "高度専門職 在留資格取得許可申請（一部のみ整備）",
  procedureType: "acquisition",
  residenceStatus: HSP,
  basis: "acquisitionCause",
  checkedAt: "2026-10-07",
  sources: [HSP_SOURCE, ...ACQUISITION_BY_CAUSE.sources],
  rules: [
    ...ACQUISITION_BY_CAUSE.rules,
    {
      id: "hsp_point_table",
      name: "ポイント計算表（高度専門職 第1号イ・ロ・ハのうち、活動の区分に応じたもの）",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "check",
      note: HSP_ACQUISITION_NOTE,
      verify: true,
    },
    {
      id: "hsp_point_evidence",
      name: "ポイント計算表の疎明資料（ポイントの合計が70点以上あることを確認できる資料）",
      party: "applicant",
      causes: ALL_CAUSES,
      level: "check",
      note: "ポイント計算表を提出する場合の疎明資料。提出の要否は、入管庁の案内で確認できていないため要確認。ポイント計算表の項目を選ぶと、その疎明資料の番号（①〜㉑）ごとの項目が、この下に出る（docs/hsp-point-evidence.md）",
      verify: true,
    },
  ],
};

// 在留資格「介護」。入管庁の案内ページに所属機関のカテゴリー（1〜4）による区分はなく、全書類を全カテゴリー共通（ALL）とする（Issue #297）。
// 提出書類は案内ページの本文による。チェックシート（PDF）3点（認定・変更・更新）の○・△は、2026-10-18 に照合済み（照合表は docs/official/reconciliation/kaigo-2026-10-18.md、Issue #333）。申請書は様式N（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
// 更新の「派遣先での活動内容の資料」は、チェックシートで△、案内ページに記載なし（要確認で足した。#312 の規則に基づく人の判断）。技能移転に係る申告書は、更新の案内ページ・チェックシートにない。
const KAIGO = "介護";
const KAIGO_SOURCE = { title: "在留資格「介護」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/nursingcare.html" };
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
// 提出書類は案内ページの本文と、チェックシート（PDF）3点（認定・変更・更新）による。照合済み（2026-10-18。照合表は docs/official/reconciliation/houmu-kaikei-2026-10-18.md、Issue #333。書類の食い違いはなかった）。申請書は様式U（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
// 更新は、共通書類（申請書・写真・パスポート及び在留カードの提示）以外の書類が案内ページにない。
const HOUMU_KAIKEI = "法律・会計業務";
const HOUMU_KAIKEI_SOURCE = { title: "在留資格「法律・会計業務」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/legalaccountingservices.html" };
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
// 提出書類は、案内ページと、認定・変更・更新のチェックシート（PDF）の表（○の位置まで）による。2026-10-07 に照合済み（Issue #292）。申請書は様式 I（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
const PROFESSOR = "教授";
const PROFESSOR_CHECKED_AT = "2026-10-07";
const PROFESSOR_PAGE_SOURCE = { title: "在留資格「教授」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/professor.html" };
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
    { title: "「教授」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404120.pdf" },
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
    { title: "「教授」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001368410.pdf" },
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
    { title: "「教授」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001368411.pdf" },
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
// 所属機関のカテゴリーには依存しないため、categories は ALL のまま）。区分が未選択の間は、区分で要否が分かれる書類を要確認（check）で表示する（Issue #302 と同じ）。申請書は様式U（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
const IRYO = "医療";
const IRYO_SOURCE = { title: "在留資格「医療」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/medicalservices.html" };
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
// 申請書は様式N（認定・変更・更新とも）。「転勤」は様式Lで、出力は別 Issue で扱う（ここでは書類のみ「要確認」で案内）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
const KENKYU = "研究";
const KENKYU_CHECKED_AT = "2026-10-07";
const KENKYU_SOURCE = { title: "在留資格「研究」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/researcher.html" };
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
// 申請書は様式 I（認定・変更・更新とも。公式の教育の様式は、教授と同じファイル）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
const EDUCATION = "教育";
const EDUCATION_CHECKED_AT = "2026-10-07";
const EDUCATION_PAGE_SOURCE = { title: "在留資格「教育」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/instructor.html" };
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
    { title: "「教育」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404130.pdf" },
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
    { title: "「教育」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367667.pdf" },
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
    { title: "「教育」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367669.pdf" },
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
// 申請書は様式L（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
const HODO = "報道";
const HODO_CHECKED_AT = "2026-10-12";
const HODO_PAGE_SOURCE = { title: "在留資格「報道」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/journalist.html" };
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
    { title: "「報道」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404123.pdf" },
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
    { title: "「報道」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001365757.pdf" },
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
    { title: "「報道」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001365760.pdf" },
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
// 申請書は様式N（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
const GINO = "技能";
const GINO_CHECKED_AT = "2026-10-12";
const GINO_SOURCES = [
  { title: "在留資格「技能」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/skilledlabor.html" },
  { title: "在留資格「技能」調理師としての活動の場合（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/skilledlabor01.html" },
  { title: "在留資格「技能」調理師以外の活動の場合（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/skilledlabor02.html" },
];
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
  sources: GINO_SOURCES,
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

// 在留資格「企業内転勤」。所属機関のカテゴリーは、技術・人文知識・国際業務と同じ1〜4区分（CATEGORY_LABELS）。
// 提出書類は、案内ページと、認定・変更・更新のチェックシート（PDF）の表（○の位置まで）による。2026-10-12 に照合済み（Issue #295）。
// 案内ページとチェックシートの食い違いはなかったため、要確認（verify）の項目はない。
// 「在留資格『企業内転勤』の提出書類の変更について（令和8年4月1日運用開始）」（001457117.pdf）は、認定・変更の表2の9に「登記事項証明書」を選択肢として足すが、10の登記事項証明書は引き続き必要で、提出する書類の範囲は変わらない。
// 申請書は様式L（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
const KIGYONAI = "企業内転勤";
const KIGYONAI_CHECKED_AT = "2026-10-12";
const KIGYONAI_PAGE_SOURCE = { title: "在留資格「企業内転勤」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/intracompanytransfee.html" };

const kigyonaiCategoryProof: RequirementRule = {
  id: "category_proof",
  name: "所属機関のカテゴリーを証明する文書",
  party: "organization",
  categories: ["1", "2", "3"],
  level: "required",
  note: "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。カテゴリー2は、オンライン利用申出の承認を受けている場合はその承認を示す文書。提出可能な書類がなければカテゴリー4となる",
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
  { id: "withholding_tax_receipts", name: "直近3か月分の所得税徴収高計算書の写し", party: "organization", categories: ["4"], level: "required" },
  {
    id: "withholding_special_approval",
    name: "源泉所得税の納期の特例の承認に関する申請書の写し",
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
    { title: "「企業内転勤」に係る提出書類一覧（在留資格認定証明書交付申請用・カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001404133.pdf" },
    { title: "「企業内転勤」に係る提出書類一覧（在留資格認定証明書交付申請用・カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001366542.pdf" },
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
    { title: "「企業内転勤」に係る提出書類一覧（在留資格変更許可申請用・カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001366563.pdf" },
    { title: "「企業内転勤」に係る提出書類一覧（在留資格変更許可申請用・カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001366564.pdf" },
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
    { title: "「企業内転勤」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001366562.pdf" },
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

// 在留資格「特定活動」のうち、特定研究等活動（告示36号）の本人（種別 tokuteiKenkyu。Issue #299）。カテゴリー区分はなく、すべての書類がどのカテゴリーでも同じ。
// 提出書類は、入管庁の案内ページ（designatedactivities07）の原文による（2026-10-12 に原文を確認。認定・変更・更新のチェックシートは案内ページに掲載がなく、照合していない）。逐語の原文（docs/official/designatedactivities11_2026-10-18.txt）との照合も済み、チェックシートの掲載がないことも確認した（2026-10-18。照合表は docs/official/reconciliation/tokutei-katsudo-2026-10-18.md、Issue #333）。逐語の原文（docs/official/designatedactivities07_2026-10-18.txt）との照合も済み、チェックシートの掲載がないことも確認した（2026-10-18。照合表は docs/official/reconciliation/tokutei-katsudo-2026-10-18.md、Issue #333）。
// 範囲外：特定研究等活動の家族は種別「その他」。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。申請書は様式N（認定・変更・更新とも）。
const TOKUTEI_KENKYU_STATUS = "特定活動";
const TOKUTEI_KENKYU_CHECKED_AT = "2026-10-12";
const TOKUTEI_KENKYU_PAGE_SOURCE = { title: "在留資格「特定活動」（特定研究等活動）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/designatedactivities07.html" };

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
// 範囲外：本邦大学等卒業者の家族（案内ページの家族の列）は種別「その他」。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。申請書は様式N（認定・変更・更新とも）。
const DAIGAKU_SOTSUGYO_STATUS = "特定活動";
const DAIGAKU_SOTSUGYO_CHECKED_AT = "2026-10-12";
const DAIGAKU_SOTSUGYO_PAGE_SOURCE = { title: "在留資格「特定活動」（本邦大学等卒業者及びその配偶者等）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/designatedactivities11.html" };

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
// 範囲外：特定情報処理活動の家族は種別「その他」。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。申請書は様式N（認定・変更・更新とも。lib/hspForm.ts の FORM_N_TOKUTEI_TYPES）。
const TOKUTEI_JOHO_STATUS = "特定活動";
const TOKUTEI_JOHO_CHECKED_AT = "2026-10-17";
const TOKUTEI_JOHO_PAGE_SOURCE = { title: "在留資格「特定活動」（特定情報処理活動）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/designatedactivities08.html" };

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
  ACQUISITION_BY_CAUSE,
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
];
