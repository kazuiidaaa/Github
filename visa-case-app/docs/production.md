# 本番運用ガイド（フェーズ7）

在留カード・パスポート情報などの個人情報を扱うため、開発環境と本番環境を完全に分離します。

## 1. 環境の分離

| 項目 | 開発環境 | 本番環境 |
| :-- | :-- | :-- |
| データ | ダミーデータのみ | 実案件データ |
| Supabase | 開発用プロジェクト | 本番用プロジェクト |
| 環境変数の設置場所 | `.env.local`（Git管理外） | Vercel の Environment Variables（Production） |
| デプロイ | `npm run dev` / Vercel Preview | Vercel Production |

規則：
- 実案件のデータ・書類画像を、開発環境・Preview環境へ入力しない。
- Vercel の Preview 環境には、本番用の Supabase 接続情報を設定しない（Preview は開発用プロジェクトを指す）。
- 本番用 Supabase の管理者アカウントには、多要素認証を設定する。

## 2. 環境変数一覧

| 変数 | 公開 | 内容 |
| :-- | :-- | :-- |
| `NEXT_PUBLIC_SUPABASE_URL` | 可（ブラウザへ公開） | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 可（RLSで保護） | Publishable（anon）キー |

設定してはならないもの：`service_role` キー、`sb_secret_` で始まる鍵、データベースのパスワード。
`lib/env.ts` が起動時に検証し、秘密鍵が混入している場合は接続を拒否します。

## 3. 設定漏れ時の動作
- 開発（`next dev`）：未設定ならブラウザ内の仮データで動作します。
- 本番（`next build` / `next start`）：未設定・形式不正の場合は、仮データへ切り替えず、画面全体に設定エラーを表示して停止します。

## 4. 公開前チェックリスト
- [ ] 本番用 Supabase プロジェクトを新規作成した（開発用と別）
- [ ] `supabase/migrations` を番号順にすべて実行した
- [ ] 新規ユーザー登録（Allow new users to sign up）を無効にした
- [ ] Security Advisor に、未対応の警告がない
- [ ] 全テーブルでRLSが有効である
- [ ] Storage の `documents` バケットが非公開である
- [ ] バックアップを確認した（Pro プランの場合は PITR の要否を判断）
- [ ] 管理者アカウントに多要素認証を設定した
- [ ] Vercel の Production にのみ、本番用の環境変数を設定した
- [ ] 他事務所のデータへアクセスできないことを、2つのアカウントで確認した

## 5. エラー表示の方針
Supabase の内部エラー文（テーブル名・制約名など）は画面へ表示しません（`lib/errors.ts`）。画面には一般的な文言のみを表示し、コンソールにはエラーコードのみを残します。
