# 公式資料(出入国在留管理庁)

在留期間更新許可申請・在留資格変更許可申請・在留資格認定証明書交付申請・在留資格取得許可申請(いずれも技術・人文知識・国際業務を中心とした在留資格)に関する、公式の様式・案内の写しです。

`renewal-application-form_930004095.xlsx`・`change-application-form_930004065.xlsx`・`coe-application-form_930004030.xlsx`・`acquisition-application-form_930004121.xlsx` の4様式(Excel)は、フェーズ11(`docs/phase11-excel-fill-decision.md`)の決定により、実行時のコードから参照する**差し込み元テンプレート**です(実装はIssue単位で順次行います)。アプリは、これらのファイルを読み込み、案件情報を対応するセルへ書き込んだものを、申請書類としてダウンロード提供します。現在、実行時に読み込むのは `renewal-application-form_930004095.xlsx` のみです(`lib/documents/excelFill/renewal.ts`。セル座標の特定方法は `docs/phase11-renewal-fill-engine.md`、画面・API への統合と手続種別ごとの拡張点は `docs/phase11-official-form-ui.md`)。他の3様式(変更・認定・取得)は、各Issueで同様に実装されるまで、コードからは参照していません。それ以外のPDF資料は、実行時のコードからは参照せず、対応表を点検するための参照用です。

| ファイル | 内容 | 取得元 |
|---|---|---|
| renewal-application-form_930004094.pdf | 在留期間更新許可申請書(別記第三十号の二様式) | https://www.moj.go.jp/isa/content/930004094.pdf |
| renewal-application-form_930004095.xlsx | 同(Excel・差し込み元テンプレート) | https://www.moj.go.jp/isa/content/930004095.xlsx |
| renewal-application-sample_001460062.pdf | 申請書の記載例 | https://www.moj.go.jp/isa/content/001460062.pdf |
| gijinkoku-renewal-checksheet_001367009.pdf | 提出書類チェックシート(更新) | https://www.moj.go.jp/isa/content/001367009.pdf |
| change-application-form_930004065.xlsx | 在留資格変更許可申請書(別記第三十号様式・Excel・差し込み元テンプレート) | https://www.moj.go.jp/isa/content/930004065.xlsx |
| coe-application-form_930004030.xlsx | 在留資格認定証明書交付申請書(別記第六号の三様式・Excel・差し込み元テンプレート) | https://www.moj.go.jp/isa/content/930004030.xlsx |
| coe-application-form-I_930004028.xlsx | 認定申請書 様式 I(教授。高度専門職1号イで教授の活動を行う場合)。第1表のみ差し込み元（`lib/documents/excelFill/coe.ts`） | https://www.moj.go.jp/isa/content/930004028.xlsx |
| coe-application-form-L_930004032.xlsx | 認定申請書 様式 L(企業内転勤。高度専門職1号ロ)。同上 | https://www.moj.go.jp/isa/content/930004032.xlsx |
| coe-application-form-M_930004034.xlsx | 認定申請書 様式 M(経営・管理。高度専門職1号ハ)。同上 | https://www.moj.go.jp/isa/content/930004034.xlsx |
| coe-application-form-U_930004059.xlsx | 認定申請書 様式 U(法律・会計、医療。高度専門職1号ロ・ハ)。同上 | https://www.moj.go.jp/isa/content/930004059.xlsx |
| hsp-point-calculation-sheet_930001673.xls | 高度専門職ポイント計算表（令和5年4月1日以降の参考書式。1号イ・ロ・ハの各シートと疎明資料。第2号と共用）。**参照用**（実行時のコードからは読み込まない。`.xls`のため）。疎明資料の対応は `docs/hsp-point-evidence.md`（Issue #186） | https://www.moj.go.jp/isa/content/930001673.xls |
| acquisition-application-form_930004121.xlsx | 在留資格取得許可申請書(別記第三十六号様式・Excel・差し込み元テンプレート) | https://www.moj.go.jp/isa/content/930004121.xlsx |

- 取得日:2026-10-02(更新の4資料)、2026-10-03(変更・認定・取得の3様式)
- 出典:出入国在留管理庁ホームページ(https://www.moj.go.jp/isa/applications/status/gijinkoku.html)
- 利用条件:入管庁のコンテンツは、権利表記がない限り公共データ利用規約(PDL1.0)が適用されます(https://www.moj.go.jp/isa/copyright/index2.html)。出典を記載し、編集・加工した場合はその旨を記載してください。国が作成したかのように公表・利用してはなりません。本アプリは、上記4様式のコピーのセルに案件情報を入力する加工を行います。加工後のファイルをダウンロードする画面に、出典および加工を行っている旨を表示してください。
- 取り扱い:事務所内での参照・差し込み処理用です。外部へ再配布する場合は、利用条件を再確認してください。
- 更新:様式は改正されることがあります。月次で入管庁の更新情報を確認し、版が変わった場合は、このフォルダの資料と対応表(`lib/documents/excelFill/` 配下の各モジュール)を更新してください。

- 認定申請書の様式の使い分け(高度専門職1号):イ=教授→I、研究→N/ロ=企業内転勤→L、技術・人文知識・国際業務→N、法律・会計または医療→U/ハ=経営・管理→M、法律・会計→U。上記以外の活動は、各在留資格の案内ページの様式を使います(Issue #181・#187)。取得日は2026-10-05です。
