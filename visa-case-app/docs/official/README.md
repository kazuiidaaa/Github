# 公式資料(出入国在留管理庁)

在留期間更新許可申請・在留資格変更許可申請・在留資格認定証明書交付申請・在留資格取得許可申請(いずれも技術・人文知識・国際業務を中心とした在留資格)に関する、公式の様式・案内の写しです。

`renewal-application-form_930004095.xlsx`・`change-application-form_930004065.xlsx`・`coe-application-form_930004030.xlsx`・`acquisition-application-form_930004121.xlsx` の4様式(Excel)は、フェーズ11(`docs/phase11-excel-fill-decision.md`)の決定により、実行時のコードから参照する**差し込み元テンプレート**です(実装はIssue単位で順次行います)。アプリは、これらのファイルを読み込み、案件情報を対応するセルへ書き込んだものを、申請書類としてダウンロード提供します。実行時に読み込むのは、更新・変更・認定・取得の4様式(様式N)と、高度専門職の様式別ファイル(`renewal-application-form-{I,L,M,U}.xlsx`・`change-application-form-{I,L,M,U}.xlsx`・`coe-application-form-{I,L,M,U}_*.xlsx`)です(`lib/documents/excelFill/{renewal,change,coe,acquisition}.ts`。高度専門職の号・行う活動から様式を選ぶ規則は `lib/hspForm.ts`。取得は様式が1つで、高度専門職でも切り替えません)。セル座標の特定方法は `docs/phase11-fill-engines.md`（更新編）、画面・API への統合と手続種別ごとの拡張点は `docs/phase11-official-form-ui.md` を参照してください。それ以外のPDF資料は、実行時のコードからは参照せず、対応表を点検するための参照用です。

| ファイル | 内容 | 取得元 |
|---|---|---|
| renewal-application-form_930004094.pdf | 在留期間更新許可申請書(別記第三十号の二様式) | https://www.moj.go.jp/isa/content/930004094.pdf |
| renewal-application-form_930004095.xlsx | 同(Excel・差し込み元テンプレート) | https://www.moj.go.jp/isa/content/930004095.xlsx |
| renewal-application-sample_001460062.pdf | 申請書の記載例 | https://www.moj.go.jp/isa/content/001460062.pdf |
| gijinkoku-renewal-checksheet_001367009.pdf | 提出書類チェックシート(更新) | https://www.moj.go.jp/isa/content/001367009.pdf |
| renewal-application-form-I.xlsx | 更新申請書 様式 I(教授。高度専門職1号イ・2号)。ユーザーが2026-10-07に提供。取得元の確認は未了 | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号は未照合) |
| renewal-application-form-L.xlsx | 更新申請書 様式 L(企業内転勤。高度専門職1号ロ・2号)。ユーザーが2026-10-07に提供。取得元の確認は未了 | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号は未照合) |
| renewal-application-form-M.xlsx | 更新申請書 様式 M(経営・管理。高度専門職1号ハ・2号)。ユーザーが2026-10-07に提供。取得元の確認は未了 | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号は未照合) |
| renewal-application-form-U.xlsx | 更新申請書 様式 U(法律・会計、医療。高度専門職1号ロ・ハ・2号)。ユーザーが2026-10-07に提供。取得元の確認は未了 | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号は未照合) |
| change-application-form_930004065.xlsx | 在留資格変更許可申請書(別記第三十号様式・Excel・差し込み元テンプレート) | https://www.moj.go.jp/isa/content/930004065.xlsx |
| change-application-form-I.xlsx | 変更申請書 様式 I(教授。高度専門職1号イ・2号)。ユーザーが2026-10-07に提供。取得元の確認は未了 | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号は未照合) |
| change-application-form-L.xlsx | 変更申請書 様式 L(企業内転勤。高度専門職1号ロ・2号)。ユーザーが2026-10-07に提供。取得元の確認は未了 | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号は未照合) |
| change-application-form-M.xlsx | 変更申請書 様式 M(経営・管理。高度専門職1号ハ・2号)。ユーザーが2026-10-07に提供。取得元の確認は未了 | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号は未照合) |
| change-application-form-U.xlsx | 変更申請書 様式 U(法律・会計、医療。高度専門職1号ロ・ハ・2号)。ユーザーが2026-10-07に提供。取得元の確認は未了 | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号は未照合) |
| coe-application-form_930004030.xlsx | 在留資格認定証明書交付申請書(別記第六号の三様式・Excel・差し込み元テンプレート) | https://www.moj.go.jp/isa/content/930004030.xlsx |
| coe-application-form-I_930004028.xlsx | 認定申請書 様式 I(教授。高度専門職1号イで教授の活動を行う場合)。第1表のみ差し込み元（`lib/documents/excelFill/coe.ts`） | https://www.moj.go.jp/isa/content/930004028.xlsx |
| coe-application-form-L_930004032.xlsx | 認定申請書 様式 L(企業内転勤。高度専門職1号ロ)。同上 | https://www.moj.go.jp/isa/content/930004032.xlsx |
| coe-application-form-M_930004034.xlsx | 認定申請書 様式 M(経営・管理。高度専門職1号ハ)。同上 | https://www.moj.go.jp/isa/content/930004034.xlsx |
| coe-application-form-U_930004059.xlsx | 認定申請書 様式 U(法律・会計、医療。高度専門職1号ロ・ハ)。同上 | https://www.moj.go.jp/isa/content/930004059.xlsx |
| points-calculation-table_930001673.xlsx | 高度専門職のポイント計算表(令和5年4月1日以降の参考書式。シート:A 第1号イ・B 第1号ロ・C 第1号ハ・疎明資料(基本例)・中小企業者の参考表。第2号と共用)。公式のxlsを、Excelで.xlsxに保存し直したもの(Issue #186)。初版は出力時に見切れていた可能性があるため、保存し直した版へ差し替え済み。**差し込み元テンプレート**（`lib/documents/excelFill/hspPoint.ts`） | 出典ページ: https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html(ファイル番号 930001673) |
| hsp-point-calculation-sheet_930001673.xls | 高度専門職ポイント計算表（令和5年4月1日以降の参考書式。1号イ・ロ・ハの各シートと疎明資料。第2号と共用）。**参照用**（実行時のコードからは読み込まない。`.xls`のため）。疎明資料の対応は `docs/hsp-point-evidence.md`（Issue #186） | https://www.moj.go.jp/isa/content/930001673.xls |
| acquisition-application-form_930004121.xlsx | 在留資格取得許可申請書(別記第三十六号様式・Excel・差し込み元テンプレート) | https://www.moj.go.jp/isa/content/930004121.xlsx |

- 取得日:2026-10-02(更新の4資料)、2026-10-03(変更・認定・取得の3様式)
- 出典:出入国在留管理庁ホームページ(https://www.moj.go.jp/isa/applications/status/gijinkoku.html)
- 利用条件:入管庁のコンテンツは、権利表記がない限り公共データ利用規約(PDL1.0)が適用されます(https://www.moj.go.jp/isa/copyright/index2.html)。出典を記載し、編集・加工した場合はその旨を記載してください。国が作成したかのように公表・利用してはなりません。本アプリは、上記4様式のコピーのセルに案件情報を入力する加工を行います。加工後のファイルをダウンロードする画面に、出典および加工を行っている旨を表示してください。
- 取り扱い:事務所内での参照・差し込み処理用です。外部へ再配布する場合は、利用条件を再確認してください。
- 更新:様式は改正されることがあります。月次で入管庁の更新情報を確認し、版が変わった場合は、このフォルダの資料と対応表(`lib/documents/excelFill/` 配下の各モジュール)を更新してください。

- 認定申請書の様式の使い分け(高度専門職1号):イ=教授→I、研究→N/ロ=企業内転勤→L、技術・人文知識・国際業務→N、法律・会計または医療→U/ハ=経営・管理→M、法律・会計→U。上記以外の活動は、各在留資格の案内ページの様式を使います(Issue #181・#187)。取得日は2026-10-05です。

- 変更申請書の様式の使い分け(高度専門職):1号は認定と同じ対応(イ=教授→I、研究→N/ロ=企業内転勤→L、技術・人文知識・国際業務→N、法律・会計または医療→U/ハ=経営・管理→M、法律・会計→U)。2号は、1号と同じ活動なら1号と同じ様式、活動が変わる場合は変更後の在留資格の案内ページの様式を使います。出典:上記の入管庁ページ(2026-10-07確認。ページ内に最終更新日の記載なし)。
- 更新申請書の様式の使い分け(高度専門職1号):変更と同じ対応です(上記)。2号に更新はありません(在留期限が無期限のため)。出典:上記の入管庁ページ(2026-10-07確認)。

- 特定活動の案内ページの原文の控え(designatedactivities07/08/11_2026-10-18.txt)と、画面の必要書類との照合表(`reconciliation/tokutei-katsudo-2026-10-18.md`)。取得日は2026-10-18。人がブラウザでページの文字をコピーしたもの。3ページとも、提出書類のチェックシートのPDFは無い(Issue #333 手順B)。

- 研究の案内ページの原文の控え(`researcher_2026-10-18.txt`)と、チェックシート3点(`researcher-coe-checksheet-cat34_001460239.pdf`:認定・カテゴリー3・4のみ、`researcher-change-checksheet-cat34_001460240.pdf`:変更・カテゴリー3・4のみ、`researcher-renewal-checksheet_001460241.pdf`:更新・カテゴリー共通。いずれも令和8年4月15日以降。ほかに、認定・変更のカテゴリー共通 `researcher-coe-checksheet-common_001404129.pdf`・`researcher-change-checksheet-common_001367603.pdf`)、画面の必要書類との照合表(`reconciliation/kenkyu-2026-10-18.md`)。取得日は2026-10-18。ページは人がブラウザでコピーしたもの、PDFは人が提供したもの。出典:https://www.moj.go.jp/isa/applications/status/researcher.html 。研究のPDFは5つそろった(Issue #333 手順A)。
- 介護の案内ページの原文の控え(`nursingcare_2026-10-18.txt`)と、チェックシート3点(`nursingcare-coe-checksheet_001460243.pdf`:認定、`nursingcare-change-checksheet_001460244.pdf`:変更、`nursingcare-renewal-checksheet_001460245.pdf`:更新。いずれも令和8年4月15日以降)、画面の必要書類との照合表(`reconciliation/kaigo-2026-10-18.md`)。取得日は2026-10-18。ページは人がブラウザでコピーしたもの、PDFは人が提供したもの。出典:https://www.moj.go.jp/isa/applications/status/nursingcare.html (Issue #333 手順A)。

- 法律・会計業務の案内ページの原文の控え(`legalaccountingservices_2026-10-18.txt`)と、チェックシート3点(`legalaccountingservices-coe-checksheet_001404126.pdf`:認定、`legalaccountingservices-change-checksheet_001365777.pdf`:変更、`legalaccountingservices-renewal-checksheet_001365781.pdf`:更新)、画面の必要書類との照合表(`reconciliation/houmu-kaikei-2026-10-18.md`)。取得日は2026-10-18。ページは人がブラウザでコピーしたもの、PDFは人が提供したもの。出典:https://www.moj.go.jp/isa/applications/status/legalaccountingservices.html (Issue #333 手順A 法律・会計業務)。
- 医療の案内ページの原文の控え(`medicalservices_2026-10-18.txt`)と、チェックシート3点(`medicalservices-coe-checksheet_001404128.pdf`:認定、`medicalservices-change-checksheet_001365695.pdf`:変更、`medicalservices-renewal-checksheet_001365702.pdf`:更新)、画面の必要書類との照合表(`reconciliation/iryo-2026-10-18.md`)。取得日は2026-10-18。ページは人がブラウザでコピーしたもの、PDFは人が提供したもの。出典:https://www.moj.go.jp/isa/applications/status/medicalservices.html (Issue #333 手順A 医療)。

- 技能の案内ページの原文の控え(調理師:`skilledlabor-cook_2026-10-18.txt`、調理師以外:`skilledlabor-other_2026-10-18.txt`)と、変更のチェックシート4点(`skilledlabor-cook-change-checksheet-cat34_001460250.pdf`:調理師・カテゴリー3・4のみ、`skilledlabor-other-change-checksheet-cat34_001460256.pdf`:調理師以外・カテゴリー3・4のみ、`skilledlabor-change-checksheet-common_001395552.pdf`・`skilledlabor-change-checksheet-common_001395558.pdf`:カテゴリー共通。この2つは内容(バイト)が同一で、調理師向け・調理師以外向けのどちらかは不明)、画面の必要書類との照合表(`reconciliation/gino-change-2026-10-18.md`)。取得日は2026-10-18。ページは人がブラウザでコピーしたもの、PDFは人が提供したもの。出典:https://www.moj.go.jp/isa/applications/status/skilledlabor01.html ・ skilledlabor02.html (Issue #333 手順A 技能・変更)。認定(カテゴリー3・4)と更新は照合済みで、今回は見ていない。

- 経営・管理の案内ページの原文の控え(`businessmanager_2026-10-18.txt`)と、チェックシート5点(認定:`businessmanager-coe-checksheet-common_001448296.pdf`(カテゴリー共通)・`businessmanager-coe-checksheet-cat34_001448297.pdf`(カテゴリー3・4のみ)、変更:`businessmanager-change-checksheet-common_001448304.pdf`・`businessmanager-change-checksheet-cat34_001460234.pdf`、更新:`businessmanager-renewal-checksheet_001460235.pdf`)と、画面の必要書類との照合表(`reconciliation/keiei-kanri-2026-10-18.md`)。取得日は2026-10-18。案内ページは人がブラウザでコピーしたもの、PDFは人が提供したもの。出典:https://www.moj.go.jp/isa/applications/status/businessmanager.html (Issue #333 手順C 経営・管理)。取得は対象外。コードは変更していない(食い違いは判断待ち)。

- 技術・人文知識・国際業務の案内ページの原文の控え(`gijinkoku_2026-10-18.txt`。取得の項を含む(#396で追記))と、チェックシート4点(認定:`gijinkoku-coe-checksheet-common_001404131.pdf`(カテゴリー共通)・`gijinkoku-coe-checksheet-cat34_001437254.pdf`(カテゴリー3・4のみ)、変更:`gijinkoku-change-checksheet-common_001367001.pdf`・`gijinkoku-change-checksheet-cat34_001437255.pdf`)を追加。更新は既存の `gijinkoku-renewal-checksheet_001367009.pdf`(バイト一致を確認)。画面の必要書類との照合表は `reconciliation/gijinkoku-2026-10-18.md`。取得日は2026-10-18。案内ページは人がブラウザでコピーしたもの、PDFは人が提供したもの。出典:https://www.moj.go.jp/isa/applications/status/gijinkoku.html (Issue #333 手順E 技術・人文知識・国際業務)。取得は対象外。コードは変更していない(食い違いは判断待ち)。

- 企業内転勤の案内ページの原文の控え(`intracompanytransferee_2026-10-18.txt`。取得の項は省略)と、チェックシート5点(認定:`intracompanytransferee-coe-checksheet-common_001404133.pdf`(カテゴリー共通)・`intracompanytransferee-coe-checksheet-cat34_001366542.pdf`(カテゴリー3・4のみ)、変更:`intracompanytransferee-change-checksheet-common_001366563.pdf`・`intracompanytransferee-change-checksheet-cat34_001366564.pdf`、更新:`intracompanytransferee-renewal-checksheet_001366562.pdf`)、提出書類の変更の案内(`intracompanytransferee-change-notice-202604_001457117.pdf`。令和8年4月1日運用開始。赤字が変更点)を追加。画面の必要書類との照合表は `reconciliation/kigyonai-2026-10-18.md`。取得日は2026-10-18。案内ページは人がブラウザでコピーしたもの、PDFは人が提供したもの(5点のチェックシートの番号が、案内ページのリンク先と同じことは、人が確認済み)。出典:https://www.moj.go.jp/isa/applications/status/intracompanytransfee.html (Issue #333 企業内転勤。URLの綴りは `transfee` が正しい（人がブラウザで確認。照合表のE-4)。取得は対象外。コードは変更していない。

- 取得許可申請の案内ページ2本の原文の控え(`acquisition_2026-10-18.txt`:入管庁「在留資格取得許可申請」の手続案内。提出書類は各在留資格のページに委ねる。PDFなし。URL: https://www.moj.go.jp/isa/applications/procedures/16-10.html (人が提示)。`highlyskilledprofessional_2026-10-18.txt`:高度専門職のページ。節「在留資格取得許可申請(高度専門職１号)」が対象。出典:https://www.moj.go.jp/isa/applications/status/designatedactivities02_00004.html 。チェックシート類のPDFは保存していない)と、画面の必要書類との照合表(`reconciliation/acquisition-2026-10-18.md`)。取得日は2026-10-18。ページは人がブラウザでコピーしたもの。取得許可申請書(`acquisition-application-form_930004121.xlsx`)は上の表のとおり保存済み。事由別ページ(手続案内)のURLは `https://www.moj.go.jp/isa/applications/procedures/16-10.html`(人が提示)。食い違い R-1〜R-9 は、人が「原文に合わせる」と判断し、#374 の最後の PR で `rules.ts` の `HSP_ACQUISITION` に反映した(Issue #374 項目1)。
- 技術・人文知識・国際業務と家族滞在の案内ページの原文の控え(`gijinkoku_2026-10-18.txt`:取得の節を含む、`kazokutaizai_2026-10-18.txt`)と、取得の画面の必要書類との照合表(`reconciliation/acquisition-gijinkoku-kazokutaizai-2026-10-18.md`)。取得日は2026-10-18。人がブラウザでページの文字をコピーしたもの。URL: https://www.moj.go.jp/isa/applications/status/gijinkoku.html 、https://www.moj.go.jp/isa/applications/status/dependent.html (人が2026-10-18に提示)。家族滞在の取得のチェックシート(PDF)は、人がPDFの文字を転記した `checksheets/kazokutaizai_acquisition_checksheet_2026-10-18.txt` で保存(PDFの原本は人の端末にあり、リポジトリには置いていない。取得日2026-10-18)。照合は同じ照合表に追記。

## 出典の kind と comparedAt、画面の日付(Issue #374 項目2)
- `lib/requirements/rules.ts` の出典(`RuleSource`)に、`kind`(`page`=案内ページ、`pdf`=PDF、`form`=申請書様式。URLの拡張子に合わせる)と、`comparedAt`(その出典の原文と突き合わせた日 `YYYY-MM-DD`)を設けた。照合表(`reconciliation/*.md`)がある資格の出典に入れてあり、`comparedAt` は照合した出典にだけ入れる(日付は照合表と `reconciliation/README.md` の1章の表から写す。推測しない)。
- 画面の見出し「規則の確認日」は、`comparedAt` の最新日を優先し、なければ従来の `checkedAt` を表示する。`checkedAt` は変えない(意味は「規則を最後に見直した日」)。`kind` は画面に出さない。
- 原文(このフォルダのページの控え・PDF)を新たに照合したら、その出典の `comparedAt` を更新する。方針の詳細は `reconciliation/README.md` の2-2章。
