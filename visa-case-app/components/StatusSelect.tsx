import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { ADVANCED_PROFESSIONAL_GRADE_2, ADVANCED_PROFESSIONAL_GRADES, ADVANCED_PROFESSIONAL_STATUS, baseResidenceStatus, PROCEDURE_TYPES, RESIDENCE_STATUSES } from "@/lib/types";

/** 在留資格の選択肢に添える説明文（初見でも選び方が分かるようにする） */
export const STATUS_HINTS = {
  current: "在留カードの「在留資格」欄の記載から選びます。例：技術・人文知識・国際業務",
  target: "変更後（または取得したい）在留資格を選びます。例：技術・人文知識・国際業務",
  card: "在留カードの「在留資格」欄の記載どおりに選びます。",
} as const;

/** 実務で頻出する在留資格。一覧の先頭の「よく使う項目」に、この順で並べる（Issue #214） */
export const FEATURED_RESIDENCE_STATUSES: readonly string[] = [
  "技術・人文知識・国際業務",
  "経営・管理",
  "高度専門職",
  "特定技能",
  "技能実習",
  "留学",
  "家族滞在",
  "永住者",
  "定住者",
  "日本人の配偶者等",
  "永住者の配偶者等",
  "特定活動",
];

export const LEGACY_GROUP = "登録済みの入力";
const OTHER_GROUP = "その他";

/**
 * 在留資格の選択肢。よく使う項目を先頭に、残りは「その他」にまとめる。
 * 過去に自由入力で保存された値（legacy）は、選択肢として残す。
 */
export function residenceStatusOptions(legacy?: string): ChoiceOption[] {
  const known: readonly string[] = RESIDENCE_STATUSES;
  const featured = FEATURED_RESIDENCE_STATUSES.filter((s) => known.includes(s)).map((s) => ({ value: s, label: s, featured: true }));
  const rest = RESIDENCE_STATUSES.filter((s) => !FEATURED_RESIDENCE_STATUSES.includes(s)).map((s) => ({ value: s, label: s, group: OTHER_GROUP }));
  const old = legacy ? [{ value: legacy, label: `${legacy}（登録済みの入力）`, group: LEGACY_GROUP }] : [];
  return [...featured, ...old, ...rest];
}

/** 高度専門職の号の選択肢。2号は、許可されるとき（または保存済みのとき）だけ加える */
export function gradeOptions(withGrade2: boolean): ChoiceOption[] {
  const grades: readonly string[] = withGrade2 ? [...ADVANCED_PROFESSIONAL_GRADES, ADVANCED_PROFESSIONAL_GRADE_2] : ADVANCED_PROFESSIONAL_GRADES;
  return grades.map((g) => ({ value: g, label: g }));
}

/** 手続種別の選択肢（横並びのボタン）。説明文は、選択後に呼び出し側が ChoiceGroup の hint として出す */
export const PROCEDURE_OPTIONS: ChoiceOption[] = PROCEDURE_TYPES.map((p) => ({ value: p.value, label: p.label }));

/** 手続種別の説明文（未選択は undefined） */
export function procedureDescription(value: string): string | undefined {
  return PROCEDURE_TYPES.find((p) => p.value === value)?.description;
}

export function StatusSelect({
  id,
  value,
  onChange,
  disabled,
  withGrade,
  allowGrade2,
  legend,
  required,
  hint,
  error,
}: {
  /** 最初の選択欄に付ける id（外からフォーカスを移すため） */
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** 希望する（変更後の）在留資格の欄だけ true。高度専門職を選ぶと、号（イ・ロ・ハ。変更では2号も）の選択を表示する */
  withGrade?: boolean;
  /** 在留資格変更許可申請のときだけ true。号の選択に「高度専門職（2号）」を加える */
  allowGrade2?: boolean;
  /** 欄の名前（画面に表示する）。未指定は「在留資格」 */
  legend?: string;
  required?: boolean;
  hint?: string;
  error?: string;
}) {
  // 2号が保存済みの案件は、手続を変えても値を失わないよう、選択肢に残す
  const withGrade2 = !!allowGrade2 || value === ADVANCED_PROFESSIONAL_GRADE_2;
  const base = withGrade ? baseResidenceStatus(value) : value;
  // 過去に自由入力で保存した値も、選択肢として残して表示する
  const legacy = base && !(RESIDENCE_STATUSES as readonly string[]).includes(base) ? base : undefined;
  const name = legend ?? "在留資格";
  const main = (
    // id は、外から該当の欄へフォーカスを移すための目印（フォーカスは、中の選択済み・先頭の項目へ入る）
    <div id={id}>
    <ChoiceGroup
      legend={name}
      options={residenceStatusOptions(legacy)}
      value={base}
      onChange={onChange}
      disabled={disabled}
      required={required}
      hint={hint}
      error={error}
      variant="list"
    />
    </div>
  );
  if (!withGrade || base !== ADVANCED_PROFESSIONAL_STATUS) return main;
  return (
    <div className="space-y-3">
      {main}
      <ChoiceGroup
        legend="高度専門職の号"
        options={gradeOptions(withGrade2)}
        value={value === ADVANCED_PROFESSIONAL_STATUS ? "" : value}
        onChange={onChange}
        disabled={disabled}
        hint="号を選択してください（未選択でも保存できます）"
        variant="segment"
        // 号なしの値（高度専門職）へ戻す。保存される値は、号を選ぶ前と同じ
        onClear={() => onChange(ADVANCED_PROFESSIONAL_STATUS)}
        clearLabel="号を未選択に戻す"
      />
    </div>
  );
}
