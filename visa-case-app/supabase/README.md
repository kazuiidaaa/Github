# Supabase の設定手順

接続情報を設定しない場合、アプリはブラウザ内の仮データで動作します。以下を行うと、ログインとデータベース保存が有効になります。

## 1. プロジェクトを作成する
1. https://supabase.com でアカウントを作成し、新しいプロジェクトを作成します（例：`visa-case-app`）。
2. データベースのパスワードを設定します（パスワード管理ツールに保管してください）。

## 2. テーブルを作成する
1. 左メニューの **SQL Editor** を開きます。
2. `supabase/migrations/0001_init.sql` の内容をすべて貼り付け、**Run** を実行します。続けて `0002_employment_requirements.sql`（雇用・会社情報と必要書類の記録用）、`0003_account.sql`（事務所名の変更を所有者のみに許可）も、同様に順番に実行します。さらに `0004_document_upload.sql`（書類のファイルサイズ、ストレージの20MB・形式制限、select/insert/delete の分割）も実行します。続けて `0005_applicant_manual_entry.sql`（申請人情報の手入力化。OCRの廃止に伴う状態名の変更を含む）、`0006_requirement_tracking.sql`（必要書類の状態・期限と追加書類）も実行します。最後に `0007_case_checks.sql`（申請前チェック）も実行します。`0006` は `requirement_states.submitted` 列を削除するため、実行前にファイル冒頭の確認用 SQL で件数を確認してください。
3. エラーが出ないことを確認します。

**重要**：`0009_security_hardening.sql` は、アプリの更新（監査ログの成否の記録）と対になっています。0009 を実行する前に、ファイル冒頭のコメントにある確認クエリがすべて 0 であることを確認してください。0009 を実行せずに最新のアプリを使うと、監査ログの記録が失敗します。

## 3. ご自身のログイン用ユーザーを作成する
1. 左メニューの **Authentication > Users** で **Add user** を選び、メールアドレスとパスワードを登録します（**Auto Confirm User** を有効にします）。
2. **Authentication > Sign In / Providers**（または Settings）で、**新規ユーザーの登録（Allow new users to sign up）を無効**にします。自分専用で使う間は、他の人が登録できないようにしてください。

## 4. 接続情報を設定する
1. **Project Settings > API** で、Project URL と Publishable key（anon key）を確認します。
2. `visa-case-app/.env.example` を `.env.local` という名前でコピーし、値を入力します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

3. `npm run dev` を起動し直し、`http://localhost:3000` を開きます。ログイン画面が表示されれば接続されています。
4. 初回ログイン時に、事務所（organization）が自動で1件作成され、ご自身が所属します。

`service_role` キー（秘密鍵）は、ブラウザ用のコードや `NEXT_PUBLIC_` 付きの変数に設定しないでください。

## 5. 動作確認の観点
- 案件を作成し、在留カードを登録して、「申請人情報」タブで手入力・下書き保存・確認済み化・再編集ができること。
- Supabase の **Table Editor** で `cases` / `applicants` / `documents` / `document_extractions` / `audit_logs` に記録されること。
- **Storage > documents** に、ファイルが「事務所ID/案件ID/書類ID.拡張子」で保存され（JPG/PNG/PDF、20MBまで）、公開されていないこと。
- ログアウト後、案件画面を開くとログイン画面へ移動すること。

## 6. 本番利用の前に
- 実在の個人情報を扱う前に、匿名化したテストデータで検証してください。
- 開発用と本番用で、Supabase のプロジェクトを分けてください。
- 管理者アカウントには多要素認証を設定することを推奨します（Authentication の設定から有効化できます）。

## 構成
| テーブル | 内容 |
| :-- | :-- |
| organizations / members | 事務所と所属 |
| cases | 案件（案件名・手続種別・状態） |
| applicants | 行政書士が手入力した申請人情報（下書き／確認済み。案件名とは別に保持） |
| documents | アップロードした書類（実体は非公開ストレージ） |
| document_extractions | （廃止済み・未使用。OCRの抽出候補。後続の移行で削除予定） |
| employment_details | 雇用・会社情報（所属機関のカテゴリーを含む） |
| requirement_states | 必要書類ごとの、提出済み・判定の上書き・理由の記録 |
| case_checks | 申請前チェックの項目ごとの状態・メモ・確認日時（行政書士が付ける管理状態） |
| audit_logs | 案件作成・書類登録・確定などの記録（追記のみ） |

## 7. 申請書類作成（フェーズ6-A）を使う場合
`supabase/migrations/0008_generated_documents.sql` を、0001〜0007 の実行後に SQL Editor で実行します。生成した内部確認シートの保存と、版の管理に使います。

## 8. Word出力（フェーズ6-B）を使う場合
`supabase/migrations/0010_generated_documents_word.sql` を、0008 の実行後に SQL Editor で実行します（0009 の有無には依存しません）。Word ファイルを保存する非公開バケット `generated-documents`（10MB・.docx のみ・更新と削除は不可）と、Word 版を新しい版として登録する関数を作成します。

## 9. PDF出力（フェーズ6-C）を使う場合
`supabase/migrations/0011_generated_documents_pdf.sql` を、0010 の実行後に SQL Editor で実行します。バケット `generated-documents` に PDF を追加し、登録関数を Word と PDF の両方に対応させます。日本語フォント（Noto Sans JP、SIL Open Font License）は `public/fonts/` に同梱しており、PDF の出力時のみ読み込みます。

## フェーズ10：複数ユーザーと役割

`supabase/migrations/0013_roles.sql` を、0012 の実行後に SQL Editor で実行します。役割（owner / admin / staff / viewer）ごとに、案件・子テーブル・生成文書・ファイル保存先の規則を置き換え、メンバー管理の関数（`list_members`、`add_member_by_email`、`set_member_role`、`remove_member`）を追加します。実行前にバックアップを取り、ファイル冒頭の確認クエリを実行してください。アプリの更新と対になっています。0013 を実行せずに最新のアプリを使うと、アカウント画面のメンバー管理が失敗します（他の機能は従来どおり動作します）。詳細は `docs/production.md` の「9. 複数ユーザーと役割」を参照してください。

## 0012・0014(フェーズ9:公式様式対応)

- `supabase/migrations/0012_transcription_aid.sql`:生成文書の種類に「転記補助シート」を追加します(0011 の実行後)。
- `supabase/migrations/0014_form_fields.sql`:公式申請書の追加入力項目(旅券番号、犯罪を理由とする処分、在日親族、職歴など)の保存先 `form_details` を追加します。0013(役割)の実行後に実行してください。個人情報を含むため、実行前にバックアップを取得してください。実行せずに最新のアプリを使うと、案件の読み込みが失敗します。

## 0016(フェーズ11:公式様式のエクセル出力)

`supabase/migrations/0016_generated_documents_xlsx.sql` を、0015 の実行後に SQL Editor で実行します。`generated_documents.output_format` の制約、バケット `generated-documents` の許可形式(.xlsx を追加)、`register_generated_file` 関数の許可形式に、`xlsx` を追加します。実行せずに最新のアプリで「公式申請様式」を生成すると、エクセルの保存に失敗します(画面版の保存までは行われます)。既存のデータは変更しません。

## 0017(手続種別「在留資格取得許可申請」)

- `supabase/migrations/0017_procedure_type_acquisition.sql`:`cases.procedure_type` の許可する値に `acquisition` を追加します。既存データへの影響はありません。実行せずに最新のアプリを使うと、手続種別「在留資格取得許可申請」の案件を保存できません(他の手続種別は従来どおり動作します)。
- 適用順は、0016(`0016_generated_documents_xlsx.sql`、差し込み済みエクセル)の次に 0017 です(番号は、PR #97 の 0016 と重ならないよう 0017 にしました)。0016 が未適用の環境でも、0017 の内容は 0016 に依存しません(適用順は番号順を保つこと)。
- 実行前に、バックアップを取得し、本番の制約名を確認してください。ファイルは `cases_procedure_type_check` を drop して付け直します。制約名が異なる環境では、`drop constraint if exists` が何もせず、古い制約が残ったまま新しい制約が追加され、`acquisition` を保存できません。

  ```sql
  select conname, pg_get_constraintdef(oid)
  from pg_constraint
  where conrelid = 'public.cases'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%procedure_type%';
  ```

  `cases_procedure_type_check` 以外の名前が返った場合は、その名前に合わせてファイルを読み替えてください。

## 0018(公式様式の生成 API のレート制限)

- `supabase/migrations/0018_rate_limits.sql`:集計表 `rate_limits`(利用者からの直接の読み書きは不可)と、関数 `check_rate_limit` を追加します。既存のデータへの影響はありません。0017 の実行後に SQL Editor で実行します。
- 実行しない場合、レート制限は適用されません(共有ストアを利用できないときは、制限を止めて処理を続ける仕様のためです。公式様式の生成そのものは動作します)。
- 古い行は、関数の呼び出し時に一部の確率で削除します(1時間より前の窓)。

## 0019(生成文書の状態:「最終版」を「提出済み」へ)

- `supabase/migrations/0019_document_status_submitted.sql`:`generated_documents.document_status` の `final` を `submitted` に変更し(制約と遷移の規則)、既存の `final` を `submitted` に読み替えます。0018 の実行後に SQL Editor で実行します。
- 実際に提出済みかどうかは DB から判別できないため、読み替え後に、未提出の版がないか画面で確認してください。
- 監査ログの過去の記録(`document_final`)は書き換えません。

## 0020(生成文書:確認前の版の更新)

- `supabase/migrations/0020_draft_documents_update.sql`:確認前(draft)の版に限り、題名・内容・版番号の変更を許可します(`guard_generated_documents` の差し替え)。更新用の関数 `update_draft_generated_document` と、保管庫 `generated-documents` の上書き用ポリシーを追加します。0019 の実行後に SQL Editor で実行します。
- 確認済み(reviewed)・提出済み(submitted)・保管(archived)の版は、内容も、保管庫のファイルも、変更できません。行の削除のポリシーは、設けないままです。
- 実行しない場合、最新のアプリで再生成すると、確認前の版の更新に失敗します(新しい版の追加は従来どおりです)。既存のデータは変更しません。

## 0021(生成文書:高度専門職ポイント計算表)

- `supabase/migrations/0021_hsp_point_sheet.sql`:`generated_documents.document_type` の許可する値に `hsp_point_sheet` を追加します(制約の付け直しのみ。既存のデータ・ポリシー・トリガーは変更しません)。0020 の実行後に SQL Editor で実行します。
- 実行しない場合、案件の「ポイント計算表」の「版として保存してダウンロード」が失敗します(「保存せずにダウンロード」は動作します)。
- 実行前に、制約名が `generated_documents_document_type_check` であることを確認してください(0012 と同じ名称です)。

  ```sql
  select conname, pg_get_constraintdef(oid)
  from pg_constraint
  where conrelid = 'public.generated_documents'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%document_type%';
  ```

## 0023(案件:受任日)

- `supabase/migrations/0023_accepted_date.sql`:`cases` に、受任日の列 `accepted_date`(日付、未入力可)を追加します。既存の案件は未入力のままで、既存のデータ・ポリシー・トリガーは変更しません。
- 実行の順序:先に #224 の `0022_client_guide.sql` を実行し、その後に `0023_accepted_date.sql` を、SQL Editor で実行します。0022 が未実行の環境でも 0023 の内容は 0022 に依存しませんが、番号順に実行してください。
- 実行しない場合、最新のアプリで案件を保存すると、列がないため失敗します(新規案件の作成、案件情報の保存、申請予定日など案件の他の項目の保存を含みます)。実行前に、最新のアプリを公開しないでください。公開済みの場合は、先に実行してください。
- 実行後の確認:次の SQL が、1行(`accepted_date`、`date`)を返すことを確認します。

  ```sql
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'cases' and column_name = 'accepted_date';
  ```

  その後、画面で案件情報の「受任日」を入力して保存し、再読み込み後も残ることを確認してください。

