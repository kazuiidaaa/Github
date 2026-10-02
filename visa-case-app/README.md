# 在留資格案件管理（visa-case-app）

行政書士向けの案件管理アプリです。個人情報を扱うため、運用前に必ず次を確認してください。

- 環境変数と本番化の手順：[docs/production.md](docs/production.md)
- Supabase の設定手順：[supabase/README.md](supabase/README.md)

## 開発

```bash
cp .env.example .env.local   # 開発用 Supabase の値を入力（未設定でも仮データで動作）
npm install
npm run dev
npm run lint && npm test
```

実案件のデータは、開発環境へ入力しないでください。
