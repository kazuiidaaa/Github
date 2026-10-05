import { inputClass } from "@/components/ui";
import { ADVANCED_PROFESSIONAL_GRADE_2, ADVANCED_PROFESSIONAL_GRADES, ADVANCED_PROFESSIONAL_STATUS, baseResidenceStatus, RESIDENCE_STATUSES } from "@/lib/types";

/** 在留資格のプルダウンに添える説明文（初見でも選び方が分かるようにする） */
export const STATUS_HINTS = {
  current: "在留カードの「在留資格」欄の記載から選びます。例：技術・人文知識・国際業務",
  target: "変更後（または取得したい）在留資格を選びます。例：技術・人文知識・国際業務",
  card: "在留カードの「在留資格」欄の記載どおりに選びます。",
} as const;

export function StatusSelect({
  value,
  onChange,
  disabled,
  withGrade,
  allowGrade2,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** 希望する（変更後の）在留資格の欄だけ true。高度専門職を選ぶと、号（イ・ロ・ハ。変更では2号も）の選択を表示する */
  withGrade?: boolean;
  /** 在留資格変更許可申請のときだけ true。号の選択に「高度専門職（2号）」を加える */
  allowGrade2?: boolean;
}) {
  // 2号が保存済みの案件は、手続を変えても値を失わないよう、選択肢に残す
  const grades: readonly string[] = allowGrade2 || value === ADVANCED_PROFESSIONAL_GRADE_2 ? [...ADVANCED_PROFESSIONAL_GRADES, ADVANCED_PROFESSIONAL_GRADE_2] : ADVANCED_PROFESSIONAL_GRADES;
  const base = withGrade ? baseResidenceStatus(value) : value;
  // 過去に自由入力で保存した値も、選択肢として残して表示する
  const legacy = base && !(RESIDENCE_STATUSES as readonly string[]).includes(base);
  const select = (
    <select className={inputClass} value={base} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">選択してください</option>
      {legacy && <option value={base}>{base}（登録済みの入力）</option>}
      {RESIDENCE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
  if (!withGrade || base !== ADVANCED_PROFESSIONAL_STATUS) return select;
  return (
    <div className="space-y-2">
      {select}
      <select
        className={inputClass}
        aria-label="高度専門職の号"
        value={value === ADVANCED_PROFESSIONAL_STATUS ? "" : value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || ADVANCED_PROFESSIONAL_STATUS)}
      >
        <option value="">号を選択してください（未選択でも保存できます）</option>
        {grades.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </div>
  );
}
