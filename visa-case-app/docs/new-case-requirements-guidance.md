# 新規案件作成画面の必要書類判定の対応範囲の案内（Issue #81）

## 目的
必要書類の判定（`lib/requirements/rules.ts` の `RULE_SETS`）が対応していない手続・在留資格を選んだ場合に、案件作成の時点で案内する。

## 設計判断
- 判定は `lib/requirements/evaluate.ts` の `hasRuleSetFor(procedureType, residenceStatus, ruleSets = RULE_SETS)` に括り出した。`findRuleSet`（案件の判定）と同じ照合ロジック（`matchRuleSet`）を共有する。`ruleSets` は引数で差し替えられる（テストで、規則のない手続の規則集合を注入するため）。
- 規則を引くための在留資格は、`statusForRules` の1か所で決め、`findRuleSet`（`evaluate`）と画面の案内（`shouldShowNoRuleGuide`）の両方が使う。基準は次のとおり。
  - 変更（`change`）・認定（`coe`）・取得（`acquisition`）：変更後（希望）の在留資格（`targetStatus`）。空なら一致なしとする。現在の在留資格や確認済みの申請人情報の在留資格では引かない。
  - 更新（`renewal`）・その他（`other`）：確認済みの申請人情報の在留資格があればそれ、なければ現在の在留資格（`currentStatus`）。従来どおり。
  - 理由：`RULE_SETS` の `residenceStatus` は、申請後に持つ在留資格（変更・認定・取得では変更後）を意味する。現在の在留資格で引くと、「留学→技術・人文知識・国際業務」の変更案件で規則が一致しない。以前は `findRuleSet` が `targetStatus` を参照しておらず、画面の案内と判定が食い違っていた。
- 案内の要否は純関数 `shouldShowNoRuleGuide(procedureType, currentStatus, targetStatus, ruleSets)` で判定する。同一の入力に対し、案内が出ることと `evaluate` の `ruleSet` が空であることは一致する（入力が未完了で案内を出さない場合を除く）。
- 案内文は `notApplicableMessage()` で `RULE_SETS` から生成する。必要書類タブ（`evaluate` の `notApplicableReason`）と同一の関数を使うため、文言は常に一致し、`RULE_SETS` に規則が増えれば（Issue #89・#90・#91）自動で追従する。手続種別・在留資格のハードコードはない。
- 手続種別が未選択、または判定に使う在留資格（上記の基準によるもの）が未入力の間は、案内を表示しない（入力途中の表示を避けるため）。
- 案内は警告ではなく、灰色の案内文として入力欄の下に表示する。案件の作成は妨げない（「その他」の案件を含む）。

## テストの方針
- 「規則がない」ことの検証には、規則が増えない `other` を使う。並行して `change`・`coe` の規則が追加されても壊れない。
- 変更の一致は、`RULE_SETS` に代えてテスト用の規則集合を注入して検証する。
- `RULE_SETS` の全要素が `hasRuleSetFor` で真となり、案内文に手続名と在留資格が含まれることを検証する。
