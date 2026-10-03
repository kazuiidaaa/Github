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

// 在留資格認定証明書交付申請。カテゴリーは更新・変更と同じ所属機関の区分。
// 根拠・差異は docs/phase13-coe-requirements-research.md を参照。調査に基づく提案であり、行政書士の最終確認を要する。
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
    { id: "application_form", name: "在留資格認定証明書交付申請書", party: "applicant", categories: ALL, level: "required" },
    { id: "photo", name: "写真（縦4cm×横3cm）", party: "applicant", categories: ALL, level: "required", note: "申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。裏面に申請人の氏名を記載し、申請書の写真欄に貼付する" },
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

export const RULE_SETS: RuleSet[] = [GIJINKOKU_RENEWAL, GIJINKOKU_COE];
