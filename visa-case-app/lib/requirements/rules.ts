import type { FormDetails } from "../formDetails";
import { HSP_EVIDENCE } from "../hspPoints";
import type { EmploymentInfo, OrgCategory, ProcedureType } from "../types";

// 必要書類の規則。プログラムから分離したデータとして保持し、改正時はここだけを修正する。
// 最終的な判断は行政書士が行う前提で、確認が不十分な項目は verify: true とする。

export type Party = "applicant" | "organization";
export type Category = Exclude<OrgCategory, "">;
/** 在留資格取得許可申請の取得の事由（formDetails.acquisitionCause の未選択以外の値） */
export type AcquisitionCause = Exclude<FormDetails["acquisitionCause"], "">;

export interface RequirementRule {
  id: string;
  name: string;
  party: Party;
  /** この書類が必要となるカテゴリー（basis が acquisitionCause の規則集合では使わない） */
  categories?: Category[];
  /** この書類が必要となる取得の事由（basis が acquisitionCause の規則集合のみ） */
  causes?: AcquisitionCause[];
  /** required：必要、check：必要となる場合があり確認を要する */
  level: "required" | "check";
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
  /** 規則の適用条件の基準。省略時は所属機関のカテゴリー（employment.category） */
  basis?: "category" | "acquisitionCause";
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
  renewal: "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの",
  change: "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの",
  coe: "申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。裏面に申請人の氏名を記載し、申請書の写真欄に貼付する",
};

/**
 * 認定・変更・更新の共通書類。パスポート及び在留カードの提示は、更新・変更のみ（認定は海外からの呼び寄せで在留カードがなく、旅券の提示も不要）。
 * 取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が同じ項目を持つ。
 */
export function procedureCommonRules(procedure: CommonProcedure): RequirementRule[] {
  const rules: RequirementRule[] = [
    { id: "application_form", name: COMMON_APPLICATION_FORM_NAMES[procedure], party: "applicant", categories: ALL, level: "required" },
    { id: "photo", name: "写真（縦4cm×横3cm）", party: "applicant", categories: ALL, level: "required", note: COMMON_PHOTO_NOTES[procedure] },
  ];
  if (procedure !== "coe") {
    rules.push({ id: "passport_card", name: "パスポート及び在留カード（提示）", party: "applicant", categories: ALL, level: "required" });
  }
  return rules;
}

export const GIJINKOKU_RENEWAL: RuleSet = {
  id: "gijinkoku_renewal",
  title: "技術・人文知識・国際業務 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: "技術・人文知識・国際業務",
  checkedAt: "2026-10-02",
  sources: [
    { title: "在留資格「技術・人文知識・国際業務」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/gijinkoku.html" },
    { title: "提出書類のカテゴリー別一覧（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367009.pdf" },
  ],
  rules: [
    ...procedureCommonRules("renewal"),
    {
      id: "employment_contract",
      name: "申請人の活動内容を明らかにする書類（雇用契約書・労働条件通知書の写し等）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
    },
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: ["3", "4"],
      level: "required",
      note: "直近1年分の総所得及び納税状況が記載されたもの",
      verify: true,
    },
    {
      id: "statutory_report_total",
      name: "前年分の職員の給与所得の源泉徴収票等の法定調書合計表（受付印のあるものの写し）",
      party: "organization",
      categories: ["2", "3"],
      level: "required",
      note: "カテゴリーを証明する文書として提出する",
      verify: true,
    },
    {
      id: "payroll_office_notification",
      name: "給与支払事務所等の開設届出書の写し",
      party: "organization",
      categories: ["4"],
      level: "required",
      verify: true,
    },
    {
      id: "withholding_tax_receipts",
      name: "直近3か月分の所得税徴収高計算書の写し",
      party: "organization",
      categories: ["4"],
      level: "required",
      verify: true,
    },
    {
      id: "withholding_special_approval",
      name: "源泉所得税の納期の特例の承認に関する申請書の写し",
      party: "organization",
      categories: ["4"],
      level: "required",
      when: "withholdingSpecial",
      note: "納期の特例の承認を受けている場合",
      verify: true,
    },
    {
      id: "business_materials",
      name: "勤務先の事業内容・経営状況を明らかにする資料（決算文書の写し等）",
      party: "organization",
      categories: ["4"],
      level: "check",
      note: "提出の要否を、出入国在留管理局の案内で確認すること",
      verify: true,
    },
    {
      id: "representative_declaration",
      name: "所属機関の代表者に関する申告書（参考様式）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "2026年4月15日以降の申請で提出する",
      verify: true,
    },
    {
      id: "language_ability",
      name: "言語能力（CEFR・B2相当）を示す資料",
      party: "applicant",
      categories: ["3", "4"],
      level: "check",
      note: "言語能力を用いた対人業務に従事する場合。更新では、以前から同様の業務に継続して従事している場合は不要（審査で求められる場合あり）",
      verify: true,
    },
    {
      id: "dispatch_documents",
      name: "派遣契約に基づいて就労する場合の資料（誓約書、派遣個別契約書、管理台帳等）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "派遣形態で就労する場合のみ。公式案内で資料の範囲を確認すること",
      verify: true,
    },
  ],
};

// 在留資格認定証明書交付申請。カテゴリーは更新・変更と同じ所属機関の区分。
// 根拠・差異は docs/requirements-research.md（認定編） を参照。調査に基づく提案であり、行政書士の最終確認を要する。
export const GIJINKOKU_COE: RuleSet = {
  id: "gijinkoku_coe",
  title: "技術・人文知識・国際業務 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: "技術・人文知識・国際業務",
  checkedAt: "2026-10-03",
  sources: [
    { title: "在留資格「技術・人文知識・国際業務」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/gijinkoku.html" },
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
      name: "所属機関のカテゴリーを証明する文書",
      party: "organization",
      categories: ["1", "2", "3"],
      level: "required",
      note: "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。カテゴリー2は、オンライン利用申出の承認を受けている場合はその承認を示す文書。提出可能な書類がなければカテゴリー4となる",
      verify: true,
    },
    {
      id: "vocational_school_certificate",
      name: "専門士・高度専門士の称号を付与されたことを証明する文書（専攻科修了の場合は修了証明）",
      party: "applicant",
      categories: ALL,
      level: "check",
      note: "専門学校を卒業した場合のみ",
      verify: true,
    },
    {
      id: "dispatch_documents",
      name: "派遣契約に基づいて就労する場合の資料（誓約書（派遣元用・派遣先用）、労働条件通知書、労働者派遣個別契約書）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "申請人が被派遣者の場合のみ。公式案内で資料の範囲を確認すること",
      verify: true,
    },
    {
      id: "activity_documents",
      name: "活動内容等を明らかにする資料（労働条件を明示する文書、役員報酬を定める定款の写し等）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "労働契約の場合は労働条件通知書等。役員就任・外国法人の日本支店への転勤の場合は、公式案内の資料を提出する",
      verify: true,
    },
    {
      id: "career_documents",
      name: "学歴及び職歴その他経歴等を証明する文書（履歴書、卒業証明書又は在職証明書等）",
      party: "applicant",
      categories: ["3", "4"],
      level: "required",
      note: "履歴書と、学歴又は職歴を証明する文書。外国の文化に基盤を有する業務では、3年以上の実務経験を証明する文書など、業務内容により異なる",
      verify: true,
    },
    { id: "registry_certificate", name: "登記事項証明書", party: "organization", categories: ["3", "4"], level: "required", verify: true },
    {
      id: "business_description",
      name: "事業内容を明らかにする資料（会社案内等）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が記載されたもの、又はこれに準ずる文書",
      verify: true,
    },
    {
      id: "financial_statements",
      name: "直近年度の決算文書の写し",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "新規事業の場合は事業計画書",
      verify: true,
    },
    {
      id: "representative_declaration",
      name: "所属機関の代表者に関する申告書（参考様式）",
      party: "organization",
      categories: ["3", "4"],
      level: "required",
      note: "2026年4月15日以降の申請で提出する",
      verify: true,
    },
    {
      id: "language_ability",
      name: "言語能力（CEFR・B2相当）を示す資料",
      party: "applicant",
      categories: ["3", "4"],
      level: "check",
      note: "翻訳・通訳、接客等、言語能力を用いた対人業務に主に従事する場合。それ以外でも審査で求められる場合がある",
      verify: true,
    },
    {
      id: "withholding_exemption",
      name: "源泉徴収の免除を受ける機関であることを明らかにする資料（外国法人の免除証明書等）",
      party: "organization",
      categories: ["4"],
      level: "check",
      note: "法定調書合計表を提出できない理由を明らかにする資料。源泉徴収の免除を受ける機関の場合のみ。この場合、下記の開設届出書等は別途確認すること",
      verify: true,
    },
    {
      id: "payroll_office_notification",
      name: "給与支払事務所等の開設届出書の写し",
      party: "organization",
      categories: ["4"],
      level: "required",
      note: "法定調書合計表を提出できない理由を明らかにする資料（源泉徴収の免除を受ける機関を除く）",
      verify: true,
    },
    {
      id: "withholding_tax_receipts",
      name: "直近3か月分の所得税徴収高計算書の写し（領収日付印のあるもの）",
      party: "organization",
      categories: ["4"],
      level: "required",
      note: "公式案内では、これ又は納期の特例の承認を示す資料のいずれか",
      verify: true,
    },
    {
      id: "withholding_special_approval",
      name: "源泉所得税の納期の特例の承認を受けていることを明らかにする資料",
      party: "organization",
      categories: ["4"],
      level: "required",
      when: "withholdingSpecial",
      note: "納期の特例の承認を受けている場合",
      verify: true,
    },
    {
      id: "passport_copy",
      name: "旅券（パスポート）の写し",
      party: "applicant",
      categories: ALL,
      level: "check",
      note: "認定証明書上の氏名と旅券上の氏名の表記が異なる場合に、提出が可能であれば併せて提出する。認定申請では旅券・在留カードの提示は不要",
      verify: true,
    },
  ],
};

// 在留資格変更許可申請（技術・人文知識・国際業務への変更）。
// 入管庁の提出書類チェックシート（変更・表1／表2）に基づく提案であり、行政書士の確認前の内容。
// 判断待ちの事項は docs/requirements-research.md（変更編） に記録する。
const C34: Category[] = ["3", "4"];

export const GIJINKOKU_CHANGE: RuleSet = {
  id: "gijinkoku_change",
  title: "技術・人文知識・国際業務 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: "技術・人文知識・国際業務",
  checkedAt: "2026-10-03",
  sources: [
    { title: "在留資格「技術・人文知識・国際業務」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/gijinkoku.html" },
    { title: "提出書類チェックシート（変更・カテゴリー共通・表1）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001367001.pdf" },
    { title: "提出書類チェックシート（変更・カテゴリー3・4のみ・表2）（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/content/001437255.pdf" },
  ],
  rules: [
    ...procedureCommonRules("change"),
    {
      id: "category1_proof",
      name: "カテゴリー1に該当することを証明する文書（四季報の写し、上場を証明する文書の写し等）",
      party: "organization",
      categories: ["1"],
      level: "required",
      note: "公式案内に列挙された文書のうち、提出可能なものを提出する。提出可能な文書がなければカテゴリー4となる",
      verify: true,
    },
    {
      id: "statutory_report_total",
      name: "前年分の職員の給与所得の源泉徴収票等の法定調書合計表（受付印のあるものの写し）",
      party: "organization",
      categories: ["2", "3"],
      level: "required",
      note: "カテゴリーを証明する文書として提出する",
      verify: true,
    },
    {
      id: "online_approval_proof",
      name: "在留申請オンラインシステムの利用申出の承認を証明する文書（承認のお知らせメール等）",
      party: "organization",
      categories: ["2"],
      level: "check",
      note: "カテゴリー2と同様の添付資料での申請を希望し、利用申出が承認された機関の場合のみ",
      verify: true,
    },
    {
      id: "omission_statement",
      name: "提出書類省略に関する説明書（「留学」から「技術・人文知識・国際業務」又は「研究」への変更）（参考様式）",
      party: "organization",
      categories: ["2"],
      level: "check",
      note: "「留学」からの変更で、カテゴリー2（大学・短大・大学院の卒業（予定）者等）として扱う場合",
      verify: true,
    },
    {
      id: "vocational_school_certificate",
      name: "専門士・高度専門士の称号を付与されたことを証明する文書（専攻科修了の場合は修了証明書）",
      party: "applicant",
      categories: ALL,
      level: "check",
      note: "専門学校を卒業した場合のみ。外国人留学生キャリア形成促進プログラムの認定学科修了者は認定学科修了証明書",
      verify: true,
    },
    {
      id: "dispatch_pledge",
      name: "申請人の派遣労働に関する誓約書（所属機関（派遣元）用・派遣先用）（参考様式）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "派遣契約に基づいて就労する場合（申請人が被派遣者の場合）のみ",
      verify: true,
    },
    {
      id: "dispatch_contract_documents",
      name: "派遣先での活動内容及び派遣契約期間を明らかにする資料の写し（労働条件通知書（雇用契約書）、労働者派遣個別契約書）",
      party: "organization",
      categories: ALL,
      level: "check",
      note: "派遣形態で就労する場合のみ。更新と異なり、管理台帳・就業状況報告書は変更の案内に記載がない",
      verify: true,
    },
    {
      id: "activity_documents",
      name: "申請人の活動の内容等を明らかにする書類（労働条件通知書・役員報酬を定める定款等）",
      party: "organization",
      categories: C34,
      level: "required",
      note: "労働契約を締結する場合は労働条件を明示する文書。役員就任・外国法人の日本支店への転勤等の場合は公式案内の文書",
      verify: true,
    },
    {
      id: "career_documents",
      name: "申請人の学歴及び職歴その他経歴等を証明する文書（履歴書、卒業証明書、在職証明書等）",
      party: "applicant",
      categories: C34,
      level: "required",
      note: "履歴書と、卒業証明書・在職証明書等のいずれか。IT技術者は情報処理技術の資格証書、外国の文化に基づく業務は3年以上の実務経験の証明",
      verify: true,
    },
    {
      id: "registry_certificate",
      name: "登記事項証明書",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "business_overview",
      name: "事業内容を明らかにする資料（沿革・役員・組織・事業内容が記載された案内書等）",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "financial_statements",
      name: "直近年度の決算文書の写し（新規事業の場合は事業計画書）",
      party: "organization",
      categories: C34,
      level: "required",
      note: "公式ページの本文にはカテゴリー3は「その他の資料は原則不要」との記載があり、チェックシートと食い違う。チェックシートに従いカテゴリー3も必要としている",
      verify: true,
    },
    {
      id: "representative_declaration",
      name: "所属機関の代表者に関する申告書（参考様式）",
      party: "organization",
      categories: C34,
      level: "required",
      note: "2026年4月15日以降の申請で提出する",
      verify: true,
    },
    {
      id: "language_ability",
      name: "言語能力（CEFR・B2相当）を示す資料",
      party: "applicant",
      categories: C34,
      level: "check",
      note: "主に言語能力を用いて対人業務等に従事する場合（翻訳・通訳、接客等）",
      verify: true,
    },
    {
      id: "payroll_office_notification",
      name: "給与支払事務所等の開設届出書の写し（法定調書合計表を提出できない理由の資料）",
      party: "organization",
      categories: ["4"],
      level: "required",
      note: "源泉徴収の免除を受ける外国法人等の場合は、免除証明書その他の源泉徴収を要しないことを明らかにする資料",
      verify: true,
    },
    {
      id: "withholding_tax_receipts",
      name: "直近3か月分の所得税徴収高計算書の写し（領収日付印のあるもの）",
      party: "organization",
      categories: ["4"],
      level: "check",
      note: "この書類、又は納期の特例の承認を受けていることを明らかにする資料のいずれか",
      verify: true,
    },
    {
      id: "withholding_special_approval",
      name: "源泉所得税の納期の特例の承認を受けていることを明らかにする資料",
      party: "organization",
      categories: ["4"],
      level: "required",
      when: "withholdingSpecial",
      note: "納期の特例の承認を受けている場合",
      verify: true,
    },
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
// 認定証明書交付申請は、提供された提出書類一覧（カテゴリー3・4）に基づく。
// 更新・変更は同種の一覧が未提供のため、公開情報から作成した暫定の内容で、すべて verify: true とする。一覧の提供後に差し替える。
const KEIEI_KANRI = "経営・管理";
const KEIEI_KANRI_SOURCE = { title: "在留資格「経営・管理」（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/business-manager.html" };

export const KEIEI_KANRI_RENEWAL: RuleSet = {
  id: "keiei_kanri_renewal",
  title: "経営・管理 在留期間更新許可申請",
  procedureType: "renewal",
  residenceStatus: KEIEI_KANRI,
  checkedAt: "2026-10-05",
  sources: [KEIEI_KANRI_SOURCE],
  rules: [
    ...procedureCommonRules("renewal"),
    {
      id: "statutory_report_total",
      name: "前年分の職員の給与所得の源泉徴収票等の法定調書合計表（受付印のあるものの写し）",
      party: "organization",
      categories: ["2", "3"],
      level: "required",
      note: "カテゴリーを証明する文書として提出する",
      verify: true,
    },
    {
      id: "financial_statements",
      name: "直近年度の決算文書の写し",
      party: "organization",
      categories: C34,
      level: "required",
      note: "更新の一覧が未提供のため、公開情報に基づく暫定の内容",
      verify: true,
    },
    {
      id: "registry_certificate",
      name: "登記事項証明書",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "office_facility_documents",
      name: "事業所用施設の存在を明らかにする資料（賃貸借契約書の写し等）",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "resident_tax_certificates",
      name: "住民税の課税（又は非課税）証明書及び納税証明書",
      party: "applicant",
      categories: C34,
      level: "required",
      note: "直近1年分の総所得及び納税状況が記載されたもの",
      verify: true,
    },
    {
      id: "representative_declaration",
      name: "所属機関の代表者による申告書（参考様式）",
      party: "organization",
      categories: C34,
      level: "check",
      note: "申請人が事業の管理に従事する場合のみ",
      verify: true,
    },
  ],
};

export const KEIEI_KANRI_COE: RuleSet = {
  id: "keiei_kanri_coe",
  title: "経営・管理 在留資格認定証明書交付申請",
  procedureType: "coe",
  residenceStatus: KEIEI_KANRI,
  checkedAt: "2026-10-05",
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
      name: "所属機関のカテゴリーを証明する文書",
      party: "organization",
      categories: ["1", "2"],
      level: "required",
      note: "カテゴリー1：四季報の写し等／カテゴリー2：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。提出可能な書類がなければカテゴリー4となる",
      verify: true,
    },
    {
      id: "activity_documents",
      name: "申請人の活動内容を明らかにする資料（役員就任、日本法人への転勤・他団体の役員就任、管理者としての雇用のいずれか）",
      party: "organization",
      categories: C34,
      level: "required",
    },
    {
      id: "business_plan",
      name: "専門的知識を有する者による事業計画書の写し",
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
      name: "所属機関の代表者による申告書（参考様式）",
      party: "organization",
      categories: C34,
      level: "check",
      note: "申請人が事業の管理に従事する場合のみ（提供された一覧で△）",
      verify: true,
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
      name: "前年分の職員の源泉徴収票等の法定調書合計表を提出できない理由を明らかにする資料",
      party: "organization",
      categories: ["4"],
      level: "required",
      note: "カテゴリー4のみ",
    },
    {
      id: "office_facility_documents",
      name: "事業所用施設の存在を明らかにする資料（不動産登記簿謄本、賃貸借契約書等）",
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
      note: "事業内容を明らかにする資料として登記事項証明書を提出済みの場合は不要",
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
  ],
};

export const KEIEI_KANRI_CHANGE: RuleSet = {
  id: "keiei_kanri_change",
  title: "経営・管理 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: KEIEI_KANRI,
  checkedAt: "2026-10-05",
  sources: [KEIEI_KANRI_SOURCE],
  rules: [
    ...procedureCommonRules("change"),
    {
      id: "category_proof",
      name: "所属機関のカテゴリーを証明する文書",
      party: "organization",
      categories: ["1", "2"],
      level: "required",
      note: "カテゴリー1：四季報の写し等／カテゴリー2：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。提出可能な書類がなければカテゴリー4となる",
      verify: true,
    },
    {
      id: "activity_documents",
      name: "申請人の活動内容を明らかにする資料（役員就任、日本法人への転勤・他団体の役員就任、管理者としての雇用のいずれか）",
      party: "organization",
      categories: C34,
      level: "required",
      note: "変更の一覧が未提供のため、認定証明書交付申請の一覧に準じた暫定の内容",
      verify: true,
    },
    {
      id: "business_plan",
      name: "専門的知識を有する者による事業計画書の写し",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "business_description",
      name: "事業内容を明らかにする資料（登記事項証明書、事業内容の詳細資料等）",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "financial_statements",
      name: "直近の年度の決算文書の写し",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "business_licenses",
      name: "事業を営むために必要な許認可の取得等を証する資料",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "office_facility_documents",
      name: "事業所用施設の存在を明らかにする資料（不動産登記簿謄本、賃貸借契約書等）",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "business_scale_documents",
      name: "事業規模を明らかにする資料（常勤職員の賃金支払・住民票、貸借対照表、登記事項証明書等）",
      party: "organization",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "japanese_ability",
      name: "日本語能力を明らかにする資料",
      party: "applicant",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "career_documents",
      name: "経歴を明らかにする資料（学歴または職歴）",
      party: "applicant",
      categories: C34,
      level: "required",
      verify: true,
    },
    {
      id: "representative_declaration",
      name: "所属機関の代表者による申告書（参考様式）",
      party: "organization",
      categories: C34,
      level: "check",
      note: "申請人が事業の管理に従事する場合のみ",
      verify: true,
    },
    {
      id: "statutory_report_unavailable_reason",
      name: "前年分の職員の源泉徴収票等の法定調書合計表を提出できない理由を明らかにする資料",
      party: "organization",
      categories: ["4"],
      level: "required",
      verify: true,
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
// 提出書類は案内ページの本文による。チェックシート（PDF）の内容は未照合。申請書は様式N（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
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
    {
      id: "passport_copy",
      name: "旅券（パスポート）の写し",
      party: "applicant",
      categories: ALL,
      level: "check",
      note: "認定証明書上の氏名と旅券上の氏名の表記が異なる場合に、提出が可能であれば併せて提出する。認定申請では旅券・在留カードの提示は不要",
      verify: true,
    },
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
      note: "直近1年分の総所得及び納税状況が記載されたもの",
    },
    { ...kaigoWorkingConditions, level: "check", note: "転職後、初回の更新許可申請の場合のみ" },
    { ...kaigoOrganizationOverview, level: "check", note: "転職後、初回の更新許可申請の場合のみ" },
  ],
};

// 在留資格「法律・会計業務」。入管庁の案内ページに所属機関のカテゴリー（1〜4）による区分はなく、全書類を全カテゴリー共通（ALL）とする（Issue #301）。
// 提出書類は案内ページの本文による（チェックシート（PDF）は未照合）。申請書は様式U（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
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
    {
      id: "passport_copy",
      name: "旅券（パスポート）の写し",
      party: "applicant",
      categories: ALL,
      level: "check",
      note: "認定証明書上の氏名と旅券上の氏名の表記が異なる場合に、提出が可能であれば併せて提出する。認定申請では旅券・在留カードの提示は不要",
      verify: true,
    },
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
// （カテゴリー1＝医師・歯科医師、カテゴリー2＝医師・歯科医師以外の者）。案件にこの区分の入力項目がないため、全書類を全カテゴリー共通（ALL）とし、
// 区分によって要否が分かれる書類は、要確認（check）として注記に区分を示す（Issue #302）。申請書は様式U（認定・変更・更新とも）。取得は、事由別の規則集合（ACQUISITION_BY_CAUSE）が扱う。
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
  level: "check",
  note: IRYO_DOCTOR_NOTE,
};
const iryoOtherLicense: RequirementRule = {
  id: "medical_license_other",
  name: "医療に係る日本の資格を有することを証明する文書（免状又は証明書等の写し）",
  party: "applicant",
  categories: ALL,
  level: "check",
  note: "医師・歯科医師以外の場合のみ（入管庁の案内の「カテゴリー2」）。薬剤師、保健師、助産師、看護師、准看護師、歯科衛生士、診療放射線技師、理学療法士、作業療法士、視能訓練士、臨床工学技士、義肢装具士のいずれか",
};
const iryoFacilityOverview: RequirementRule = {
  id: "facility_overview",
  name: "勤務する機関の概要を明らかにする資料（病院、診療所等設立に許可を受けることを要する機関の場合は、当該許可を受けた年月日を明示したもの）",
  party: "organization",
  categories: ALL,
  level: "check",
  note: IRYO_OTHER_NOTE,
};

export const IRYO_COE: RuleSet = {
  id: "iryo_coe",
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
    {
      id: "passport_copy",
      name: "旅券（パスポート）の写し",
      party: "applicant",
      categories: ALL,
      level: "check",
      note: "認定証明書上の氏名と旅券上の氏名の表記が異なる場合に、提出が可能であれば併せて提出する。認定申請では旅券・在留カードの提示は不要",
      verify: true,
    },
  ],
};

export const IRYO_CHANGE: RuleSet = {
  id: "iryo_change",
  title: "医療 在留資格変更許可申請",
  procedureType: "change",
  residenceStatus: IRYO,
  checkedAt: IRYO_CHECKED_AT,
  sources: [IRYO_SOURCE],
  rules: [...procedureCommonRules("change"), iryoDoctorLicense, iryoOtherLicense, iryoFacilityOverview],
};

export const IRYO_RENEWAL: RuleSet = {
  id: "iryo_renewal",
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
      level: "check",
      note: IRYO_OTHER_NOTE,
    },
    {
      ...iryoOtherLicense,
      // 更新の案内には、資格を証明する文書の記載がない（住民税の証明書・在職証明書・転職後の初回の機関概要のみ）。認定・変更と同じ書類を、念のため確認として案内する
      note: "更新の案内ページには記載がありません。医師・歯科医師以外の方は、念のため日本の資格（免状又は証明書等）の写しを用意し、管轄の出入国在留管理官署に要否を確認してください",
      verify: true,
    },
    { ...iryoFacilityOverview, note: "医師・歯科医師以外の方が、転職後の初回の更新許可申請を行う場合のみ" },
  ],
};

// 在留資格「研究」。所属機関のカテゴリー（1〜4）は、技術・人文知識・国際業務と同じ区分で、書類もカテゴリーごとに異なる（Issue #296）。
// 提出書類は案内ページの本文による（カテゴリー1・2は「その他の資料は原則不要」、3は4のうち源泉徴収に関する資料が不要）。チェックシート（PDF）の○の位置は未照合。
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
  note: "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。カテゴリー2は、オンライン利用申出の承認を受けている場合はその承認を示す文書。提出可能な書類がなければカテゴリー4となる",
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
  verify: true,
};
const kenkyuBusinessMaterials: RequirementRule = {
  id: "business_description",
  name: "事業内容を明らかにする資料（会社案内等）",
  party: "organization",
  categories: ["3", "4"],
  level: "required",
  note: "沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が詳細に記載された案内書、これに準ずる文書、又は登記事項証明書のいずれか",
};
const kenkyuFinancialStatements: RequirementRule = {
  id: "financial_statements",
  name: "直近年度の決算文書の写し",
  party: "organization",
  categories: ["4"],
  level: "required",
  note: "新規事業の場合は事業計画書",
};
const kenkyuFinancialStatementsCat3: RequirementRule = {
  ...kenkyuFinancialStatements,
  id: "financial_statements_transfer",
  categories: ["3"],
  level: "check",
  note: "カテゴリー3は、転勤して研究を行う業務に従事する場合に限る。新規事業の場合は事業計画書",
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
    name: "源泉所得税の納期の特例の承認に関する申請書の写し",
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
      note: "「留学」からの変更で、カテゴリー2（大学・短大・大学院の卒業（予定）者等）として扱う場合",
    },
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

// 更新は、案内ページの「転職後の初回の更新申請」の資料（活動内容・事業内容・決算文書・代表者申告書）を、カテゴリー3・4の「要確認」とする。
// 決算文書は、カテゴリー3について案内の文言が複数あり（転勤の場合に限る／提出書類10は不要）、読み取りに幅があるため要確認。
const KENKYU_FIRST_RENEWAL_NOTE = "転職後、初回の更新許可申請の場合のみ";
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
    { ...kenkyuFinancialStatements, level: "check", note: KENKYU_FIRST_RENEWAL_NOTE, verify: true },
    { ...kenkyuFinancialStatementsCat3, note: "転職後、初回の更新許可申請で、転勤して研究を行う業務に従事する場合に限る", verify: true },
    { ...kenkyuRepresentativeDeclaration, level: "check", note: KENKYU_FIRST_RENEWAL_NOTE, verify: true },
    ...kenkyuWithholdingRules,
  ],
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
];
