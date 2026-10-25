# 文言カタログからの String Catalog（.xcstrings）派生の設計（Issue #456 の後続）

SwiftUI 用の文言を、Web の文言カタログ（`lib/i18n/messages/*.ts`、ja / en / ko）から派生させる設計です。この文書は設計のみで、コードは含みません。PR #458（Style Dictionary 段階0）の `docs/tokens.md` の未決事項「1. 文言の `.xcstrings` 出力」に答える位置づけで、色・動き・影と同じく「正本は 1 つ、生成物はコミットし、差分を検査する」方針に合わせます。

## 結論（推奨）

| 論点 | 推奨 |
| --- | --- |
| 正本 | TS カタログのまま。`.xcstrings` は生成物（コミットする）。型検査の利点を保てます |
| プレースホルダ | `{name}` を、名前ごとの型表（既定は文字列 `%@`、数値は `%lld`）で変換し、2 個以上は位置指定（`%1$@`）にします |
| 複数形 | 現状は不要（使われていません）。必要になった時点で、キーの接尾辞（`__one` / `__other`）で表します |
| 翻訳状態 | `REVIEW_STATUS` の `draft` を `needs_review`、`reviewed` を `translated` に対応づけます |
| 置き場所と検査 | `xcstrings/` に生成設定、`xcstrings/build/Localizable.xcstrings` に生成物。`xcstrings:check` を `tokens:check` と同じ形で用意します |
| iOS コード | 同じリポジトリ（リポジトリ直下の `ios/`）を第一案とします。ただし、ネイティブアプリの着手時に再判断します |

## 1. 現状の文言カタログの構造と制約

実データ（origin/main、`lib/i18n/messages/*.ts` の 26 ファイル、`index.ts` を除く）を数えた結果です。数え方は、`ja:` / `en:` / `ko:` ブロック内の `キー: "文"` の行を正規表現で拾った簡易集計です。

- 構造：`defineMessages({ ja, en, ko })`（`lib/i18n/define.ts`）。ja を原文とし、en・ko は ja と同じキーをすべて持つ型です。訳の漏れは `tsc` が検出します。区分（Namespace）は 26 個で、`CATALOG`（`messages/index.ts`）に並べ、キーは `区分.キー`（型 `MessageKey`）です。
- キー数：1 言語あたり 1,153 件。値はすべて文字列リテラルです（関数・テンプレート式はありません）。
- プレースホルダ：`{name}`（`\w+`）形式の名前付き。ja に含むキーは 171 件（約 15%）、異なる名前は 66 種類です。1 キー内の個数は、1 個が大半で、2 個以上は少数（3 個・4 個は各 1 件）です。同じ名前の重複はありません。ja・en・ko で名前の集合が食い違うキーは 0 件でした。現状は、型検査では保証されておらず、結果として揃っています（テストで固定する必要があります）。
- 型情報：カタログには型がありません。`translate()`（`lib/i18n/translate.ts`）は `Record<string, string | number>` を受け取り、`String(値)` で置換します。名前が多いのは `count`（ja で約 29 キー）、`label`、`type`、`total`、`reason`、`name`、`days` などで、数値か文字列かは名前から推定できますが、機械的な保証はありません。
- 複数形：区別はありません。件数を含む文（`count` `total` `days` `n` `times` を含む ja のキー）は約 46 件ありますが、英語は `{count} matching`、`Documents not received: {count}` のように、単数・複数で形が変わらない語順に寄せています。`(s)` の表記もありません。ja・ko は複数形がない言語です。
- 書式記号：`%`、HTML タグ、`\n` を含む値はありません。`%` を使っていないため、変換時のエスケープ（`%%`）の考慮は、将来の追加時の検査で足ります。
- 翻訳状態：`lib/i18n/reviewStatus.ts` の `REVIEW_STATUS` が、区分 × 言語（en / ko）で `draft` / `reviewed` を持ちます。現状は全区分が `draft`。キー単位の状態はありません。空文字の訳は「未訳」で、`translate()` は ja の原文にフォールバックします（`untranslatedKeys`）。
- コメント：キー単位のコメントはほぼありません（`documents.ts` に 1 行のみ）。区分ごとの説明は、`export const` 直前の JSDoc にあります。
- 文言の組み立て：一部は、コード側で複数のキーを組み合わせています（例：`lib/i18n/expiry.ts` が `days` の正負でキーを選ぶ）。この種の分岐は、カタログからは見えないため、iOS 側で同じ分岐を再実装する必要があります。
- iPhone 向け文言：Web の `/m`（`docs/mobile-ios.md`）用に、区分 `mobile`（48 件）、`mobileDetail`（26 件）、`mobileNew`（12 件）があります。リポジトリには、Swift・Xcode・`.xcstrings` のファイルはまだありません。

## 2. 正本をどこに置くか

| 案 | 内容 | 評価 |
| --- | --- | --- |
| A（推奨） | TS カタログを正本とし、`.xcstrings` を生成する | 既存の型検査（`MessageKey`、ja と同じキーの強制）と、`REVIEW_STATUS` の運用をそのまま使えます。Web の変更が最小です。弱点は、TS を読み込む生成スクリプトが要ること、型情報（数値か文字列か）が正本に無いことです |
| B | `.xcstrings` を正本とし、TS を生成する | Xcode の編集機能を使えますが、`MessageKey` の型検査を、生成された TS で作り直す必要があります。Xcode が自動でファイルを書き換えるため、競合しやすくなります。Web の変更が大きく、推奨しません |
| C | 中立の JSON（または XLIFF）を正本とし、TS と `.xcstrings` の両方を生成する | 正本が 1 つで、型情報やコメントも持たせられます。ただし、1,153 件 × 3 言語の移行と、既存のカタログ構造の置き換えが要り、段階0（トークン）より大きな変更です。複数形や型が本格的に要る段階で再検討します |

トークンは、TS に正本がなかったため DTCG の JSON を新設しました。文言は、すでに TS に正本と型検査があるため、同じ形にそろえる必要はなく、案 A が整合します。

## 3. 変換規則

### 3.1 全体

- 出力は 1 ファイル `Localizable.xcstrings`。`sourceLanguage` は `ja`、`version` は `1.0`。
- 出力するキーは、区分の許可リスト（`xcstrings/config` に置く）で選びます。初期は `mobile`、`mobileDetail`、`mobileNew` と、共通の文言（`common` など）から始め、iPhone で使う区分を足します（Web 専用の長文・規則文は出しません）。
- 各エントリに `extractionState: "manual"`、`localizations.{ja,en,ko}.stringUnit.{state,value}` を出します。en / ko の訳が空のキーは、その言語の `localizations` を出しません（Xcode 側で原文にフォールバックします）。`new` は出しません。

### 3.2 キー名

Web と同じ `区分.キー`（例：`common.themeAria`）をそのまま使います。Web 辞書との一対一対応が保て、名前の対応表が要りません。iOS 側は、原文でなくキーで引きます。ドットを含むキーが Xcode 上で問題ないか、生成されるシンボル名（Xcode のシンボル生成機能）との関係は、未確認です。

### 3.3 プレースホルダ

- `{name}` を、型に応じて次のように変換します。

| TS（ja / en / ko 共通） | `.xcstrings` の値 |
| --- | --- |
| 1 個：`残り{days}日` | `残り%lld日`（型が数値）、または `%@`（既定） |
| 2 個以上：`{done}／{total}件` | `%1$lld／%2$lld件` のように位置指定 |
| 重複・リテラルの `%` | 現状なし。出現したらテストで失敗させる |

- 位置の番号は、ja の原文での出現順に固定し、en・ko は、同じ名前に同じ番号を割り当てます（語順が言語で入れ替わる場合も、番号で対応します。現状は名前の集合が全言語で一致しているため、生成が可能です）。
- 型の取得方法（推奨は 1、将来 2）：
  1. 名前ごとの型表 `xcstrings/placeholders` を置きます。既定は文字列（`%@`）で、数値の名前（`count`、`total`、`days`、`n`、`times` など十数種）だけ `int`（`%lld`）と宣言します。テストで、カタログに現れる 66 種類のすべての名前が、表のどちらかに分類されているか（未分類があれば失敗）を検査します。名前単位のため、同じ名前を別の型で使う場合は誤変換になります。呼び出し側（`translate` / `t` の引数）の実際の型との一致は、生成側では保証できません。
  2. 型を厳密にしたい場合は、`MessageKey` から `{name}` の名前を取り出す型（テンプレートリテラル型）を作り、`t(key, params)` の `params` を必須かつ型付きにします。現状は、`defineMessages` が値を `string` に広げているため、リテラル型の保持（`as const` 相当の定義への変更）が要り、変更は大きいです。この段階は、数値と文字列の取り違えが実害になった時に検討します。
- Swift 側では、`%@` に `String`、`%lld` に `Int` を渡します。`translate()` は、数値を `String(値)` にするだけで、桁区切りやロケール整形をしません。Swift 側でも整形せず `Int` をそのまま渡し、表示が Web と一致するかは、確認が必要です（`%lld` は桁区切りなしで、`NumberFormatter` を通さなければ一致する見込みですが、実機では未確認です）。

### 3.4 複数形

- 現状は、複数形の区別を持つキーがないため、`variations.plural` は出力しません。
- 英語で単数・複数を書き分けたくなった場合は、TS カタログ側で `キー__one` と `キー__other` の 2 キーとして書き、生成時に 1 エントリへまとめます（en は one / other、ja・ko は other のみ。CLDR の区分）。Web の `translate()` は、`count` から `Intl.PluralRules` で接尾辞を選ぶ小さな拡張を足します。この場合、`.xcstrings` では `substitutions`（`argNum`、`formatSpecifier`、`variations.plural`）を使う形（`%#@count@`）になる可能性が高いですが、2 個以上の引数と組み合わせた時の厳密な書式は、下の「未確認」を参照します。
- 当面の運用：新しい文言は、複数形が要らない語順に書く（今と同じ）とします。

### 3.5 翻訳状態

| TS の状態 | `.xcstrings` の `state` |
| --- | --- |
| ja（原文） | `translated` |
| en / ko で `REVIEW_STATUS` が `reviewed` | `translated` |
| en / ko で `draft` | `needs_review` |
| en / ko の訳が空 | 出力しない（`new` も出さない） |

状態は区分 × 言語の単位のため、同じ区分のキーはすべて同じ状態になります。キー単位の状態は、必要になった時に別途検討します。

### 3.6 コメント

- 各エントリの `comment` に、区分の JSDoc の説明（日本語）と、プレースホルダの対応（例：`%1$lld = done、%2$lld = total`）を自動で入れます。後者は生成時に作れます。
- キー単位の説明が要る場合は、`xcstrings/` 内の補助ファイルに、キーごとの文字列を置きます（TS カタログの構造は変えません）。

### 3.7 出力の書式

Xcode が `.xcstrings` を開く・ビルドするときに書き換えると、生成物との差分が出るため、生成側は Xcode の出力に合わせた書式（インデント、キーの順、`:` の前後の空白）にします。キーは区分・キーの昇順に整列し、再生成で差分が出ない（決定的）ようにします。Xcode の書式の細部は、実機で確認します（未確認）。

## 4. 生成物の置き場所と差分検査

PR #458 の構成に揃えます。

| 区分 | 場所 |
| --- | --- |
| 生成スクリプト | `xcstrings/build.mjs`（変換は `xcstrings/lib.mjs`。テストと共用） |
| 設定 | `xcstrings/config.mjs`（出力する区分の許可リスト、数値の名前の表、コメントの補助） |
| 生成物（コミットする） | `xcstrings/build/Localizable.xcstrings` |
| テスト | `tests/xcstrings.test.ts`（`npm test` で CI に載ります） |

- TS カタログの読み込み：生成スクリプトは `messages/*.ts` を読む必要があります。`define.ts` が `@/` の別名と拡張子なしの相対 import を使うため、素の Node では読めません。既存の `vitest`（`@/` の解決あり）の中で変換を呼ぶか、TS 実行用の devDependency（`tsx` など）を足すかのどちらかです。推奨は、変換を `lib.mjs` の純粋関数にし、テストと `npm run xcstrings:build` の両方から、同じ読み込み手段で呼ぶ形です。どちらにするかは未決です。
- コマンド：`npm run xcstrings:build`（再生成）、`npm run xcstrings:check`（再生成して、コミット済みの生成物と一致するか確認）。`tokens:check` は `git diff --exit-code` を使いますが、生成物をメモリ上で作り、ファイルと比較する形なら、作業ツリーの状態に依存しません。推奨は後者です。
- CI（`.github/workflows/ci.yml` の lint → build → tsc → test）への組み込みは、`tokens:check` と同時に判断します（`tokens.md` の未決事項3）。テスト（`npm test`）側に検査を含めれば、CI の変更なしで、食い違いを検出できます。
- 追加する検査（テスト）：ja・en・ko のプレースホルダ名の集合が同じ、数値の表に未分類の名前がない、`%` を含む値がない、`REVIEW_STATUS` と状態の対応、出力するキーの数と許可リストの一致。
- `npm run lint`：この設計文書（Markdown）のみのコミットでは影響しません。実装時は、`xcstrings/*.mjs` が ESLint（`eslint.config.mjs`）の対象になるため、その時点で lint を通します。

## 5. iOS 側コードの置き場所

SwiftUI のアプリは、現在リポジトリにありません。Web の `/m` は、SwiftUI 風の見た目の Web 画面です（`docs/mobile-ios.md`）。ネイティブアプリの着手が前提の比較です。

| 観点 | 同じリポジトリ（`ios/`） | 別リポジトリ |
| --- | --- | --- |
| 文言・トークンの同期 | 生成物（`DesignTokens.swift`、`.xcstrings`）を同じ PR で更新でき、差分検査も同じ CI で済む | 生成物を別リポジトリへ複製・取り込みする経路（スクリプト、サブモジュール、パッケージ）が要る。食い違いが起きやすい |
| 運用ルール | 1 目的 1 PR・Issue 運用（`docs/working-rules.md`）を共通で使える | 規則と権限を二重に管理する |
| CI | Xcode のビルドに macOS の実行環境が別途必要（どちらでも同じ）。Web の CI と分けて、パスで起動を絞る必要がある | 完全に分離でき、Web の CI に影響しない |
| Vercel・Web の影響 | ルートディレクトリが `visa-case-app` のため、`ios/` を `visa-case-app` の外（リポジトリ直下）に置けば、Web のデプロイに影響しない見込み（未確認） | 影響なし |
| 公開範囲・権限 | 同じ。App Store の署名情報は、リポジトリに置かず、別の仕組みで管理する（どちらでも必要） | 分けられる |

推奨：同じリポジトリのリポジトリ直下 `ios/`。理由は、生成物の同期の手間をなくし、現在の運用（少人数、Issue 単位）に合うためです。ネイティブアプリの着手時に、規模・担当者・公開方針を見て確定します。

## 6. 実装の段階案と見積り

| 段階 | 内容 | 見積り |
| --- | --- | --- |
| 0 | この設計の合意。未決事項（下記）の判断 | 利用者の判断待ち |
| 1 | 変換（`lib.mjs`）、生成スクリプト、生成物、テスト、`xcstrings:check`。許可リストは `mobile*` から。複数形・コメントの補助は最小 | 1 セッション（1 Issue）。変換と読み込み手段の確定に半日、テストに半日 |
| 2 | 許可リストの拡大、キー単位のコメント・状態、`REVIEW_STATUS` をキー単位へ細分する要否の判断 | 0.5 セッション |
| 3 | 複数形（`__one` / `__other`）と `translate()` の拡張、必要なら `params` の型付け | 1 セッション（Web 側の変更を含むため、PC 版への影響の確認が要る） |
| 4 | Xcode での取り込み確認、Swift 側のアクセサ生成の検討、CI の組み込み | ネイティブアプリの着手と同時。Mac での実機確認が要り、見積りは着手時 |

段階1・2は、PC 版の見た目・動作を変えません。

## 7. 未確認・未決事項

未確認（Apple の公式ドキュメントの本文を取得できず、第三者の解説と記憶による。実機の Xcode での確認が必要）：
- `.xcstrings` の JSON の骨格（`sourceLanguage`、`version`、`strings`、`comment`、`extractionState`、`localizations`、`stringUnit.{state,value}`、`variations.plural`、`substitutions`）は、複数の解説で一致していますが、Apple の一次資料では未確認です。`version` は 1.0 が多く、1.1 に触れる資料もあるため、現行の値は未確認です。
- `state` の値：`translated`、`new` は解説で確認。`needs_review` は、解説の一つで確認、複数の資料では確認できていません。`stale` は `state` でなく `extractionState` の値です。
- `substitutions` の `argNum`、`formatSpecifier`、`%#@name@` の書式、複数の引数と複数形を併用する時の厳密な書き方は、解説では詳細が確認できていません。位置指定 `%1$@` は iOS の標準書式として確認しましたが、`.xcstrings` の中で Xcode が `%1$lld` を正しく扱うか、`%1$@` と `%2$lld` の混在は、実機で確認します。
- Xcode が出力する JSON の書式（インデント、`:` の前後の空白、キーの順）と、ビルド時にファイルを書き換える挙動（Swift コードからの自動抽出など）への対策（`extractionState: "manual"` で十分か、抽出の設定を切るか）。
- ドット入りのキー、およびキーで引く（原文でなく）呼び出しでの `String(localized:)` / `NSLocalizedString` の使い分け。数値の引数を伴うキーを Swift から引く最適な形（複数形を使う場合は、`String(format:)` を後から通す方法では複数形が解決されない可能性がある）。
- `ios/` をリポジトリ直下に置いた時の Vercel・既存 CI への影響。

未決（利用者または調整のセッションの判断が要ります）：
1. 案 A（TS が正本）で進めてよいか。
2. TS カタログの読み込み手段：vitest 内で実行するか、`tsx` を devDependency に足すか。
3. 出力する区分の初期の範囲（`mobile*` のみか、`common` などを含めるか）。
4. 数値の名前を、名前単位の表で運用してよいか（誤変換のリスクを受け入れるか）、最初から `params` の型付けまで行うか。
5. 状態をキー単位に細分する要否（現状は区分 × 言語）。
6. `xcstrings:check` と `tokens:check` を CI に載せる時期と方法。
7. iOS コードの置き場所（5 章の推奨で進めるか、ネイティブアプリの着手時に決めるか）。
8. ネイティブアプリ自体の着手時期（現状は `/m` の Web 画面のみで、`.xcstrings` の利用者がまだいません）。

## 参考にした資料

- `lib/i18n/define.ts`、`translate.ts`、`reviewStatus.ts`、`messages/index.ts`。
- `docs/tokens.md`（`origin/claude/issue-456-tokens`、PR #458）、`docs/mobile-ios.md`。
- `.xcstrings` の形式：Apple の「Localizing and varying text with a string catalog」は本文を取得できず、SimpleLocalize、Localazy などの解説で補いました。
