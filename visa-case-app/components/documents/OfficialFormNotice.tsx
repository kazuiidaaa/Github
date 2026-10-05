import { OFFICIAL_FORM_NOTICES } from "@/lib/documents/types";

/** 公式様式（エクセル）の出典・下書きである旨・A4印刷の注意。生成画面とダウンロード画面で共通に使う */
export function OfficialFormNotice() {
  return (
    <ul className="list-disc space-y-1 rounded-xl bg-amber-50 p-3 pl-7 text-sm text-amber-900" aria-label="公式申請様式の注意">
      {OFFICIAL_FORM_NOTICES.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
