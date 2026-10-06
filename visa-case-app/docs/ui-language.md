# 画面全体の表示言語（利用者ごとの切替）

Issue #255（第1段階：基盤）。画面の表示言語を、利用者ごとに、日本語・英語・韓国語から選べるようにする。第1段階は、基盤と、共通の枠組みの訳のみ。画面ごとの訳は、第2段階以降。

## ご案内書類の言語との関係
docs/client-guide-languages.md（#251）は、依頼者向けの案内書類の言語を扱う。案件ごとに、出力時に選ぶ。本件では変更しない。
- 画面の表示言語と、案内書類の言語は、独立している。一方を切り替えても、他方は変わらない。
- `Lang` 型、`LANG_LABELS`、`isLang`（`lib/documents/lang.ts`）は、共用する。
- 訳表は別。案内書類は `lib/documents/clientGuideText.ts` のまま（変更しない）。画面は `lib/i18n/messages/` に置く。

## 設計の判断

### 1. 保存先
判断：新しい表 `user_preferences`（`user_id` 主キー、`language`、`updated_at`）に保存する。RLS は、自分の行のみ、select / insert / update を許可する。マイグレーションは 0024。

理由：言語は、事務所ではなく、利用者ごとの設定のため。
- 案B（`members` への列追加）は採らない。`members` は事務所単位の表で、更新は管理者向けの関数に限られる。利用者が複数の事務所に所属すると、事務所ごとに言語が分かれ、不整合になる。
- 0024 は追加のみで、既存のデータへの影響はない。
- 言語を追加するときは、`language` の check 制約を広げる小さなマイグレーションが必要。

### 2. 既定値と記憶
判断：
- 未設定・未ログインは、日本語。ブラウザの言語からの自動判定はしない。
- ブラウザの記憶（localStorage、キー `visa-case-app:ui-lang`。案内書類のキー `visa-case-app:client-guide-lang` とは別）は、取得前のちらつきを抑える一時的な手掛かり。正は、保存した設定。
- 仮データ（Supabase 未設定・デモ）は、localStorage のみ。

理由：意図しない言語での表示を避けるため。保存した設定を取得する前にも、直前の言語で描画できるようにするため。

### 3. 取得と反映
判断：認証がブラウザ側のみ（cookies なし、proxy なし）のため、言語の取得・反映もブラウザ側で行う。`LanguageProvider`（`lib/i18n/LanguageProvider.tsx`）の流れは、次のとおり。
1. 初回の描画は、記憶、なければ日本語。
2. ログインの確定後に、保存した設定を1回取得する。
3. 記憶と差があれば、切り替える。
4. 取得の前に利用者が切り替えた場合は、取得の結果で上書きしない。

失敗時：
- 取得の失敗：記憶のまま表示する。
- 保存の失敗：利用者の選択は保ち、保存できなかったことを通知する。

既知の限界：
- 同じブラウザで別の利用者がログインし、その利用者に保存値がない場合は、前の利用者の記憶が残る。
- サーバー側の描画は、常に日本語。題名（metadata）も、日本語のまま。

### 4. 見送った案：URL による言語の分離
判断：`/{言語}/...` への URL の移行（公式の方式）は、見送る。

理由：全画面の移動、proxy の追加、cookies を使う認証への変更が必要で、本件の範囲を超える。

### 5. 未訳の文言
判断：訳がない文言は、日本語の原文を表示する（`translate` の退避）。

理由：英語・韓国語のキーの漏れは、型で `tsc` が検出する。実行時の退避は、値が空文字の場合の安全網。

## 訳表の形式
- 場所：`lib/i18n/messages/<区分>.ts`。区分は、画面や機能のまとまり（例：`header`、`footer`、`common`）。
- 定義：`defineMessages` で、`ja`・`en`・`ko` を、同じキーで持つ。日本語が原文（正）。
- 登録：`lib/i18n/messages/index.ts` の `CATALOG` へ。キーの型 `MessageKey` は、`"区分.キー"` の形で、`CATALOG` から導かれる。存在しないキーは、型検査で弾かれる。
- 使い方：画面の部品（クライアント）で、`const t = useT();` とし、`t("header.logout")` のように呼ぶ。
- 差し込み：文中の `{名前}` を、`t("区分.キー", { 名前: 値 })` で置き換える。
- 自由記述・氏名・案件の内容は、訳表に入れない（原文のまま表示する）。

### 区分を足す手順
1. `lib/i18n/messages/<区分>.ts` を作る。
2. `messages/index.ts` の `CATALOG` へ、1行足す。
3. `lib/i18n/reviewStatus.ts` へ、1行足す（英語・韓国語を `draft` とする）。
4. 試験が、`CATALOG` と `reviewStatus.ts` の整合を検査する。

第2段階では、画面ごとに別の区分とするため、複数の担当が同時に進めても、担当するファイルが重ならない（`CATALOG` と `reviewStatus.ts` への1行の追加のみが共通）。

## 未確認の訳の目印
- `lib/i18n/reviewStatus.ts` が、区分ごと・言語ごとに、`draft`（行政書士の確認前）または `reviewed`（確認済み）を持つ。
- `draft` の区分を含む言語を選ぶと、言語の切替の操作部分に、「訳文は行政書士の確認前です」と表示する。
- 確認が済んだら、該当の区分・言語を `reviewed` に直す。すべての区分が `reviewed` になると、表示は消える。
- 1文言ごとの管理は、見送る。理由：記述量が多くなるため。必要になれば、後で細分化する。
- 確認前の訳文は、AI が作成した下書き。依頼者に関わる内容は、行政書士が確認してから使う。

## 言語の追加手順
1. `lib/documents/lang.ts` の `LANGS`・`LANG_LABELS` に、言語を足す。
2. 各区分の訳表（`lib/i18n/messages/`）に、その言語の訳を足す。`Record<Lang, ...>` の型により、漏れは `tsc` が検出する。
3. `lib/i18n/reviewStatus.ts` に、その言語の状態（`draft`）を足す。
4. `user_preferences.language` の check 制約を広げるマイグレーションを足す。

案内書類の訳表（`clientGuideText.ts`、`clientGuideNames.ts`）も `Lang` を使うため、言語を足すと、そちらも型で漏れが分かる。

## 範囲外
- 案内書類の言語（#251。変更しない）。
- 自由記述・氏名・案件の内容の翻訳。
- 翻訳 API の導入。外部へ個人情報を送らない。

## 第1段階で訳した共通の枠組み
- ヘッダー（メニュー、言語の切替）
- フッター
- 読み込み中の表示
- 通知（保存の失敗など）
- 明暗の切替
- ログイン状態の確認

画面ごとの訳は、第2段階以降（docs/future-considerations.md の 4）。

## 第2段階・順1：共通部品の訳（#257）
- 訳表の区分は、担当の重なりを避けるため、`input`（入力・選択の部品）、`dialog`（確認・案内の部品）、`display`（期限・状態・取り込み・指標の部品）、`labels`（状態のラベル）の4つとした（#257 の本文案の `shared` を細分した）。
- 書類の出力・監査記録・テストが使う日本語の定数（`lib/types.ts` のラベル、`lib/caseMetrics.ts` の期限の文言、`lib/dateInput.ts` の `DATE_INVALID_MESSAGE` など）は、変更しない。画面の表示のときだけ、言語に合わせて引く仕組みを追加した。
  - `useLabels()`（`lib/i18n/labels.ts`）：案件の状態、必要書類の収集状況、確認の状態・種別、書類の状態。キーの型は `lib/types.ts` の型で、値の追加時に訳の漏れが型検査で分かる。
  - `lib/i18n/expiry.ts`：期限の表示。日本語の出力は、元の関数と一致することをテストで確認している。
  - `useStatusHints()`、`useDateInvalidMessage()`：入力部品の補助文。
- 在留資格名、高度専門職の号、手続名は、法令用語であり、保存値でもあるため、訳さない（日本語のまま表示）。
- 呼び出し元が部品へ渡す文言（props）と、`lib/` の関数が返す日本語（次に行うこと、指標の名称、書類の検証メッセージなど）は、各画面の Issue で扱う。呼び出し元が `STATUS_HINTS`・`DATE_INVALID_MESSAGE` を渡している箇所は、各画面の Issue で、上の `useStatusHints()`・`useDateInvalidMessage()` に切り替える。
- 英語・韓国語の訳文の件数（行政書士の確認待ち）：`input` 42、`dialog` 39、`display` 29、`labels` 18。計128件（言語ごと）。

## 確認の結果
確認した項目（2026-10-06、仮データ方式で実画面を確認）：
- 型検査（`tsc --noEmit`）、`npm run lint`、`npm run test`（66 ファイル・695 件）、`npm run build`：すべて通った。
- 実画面で、日本語・英語・韓国語を切り替え、ヘッダーとフッターの文言と `html lang` が連動すること、再読み込み後も選択が保たれることを確認した。
- 記憶が不正な値の場合は日本語に戻ること、localStorage が使えない環境でも、画面が壊れず、その画面では切り替わることを確認した。

確認できなかった項目：
- Supabase に接続した状態での、保存・取得と、別のブラウザへの引き継ぎ。確認用の Supabase 環境がなく、マイグレーション 0024 も未実行のため。保存・取得・失敗時の動きは、モックを使ったテスト（`tests/i18nPreferences.test.ts`、`tests/languageProvider.test.tsx`）で確認したのみ。
- 行ごとのアクセス制御（他の利用者の行を読み書きできないこと）の実機での確認。
- 英語・韓国語の訳文は、行政書士の確認前（`reviewStatus.ts` はすべて draft）。

第2段階・順1（#257）の確認：型検査、lint、全テスト（69 ファイル・718 件）、ビルド：通過。開発サーバーの実画面（ホーム、案件一覧、案件の新規登録）で、3言語を切り替え、幅 1280 と 375 のどちらでも横のはみ出しがなく、画面のエラーが出ないことを確認した。確認できなかった項目：Supabase に接続した状態の確認（上と同じ）、案件詳細・書類の画面での共通部品の表示（各画面の Issue で確認する）。

## 第2段階・順7：書類の生成と履歴（#267）
- 区分：`documents`（`lib/i18n/messages/documents.ts`）。対象は、`/cases/[id]/documents` の本文、`UnresolvedNote`、`OfficialFormNotice`（書類のプレビュー画面 `/cases/[id]/documents/[docId]` も、この2部品を使うため、表示言語に連動する。`DocumentSheet` は未変更）。
- 表示用の対応は、`lib/i18n/documentsView.ts` に集約した。元の日本語の定数・関数（`lib/documents/types.ts`、`precheck.ts`、`officialForms.ts`、`lib/errors.ts`、`lib/documentKinds.ts`）は変更していない。
  - 書類の種類・状態・出力形式：`useDocumentLabels()`。キーの型は、元の型（`GeneratedDocumentType` など）で、値の追加時に訳の漏れを `tsc` が検出する。
  - 公式様式の注意：`OFFICIAL_NOTICE_KEYS`（元の `OFFICIAL_FORM_NOTICES` と日本語が一致することを試験で確認）。
  - 対象外の注意：`scopeWarningsText()`。判定は元の `officialFormScopeWarnings` を使い、文面だけを手続種別のキーで引く。
  - 事前チェック（データ状態）：`precheckRowsText()`。元の `precheckRows` の返り値（key・tone・unresolved・tab）を使い、文面は、入力（`PrecheckInput`）から決まる種別で引く。全入力の組み合わせで、日本語の出力が元の関数と一致することを試験で確認している。
  - エラー文：`errorText()`。エラーが種別・コードを持たず（`AppError` は文言のみ）、文字列でしか区別できないため、既知の文言の完全一致で引く（`ERROR_TEXT_KEYS`）。一致しない文言は日本語のまま表示する。`lib/errors.ts`・`lib/documents/store.ts`・API ルートの文言を変更した場合は、`ERROR_TEXT_KEYS` も直す必要がある（`lib/errors.ts` の文言は試験で網羅を確認）。「生成文書の読み込みに失敗しました：」の前置きは、理由を分けて訳す。
- 画面の状態として保持する通知（「生成中」「生成しました」「失敗」）は、表示した時点の言語の文字列を持つ。表示中に言語を切り替えても、その通知は切り替わらない（次の操作で更新される）。
- 書類の出力（Word・PDF・エクセル）の言語、案内書類の言語選択は、変更していない。
- 小さな画面で、生成履歴の行が横にはみ出していたため（日本語でも発生）、行を折り返す指定にした。
- 英語・韓国語の訳文の件数（行政書士の確認待ち）：`documents` 98件（言語ごと）。
- 確認してほしい訳：
  - 公式書式・入管庁に関わる語：「出入国在留管理庁」（Immigration Services Agency of Japan／출입국재류관리청）、「公式申請様式」（Official application form／공식 신청 서식）、「在留資格認定証明書交付申請」（application for a Certificate of Eligibility／체류자격 인정 증명서 교부 신청）、「在留資格変更許可申請」「在留資格取得許可申請」「在留期間更新許可申請」（対象外の注意の本文。在留資格名「技術・人文知識・国際業務」は日本語のまま）。
  - 書類名：「案件確認シート」（Case confirmation sheet）、「申請人情報一覧」（Applicant information list）、「必要書類チェックリスト」（Required documents checklist）、「理由書ドラフト」（Statement of reasons (draft)）、「転記補助シート」（Transcription aid sheet）、「高度専門職ポイント計算表」（Highly Skilled Professional points calculation sheet）、「ご案内書類」（Client guide）。
  - 状態：「行政書士確認前／確認済み」（Pending scrivener review／Reviewed by scrivener）、「保管」（Archived。画面の操作は Archive）。
  - 「申請人」（applicant／신청인）、「申請前チェック」（Pre-application checks／신청 전 점검）、「監査ログ」（audit log／감사 로그）。
  - 韓国語の「{label} v{version}을(를) 보관합니다」は、書類名の末尾の音によらず使える形にした（自然さの確認を希望）。

## 第2段階・順8：書類のプレビュー（#268）
- 区分：`documentView`（`lib/i18n/messages/documentView.ts`）。対象は、`/cases/[id]/documents/[docId]` の画面の操作部分（戻る、注意書き、状態変更のボタンと確認ダイアログ、出力・印刷のボタン、失敗の表示、案内書の言語選択の見出しと説明）。
- 書類の種類・状態・出力形式の表示名、公式様式の注意、エラー文は、順7の `documents` 区分（`useDocumentLabels()`、`OfficialFormNotice`、`errorText()`）を再利用した。
- `DocumentSheet`（プレビューされる書類の本文）は、変更していない。画面の操作に当たる文言がなく、すべて書類の内容で、Word・PDF・エクセルの出力と同じ日本語を表示するため。`ClientGuideSheet` と、案内書類の言語の選択肢と動作も、変更していない（見出し、説明、注意書きの文言のみ訳した。説明文の「画面の表示」は、画面の言語と紛らわしいため、「案内書の表示」へ改めた）。
- 「画面の言語」と「書類の言語」の区別：画面の言語が日本語以外のとき、書類の内容と出力は日本語のままである旨の注意を、画面の上部に示す（案内書類では、案内書の言語の選択を案内する。保存済みの案内書類では、保存した版の言語が変わらない旨を示す）。
- 失敗の表示（出力・状態変更）は、種類と理由（日本語）を保持し、表示のたびに現在の言語へ引き直す。順7の通知と異なり、表示中に言語を切り替えると、失敗の文も切り替わる。
- 英語・韓国語の訳文の件数（行政書士の確認待ち）：`documentView` 34件（言語ごと）。
- 確認してほしい訳：「行政書士確認済みにする」（Mark as reviewed by scrivener／행정서사 확인 완료로 변경）、「提出済みにする」の確認文（入管＝Immigration Services Agency／출입국재류관리청）、「案内書の言語」（Guide language／안내서 언어）、案内書の訳文に関する注意書き。

## 第2段階・順3：ホーム、アカウント（#261）
- 訳表の区分は `home`（ホーム、指標カード、次に行うこと）と `account`（アカウント、メンバー管理、操作履歴の名称、ロール名、エラー文）の2つ。
- 書類の出力・監査記録・テストが使う日本語の定数（`lib/auditLabels.ts`、`lib/permissions.ts`、`lib/dashboardMetrics.ts`、`lib/nextAction.ts`、`lib/errors.ts`、`lib/auth.ts` のエラー文）は変更しない。画面の表示のときだけ、次の薄い仕組みで引く。日本語の出力が元と一致することは、`tests/homeAccountMessages.test.ts` で確認している。
  - `lib/i18n/metrics.ts`（`useMetricText()`）：指標カードの名称・説明。
  - `lib/i18n/nextActionText.ts`（`nextActionMessage`）：「次に行うこと」の案内文。段階の判定は `decideNextAction` に任せ、文だけを訳表から引く。件数は呼び出し側で再計算する。
  - `lib/i18n/accountText.ts`（`useAccountText()`）：操作履歴の名称（`audit`）、ロール名（`role`）、エラー文（`error`）。
- エラー文は、lib が返す日本語の文を、完全一致で訳表に対応づけて引く（表にない文は、日本語の原文のまま）。`lib/errors.ts` を変更せずに済ませるための方法で、lib 側の文言を直した場合は、`ERROR_KEYS` も直す必要がある（試験が、`errors.ts` の文の漏れを検出する）。
- 氏名・案件名・メールアドレス・ユーザーID・組織名・保存済みの操作履歴は、訳さない。
- 日時の整形（`lib/format.ts`）は範囲外のため、そのまま。
- 英語・韓国語の訳文の件数（行政書士の確認待ち）：`home` 39、`account` 112（言語ごと）。計151件。
- 確認してほしい訳：
  - 「要対応」を「Action needed」、「確認待ち」を「Awaiting review」、「確認未了」を「Not yet confirmed」としたこと（韓国語は「확인 대기」「확인 미완료」）。2つの指標の違いが伝わるか。
  - 「申請準備完了」を「Ready to apply」（韓国語「신청 준비 완료」）としたこと。
  - 「所有者・管理者・担当者・閲覧のみ」を「Owner / Admin / Staff / Viewer」（韓国語「소유자 / 관리자 / 담당자 / 열람 전용」）としたこと。
  - 「監査ログ」を「Audit log」（韓国語「감사 로그」）としたこと。
  - 操作履歴の名称（`audit_*`）のうち、「行政書士確認済み」「内部確認シート」「提出済み」など、手続に関わる語。
  - 「行政書士」を「administrative scrivener」（韓国語「행정서사」）としたこと（既存の区分と同じ）。
- 確認できなかった項目：Supabase に接続した状態の `/account` の本体（アカウント情報、メンバー管理、操作履歴）。仮データ方式では、案内文のみの表示になるため。型・訳表・試験（日本語の出力の一致）で確認した。

## 第2段階・順4：案件一覧（#262）
- 区分：`caseList`（`lib/i18n/messages/caseList.ts`）。対象は、`app/cases/page.tsx`、`components/CaseFilters.tsx`（検索欄、絞り込み、並び順、まとめてアップロードの入口、ページ送り）。
- 設計の判断：
  - 書類・監査記録・テストが使う `lib/caseMetrics.ts`、`lib/types.ts`（`getTargetStatusDisplay`）の日本語は、変更しない。画面の表示のときだけ、`lib/i18n/caseList.ts`（並び順の選択肢、変更後／希望の見出し、並び替えの向き）で引く。日本語の出力が元の関数と一致することは、`tests/caseListMessages.test.ts` で確認している。
  - 状態の選択肢は `useLabels().workflow`、期限の表示は `ExpiryBadge`（既存）を使う。区分の重複は作らない。
  - 氏名、案件名、在留資格名、手続名（`PROCEDURE_TYPES`）は、訳さない。
  - 「読み込めませんでした」等の文言は、この画面内にあるため、`lib/errors.ts` には触れず、`caseList` 区分で扱った。
- 訳の件数（英語・韓国語。言語ごと）：`caseList` 65。行政書士の確認待ち（`reviewStatus.ts` は draft）。
- 担当外のため未対応：指標カード（`components/DashboardCards.tsx`、`lib/dashboardMetrics.ts`）の名称・説明は日本語のまま。ホームと共用のため、ホームの Issue 側での対応が必要。
- 確認してほしい訳：
  - 韓国語の「案件」を「사건」とした（ヘッダーの既存の訳「체류자격 사건 관리」に合わせた）。
  - 「在留資格」は、英語で "Status of residence"、韓国語で「체류자격」。「在留カード」は、韓国語で「재류카드」（#257 の訳に合わせた）。
  - 「状況」を "Progress"・「진행 상황」、「確認未了」を "not yet confirmed"・「확인 미완료」とした。
  - 「申請前チェック」を "Pre-filing checks"・「신청 전 점검」とした。
  - 「期限の表示は業務上の注意喚起です。…」の注意書きの英語・韓国語（申請の可否や許可の見込みを示さない旨）。

## 第2段階・順2：ログイン、パスワード再設定、ご利用にあたって（#260）
- 区分：`auth`（ログイン、パスワード再設定。エラー文を含む）、`about`（ご利用にあたって）。
- 設計の判断：
  - `lib/auth.ts`、`lib/authMessages.ts` が返す日本語のエラー文は変更しない。画面側は、エラーを日本語の文のまま状態に持ち、表示のときだけ `useAuthErrorText()`（`lib/i18n/authErrors.ts`）で訳す。日本語の文から訳表（`auth.err_*`）を引く方式のため、言語を切り替えると、表示中のエラーも訳が変わる。未知の文は、そのまま表示する。日本語の一致は、`tests/authMessages.i18n.test.ts` で確認している。
  - `/about` は、題名（metadata）をサーバー側に残すため、本文を `app/about/AboutContent.tsx`（クライアント）へ分けた。題名は日本語のまま（第1段階の既知の限界）。
  - `lib/notices.ts` の定数は変更しない（フッターが使う）。`/about` の注意書きは、`about.notice` に持ち、日本語が定数と一致することをテストで確認している。
  - `lib/errors.ts` は、これらの画面に出る文がないため、変更していない。
  - ログイン前の画面でも、ヘッダーの言語の切替は表示され、動作する（仮データ方式で確認）。
- 英語・韓国語の訳文の件数（行政書士の確認待ち）：`auth` 37、`about` 28（言語ごと）。
- 確認してほしい訳：
  - 「ご利用にあたって」全体（法的な注意書きを含む）。特に、個人情報の取扱い（扱う情報、保管場所、監査ログ、日本郵便 API）、利用者の責任、事務所の規程が必要な事項。
  - 「行政書士」：英語 administrative scrivener、韓国語 행정서사（フッターと同じ）。
  - 「出入国在留管理庁」：英語 Immigration Services Agency、韓国語 출입국재류관리청。「在留カード」：재류카드。
  - 「犯罪を理由とする処分の有無」：whether there has been any disposition due to a crime。
  - 「仮データ方式」：英語 sample data、韓国語 임시 데이터 방식。
  - ログインの案内文（事務所のメンバー以外は利用できない旨）。

## 第2段階の共通ルール
第2段階（画面全体の表示言語）の Issue（#260〜#268）に共通する内容。

### 方針
- #255・#257 の方針を踏襲する。翻訳 API は使わない。日本語を原文とし、訳のない文言は日本語の原文を表示する。訳文は、行政書士の確認前の下書きとして扱う。
- 氏名、宛名、案件の内容、自由記述は、翻訳しない。在留資格名、高度専門職の号、手続名は、法令用語で保存値でもあるため、日本語のまま表示する。
- 書類の出力、監査記録、テストが使う日本語の定数は、変更しない。画面の表示のときだけ、言語に合わせて引く。状態のラベルは `useLabels()`、補助文は `useStatusHints()`・`useDateInvalidMessage()`、期限は `lib/i18n/expiry.ts` を使う。
- 訳表は、各 Issue 専用の区分を新設する。`messages/index.ts` の `CATALOG` と `reviewStatus.ts` に、各1行を追加する。

### 完了の条件
- `npm run lint`、`npm run test`、`npm run build` が通る。
- 3言語に切り替えて、対象画面の表示が崩れない（幅 1280 と 375 で、横のはみ出しがない）。開発サーバーで確認する（本番ビルドは、環境設定がないと停止の案内になるため）。
- 英語・韓国語のキーの漏れがない（型検査とテストで確認）。
- PR 本文に、未確認の訳（行政書士の確認待ち）の件数を、区分ごとに記載する。
- 設計の判断があれば、この文書に追記する。

### 範囲外
依頼者向け案内書の言語、自由記述・氏名・案件内容・保存済み書類の翻訳、翻訳 API の導入、日付・数値の整形（`lib/format.ts`。別の Issue）、他の画面の Issue の範囲。
