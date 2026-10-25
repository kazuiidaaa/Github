# デザイントークンの正本（段階0、Issue #456）

PC版（Web）と iPhone 版（SwiftUI）で、色・動き・影の値を 1 か所から配るための土台。段階0では、正本と生成物を置くだけで、PC版の見た目・動作は変えない。`app/globals.css` は変更せず、生成した CSS はどこからも読み込まない。

## 正本と生成物

| 区分 | 場所 | 内容 |
| --- | --- | --- |
| 正本 | `tokens/*.tokens.json`（W3C DTCG 形式） | `base`（背景・文字・アクセント等）、`color`（slate・blue・red・amber・yellow・green の各段）、`semantic`（danger / success / warning / info / muted と text / soft / line）、`motion`（曲線・時間）、`shadow`（影） |
| 生成設定 | `style-dictionary.config.mjs`、`tokens/lib.mjs` | Style Dictionary v4。書き出しの処理は `tokens/lib.mjs`（回帰テストと共用） |
| 生成物（コミットする） | `tokens/build/tokens.generated.css` | CSS 変数（明色は `:root`、暗色は `:root[data-theme="dark"]`） |
| 生成物（コミットする） | `tokens/build/DesignTokens.swift` | SwiftUI 用の色（明暗の組）、動き、影 |
| 回帰テスト | `tests/designTokens.test.ts` | 正本の値が `app/globals.css` の現行の宣言（明色・暗色）と一致すること |

- 再生成：`npm run tokens:build`。生成物が最新かの確認：`npm run tokens:check`（再生成して `git diff --exit-code tokens/build`）。
- 値は `app/globals.css` を正として 1:1 で写した。段階0の間は、値を変えるときは `globals.css` と正本の両方を同じ PR で変える（テストが食い違いを検出する）。
- 独自の情報は `$extensions["app.visa-case"]` に最小限で置く：`dark`（暗色値）、`platforms`（出力先の限定。CSS の `linear()` のばねは `["css"]`）、`legacyAlias`（旧色名）。
- 意味の名前（`semantic`）は旧色名の段階色への参照で、暗色は参照先に追随する。`red`（実際は橙系）・`green`（実際は青緑系）・`amber`・`yellow` は Web 専用の旧色名で、Web 互換のエイリアスとして区別する。新しい箇所は意味の名前を使う。
- 段階0では、文字の大きさ（`--text-*`）、書体、印刷用の読み替え（`paper`、`@media print`）、`color-scheme` は正本に含めない。

## 共有するものと、別にするもの

| 項目 | 共有する（正本は 1 つ） | 各実装で別にする |
| --- | --- | --- |
| 色・動き（曲線と時間）・影の値 | 共有：`tokens/*.tokens.json` | 適用方法（CSS 変数 / SwiftUI の `Color` と `Animation`） |
| ばね | 到達時間・減衰の意図（設計書 3章C） | Web は CSS の `linear()` の近似（CSS 専用）。SwiftUI は標準のばね |
| 文言（ja / en / ko） | 共有：文言カタログ（キーと 3 言語の文） | 取り込み方（Web は `lib/` の辞書、iPhone は `.xcstrings`。未決事項を参照） |
| 部品の仕様 | 共有：状態・見た目の規則・アクセシビリティ（`docs/design-system.md`、必須表示、`Badge` の図形など） | React / CSS の実装（`components/ui.tsx` など）、SwiftUI の実装 |
| 画面の配置・操作 | 共有：機能の仕様 | 実装は別（Web は React、iPhone は SwiftUI） |
| safe-area、ホームバー、`env()`、ブラウザーの挙動、`prefers-reduced-motion` の CSS | 共有しない | Web 固有（iPhone は OS の機構を使う） |
| 書体 | 方針（Noto Sans JP・KR を先頭） | Web は `next/font`。iPhone は別途決める |

## 未決事項

1. 文言の `.xcstrings` 出力
   - プレースホルダの型：Web の文言は `{name}` 形式の名前付きで型を持たない。`.xcstrings` は `%@`、`%lld` などの型付きで、位置指定（`%1$@`）も要る。正本に型を持たせるか、出力時に決めるか。
   - 複数形：英語は one / other、日本語・韓国語は other のみ。`.xcstrings` の variations（plural）に写すには、カタログ側で複数形を表せる必要がある。現在は件数を文に埋め込む形で、複数形の区別をしていない。
   - 翻訳の状態（`translated` / `needs_review`）、コメント（文脈の説明）の持ち方。
   - 文言キーの命名と、Web 辞書との一対一対応。
2. Swift 出力：`Color(light:dark:)` は UIKit の動的色を使う。高コントラスト対応の追加値、アセットカタログ（`.xcassets`）出力にするかは未決。影の `blur` は CSS の半径で、SwiftUI の `radius` との換算は実機で確認する。
3. 段階1以降：`globals.css` の `@theme` を生成物から作る（または生成物を読み込む）か。その場合の Tailwind v4 の `@theme` との整合と、`npm run tokens:check` の CI 組み込み。
4. 文字の大きさ（`--text-sm` など、幅で値が変わるもの）を正本に含めるか。
