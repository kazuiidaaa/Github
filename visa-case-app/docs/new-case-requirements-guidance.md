# 新規案件作成画面の必要書類判定の対応範囲の案内（Issue #81）

## 目的
必要書類の判定（`lib/requirements/rules.ts` の `RULE_SETS`）が対応していない手続・在留資格を選んだ場合に、案件作成の時点で案内する。

## 設計判断
- 判定は `lib/requirements/evaluate.ts` の `hasRuleSetFor(procedureType, residenceStatus)` に括り出した。`findRuleSet`（案件の判定）と同じ照合ロジック（`matchRuleSet`）を共有する。
- 案内文は `notApplicableMessage()` で `RULE_SETS` から生成する。必要書類タブ（`evaluate` の `notApplicableReason`）と同一の関数を使うため、文言は常に一致し、`RULE_SETS` に規則が増えれば（Issue #89・#90・#91）自動で追従する。手続種別・在留資格のハードコードはない。
- 判定に使う在留資格は、更新・その他は「現在の在留資格」、変更・認定は「変更後／希望する在留資格」とする。`RULE_SETS` の `residenceStatus` が申請後に持つ在留資格を基準としているため。
- 手続種別が未選択、または判定に使う在留資格が未入力の間は、案内を表示しない（入力途中の表示を避けるため）。
- 案内は警告ではなく、灰色の案内文として入力欄の下に表示する。案件の作成は妨げない（「その他」の案件を含む）。
