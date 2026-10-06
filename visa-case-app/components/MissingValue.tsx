import { applicantFieldId, type JumpField } from "@/lib/applicantFields";

/**
 * 概要の「未入力」の表示。onJump があるときは、申請人情報タブの該当欄へ移動するボタンにする。
 * 閲覧のみ・確認済みのときは onJump を渡さず、文字のみ。
 */
export function MissingValue({ field, label, onJump }: { field: JumpField; label: string; onJump?: (id: string) => void }) {
  if (!onJump) return <span className="text-slate-400">未入力</span>;
  return (
    <button
      type="button"
      onClick={() => onJump(applicantFieldId(field))}
      aria-label={`${label}は未入力です。申請人情報タブの入力欄へ移動します`}
      className="min-h-10 rounded text-left font-medium text-accent underline underline-offset-2 md:min-h-0"
    >
      未入力（入力する）
    </button>
  );
}
