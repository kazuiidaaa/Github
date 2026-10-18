# visa-case-app UI刷新 監査と設計書

調査のみ。コード変更・Issue起票・PR作成はしていない。個人情報なし。
調査対象: `visa-case-app/` の `app/` `components/` `app/globals.css` `docs/design-system.md`。
Next.js 16.4 / React 19.3 / Tailwind v4（`@tailwindcss/postcss`、`tailwind.config` なし。設定は `app/globals.css` の `@theme`）。
Next 同梱ドキュメントは `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` と `01-getting-started/11-css.md` を参照対象とした（未実装。後述）。

## 0. 前提の確認

- ばねライブラリは未導入。`package.json` の dependencies に motion / framer-motion / react-spring / @react-spring は無い。
  - 追加の要否は **人の承認事項**（9章）。本設計は「追加なし（CSS の `linear()` イージング＋小さな自前ばね関数）」を第1案、「Motion 追加」を第2案とする。
- 動きは全て CSS（transition と @keyframes）。JS のアニメーションは `ImageZoom` のポインタ操作のみ。
- `prefers-reduced-motion` は `app/globals.css:263-275` で全体対応済み（時間を 0.01ms にする方式）。

## 1. 画面一覧

| ルート | 主要コンポーネント | 性格 |
|---|---|---|
| `/` (app/page.tsx) | DashboardCards, NextActionCard, ExpiryBadge | ホーム。要対応・件数 |
| `/login`, `/reset-password` | PasswordField | 認証フォーム |
| `/account` | MembersPanel（表） | 設定・メンバー |
| `/cases` (402行) | CaseFilters, DashboardCards, 表（md以上）/カード（md未満）, StatusSelect, WorkflowBadge | 一覧 |
| `/cases/new` (330行) | ChoiceGroup, DateField, ApplicantForm 系, ConfirmLeaveDialog | 入力フォーム |
| `/cases/[id]` (386行) | タブ（概要/申請人/就労先/必要書類/チェック…）, RequirementsPanel(449), ChecksPanel, FormDetailsForm(468), EmploymentForm, HspPointSection, UploadBox, CaseInfoEditor | 中核。入力と一覧が混在 |
| `/cases/[id]/documents` | 書類履歴、DocumentSheet, ImageZoom | 書類作成 |
| `/cases/[id]/documents/[docId]` | DocumentSheet, ClientGuideSheet, OfficialFormNotice | プレビュー（紙） |
| `/about` | AboutContent | 説明 |
| `/api/*` | （画面なし） | 対象外 |
| 全体 | Header（sticky・半透明）, Footer, Toast, 確認ダイアログ5種, ThemeToggle, LanguageSwitcher | 共通 |

## 2. 現状の事実（CSS方式ほか）

- 方式: Tailwind v4 ユーティリティ直書き＋`globals.css`のトークン。CSS Modules・CSS-in-JS なし。
- 色: 「青・橙・灰」。Tailwind の色名（slate/red/green 等）を `@theme` で再定義し、`red`=橙、`green`=青緑に読み替え（`globals.css:12-58`）。暗色は `:root[data-theme="dark"]`（同 `:107-`）。紙プレビューは `.paper` で明色固定。
  - 良い点: 赤緑に頼らない、`Badge`+`ToneIcon` で形併記（`ui.tsx`）。
  - 難点: 色名が実際の色と食い違う（`text-red-*` が橙）。新規実装者が誤解しやすい。
- 文字: Noto Sans JP/KR。サイズは `text-sm` 164 回、`text-xs` 106 回、`text-base` 2 回、`text-lg以上` 25 回。本文が実質 14px、補足が 12px。`text-[0.65rem]` が1件。
- 余白: `px-6 py-8` の main（`layout.tsx:46`）、カード `p-6`、入力 `px-3 py-2`。独自の余白スケールは無い。
- ブレークポイント: `md:` 104、`lg:` 31、`max-md:` 10、`sm:` 2、`xl:` 2。実質 md(768) が唯一の分岐。
- 動き（`globals.css`）:
  - 全 button/a/input/select/textarea/summary に 0.18s の transition（背景・枠・色・影・transform・opacity）（`:171-182`）
  - `button:active` で `scale(0.97)`（`:184`）
  - @keyframes: `page-enter`（opacity+translateY8px）、`pop-in`、`fade-in`。`anim-stagger`（30ms 刻み、8件まで）
  - 曲線は `--ease-apple: cubic-bezier(0.2,0.8,0.2,1)` の1種のみ。ばね無し。
  - 使用箇所: `PageTransition.tsx:10`（全ルート遷移）、`ConfirmDialog.tsx:40-41` ほかダイアログ5種、`Toast.tsx:78`、一覧 `cases/page.tsx:232,275,322`、`app/page.tsx:24,87`、`DashboardCards.tsx:91`、`cases/new/page.tsx:255-258`
  - `DashboardCards.tsx:12` の `hover:-translate-y-0.5 hover:shadow-md`、`cases/page.tsx:296`・`documents/page.tsx:229` の `transition-colors`
- backdrop-filter: `Header.tsx:24`（`bg-white/75 backdrop-blur-xl backdrop-saturate-150`）、ダイアログのスクリム5種（`bg-black/40 backdrop-blur-sm`）。
- 影: `Toast` `shadow-lg`、ダイアログ `shadow-2xl`、カード hover `shadow-md`、紙 `shadow-sm`。
- reduced motion: 全体 CSS で対応。ただし JS 側の `scrollIntoView({behavior:"smooth"})`（`documents/page.tsx:52`）は CSS の `scroll-behavior:auto` では止まらない（JS 指定は CSS を上書きするため）。要修正。

## 3. (a) 動きと触感の監査

### A. 感触の監査（1〜5点）

| 項目 | 点 | 証拠と所見 |
|---|---|---|
| 応答（押した瞬間） | 4 | `globals.css:184` で button に即時 scale(0.97)。`a`、タブ、行（`cases/page.tsx:296` はホバーのみ）、チェックの行に押下表現が無い。touch の `:hover` 固着も未考慮 |
| 直接操作（1:1） | 3 | `ImageZoom.tsx:57-70` はポインタに1:1で追従（良い）。ただし慣性・端の制限無し。ホイールが段階値（`STEP=0.5`）で離散。ほかに直接操作は無く、そもそも入力フォーム中心 |
| 割り込み可能性 | 2 | ダイアログ・トーストは表示のみで退場アニメ無し（アンマウント即消え）。`page-enter` は遷移ごとに `key={pathname}` で再マウントされ、opacity 0 から始まるため、再生中の操作は新しい画面の要素に効くが現在値から動かし直す設計ではない。`anim-stagger` は最大約0.5秒、先頭以外の行が最初透明で、素早い操作の直前に押すと不安定。動作自体はクリックを妨げない（animation は pointer-events に影響しない）ため致命的ではない |
| ばね | 1 | ばね皆無。全て cubic-bezier 1種。ドラッグ後の慣性・スナップ無し（`ImageZoom`、`DashboardCards.tsx:91` の横スナップは CSS scroll-snap でブラウザ任せ） |
| 空間の一貫性 | 2 | ダイアログは中央で拡大しつつ出現（`anim-pop-in`）だが、閉じるときは経路が違い、即消える（入り＝出ではない）。トーストは下から出ず中央で拡大。タブ切替（`cases/[id]/page.tsx:257-283`）は内容が無移動で差し替わり、どの方向へ移ったか不明。画面遷移は常に「下から8px上昇」で、進む/戻るの区別なし |
| 素材 | 3 | ヘッダー（半透明＋ぼかし）は妥当。ただし `bg-white/75` は暗色で `--color-white` が `#2c2c2e` になるため暗い半透明に自動対応（良い）。ダイアログ背景のぼかし（`backdrop-blur-sm`）は入力フォーム中心のアプリでは負荷に見合わず、低性能スマホでスクロール性能に影響しうる（要実機）。影は `shadow-2xl` など強め |
| reduced motion | 4 | 全体 CSS 対応済み（`:263-275`）。「減らす」ではなく実質「止める」ので、状態変化の手がかり（フェード）まで消える。JS のスムーズスクロール・`ImageZoom` は未対応（3章A欄参照）。代替（瞬時の不透明度切替）を明文化すべき |

### B. 主要な操作の再設計

この画面群で動きが効くのは次の6操作に絞る。

1. **確認ダイアログ（削除・書類置換・離脱確認。5コンポーネント）**
   - 正常系: 押した要素の近くから、または中央から、ダイアログが減衰1.0・応答0.3秒のシート的ばねで出る（スケール 0.96→1、不透明度 0→1）。スクリムは不透明度のみ。
   - 中断・逆戻り: 開閉の途中でキャンセル/Esc しても、現在の値から逆向きに動かす（CSS transition を使い、`@keyframes` を使わないことで可能）。閉じる動きは出る動きの逆経路。
   - 端: モバイル幅（<md）では下端寄せのシート形にし、下方向のドラッグで閉じるのは **やらない**（誤操作で入力を失う。8章「やらない」参照）。
   - reduced motion: スケールを無効、不透明度のみ 0.01s。
2. **トースト（`Toast.tsx`）**
   - 正常系: 下から 12px＋不透明度で入り、5秒後に同経路で退場。
   - 中断: 退場中にホバー/フォーカスしたら現在値から戻す（成功トーストは操作中に消えないよう、フォーカス中はタイマー停止）。
   - 端: 複数同時は縦に積む、位置の入れ替えは transform の移動で補間。
   - reduced: 不透明度のみ。
3. **タブ切替（案件詳細）**
   - 正常系: 下線（選択インジケータ）を transform で隣のタブへ移動（移動 減衰1.0/応答0.4秒）。パネルは不透明度のみで切替（左右スライドはしない。内容が長く、入力中の欄が動くと迷うため）。
   - 中断: 連打時は現在位置から次のタブへ動かし直す。
   - 端: 横スクロールのタブバーはブラウザ標準のゴム引きに任せる。
   - reduced: 下線は瞬時に移動。
4. **一覧→詳細（および戻る）**
   - 正常系: 現行の「毎回、下からフェード」をやめ、フェードのみ（0.15秒）に弱める。または Next の View Transitions（`view-transitions.md`）で一覧行→詳細ヘッダーの共有要素を検討（承認事項）。
   - 逆戻り: ブラウザの戻る時はスクロール位置復元を優先し、入場アニメを省略する。
   - reduced: アニメ無し。
5. **フォームの検証・保存フィードバック（入力フォーム全般）**
   - 正常系: 入力エラーは、欄の下にテキスト＋図形で表示し、高さの変化は `grid-template-rows` 0fr→1fr の補間（transform 優先の原則の例外。レイアウト変更は最小限に留める）または、予約領域で高さ変化を発生させない。
   - 中断: 入力途中に新しいエラーが出ても、出ている表示を再生し直さない。
   - 保存: ボタン内のスピナー/チェック表示に切替（不透明度）。保存中も入力欄は操作可能にする（`aria-busy` のみ）。
6. **ImageZoom**（直接操作が効く唯一の場所）
   - 正常系: ピンチ/ドラッグは1:1のまま。ボタン（＋/−/元に戻す）はばね（移動 減衰1.0/応答0.4秒）でスケールを補間。
   - 中断: ボタン連打は現在値から目標値へ動かし直す。ドラッグ開始でばねを停止し、指の位置を優先。
   - 端: スケール 1〜5 の範囲外は、ゴム引き（抵抗付き）で超過を許し、指を離すと範囲内へ戻す。パンは画像端を超えたら抵抗。離したときの速度は、勢いの射影（減衰率に基づく到達点）を求め、画像端へ収まる最寄り位置にスナップ。
   - reduced: ばね無し、瞬時にスナップ。ホイールの段階値はそのまま。

### C. 動きの仕様

- トークン（`globals.css` に追加。値はCSS変数）:

| 名前 | 用途 | 減衰 | 応答 | 実装 |
|---|---|---|---|---|
| `--spring-move` | 移動（トースト、インジケータ、ズーム） | 1.0 | 0.4秒 | 第1案: CSS `linear()` 近似、第2案: Motion の spring |
| `--spring-rotate` | 回転（展開矢印など） | 0.8 | 0.4秒 | 同上 |
| `--spring-sheet` | シート/ダイアログ | 0.8 | 0.3秒 | 同上。跳ねは小さい（目安）。入力を邪魔しない範囲に抑える |
| `--dur-fade` | 不透明度のみ | - | 0.15秒 | linear に近い ease-out |

  - 既定の減衰は 1.0（跳ねない）。0.8 を使うのは回転とシートのみ。
  - 速度の引き継ぎ: 中断時、現在の値と速度から再開する。CSS transition は現在値は引き継ぐが速度は引き継がない。許容できない場面（ImageZoom のみ）に限り JS ばねを使う。
- プロパティ: `transform` と `opacity` を優先。`box-shadow`、`background-color` の transition は小さい要素のみに限る。`width/height/top/left` は動かさない。`globals.css:171-182` の全要素 transition を、`transition-property` の限定（color, background-color, border-color, box-shadow, opacity, transform）に絞り、`all` は使わない（現状も限定済みで良い）。
- ジェスチャー（ImageZoom、将来のシート）に CSS `@keyframes` を使わない。keyframes は現在値から動かし直せないため。使ってよいのは「出現演出」のみ（現在は `page-enter`/`pop-in`/`fade-in`/`anim-stagger`）。
- 順次表示（stagger）: 先頭8件、30ms 刻みは維持してよいが、再訪・戻る・絞り込み変更では再生しない（初回表示のみ）。件数が多い一覧では合計 0.5 秒を超えない。
- reduced motion の代替表（すべての動きに用意）:

| 動き | 通常 | reduced |
|---|---|---|
| 画面入場 | 不透明度+8px上昇 | 不透明度のみ 0.01s、または無し |
| ダイアログ | スケール+不透明度 | 不透明度のみ |
| トースト | 下から入る | 不透明度のみ |
| タブ下線 | ばね移動 | 瞬時移動 |
| ズーム | ばね補間 | 瞬時 |
| ボタン押下 | scale(0.97) | 色の変化のみ（既存。`:271-274`） |
| スクロール | smooth | auto（JS 側も `matchMedia` で分岐） |

### D. 素材と階層

- 半透明は **ヘッダー1か所のみ** に維持（`Header.tsx:24`）。下の内容が見える意味があるため。
- スクリム: ダイアログ背景の `backdrop-blur-sm` を廃止し、`bg-black/40`（暗色では `bg-black/60`）のみに。理由: 入力フォーム中心で背景の情報を読ませる必要が低く、ぼかしは描画コストが高い。
- 「明に明を重ねない」: 明色でヘッダー（`white/75`）の下を白カードが通るとき、境界が曖昧になる。`border-b border-slate-200` が存在するため現状は許容。暗色は `--color-white:#2c2c2e` で濃い半透明となり良好。
- 影の階層（3段に統一）: 0=枠線のみ（一覧カード、通常）、1=`shadow-sm`（浮くカード、hover）、2=`shadow-lg`（トースト/ダイアログ）。現状の `shadow-md`/`shadow-2xl` を整理。暗色では影が見えないため、枠線（`border-line-strong`）と背景の明度差で階層を示す。
- 紙プレビューは `.paper` 固定のまま変更しない。

### E. 実装チェックリスト

- [ ] `--spring-*` `--dur-*` トークンを `globals.css` に追加（値は第1案 `linear()` 近似。[NEEDS INPUT] ばね方式の決定）
- [ ] 確認ダイアログ5種を1つの `Modal` 部品に統合し、出入りの経路を揃える（退場時はアンマウント前にアニメーション完了を待つ。`useDialogA11y` は維持）
- [ ] 退場アニメーション: Toast、Modal（`@starting-style`＋`transition-behavior: allow-discrete` が使えるか対象ブラウザで確認。[NEEDS INPUT] 対応ブラウザ範囲）
- [ ] `PageTransition` の入場を、フェード中心に弱める。戻る操作では省略
- [ ] `anim-stagger` を初回のみにする（絞り込み・並べ替えでは再生しない）
- [ ] JS のスムーズスクロール（`documents/page.tsx:52`、`cases/[id]/page.tsx:140,158`、`DashboardCards.tsx:83`）に `prefers-reduced-motion` 分岐を入れる
- [ ] タブの下線インジケータ（transform）
- [ ] ImageZoom: ばね・ゴム引き・勢いの射影（JS）、reduced 分岐
- [ ] ヘッダー以外の `backdrop-blur` を撤去
- [ ] 押下表現: `a`/タブ/行カードにも `:active` の即時フィードバック。`@media (hover:hover)` でホバー表現を囲み、タッチでの固着を避ける（`DashboardCards.tsx:12`、`cases/page.tsx:296`）
- [ ] 実機での検証: 低性能 Android、iOS Safari（ぼかし、100vh、キーボード表示）。[NEEDS INPUT] 対応端末の範囲
- [ ] View Transitions の採否（`view-transitions.md` を確認のうえ）。[NEEDS INPUT]

### F. この画面群に特有の「やる5つ / やらない5つ」

やる:
1. 確認ダイアログ・トーストの出入りの経路を揃え、中断時は現在値から戻す。
2. タブ下線の移動で「どこへ移ったか」を示す（内容はスライドしない）。
3. 保存・検証の結果を、近くに、文字＋図形で、動きは最小で示す。
4. ImageZoom のみ、ばね・ゴム引き・勢いの射影を入れる。
5. すべての動きに reduced motion の代替を用意し、JS スクロールも含めて検証する。

やらない（理由つき）:
1. 入力フォームの欄・ステップをスワイプ/ドラッグで操作しない。誤操作で入力を失う。入力中は動かさない原則。
2. ダイアログの「下ドラッグで閉じる」「引っ張って更新」を入れない。未保存入力の喪失、ブラウザ標準のスクロールと競合。
3. 長い表・一覧に大きな慣性/跳ね/視差を入れない。数字や状態を読む作業を妨げる。
4. 状態を示す色の変化だけで済ませず、動きだけで意味を伝えることもしない（図形・文字を併記する既存方針を維持）。
5. 書類プレビュー（紙）を動かさない。印刷・確認用で、動きは不要。

当てはまらない指針の省略: 勢いの射影・スナップ・ゴム引き・速度の引き継ぎは、直接操作がある ImageZoom 以外には当てはまらないため省く。回転ばね（0.8/0.4秒）も展開矢印程度にとどめる。

## 4. (b) 見た目と情報設計の監査

| 観点 | 現状（証拠） | 課題 | 改善案 |
|---|---|---|---|
| 色 | 青橙灰＋暗色。コントラスト4.5以上の方針（`design-system.md`、`globals.css:1-8`） | 色名と実色の不一致（`red`=橙）。`text-slate-500` の補足（12px）が薄い灰で、暗色/明色とも境界値。`placeholder`/`disabled` の対比は未確認 | `text-xs` の補足には `slate-600` 以上を使う。意味トークン（`--color-danger`、`--color-success`）を足し、新規は意味名で使う。[NEEDS INPUT] 全組み合わせの対比測定 |
| 文字の大きさと階層 | 本文 `text-sm`（14px）、補足 `text-xs`（12px）が約7割 | モバイルで 12px が多い。ページ見出しは `text-2xl` 7、`text-xl` 10 と少数で階層が浅い。`text-[0.65rem]`（約10px）が1件 | 本文 16px（モバイル）/14px（PC）。補足は最小 13px。見出しは h1=24、h2=18-20、h3=16 の3段に固定。`text-[0.65rem]` を廃止 |
| 余白 | `px-6 py-8`、カード `p-6`、入力 `px-3 py-2` | 余白スケール未定義。モバイルでも `px-6`（24px）で本文幅が狭い | 4px 基準の余白（4/8/12/16/24/32）をトークン化。モバイルは main を `px-4` |
| スマホ表示 | `md:` を唯一の分岐に使用。一覧は md 未満でカード化（`cases/page.tsx:322`）、指標は横スナップ（`DashboardCards.tsx:91`）。MembersPanel は `md:table`、ヘッダーは `max-md:` で2段 | ヘッダーが2段で縦を消費（sticky で常時）。タブが横スクロール（見切れの手がかり不足）。`RequirementsPanel` の表（`:229,271`）は md 未満の扱いを要確認 | ヘッダーを1段（ロゴ＋メニューボタン）に。タブ端にフェード/見切れ表示。表は md 未満でカード化（`cases/page.tsx` の方式に合わせる） |
| フォームの入力しやすさ | `inputClass`：`px-3 py-2 text-sm`（高さ約38px、`ui.tsx:61`）。`ChoiceGroup` は `min-h-[44px]` 済み | 入力が 14px で iOS Safari がフォーカス時に自動拡大する（16px 未満）。高さ 38px が 44px 未満。必須は `*` と赤（橙）のみで読み上げ上の手がかりが弱い。エラーは欄の下の文字（良い）が、エラー一覧・先頭欄へのフォーカス移動は未確認 | 入力は `text-base`（16px）、`min-h-[44px]`。必須は「必須」の文字ラベル。送信時に最初のエラー欄へフォーカス＋エラー要約。`autocomplete`/`inputmode` の網羅を確認（`DateField`、`AddressField`は既に配慮あり） |
| アクセシビリティ | `:focus-visible` に 3px 輪郭（`globals.css:188`）。ダイアログに `useDialogA11y`（Tab 閉じ込め・復帰）。タブは矢印キー対応（`cases/[id]/page.tsx:123`）。Toast に `role=status/alert`。状態は図形併記 | `ImageZoom` のボタン `aria-label` が日本語直書き（i18n 外、`ImageZoom.tsx:80-92`）。ズームにキーボードでのパン手段なし。`ConfirmDocumentDeleteDialog`/`ConfirmDocumentReplaceDialog` は `useDialogA11y` の適用が未確認（`ref` 無し） | 5種のダイアログを `Modal` に統合し a11y を一元化。ImageZoom に矢印キーでのパン、i18n 化。スキップリンクの追加。[NEEDS INPUT] スクリーンリーダー実機確認 |
| 画面間の一貫性 | `Button`/`Field`/`Badge`/`inputClass` は `ui.tsx` に共通化。ただし画面ごとに `rounded-full bg-accent ...` を直書き（例 `cases/page.tsx` の新規作成リンク） | リンク型ボタンが `Button` を使わず重複。ダイアログ5種が個別実装。角丸の使い分け（`rounded-xl` と `rounded-full`）が混在 | `LinkButton` を `ui.tsx` に追加し直書きを置換。`Modal`/`Sheet` 部品化。角丸ルール：入力=xl、ボタン=full、カード=2xl |

## 5. 課題の優先度

1. 動きの基盤が貧弱：ばね無し、退場アニメ無し、ダイアログ5種が個別実装（影響大・リスク中）
2. モバイルの入力性：入力欄 14px/38px、本文幅、2段ヘッダー（影響大・リスク低）
3. 補足文字（12px・薄灰）と階層の浅さ（影響中・リスク低）
4. 一貫性：リンク型ボタン直書き、色名と実色の不一致（影響中・リスク低）
5. JS スクロールの reduced motion 漏れ、ImageZoom の i18n/キーボード（影響小・リスク低）

## 6. 実装の分け方（案）

原則: 1画面（または1共通部品）1PR。PRは統合用ブランチ（用1/用2。`working-rules.md`）へ向け、下書きで作る。PR数は必要最小限（デプロイ検査の回数制限）。基盤→共通部品→画面の順。

競合しやすいファイル（明記）:
- 共通: `app/globals.css`、`components/ui.tsx`、`components/Toast.tsx`、確認ダイアログ5種、`components/PageTransition.tsx`、`app/layout.tsx`、`components/Header.tsx`
- 画面が共有: `components/ChoiceGroup.tsx`、`DateField.tsx`、`AddressField.tsx`（`inputClass` を経由）
- `lib/requirements/rules.ts` を直接/間接に参照する箇所: `components/EmploymentForm.tsx`（`RuleSet` 型。`:11`）。さらに `lib/requirements/evaluate.ts` 経由で `RequirementsPanel.tsx`、`FormDetailsForm.tsx`、`app/cases/new/page.tsx`、`app/cases/[id]/page.tsx`、`app/cases/[id]/documents/page.tsx`。**これらは見た目の変更のみに限り、`lib/requirements/*` 自体と import 文・型・評価ロジックには触れない。**
- #374（取得許可申請の照合表・README、要件データ）の作業: 直近では PR #391 までマージ済みだが、続きの作業があれば `lib/requirements/rules.ts` と関連データ、`RequirementsPanel.tsx`（必要書類の表示）、`EmploymentForm.tsx`、`app/cases/new/page.tsx` の案内文に変更が入りうる。→ 下の PR-7（RequirementsPanel）と PR-5（new）は #374 の PR が閉じるまで待つか、直前に main/統合ブランチを取り込む。

順序:

| PR | 内容 | 主な変更ファイル | 依存/競合 |
|---|---|---|---|
| PR-1 基盤 | トークン（ばね・時間・影・余白・意味色）、`prefers-reduced-motion` の整理、JS スクロールの共通関数、`backdrop-blur` の撤去（ダイアログ分は PR-2） | `app/globals.css` | 最初に単独でマージ。以後の全PRが依存 |
| PR-2 共通部品 | `Modal` 統合（5種）＋退場アニメ、`Toast` の入退場、`LinkButton`、`inputClass` を 16px/44px に | `components/ui.tsx`、`Toast.tsx`、`ConfirmDialog.tsx` 他4種、新 `Modal.tsx` | PR-1 後。呼出し側の import は変わらない形（既存コンポーネント名を残し中身を差し替え）にして、画面PRとの競合を避ける |
| PR-3 レイアウト/ヘッダー | ヘッダーの1段化、main の余白、PageTransition の弱化、スキップリンク | `Header.tsx`、`layout.tsx`、`PageTransition.tsx`、`Footer.tsx` | PR-1 後。PR-2 と並行可（ファイルが異なる） |
| PR-4 ホーム `/` と ログイン系 | DashboardCards、NextActionCard、`/login`、`/reset-password`、`/account` | `app/page.tsx`、`DashboardCards.tsx`、`login`、`reset-password`、`account`、`MembersPanel.tsx`、`PasswordField.tsx` | PR-2 後。`DashboardCards.tsx` は案件一覧も使うため PR-5 より先 |
| PR-5 案件一覧 `/cases` | フィルタ、表/カード、stagger を初回のみ、押下表現 | `app/cases/page.tsx`、`CaseFilters.tsx`、`StatusSelect.tsx`、`WorkflowBadge.tsx` | PR-4 後 |
| PR-6 新規登録 `/cases/new` | 入力フォーム、検証、フォーカス移動 | `app/cases/new/page.tsx`、`ChoiceGroup.tsx`、`DateField.tsx`、`AddressField.tsx`、`ApplicantForm.tsx` | PR-2 後。`ChoiceGroup`/`DateField` は詳細画面とも共有するため PR-7 より先。**#374 の案内文変更と衝突しうる** |
| PR-7 案件詳細（枠とタブ） | タブ下線、パネル切替、概要、`CaseInfoEditor` | `app/cases/[id]/page.tsx`、`CaseInfoEditor.tsx` | PR-6 後 |
| PR-8 必要書類・チェック | `RequirementsPanel`、`ChecksPanel`、`UploadBox`、`HspPointSection`、表のモバイルカード化 | `RequirementsPanel.tsx`、`ChecksPanel.tsx`、`UploadBox.tsx`、`HspPointSection.tsx` | PR-7 後。**`RequirementsPanel.tsx` は #374 と最も衝突しやすい**。#374 の PR をマージ後に着手し、`lib/requirements/*` と import は触らない |
| PR-9 申請人/就労先フォーム | `FormDetailsForm`、`EmploymentForm` | `FormDetailsForm.tsx`、`EmploymentForm.tsx` | PR-7 後。`EmploymentForm` は `rules.ts` の型を参照（型 import は不変）。PR-8 と並行可 |
| PR-10 書類 | `documents` 2画面、`ImageZoom` のばね/ゴム引き/キーボード | `app/cases/[id]/documents/**`、`ImageZoom.tsx` | PR-7 後。紙の見た目（`DocumentSheet`、`ClientGuideSheet`）は変更しない |

マージ順: PR-1 → PR-2 →（PR-3, PR-4 並行）→ PR-5 → PR-6 → PR-7 →（PR-8, PR-9, PR-10 並行）。
統合用ブランチ→main への PR は、PR-1〜3 を一区切り、PR-4〜7 を二区切り、PR-8〜10 を三区切りにまとめる。

## 7. 各PRの確認方法（共通）

- `npm run lint` `npm run test`、`next build`。
- 明色/暗色、幅 360/768/1280、キーボードのみ、OS の「視差効果を減らす」ON/OFF で目視。
- 低性能端末でのスクロール（ぼかし撤去前後）。[NEEDS INPUT] 実機。

## 8. 範囲外・省いた項目

- 勢いの射影・ゴム引き・速度の引き継ぎ: ImageZoom 以外には直接操作が無く省略。
- 下ドラッグで閉じるシート、引っ張って更新、スワイプ削除: 入力喪失の危険があり、あえて入れない。
- 画面遷移の共有要素アニメーション: View Transitions は採否を人に委ねる（9章）。
- 多言語（i18n）の文言変更、`lib/requirements/*` のデータ・ロジック、API、DB は対象外。

## 9. 人の承認が要る判断

1. ばねの実装方式: (A) 追加なし（CSS `linear()`＋自前の小さなばね関数。依存を増やさない。推奨）／(B) Motion を追加（ばね・割り込み・ジェスチャーが容易。バンドルサイズ増。ImageZoom の改善が主な利用先なので効果は限定的）。
2. View Transitions（`view-transitions.md`）の採否。ブラウザ対応と実験的機能の扱い。
3. 本文を 16px（モバイル）にする等の見た目の変更の可否（全画面の密度が変わる）。
4. ダイアログのぼかしを撤去する可否、ヘッダーの1段化の可否。
5. 対応端末・ブラウザの範囲（`@starting-style` 等の利用可否）。
6. 実装 PR の着手時期（#374 の PR の完了待ちか、並行か）。
