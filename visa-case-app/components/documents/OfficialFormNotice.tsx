import { useT } from "@/lib/i18n/LanguageProvider";
import { OFFICIAL_NOTICE_KEYS } from "@/lib/i18n/documentsView";

/** 公式様式（エクセル）の出典・下書きである旨・A4印刷の注意。生成画面とダウンロード画面で共通に使う（表示言語に合わせる） */
export function OfficialFormNotice() {
  const t = useT();
  return (
    <ul className="list-disc space-y-1 rounded-xl bg-amber-50 p-3 pl-7 text-sm text-amber-900" aria-label={t("documents.officialNoticeLabel")}>
      {OFFICIAL_NOTICE_KEYS.map((key) => (
        <li key={key}>{t(key)}</li>
      ))}
    </ul>
  );
}
