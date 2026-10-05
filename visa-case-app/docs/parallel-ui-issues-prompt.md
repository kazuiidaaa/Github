# UI・顧客体験改善 Issue の並列実装プロンプト

対象リポジトリ：`kazuiidaaa/Github`（アプリ本体は `visa-case-app/`）
対象 Issue：#131〜#135、#137、#140、#142（計8件）
使い方：下の「貼り付け用プロンプト」を、新しい Claude Code セッションにそのまま貼り付けます。

## Issue 一覧と、重なるファイル

| 番号 | 件名 | 主な変更ファイル | 優先度 |
|---|---|---|---|
| #133 | 共通ヘッダーのスマートフォン対応 | `components/Header.tsx` | 高 |
| #131 | 案件詳細のタブ（キーボード・URL・横スクロール） | `app/cases/[id]/page.tsx`（タブバー） | 中 |
| #132 | 案件詳細のスマートフォン幅の表示崩れ | `app/cases/[id]/page.tsx`（見出し・書類行・概要） | 中 |
| #134 | 案件一覧の件数・並び替え・ページ分割・表の改善 | `app/cases/page.tsx`、`lib/caseMetrics.ts` | 中 |
| #135 | 検索欄の日本語入力・正規化 | `components/CaseFilters.tsx`、`app/cases/page.tsx`、`lib/caseMetrics.ts` | 中 |
| #137 | 指標カード・バッジの用語の定義 | `components/DashboardCards.tsx`、`app/page.tsx`、`app/cases/page.tsx`、`lib/dashboardMetrics.ts`（新規） | 中 |
| #140 | 操作完了の通知（トースト） | `components/Toast.tsx`（新規）、`app/layout.tsx`、`app/cases/new/page.tsx`、`app/cases/[id]/page.tsx`、`components/UploadBox.tsx` | 中 |
| #142 | ログインのパスワード再設定 | `app/login/page.tsx`、`lib/auth.ts` | 低〜中 |

同じファイルを変更する組：
- `app/cases/[id]/page.tsx`：#131・#132・#140
- `app/cases/page.tsx`：#134・#135・#137
- `lib/caseMetrics.ts`：#134・#135

変更箇所は別々ですが、マージの順序によって競合が起きえます。推奨のマージ順：#133 → #131 → #132 → #140 → #134 → #135 → #137 → #142。

## 貼り付け用プロンプト

````text
あなたは、リポジトリ kazuiidaaa/Github（アプリ本体は visa-case-app/）の、親エージェントです。
GitHub の Issue #131, #132, #133, #134, #135, #137, #140, #142 の8件を、サブエージェントに並列で実装させます。
各 Issue の本文（現状・要件定義・作業プロンプト・受け入れ基準）が、実装の仕様です。

## 0. 守ること（リポジトリの規約）
- 作業の前に、CLAUDE.md、visa-case-app/AGENTS.md、visa-case-app/CLAUDE.md を読むこと。
- visa-case-app/AGENTS.md の指示のとおり、Next.js の API を使う前に、visa-case-app/node_modules/next/dist/docs/ の該当ガイドを読むこと（この版は、既知の Next.js と異なる）。
- ブランチ名は claude/issue-<番号>-<要約>（例：claude/issue-133-header-mobile）。1 Issue につき 1 ブランチ・1 PR。複数の Issue を 1 つの PR にまとめない。
- PR は下書き（draft）で作成し、本文に `Closes #<番号>` を書く。本文の最初の1行に、競合の有無を「競合なし」または「競合あり」と書く（GitHub 上の mergeable で確認し、推測で書かない）。
- 実案件の氏名・住所・番号などの個人情報は、Issue・PR・コミット・テストデータに書かない。ダミーデータを使う。
- 外部の AI レビュー用ボットは導入しない。PR のマージは、人間（利用者 @kazuiidaaa）が行う。自動でマージしない。
- 利用者はコードを読まない。PR・完了コメントは、画面で何が変わるかを、平易な日本語で書く。利用者の確認が必要な場合のみ、@kazuiidaaa をメンションする。

## 1. 事前準備（親エージェントが、先に行う）
1. `git fetch origin main` を実行し、最新の main を確認する。
2. 8件の Issue を読み、既にブランチ・PR がないかを確認する（重複して着手しない）。
3. Issue ごとに、worktree を作る（同じ作業ディレクトリを共有させない）。
   例：
   git worktree add ../wt-issue-133 -b claude/issue-133-header-mobile origin/main
   git worktree add ../wt-issue-131 -b claude/issue-131-case-tabs origin/main
   git worktree add ../wt-issue-132 -b claude/issue-132-case-detail-mobile origin/main
   git worktree add ../wt-issue-134 -b claude/issue-134-case-list-count-sort origin/main
   git worktree add ../wt-issue-135 -b claude/issue-135-search-ime origin/main
   git worktree add ../wt-issue-137 -b claude/issue-137-metric-definitions origin/main
   git worktree add ../wt-issue-140 -b claude/issue-140-toast origin/main
   git worktree add ../wt-issue-142 -b claude/issue-142-password-reset origin/main
4. 各 worktree で、`cd visa-case-app && npm ci` を実行する。

## 2. gh コマンドの制限（先に知っておくこと）
この環境では、`gh issue create`・`gh issue comment`・`gh pr create` が、次のエラーで失敗することがある。
  HTTP 403: GraphQL is not available from Claude Code sessions; use the REST API
繰り返し試さず、GitHub の MCP ツール（mcp__github__*：issue_read、add_issue_comment、create_pull_request など）を使うか、`gh api repos/kazuiidaaa/Github/...` の REST API を使う。日本語の複数行の本文は、`gh api ... --input -` で JSON を標準入力から渡す（シェルの引用符で直接囲まない）。

## 3. サブエージェントの起動（1回のメッセージで、8件を並列に起動する）
各サブエージェントに、担当 Issue 番号と、専用の worktree のパスだけを変えて、次の指示を渡す。

「あなたの担当は Issue #<番号> です。作業ディレクトリは <worktree のパス> です。このディレクトリ配下でのみ作業し、他の worktree のファイルには触れないでください。
1. Issue #<番号> の本文と、既存のコメントを、すべて読んでください。不明確な点があれば、着手せず、Issue 上で質問して止まってください。
2. 着手前に、Issue に『着手します（ブランチ名）』と1行コメントを書いてください（重複着手の防止）。
3. Issue 本文の『要件定義』『作業プロンプト』の範囲だけを実装してください。範囲外の修正やリファクタリングはしないでください。
4. CLAUDE.md・visa-case-app/AGENTS.md・docs/design-system.md を守ってください。色は、デザインシステムの変数（slate・accent 等）を使い、ライト・ダークの両方で確認してください。
5. `cd visa-case-app && npm run lint && npx tsc --noEmit && npm run build && npm test` をすべて実行し、成功を確認してください。失敗した場合は、原因を直してください。テストをスキップ・無効化してはいけません。
6. 画面の変更は、開発サーバー（npm run dev）で、幅 375px・768px・1280px、ライト・ダークの両方を目視で確認してください。
7. `git fetch origin main` のうえ、競合がないことを確認してから、ブランチを push してください。
8. 下書きの Pull Request を作成してください（本文は、最初の1行に競合の有無、次に画面で何が変わるか、確認した結果。末尾に `Closes #<番号>`）。
9. Issue に、完了コメントを書いてください。見出しは『日付｜担当者（役割名）｜ブランチまたは PR』。項目は、1.行ったこと 2.判断とその理由 3.未完了の事項 4.次の担当者への引き継ぎ 5.確認した結果。
10. 最後に、PR の番号・ブランチ名・検証結果（lint・型・build・test・目視確認）を、親エージェントへ報告してください。」

## 4. 親エージェントが、最後に行うこと
1. 8件の完了後、重なるファイル（app/cases/[id]/page.tsx＝#131・#132・#140、app/cases/page.tsx＝#134・#135・#137、lib/caseMetrics.ts＝#134・#135）について、PR の差分を比べ、矛盾する変更がないかを確認する。矛盾がある場合は、リベースまたはマージによる解消方法を、利用者へ提示する（実際のマージは行わない）。
2. 推奨のマージ順（#133 → #131 → #132 → #140 → #134 → #135 → #137 → #142）を、利用者へ伝える。
3. 各 PR の番号・ブランチ名・競合の有無・検証結果を、一覧にして報告する。#142 は、Supabase 側の設定（再設定メールの遷移先URL）が必要なため、利用者の確認事項として、別に明記する。
4. PR は、自動でマージしない。
````
