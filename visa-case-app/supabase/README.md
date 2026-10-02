# Supabase の設定手順

接続情報を設定しない場合、アプリはブラウザ内の仮データで動作します。以下を行うと、ログインとデータベース保存が有効になります。

## 1. プロジェクトを作成する
1. https://supabase.com でアカウントを作成し、新しいプロジェクトを作成します（例：`visa-case-app`）。
2. データベースのパスワードを設定します（パスワード管理ツールに保管してください）。

## 2. テーブルを作成する
1. 左メニューの **SQL Editor** を開きます。
2. `supabase/migrations/0001_init.sql` の内容をすべて貼り付け、**Run** を実行します。続けて `0002_employment_requirements.sql`（雇用・会社情報と必要書類の記録用）、`0003_account.sql`（事務所名の変更を所有者のみに許可）も、同様に順番に実行します。
3. エラーが出ないことを確認します。

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
- 案件を作成し、在留カードをアップロードして確定できること。
- Supabase の **Table Editor** で `cases` / `applicants` / `documents` / `document_extractions` / `audit_logs` に記録されること。
- **Storage > documents** に、ファイルが「事務所ID/案件ID/書類ID.拡張子」で保存され、公開されていないこと。
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
| applicants | 確認済みの正式な申請人情報（案件名とは別に保持） |
| documents | アップロードした書類（実体は非公開ストレージ） |
| document_extractions | OCRの抽出候補と、行政書士が確認した値 |
| employment_details | 雇用・会社情報（所属機関のカテゴリーを含む） |
| requirement_states | 必要書類ごとの、提出済み・判定の上書き・理由の記録 |
| audit_logs | 案件作成・書類登録・確定などの記録（追記のみ） |
