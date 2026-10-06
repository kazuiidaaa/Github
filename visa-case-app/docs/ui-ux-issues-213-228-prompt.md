# UI・顧客体験の改善 Issue（#213〜#228）の並列実装プロンプト

対象リポジトリ：`kazuiidaaa/Github`（アプリ本体は `visa-case-app/`）
対象 Issue：#213〜#228（計16件）
使い方：下の「貼り付け用プロンプト」を、新しい Claude Code セッションにそのまま貼り付けます。

## Issue 一覧と着手の順序

| 番号 | 件名 | 主な変更ファイル | 着手の波 |
|---|---|---|---|
| #213 | 選択部品の共通化（`ChoiceGroup`） | `components/ChoiceGroup.tsx`（新規） | 1 |
| #216 | 書体を Apple のシステム書体（ヒラギノ角ゴ ProN）に | `app/layout.tsx`、`app/globals.css`、`docs/design-system.md` | 1 |
| #217 | スマートフォン幅の案件一覧：指標カードの圧縮 | `components/DashboardCards.tsx`、`app/cases/page.tsx` | 1 |
| #218 | 「次に行うこと」を概要の上部へ | `app/cases/[id]/page.tsx` | 1 |
| #219 | 概要の「未入力」から入力欄へ移動 | `app/cases/[id]/page.tsx`、`components/ApplicantForm.tsx` | 1（#218 と同ファイル） |
| #220 | 申請書類作成：未解決事項の二重表示の整理 | `app/cases/[id]/documents/page.tsx` | 1 |
| #221 | ホーム：期限切れ・期限が迫る案件を最上部に | `app/page.tsx`、`lib/caseMetrics.ts` | 1 |
| #222 | スマートフォン幅のヘッダーを2段以内に | `components/Header.tsx` | 1 |
| #224 | 依頼者向け「ご案内書類」の出力 | `lib/documents/`、`lib/documentKinds.ts`、`app/cases/[id]/documents/page.tsx` | 1（#220 と同ファイル） |
| #214 | 在留資格・手続種別を選択式に | `components/StatusSelect.tsx`、`app/cases/new/page.tsx`、`components/CaseInfoEditor.tsx`、`components/ApplicantForm.tsx` | 2（#213 の後） |
| #215 | 状態の入力を選択式に統一 | `components/ChecksPanel.tsx`、`components/RequirementsPanel.tsx`、`components/MembersPanel.tsx`、`components/CustomRequirementForm.tsx` | 2（#213 の後） |
| #227 | 日付入力の改善 | 6つの入力部品、`components/DateField.tsx`（新規） | 3（#214・#215 の後） |
| #226 | 郵便番号から住所を補う | `components/AddressField.tsx`（新規）、フォーム3部品 | 3 |
| #223 | 半角から全角への自動変換 | `lib/zenkaku.ts`（新規）、フォーム3部品 | 3（#226 の後） |
| #225 | 受任日の追加 | `lib/types.ts`、`lib/store.ts`、`lib/supabaseBackend.ts`、`supabase/migrations/0022_*.sql` | 3（#214 の後） |
| #228 | 新規案件：手続種別を先に選ぶ | `app/cases/new/page.tsx` | 3（#214・#225 の後） |

同じファイルを変更する組：
- `app/cases/[id]/page.tsx`：#218・#219
- `app/cases/[id]/documents/page.tsx`：#220・#224
- `components/ApplicantForm.tsx`：#214・#219・#223・#226・#227
- `components/EmploymentForm.tsx`・`components/FormDetailsForm.tsx`：#223・#226・#227
- `app/cases/new/page.tsx`、`components/CaseInfoEditor.tsx`：#214・#225・#228
- `components/RequirementsPanel.tsx`・`components/ChecksPanel.tsx`：#215・#227

## 貼り付け用プロンプト

````text
あなたは、リポジトリ kazuiidaaa/Github（アプリ本体は visa-case-app/）の、親エージェントです。
GitHub の Issue #213〜#228 の16件を、サブエージェントに並列で実装させます。各 Issue の本文（現状・要件定義・作業プロンプト・受け入れ基準・共通の制約）が、実装の仕様です。

## 0. 守ること
- 作業の前に、CLAUDE.md、visa-case-app/CLAUDE.md、visa-case-app/AGENTS.md、visa-case-app/docs/design-system.md を読むこと。Next.js の API を使う前に、visa-case-app/node_modules/next/dist/docs/ の該当ガイドを読むこと（この版は、既知の Next.js と異なる）。
- 【最重要】公式様式・生成文書は変更しない。docs/official/、lib/documents/excelFill/、既存の生成文書（Word・PDF・Excel）のテンプレートとプレビュー（components/documents/DocumentSheet.tsx、paper クラス）は、書体・見た目を含め、一切変更しない。#224 は、新しい種類の文書を「追加」するのみとする。
- 【最重要】プル（作業の起点）もマージ（送り先）も、すべて main のみ。ブランチは、必ず最新の origin/main から作る。PR の base は main とする。他の PR のブランチへ積み上げない。依存する Issue（下記の波）は、先の PR が main へマージされてから着手する。
- ブランチ名は claude/issue-<番号>-<要約>（例：claude/issue-216-apple-font）。1 Issue につき 1 ブランチ・1 PR。複数の Issue を 1 つの PR にまとめない。
- PR は下書き（draft）で作成し、本文に `Closes #<番号>` を書く。本文の最初の1行に、競合の有無を「競合なし」または「競合あり」と書く（GitHub 上の mergeable で確認し、推測で書かない）。
- 実案件の個人情報を、Issue・PR・コミット・テストデータに書かない。
- PR のマージは、利用者（@kazuiidaaa）が行う。自動でマージしない。PR を作成したら、利用者にレビューを依頼する（指定できない場合は、本文に @kazuiidaaa へのレビュー依頼を1行書く）。
- 利用者はコードを読まない。PR・完了コメントは、画面で何が変わるかを、平易な日本語で書く。利用者の確認が必要な場合のみ、@kazuiidaaa をメンションする。
- 書体（#216）の見え方は、利用者が Apple 端末の実機で確認する。マイグレーション（#225、必要なら #224）は、利用者が SQL Editor で実行する。PR の本文に、その手順を書く。

## 1. GitHub の操作について
- この環境では、`gh issue create` 等の GraphQL 経由のコマンドが 403 で失敗することがある。その場合は、`gh api repos/kazuiidaaa/Github/...`（REST）を、JSON を標準入力で渡して使う（例：`gh api repos/kazuiidaaa/Github/pulls -X POST --input -`）。GitHub の MCP ツール（mcp__github__*）が使える場合は、それを使ってよい。失敗を繰り返さず、すぐに切り替えること。
- Issue の完了コメントは、CLAUDE.md の書式（見出し：`日付｜担当者（役割名）｜ブランチまたは PR`。項目：行ったこと／判断とその理由／未完了の事項／次の担当者への引き継ぎ／確認した結果）で書く。

## 2. 事前準備（親エージェントが、先に行う）
1. `git fetch origin main` を実行し、最新の main を確認する。
2. 16件の Issue を読み、既にブランチ・PR がないかを確認する（重複して着手しない）。着手済みの Issue は、その状況を利用者に報告し、除外する。
3. 波ごとに、Issue 1 件につき 1 つの worktree を作る（同じ作業ディレクトリを共有させない）。
   例：git worktree add ../wt-issue-216 -b claude/issue-216-apple-font origin/main
4. 各 worktree で、`cd visa-case-app && npm ci` を実行する。

## 3. 着手の波
- 波1（すぐ並列で着手。9件）：#213、#216、#217、#218、#219、#220、#221、#222、#224
  - #218 と #219、#220 と #224 は、同じファイルの別の箇所を変更する。着手前・PR 作成前に、最新の main を確認し、競合があれば解消する。
- 波2（#213 が main へマージされてから。2件）：#214、#215
- 波3（波2 がマージされてから。5件）：
  - #227（日付）と #226（郵便番号）は、同時に着手してよい。ただし、同じフォーム部品を変更するため、先にマージされた方を取り込んでから、PR を作成する。
  - #223（全角変換）は、#226 のマージ後に着手する（補った住所にも変換を適用するため）。
  - #225（受任日）は、#214 のマージ後に着手する。
  - #228（新規案件の入力順）は、#214・#225 のマージ後に着手する。
- 波の切り替えは、利用者がマージしたことを確認してから行う。マージされていない場合は、待機し、利用者にその旨を報告する。

## 4. サブエージェントへの共通指示（波ごとに、1回のメッセージで並列に起動する）
各サブエージェントには、担当 Issue 番号と、専用の worktree のパスだけを変えて、次を指示する。
- 割り当てられた worktree 配下でのみ作業し、他の worktree には触れない。
- 担当 Issue の本文と、既存のコメントを読む。内容が不明確な場合は、着手せず、Issue 上で質問して止まる。
- Issue 本文の要件定義と作業プロンプトの範囲だけを実装する。スコープ外の修正・リファクタリングをしない。「共通の制約」を守る。
- `cd visa-case-app && npm run lint && npx tsc --noEmit && npm test` を実行し、結果を確認する。`npm run build` が、Google Fonts への接続の失敗で落ちる場合は、その旨を報告する（変更とは無関係）。
- 画面を変更する Issue は、Chromium（Playwright。PLAYWRIGHT_BROWSERS_PATH の設定済みの Chromium を使い、`playwright install` は実行しない）で、375px・768px・1280px のスクリーンショットを撮り、ライト・ダークで確認する。
- ブランチを push し、`Closes #<番号>` を含む下書きの PR（base は main）を作成する。完了後、Issue に完了コメントを書く。

## 5. 親エージェントが最後に行うこと
- 波ごとに、全サブエージェントの完了後、重複の可能性がある組について、PR の差分を確認し、矛盾があれば解消の方法（main の取り込み）を提示する。実際のマージは行わない。
- 各 PR の番号・ブランチ名・検証結果（lint・型検査・test）・利用者の確認が必要な事項（#216 の実機確認、#225 のマイグレーション、#226 の住所検索の方式、#224 のマイグレーションの要否）を、一覧にして報告する。
- 次の波へ進める条件（どの PR のマージを待つか）を、明記する。
````
