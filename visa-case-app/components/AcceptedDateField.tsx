"use client";

import { DateField } from "@/components/DateField";
import { Field, inputClass } from "@/components/ui";
import { isAcceptedAfterPlanned } from "@/lib/acceptedDate";

/**
 * 受任日（行政書士が依頼を受けた日）の入力欄。任意項目。
 * 申請予定日より後の日付は、警告を表示する（保存はできる）。
 * 新規案件の作成と、案件情報の編集で共用する。
 */
export function AcceptedDateField({
  value,
  onChange,
  plannedApplicationDate = "",
}: {
  value: string;
  onChange: (v: string) => void;
  /** 警告の判定に使う申請予定日。新規作成時は未定のため空 */
  plannedApplicationDate?: string;
}) {
  const afterPlanned = isAcceptedAfterPlanned(value, plannedApplicationDate);
  return (
    <div>
      <Field label="受任日" hint="依頼を受けた日です。任意で、あとから入力できます。過去の日付も入力できます。">
        <DateField className={`${inputClass} md:w-56`} value={value} onChange={onChange} />
      </Field>
      {afterPlanned && (
        <p role="note" className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-900">
          注意：受任日が、申請予定日（{plannedApplicationDate}）より後になっています。このまま保存できます。
        </p>
      )}
    </div>
  );
}
