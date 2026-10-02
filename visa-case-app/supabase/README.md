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
