# 自動検査（Issue #128）

Copilot を使った検査を停止したため、外部へコードを送らない検査を、GitHub Actions で追加した。

| 検査 | ファイル | 見るもの | 状態 |
| --- | --- | --- | --- |
| CodeQL | `.github/workflows/codeql.yml` | コードの静的解析 | 既存 |
| Defender for DevOps | `.github/workflows/defender-for-devops.yml` | 構成・コードの検査 | 既存 |
| Gitleaks | `.github/workflows/gitleaks.yml` | 秘密情報の混入 | 追加（警告のみ） |
| OSV-Scanner | `.github/workflows/osv-scanner.yml` | 依存ライブラリの既知の脆弱性 | 追加（警告のみ） |
| CI（lint・型検査・build・テスト） | `.github/workflows/ci.yml` | 品質の確認（セキュリティ検査ではない。Issue #177） | 追加（警告のみ） |
| Dependabot | `.github/dependabot.yml` | 依存と Actions の更新の提案（週 1 回） | 追加 |

## 判断
- 最初は、失敗扱いにしない（警告のみ）。誤検出の傾向を確認してから、必須にするかを決める。
- Semgrep は導入を見送る。CodeQL と検査の範囲が重なり、重複した報告が増えるため。必要になった時点で、別の Issue で検討する。
- AI によるレビュー用の外部ボットは、導入しない（利用者の判断）。

## 誤検出の扱い
- Gitleaks：リポジトリ直下に `.gitleaksignore` を置き、除外する指摘の識別子（指摘の `Fingerprint`）を 1 行ずつ書く。
- OSV-Scanner：`visa-case-app/osv-scanner.toml` に、除外する脆弱性の ID と、理由・期限を書く。
- いずれも、除外の理由を、この文書か PR に残す。

## 必須化の判断（未実施）
一定期間（目安：2 週間）の結果を見て、誤検出が少なければ、Gitleaks の `continue-on-error` と OSV-Scanner の `fail-on-vuln` を変更し、ブランチの保護規則で必須の検査に加える。
