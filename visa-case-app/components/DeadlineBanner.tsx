import { daysUntil, formatDate } from "@/lib/format";

/** 在留期間の満了日を目立たせる。満了日当日はオンライン申請ができない。 */
export function DeadlineBanner({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days === null) {
    return (
      <p className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
        在留期間の満了日が未入力です。申請人情報を確認してください。
      </p>
    );
  }
  const urgent = days < 30;
  const message =
    days < 0
      ? `満了日を${-days}日超過しています。`
      : days === 0
        ? "本日が満了日です。在留期限の最終日は、在留申請オンラインシステムから申請できません。"
        : `満了日まで残り${days}日です。`;
  return (
    <div
      role="alert"
      className={`rounded-md border p-4 ${
        urgent ? "border-red-400 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-800"
      }`}
    >
      <p className="text-xs">在留期間の満了日</p>
      <p className="text-xl font-semibold">{formatDate(date)}</p>
      <p className="mt-1 text-sm">{message}</p>
      {days > 0 && <p className="mt-1 text-xs">在留期限の最終日は、オンライン申請ができません。</p>}
    </div>
  );
}
