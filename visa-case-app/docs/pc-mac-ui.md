# PC 版 Mac 風の方針（Issue #456）

PC 版を、Mac（macOS）の見た目に寄せる。参考は Apple の Human Interface Guidelines の macOS（https://developer.apple.com/design/human-interface-guidelines/ 、特に Sidebars、Toolbars、Lists and tables、Color、Typography、Layout）。イメージは、Finder のサイドバー付きの外枠と、「連絡先」「システム設定」のような、グループ化した一覧と詳細。

## 変えないもの
- 機能・保存する値・規則。
- キーボード操作、色に頼らない表示（印と文字）、文字拡大、狭い幅での表示。
- iPhone 版（`/m`）の見た目。PC 版の指定は、`.m-root` を含まない画面かつ幅 md（768px）以上に限る。
- 文字の色の対比 4.5 以上、非文字（枠・焦点の輪）は 3 以上（WCAG AA）。明色・暗色の両方。

## PR の分け方
| PR | 内容 |
| --- | --- |
| PR1（この文書） | 共通の値のそろえ（デザイントークン）。外枠の構造は変えない |
| PR2 | 外枠を、サイドバー＋ツールバーへ（Header / Footer / AppFrame） |
| PR3 | 案件一覧・案件詳細を、グループ化した一覧・詳細へ |
| PR4 | フォーム・ダイアログ |

## PR1 で決めたトークン
正本は `tokens/mac.tokens.json`（生成物は `npm run tokens:build`。確認は `npm run tokens:check`）。CSS 専用で、iPhone 版の Swift には出さない。

| 意味 | CSS 変数 / Tailwind | 値（明 / 暗） | 使いどころ |
| --- | --- | --- | --- |
| ウィンドウ背景 | `--color-window` / `bg-window` | #f5f5f7 / #1d1d1f | 最も奥の面（`background` と同値） |
| グループ化した面 | `--color-grouped-surface` | #ffffff / #2c2c2e | 角丸の一覧・カードの面（`white` と同値） |
| サイドバー面 | `--color-sidebar` | #ececf0 / #252527 | サイドバー。ウィンドウ背景より一段暗い |
| サイドバー選択行 | `--color-sidebar-selected` | #d6e8ff / #10375e | 選択中の行。文字の太さと印でも示す |
| 区切り線 | `--color-separator` | #e0e0e5 / #3a3a3d | 一覧の行の間（装飾の線、1px）。入力欄・ボタンの枠は `line-strong` |
| 焦点の輪 | `--focus-ring` | #007aff / #0a84ff | キーボード操作の輪（macOS 風の青） |
| 角丸 | `--radius-mac-control/group/window` | 6 / 10 / 12px | 部品 / 一覧・カード / ダイアログ（`rounded-mac-*`） |
| コントロールの高さ | `--control-height-mac-small/regular/large` | 24 / 28 / 32px | PC（マウス）向け。iPhone は 44pt のまま |
| 文字の段階 | `--text-mac-caption/footnote/body/title3/title2/title1` | 12 / 13 / 14 / 17 / 22 / 28px | `text-mac-*`。本文は従来の 14px。macOS の 13px は、日本語・韓国語の可読性のため本文には採らない |
| 影 | `--shadow-mac-raised` / `--shadow-mac-overlay` | 控えめな二層 / ダイアログ・メニュー用 | 下記 |

## 画面で変わること（PR1）
- 影：PC 版のみ、`shadow-raised`（件数カードの hover）と `shadow-overlay`（ダイアログ・通知）を、より控えめな macOS 風に読み替える。
- 焦点の輪：PC 版のみ、キーボード操作の輪を macOS 風の青（#007aff / #0a84ff）にする。太さ・位置は従来どおり（3px）。
- 既存のクラス・トークン名は残している。

## 画面で変わること（PR2：外枠）
- PC 版（幅 768px 以上、`/m` 以外）は、Finder のように、左にサイドバー、上にツールバー、右に内容を置く。幅 768px 未満は、従来のヘッダー（メニュー）のまま。
- サイドバー（`components/PcSidebar.tsx`）：サイト名、ホーム、案件一覧、アカウント（ログイン時のみ）、ご利用にあたって。選択中の行は、背景（`sidebar-selected`）・太字・左の線で示す（色だけに頼らない）。幅は 11rem（1024px 以上は 14rem）、画面幅の 24% を上限にし、文字拡大でも内容の幅を残す。
- ツールバー（`components/PcToolbar.tsx`）：新規登録（編集権限がある場合）、言語、表示の明暗、デモ／試作版の表示、デモ終了・ログアウト。入りきらない幅では折り返し、長い注記は短い表記にする。
- 各ページの中身・URL・権限・保存値は変えない。ページ内の「新規案件」「検索」などは、PR3 で整理する（今は残している）。ツールバーへの検索の移動も PR3 で行う。
- 「本文へ移動」のリンクは、従来どおりヘッダー側に残している。

## 使われていないトークン（PR3 以降で使う）
`grouped-surface`（ツールバーのボタンの面のみ）、`radius-mac-group/window`、`control-height-mac-small/regular`、`text-mac-title2/title1`、`shadow-mac-*`（影の読み替えを除く）は、まだ画面から使っていない。PR3 以降で使う。使わなくなったものは、その PR で正本から外す。

## 個人情報
この文書・テスト・画面の例には、実在の氏名・住所・番号を書かない。
