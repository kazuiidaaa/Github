// 定住者の認定・変更・更新（Issue #420。照合表 docs/official/reconciliation/coe-change-renewal-teijusha-2026-10-24.md）の、
// 対象者だけが違う書類（住民票・住民税の証明書・職業収入の書類）の名称と注記を組み立てる。
// チェックシートは、同じ書類を区分と手続ごとに「2世の方」「2世の方又は申請人（収入の多い方）」「扶養者」などの言い回しで書き分ける。
// 日本語の文言はここで作り、英語・韓国語の訳は lib/i18n/ruleTexts.ts が、同じ対象者の id から組み立てる（規則の文言が訳表のキーのため）。

/** 住民税の証明書・職業収入の書類の対象者。who は書類の持ち主、unemployed は「無職である場合」の主語（チェックシートの言い回し） */
export const TEIJUSHA_INCOME_TARGETS = {
  nikkei2: { who: "2世の方", unemployed: "2世の方" },
  nikkei2OrApplicant: { who: "2世の方又は申請人（収入の多い方）", unemployed: "2世の方及び申請人" },
  nikkei3: { who: "3世の方", unemployed: "3世の方" },
  nikkei3OrApplicant: { who: "3世の方又は申請人（収入の多い方）", unemployed: "3世の方及び申請人" },
  /** 日系3世の更新のシート：申請人又は配偶者の方（収入の多い方）。申請人が親等の扶養を受けている場合は「扶養者の方」と読み替える */
  applicantOrSpouse: { who: "申請人又は配偶者の方（収入の多い方）", unemployed: "申請人及び配偶者" },
  supporter: { who: "扶養者", unemployed: "扶養者" },
  japaneseOrSpouse: { who: "日本人又は日本人の配偶者の方（収入の多い方）", unemployed: "日本人及び日本人の配偶者の方" },
  permanentOrSpouse: { who: "永住者又は永住者の配偶者の方（収入の多い方）", unemployed: "永住者及び永住者の配偶者の方" },
  japanese: { who: "日本人の方", unemployed: "日本人の方" },
} as const;
export type TeijushaIncomeTarget = keyof typeof TEIJUSHA_INCOME_TARGETS;

/** 住民票の持ち主 */
export const TEIJUSHA_RESIDENCE_PERSONS = {
  applicant: "申請人",
  nikkei2: "2世の方",
  nikkei3: "3世の方",
  japanese: "日本人の方",
  permanentOrSpouse: "永住者又は永住者の配偶者の方",
  supporter: "扶養者",
} as const;
export type TeijushaResidencePerson = keyof typeof TEIJUSHA_RESIDENCE_PERSONS;

/** 職業・収入を証明するもの（書類名は全区分で同じ。対象者は注記に書く） */
export const TEIJUSHA_INCOME_NAME = "職業・収入を証明するもの";

export function teijushaTaxName(target: TeijushaIncomeTarget): string {
  return `${TEIJUSHA_INCOME_TARGETS[target].who}の直近1年分の住民税の課税（又は非課税）証明書及び納税証明書`;
}

export function teijushaIncomeNote(target: TeijushaIncomeTarget): string {
  const { who, unemployed } = TEIJUSHA_INCOME_TARGETS[target];
  const base = `次のいずれか（${who}の仕事による）。会社に勤務：${who}の在職証明書／自営業等：${who}の確定申告書の控えの写し・営業許可書の写し（ある場合）／無職（${unemployed}）：預貯金通帳の写し（Web通帳の画面の写し等〔取引履歴が分かるもの〕でも差し支えない）`;
  return target === "applicantOrSpouse" ? `${base}。申請人が親等の扶養を受けている場合は、「申請人又は配偶者の方」を「扶養者の方」と読み替える` : base;
}

export function teijushaResidenceName(person: TeijushaResidencePerson): string {
  return `${TEIJUSHA_RESIDENCE_PERSONS[person]}の住民票（世帯全員の記載があるもの）`;
}
