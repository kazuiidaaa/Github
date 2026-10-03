# フェーズ11:在留資格取得許可申請書の差し込みエンジン(Issue #88)

方針は `docs/phase11-excel-fill-decision.md`、方式は `docs/phase11-renewal-fill-engine.md`(#79)、画面統合は `docs/phase11-official-form-ui.md`(#80)。項目と案件DBの対応は `docs/phase14-acquisition-forms-research.md`(#87)。本書は、取得様式で確認した座標・判断・制約を記録する。#79 の方式(ロック解除セルの機械的列挙、`{ sheet, cell, get }` の対応表、座標の整合テスト)を踏襲している。

## 構成

| ファイル | 役割 |
|---|---|
| `lib/documents/excelFill/acquisitionMapping.ts` | 項目ごとの `{ sheet, cell, get(ctx) }` の対応表。`ctx` は `{ a: Applicant, f: FormDetails, targetStatus }`(雇用情報は持たない) |
| `lib/documents/excelFill/acquisition.ts` | `fillAcquisitionExcel(a, f, targetStatus = "")`。`{ buffer, warnings }` を返す |
| `lib/documents/excelFill/acquisition.test.ts` | 座標の整合・差し込み結果・無入力・レイアウト保持・warnings・`fillOfficialExcel` 経由の確認 |
| `lib/documents/officialForms.ts`(1エントリ追加) | `ACQUISITION_SPEC` を `OFFICIAL_FORM_SPECS` へ |
| `lib/documents/excelFill/index.ts`(1エントリ追加) | `FILLERS.acquisition` |

画面・API・生成履歴のコードは変更していない(`tests/officialFormsConsistency.test.ts` が SPECS と FILLERS の整合を検査する)。`renewalMapping.ts` の `sheetKey` のみ再利用し、日付分割などの小さな補助関数は、並行する #84・#86 との衝突を避けるため、取得側に複製した。

## セル座標(原本のロック解除セルから特定)

シートは1枚で、実際の名前は `取得 (反映)`(半角空白を含む)。`sheetKey()`(NFKC 正規化+空白除去)で照合する。

| 項番 | 項目 | セル(結合の左上) |
|---|---|---|
| 1 | 国籍・地域 | G14 |
| 2 | 生年月日(年・月・日) | R14・X14・AB14 |
| 3 | 氏名 | E17 |
| 4 | 性別(選択式) | E21「男」・F21「・」・G21「女」 |
| 5 | 出生地 | O21 |
| 6 | 配偶者の有無(選択式) | AH21「有」・AI21「・」・AJ21「無」 |
| 7 | 職業 | E24 |
| 8 | 本国における居住地 | V24 |
| 9 | 住居地・電話・携帯電話 | G27・F30・X30 |
| 10 | 旅券 番号、有効期限(年・月・日) | H33、X33・AD33・AH33 |
| 11 | 取得の事由「その他(内容)」 | Z36 |
| 12 | 在留の理由 | F39 |
| 13 | 在留期間、希望する在留資格「その他(内容)」 | AF42、Q44 |
| 14 | 犯罪を理由とする処分(具体的内容) | I47 |
| 15 | 在日親族(4行。続柄・氏名・生年月日・国籍・勤務先・カード番号) | A・D・M・Q・X・AE の56・58・60・62行 |
| 16 | 在日身元保証人 氏名・関係・住所・電話・携帯 | F65・AC65・F67・G70・Y70 |
| 17 | 代理人 氏名・関係・住所・電話 | F74・AC74・F76・G79 |
| 取次者 | 氏名・住所・所属機関等・電話 | E96・T96・C101・Z101 |

## Issue 本文と原本の確認結果

* Issue 本文は項番・セルを指定していない(単一シート・項目数が少ない旨のみ)。項番は原本のラベルと `FORM_LAYOUTS.acquisition` で確認し、食い違いはなかった(5 出生地、6 配偶者の有無、7 職業、8 本国居住地、9 住居地、10 旅券、11 取得の事由、12 在留の理由、13 希望する在留資格、14 犯罪、15 在日親族、16 在日身元保証人、17 代理人)。取得様式に職歴・所属機関用紙はない。
* Issue 本文の作業プロンプトは `fillAcquisitionExcel(a, f, targetStatus)` と `store.ts`・`page.tsx` への分岐追加を求めているが、#80 で画面・保存は手続種別を意識しない構造になっているため、`store.ts`・`page.tsx` は変更せず、拡張点2か所への追加のみとした(依頼の指示どおり)。
* Issue 本文の受け入れ基準「取得の事由・希望する在留資格が正しいセルに入っている」は、様式がチェックボックス(□)であるため、下記のとおり一部のみ満たす。

## 設計判断・対象外

* **チェックボックス(□)は差し込まない**(Issue #79 の方針)。対象は、11 取得の事由(出生・国籍離脱喪失・その他の□: J36・N36・V36)と、13 希望する在留資格(永住者の配偶者等・日本人の配偶者等・定住者・家族滞在・その他の□: H42・P42・X42・H44・M44)。代わりに、該当する値がある場合は `warnings` で「どの□を選ぶか」を知らせる。
* **有無の○は対象外**:14 犯罪の有無、15 在日親族の有無・同居(はい・いいえ)。ただし14の具体的内容、15の各欄は書く。親族は4行までで、あふれた分は書かず `warnings` に出す。
* 性別・配偶者の有無は、#79 と同じ「選択肢の文字を書き換える」方式(`PickItem` 相当)。取得様式の配偶者欄は3つの別セル(AH21・AI21・AJ21)で、更新様式(結合セル Y21)と異なる。
* **11 その他の内容(Z36)** は、`acquisitionCause === "other"` のときだけ書く。**13 その他(Q44)** は、`targetStatus` が4つの在留資格(チェックボックスのあるもの)以外のときだけ、その在留資格名を書く。
* **`targetStatus` は、#84(変更の差し込み)で差し込み経路(`OfficialFormContent["input"]`・`officialFormInputOf`・`parseFillInput`・`FillInput`・`Filler` の第4引数)に通された。** `FILLERS` の取得の関数は、その `targetStatus` をそのまま `fillAcquisitionExcel(a, f, targetStatus)` に渡す。そのため、画面から生成した取得様式でも、13 の「その他」欄と13の warning が出る。ただし、#84 より前に保存した版には `targetStatus` がないので、再生成すると13は空欄になる。
* **17 代理人の携帯電話番号(Y79)** は、案件DBに項目がないため対応表に含めない(別Issue。`docs/phase14-acquisition-forms-research.md` の3章)。
* 差し込み値は文字列。入力のない項目は、テンプレートの元の状態のまま。`warnings` は、申請人情報が未確定、親族のあふれ、取得の事由・希望する在留資格のチェックの案内。
* 取得様式の対象判定(`ACQUISITION_SPEC.isInScope`)は、手続種別が `acquisition` であれば対象とする(様式は在留資格を限定しない)。

## exceljs の制限・目視確認

制限は #79 と同じ(`docs/phase11-renewal-fill-engine.md`)。テストで、A4(`paperSize=9`)・倍率・向き・シート保護・結合セルが保たれることを確認した。取得様式には写真枠がないため、写真枠の欠落の影響はない。プリンター設定の埋め込みデータ、手動改ページ・ヘッダー/フッターが失われる可能性は未確認(#79 の制限に準ずる)。
Excel／LibreOffice での目視確認は、本Issueの作業でも未実施(作業環境で確認できない)。マージ前に、行政書士または担当者が、出力ファイルを開いて確認すること。

## 引き継ぎ

* (対応済み)`targetStatus` の差し込み経路への追加は、#84 で行われた。
* `docs/official/README.md` の「現在、実行時に読み込むのは renewal のみ」の記述は、#84・#86・#88 のマージ後にまとめて更新する(並行PRとの衝突を避け、本Issueでは変更していない)。
* 代理人の携帯電話番号(全様式の代理人欄)、チェックボックス・有無の○の差し込みは別Issue。
