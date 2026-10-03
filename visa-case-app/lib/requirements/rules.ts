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

export const RULE_SETS: RuleSet[] = [GIJINKOKU_RENEWAL];
