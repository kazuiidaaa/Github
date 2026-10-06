/** 生成ボタンの近くに出す、未解決事項の件数と注意（Issue #220）。個別の項目は、「データ状態」に集約して表示する。 */
export function UnresolvedNote({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div role="note" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
      <p>注意：未解決の事項が {count} 件あります（内容は、上の「データ状態」をご確認ください）。</p>
      <p>生成はできます。生成した書類は、行政書士が内容を確認してから使用してください。</p>
    </div>
  );
}
