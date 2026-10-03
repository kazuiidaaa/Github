import { inputClass } from "@/components/ui";
import { RESIDENCE_STATUSES } from "@/lib/types";

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
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  // 過去に自由入力で保存した値も、選択肢として残して表示する
  const legacy = value && !(RESIDENCE_STATUSES as readonly string[]).includes(value);
  return (
    <select className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">選択してください</option>
      {legacy && <option value={value}>{value}（登録済みの入力）</option>}
      {RESIDENCE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
