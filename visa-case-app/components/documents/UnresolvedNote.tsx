import { useT } from "@/lib/i18n/LanguageProvider";

/** 生成ボタンの近くに出す、未解決事項の件数と注意（Issue #220）。個別の項目は、「データ状態」に集約して表示する。 */
export function UnresolvedNote({ count }: { count: number }) {
  const t = useT();
  if (count <= 0) return null;
  return (
    <div role="note" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
      <p>{t("documents.unresolvedLine1", { count })}</p>
      <p>{t("documents.unresolvedLine2")}</p>
    </div>
  );
}
