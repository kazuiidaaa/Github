import type { EmploymentInfo, OrgCategory, ProcedureType } from "../types";

// 必要書類の規則。プログラムから分離したデータとして保持し、改正時はここだけを修正する。
// 最終的な判断は行政書士が行う前提で、確認が不十分な項目は verify: true とする。

export type Party = "applicant" | "organization";
export type Category = Exclude<OrgCategory, "">;

export interface RequirementRule {
  id: string;
  name: string;
  party: Party;
  /** この書類が必要となるカテゴリー */
  categories: Category[];
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
  sources: { title: string; url: string }[];
  checkedAt: string;
  rules: RequirementRule[];
}

const ALL: Category[] = ["1", "2", "3", "4"];

export const CATEGORY_LABELS: Record<Category, string> = {
  "1": "カテゴリー1（上場企業・公共機関等）",
  "2": "カテゴリー2（前年の源泉徴収税額が1,000万円以上）",
  "3": "カテゴリー3（前年の法定調書合計表を提出した団体・個人）",
  "4": "カテゴリー4（上記以外）",
};

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
    { id: "application_form", name: "在留期間更新許可申請書", party: "applicant", categories: ALL, level: "required" },
    { id: "photo", name: "写真（縦4cm×横3cm）", party: "applicant", categories: ALL, level: "required", note: "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの" },
    { id: "passport_card", name: "パスポート及び在留カード（提示）", party: "applicant", categories: ALL, level: "required" },
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

// 在留資格変更許可申請（技術・人文知識・国際業務への変更）。
// 入管庁の提出書類チェックシート（変更・表1／表2）に基づく提案であり、行政書士の確認前の内容。
// 判断待ちの事項は docs/phase12-change-requirements-research.md に記録する。
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
    { id: "application_form", name: "在留資格変更許可申請書", party: "applicant", categories: ALL, level: "required" },
    { id: "photo", name: "写真（縦4cm×横3cm）", party: "applicant", categories: ALL, level: "required", note: "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの" },
    { id: "passport_card", name: "パスポート及び在留カード（提示）", party: "applicant", categories: ALL, level: "required" },
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

export const RULE_SETS: RuleSet[] = [GIJINKOKU_RENEWAL, GIJINKOKU_CHANGE];
