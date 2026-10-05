# 自動検査（CI）（Issue #177）

`.github/workflows/ci.yml` が、`main` 向けの PR と、`main` への push で、次を順に実行する。

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. `npx tsc --noEmit`（型定義は `next build` が生成するため、build の後）
5. `npm test`

## 判断
- Node は 22 系。`@types/node` が 22 系であり、手元の確認も 22 系のため。
- 依存関係は、`actions/setup-node` の `cache: npm` で保存する。
- 環境変数は設定しない（秘密情報を書かない）。未設定のままで、build とテストが通ることを確認済み。
- 権限は `contents: read` のみ。
- 最初は警告のみ（`continue-on-error: true`）。

## 必須化の手順（利用者の操作）
1. `main` で、このワークフローが全件成功していることを確認する。
2. `ci.yml` の `continue-on-error: true` の行を削除する。
3. GitHub のリポジトリで、Settings → Rules（または Branches）→ `main` の保護規則を開く。
4. 「Require status checks to pass before merging」を有効にし、検査の一覧から「lint・型検査・ビルド・テスト」を追加して保存する。
