# 案件一覧の「変更後（希望）の在留資格」表示（#82）

## 決定事項
- 対象：`procedureType` が `change`（在留資格変更）または `coe`（認定証明書交付）の案件。判定は `lib/types.ts` の `needsTargetStatus()`。新規案件画面の `needsTarget`（`app/cases/new/page.tsx`）と同じ条件。
- 表（md 以上）：列は追加せず、既存の「在留資格」セルの2行目に「変更後：○○」を表示する。横幅を増やさないため。
- カード（md 未満）：`dl` に「変更後の在留資格」の行を追加する。
- 未入力：氏名欄と同じく、灰色の「未入力」を表示する。
- `renewal`・`other` は表示を変えない。

## 備考
- `app/cases/new/page.tsx` 側の判定は、範囲外のため変更していない（`needsTargetStatus()` への置き換えは別途可能）。
