# フェーズ11：「申請書類作成」画面への公式申請様式（Excel）の統合（Issue #80）

方針は `docs/phase11-excel-fill-decision.md`、差し込みエンジンは `docs/phase11-renewal-fill-engine.md`（#79）。本書は、**画面・保存・生成履歴への統合と、後続の #84（変更）・#86（認定）・#88（取得）が踏襲する分岐構造**を記録する。

## 全体の流れ

```
画面（app/cases/[id]/documents/page.tsx）
  └ generateDocuments(record, types)            lib/documents/store.ts
      ├ 公式申請様式のとき、先に API を呼ぶ     lib/documents/officialFormClient.ts
      │    POST /api/documents/official-form    app/api/documents/official-form/route.ts（Node.js ランタイム）
      │      └ fillOfficialExcel(input)         lib/documents/excelFill/index.ts（手続種別 → 差し込み関数）
      │          └ fillRenewalExcel …           lib/documents/excelFill/renewal.ts（#79）
      ├ content_json（画面の版・v n）を保存      lib/documents/snapshot.ts の buildContent
      └ exportFile(doc, "xlsx", blob)           エクセルの版（v n+1）を保存
```

* **API ルートが必要な理由**：差し込みエンジンは `node:fs` でテンプレート（`docs/official/*.xlsx`）を読む Node.js 専用処理で、ブラウザでは動かない。既存の Word・PDF はブラウザ内で作るが、エクセルだけはサーバーで作る。
* **API は何も保存・参照しない**：受け取った入力値（申請人・雇用・公式様式項目・手続種別・在留資格）をファイルへ差し込み、`{ warnings, xlsxBase64 }` を返すだけ。入力は型を検証し（`excelFill/input.ts`）、不正な型の値は空欄にする。本文は1MBまで。エラー文に入力内容は含めない。
* **認証**：Supabase 設定済みの環境では、アクセストークン（`Authorization: Bearer`）を `auth.getUser` で検証する。デモモード（ブラウザ内の仮データ）は `X-Demo-Mode: 1` で通す。データを保存・参照しないため、デモ値で呼べても漏れる情報はない。ただし、ヘッダー1つで誰でも呼べるため、**認証としては弱い**（CPU 消費目的の呼び出しは防げない）。レート制限は別課題。
* **本番のテンプレート追跡**：`next.config.ts` の `outputFileTracingIncludes` に `/api/documents/official-form` → `./docs/official/**/*.xlsx` を指定した（`next build` 後の `route.js.nft.json` に含まれることを確認済み）。**デプロイ先（Vercel 等）での読み込みは、本番相当の環境で要確認**。
* **版の持ち方**：生成すると、画面の版（`output_format = html`。差し込み時の注意・出典・入力値の写しを持つ）と、エクセルの版（`xlsx`）の2版ができる。Word・PDF と同じ「画面の版 → 出力版」の仕組みを踏襲した結果で、エクセルは `register_generated_file` で登録する。ファイル本体は `content_json.officialForm.input`（入力値の写し）から、いつでも同じ内容で再生成できる（ローカル保存時のダウンロードは、この写しから API で作る。Supabase 時は保存済みファイルを署名付きURLで返す）。
* **失敗時**：エクセルの生成（API）を先に行い、失敗したら版を作らない。エクセルの保存（0016 未適用など）に失敗した場合は、画面の版だけが残る。画面の版から「エクセル出力」を再実行できる。途中で失敗しても、それまでに保存できた版は、`finally` で画面の状態へ反映する（リロード不要。反映ロジックは `lib/documents/merge.ts` の純関数で、`tests/documentsMerge.test.ts`・`tests/documentsStoreFailure.test.ts` で検証）。

## 手続種別ごとの拡張点（#84・#86・#88 向け）

追加するのは、**次の3か所だけ**。画面・API・生成履歴は手続種別を意識しない。

| 場所 | 追加すること |
|---|---|
| `lib/documents/officialForms.ts` の `OFFICIAL_FORM_SPECS` | 手続種別ごとの `OfficialFormSpec`（様式名・ファイル識別番号・出典URL・確認日・`isInScope`・対象外の注意文）。`officialFormScopeWarnings` が画面の事前表示と、生成時の warnings の両方に使う |
| `lib/documents/excelFill/index.ts` の `FILLERS` | 手続種別 → 差し込み関数（`(a, e, f) => { buffer, warnings }`）。各様式の対応表は、#79 と同じ方式（`renewalMapping.ts` を参照）で作る |
| `lib/documents/types.ts` | 新しい「文書の種類」が必要になる場合のみ。現状は、手続種別にかかわらず `official_application_form` 1種類で、案件の `procedureType` で様式を切り替える |

* **未対応の手続種別**（現状は更新以外）は、生成を妨げず、更新の様式で差し込み、対象外の注意を `warnings` の先頭に付ける。`FILLERS` と `OFFICIAL_FORM_SPECS` に足した時点で、その手続種別の専用様式に切り替わる。
* 差し込み入力は、手続種別によらず `{ applicant, employment, formDetails, currentStatus }` と `procedureType`。様式が追加の入力を必要とする場合は、`OfficialFormContent["input"]`（`types.ts`）・`officialFormInputOf`（`officialForms.ts`）・`parseFillInput`（`excelFill/input.ts`）を拡張する。
* `buildContent`（`snapshot.ts`）は、`official_application_form` のとき `content_json.officialForm` に、様式のメタ・確認状況・warnings・入力値の写しを保存する。後続でも同じ構造を使う（様式のメタは `OfficialFormSpec.form` から取る）。
* 画面側：`app/cases/[id]/documents/page.tsx` は `isOfficialForm(type)` で公式様式の行と注意を出す。詳細画面（`[docId]/page.tsx`）は `isOfficialForm` で「エクセル出力」ボタンと注意書きを出す。手続種別の分岐は、画面には置かない。

## 転記補助シートの扱い（後方互換）

* `INTERNAL_DOCUMENT_TYPES`（新規生成の選択肢）から `transcription_aid` を外し、`official_application_form` を加えた。`GeneratedDocumentType`・DBの `document_type` 制約・`DOCUMENT_TYPE_LABELS` は変更しない。
* 型 `LegacyDocumentType` / `BuildableDocumentType` を追加し、`buildContent`・`titleOf` は引き続き `transcription_aid` を組み立てられる（`formMapping.ts` も変更していない。既存テストが使う）。過去の版は、生成履歴から閲覧・Word・PDF出力ができる。
* `formMapping.ts`（転記補助シートの対応表）の削除は、本Issueでは行わない（過去の版の表示・既存テストが依存）。

## マイグレーション 0016

`supabase/migrations/0016_generated_documents_xlsx.sql`（`supabase/README.md` に実行手順）。0010・0011 の形式を踏襲し、①`generated_documents.output_format` の check 制約に `xlsx` を追加（0008 の列定義の自動命名 `generated_documents_output_format_check` を、削除して作り直す）、②バケット `generated-documents` の `allowed_mime_types` に `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` を追加、③`register_generated_file` の許可形式に `xlsx` を追加。既存データは変更しない。**未適用の環境では、エクセルの保存に失敗する**。本番への適用は、行政書士の確認後にバックアップを取って行う。

## ダウンロード画面の表示

詳細画面（生成履歴からのリンク先）に、公式様式の版（画面・エクセルとも）で、次を表示する（`components/documents/OfficialFormNotice.tsx`、文言は `OFFICIAL_FORM_NOTICES`）。生成画面でも、公式申請様式を選択している間、同じ注意を表示する。内容は、出典（出入国在留管理庁ホームページ）、下書きであり提出前に行政書士が原本と照合すること、A4での提出が必要な場合はダウンロード後に Excel・LibreOffice 等から印刷して PDF 化すること。

## 未確認・制約

* Excel／LibreOffice での目視確認は、#79 と同様に未実施（作業環境で LibreOffice が起動できない）。
* 写真枠・手動改ページ等が失われる制限は #79 のとおり（`docs/phase11-renewal-fill-engine.md`）。
* 画面の版とエクセルの版で、生成履歴に2行できる（上記）。1行にまとめる場合は、画面の版を自動で「保管」にする等の変更が必要で、本Issueでは行っていない。
* ローカル保存時（Supabase 未使用）は、エクセルの本体を保存せず、ダウンロードの都度、`content_json` の写しから API で作り直す。そのため、生成時と各ダウンロード時に API が呼ばれる（生成時に作ったファイルは、ローカル保存では再利用していない）。小さな修正では解消できないため、**既知の制約**とする。
* `OFFICIAL_FORM_SPECS` と `FILLERS` の手続種別が一致していることは、`tests/officialFormsConsistency.test.ts` が検査する（#84 などで片方だけ足すと、テストが失敗する）。

## 個人情報の保存と削除（行政書士の運用判断が必要）

事実関係のみを記す。方針は決めていない。**行政書士の運用判断が必要**（保存してよい範囲、訂正・削除の手順、保管期間など）。

* 公式様式の版は、申請人情報・雇用情報・公式様式項目（旅券番号、処分歴、在日親族、職歴を含む）を、`content_json` に写しとして保存する。
* `generated_documents` は DB のトリガーにより更新できない。内容の訂正はできない。
* `register_generated_file` により、エクセルの行にも、この `content_json` が複製される。
* そのため、訂正・削除は、案件ごとの削除以外にできない（版や項目だけを消す手段はない）。
