# iPhone 版（/m）の方針（Issue #456）

iPhone 向けに、SwiftUI の見た目（TabView、大見出しの NavigationStack、.searchable、insetGrouped の List、Menu、チップ）の画面を、別パス `/m` 配下に置く。PC 版の見た目・動作は変えない。

## 別パス /m 配下にした根拠（案 A）
Next.js 16 の資料（`node_modules/next/dist/docs/01-app/`）で確認した要点。
- ルートの `app/layout.tsx` は 1 つ。route group（`(pc)/` など）で root layout を分けると、**別の root layout 間の移動は full page load になる**（route-groups.md）。PC 版と iPhone 版の行き来が毎回全読み込みになる。
- route group で layout を共有せずに分ける方法は、PC 側のページ・フォルダーの移動を伴い、差分が大きく、PC 版への影響の確認が重い。
- layout は画面遷移で再描画されず、pathname も受け取れない（layout.md）。パスで枠を出し分けるには、`usePathname` を読む client コンポーネントを使う。
- `viewport` / `generateViewport`（`viewportFit: "cover"`、`themeColor`）は、layout または page から export でき、**入れ子の layout にも置ける**（generate-viewport.md）。`/m` の layout にだけ置けば、PC 版の `<head>` は変わらない。
- Next.js 16 では、Middleware は **Proxy**（`proxy.ts`）に改名された（proxy.md）。認証は `AuthGate`（client）が担い、`proxy.ts` は端末の振り分けのみを行う（下の「PC 版から iPhone 版への自動の振り分け」）。

## 外枠の出し分け
- `components/AppFrame.tsx`（client）を `app/layout.tsx` に置く。`ToastProvider` > `LanguageProvider` > `AppFrame` の順は従来どおり。
- `/m` と `/m/…` 以外では、従来と同じ要素（Header、max-w-6xl の main、AuthGate、StoreErrorBanner、PageTransition、Footer）を同じ順序で出す。PC 版の出力は変わらない。
- `/m` 配下では、Header・Footer・max-w-6xl の main・PageTransition を出さず、`AuthGate` と `StoreErrorBanner` の内側に `app/m/layout.tsx` の枠（`MobileShell`）を置く。
- **`/m` の画面も、必ず `AuthGate` の内側に入る。** 未ログインで開くと `/m/login`（iPhone 版のログイン）へ移る（tests/appFrame.test.tsx、実機の確認は PR に記載）。認証・API・データ取得の経路は新設しない。データの読み書きは `lib/store.ts` を通す（保護は Supabase の RLS）。

## 構成
- `app/m/layout.tsx`：viewport（viewport-fit=cover、明暗の themeColor）、`MobileShell`。
- `app/m/page.tsx`：`/m` は `/m/cases` へ移す。
- `app/m/mobile.css`：safe-area、チップ・検索欄・区切り線。すべて `.m-root` 配下に限定。
- `app/m/cases`（一覧）、`app/m/cases/[id]`（詳細）、`app/m/cases/new`（新規登録）、`app/m/account`（アカウント。暫定の最小版）、`app/m/login`（ログイン）。
- `components/mobile/`：TabBar、LargeTitleHeader、BackLink、SearchField、FilterChips、Sheet、CaseFilterSheet、CaseRow、GroupedList / GroupedRow、MenuButton、LoadingSpinner、PullToRefresh、MobileShell、paths（パス判定）。案件の型や store に依存しない。props は各ファイルの日本語コメントを参照。
- 文言：`lib/i18n/messages/mobile.ts`（区分 `mobile`。日本語・英語・韓国語。英語・韓国語は他の区分と同じく下書き扱い）。

## 規則
- 色は globals.css の変数（`bg-white`、`slate`、`accent` など）だけを使い、明暗はそちらに任せる。状態は色だけでなく文字と図形（選択中のチップ＝チェックの印、タブ＝塗りつぶしアイコン、メニュー＝チェック）で示す。
- 押せる範囲は 44pt 以上。入力欄の文字は 16px 以上。
- 動き：LoadingSpinner と PullToRefresh は、動きを減らす設定では回さず・動かさない（静止した図形と文字のみ）。メニューの表示は `motion-panel`（globals.css の規則に従う）。
- 絵文字は使わない。アイコンは SVG の線画（選択中は塗りつぶし）。

## 画面構成と HIG 適合レビューの反映（Issue #456）
- 下部タブは「案件」「アカウント」の 2 つ。新規登録は「操作」なので、タブでなく案件一覧のナビゲーションバー右の「+」（権限があるときだけ）。`/m/cases/new` は「案件」タブの配下として扱う。
- 一覧の行・空状態の新規リンク・新規作成後の遷移は、すべて iPhone 版（`/m/cases/[id]`、`/m/cases/new`）。
- アカウント（`/m/account`）は暫定の最小版：ログイン中のユーザー（useSession）、ログアウト（signOut）、デモの終了（exitDemo）、言語・明暗の切り替え（PC 版と同じ LanguageSwitcher / ThemeToggle）。認証の経路は新設しない。パスワード変更・メンバー管理は PC 版の `/account`（端末の振り分け対象外）へ移る。iPhone 版の本格的なアカウント・再設定の完了画面・メンバー管理の画面は、最後の PR で扱う（ログインは下の「ログイン」で追加済み）。
- 並び順は、絞り込みシートの中で選ぶ（ナビゲーションバーに並び替えの記号は置かない）。
- 絞り込みと並び替えは、検索欄の横のボタン 1 つで開くシート（下の「案件一覧を軽くする」）に集約した。
- 詳細の行は「項目名（左）・値（右。長いときは下の右寄せ）」（GroupedRow の `label` / `value`）。DOM の順は項目名、値で、VoiceOver も同じ順に読む。
- 戻るは、BackLink で「‹ ＋戻り先の画面名（案件）」に統一（詳細・新規とも）。読み上げ名は「案件へ戻る」。
- 検索欄は、フォーカス中だけ右に「キャンセル」を出す（入力を消してフォーカスを外す）。
- 初回の読み込み中は LoadingSpinner（reduced motion では静止）。詳細の「見つかりません」は、説明文と「案件一覧へ戻る」の行を出す。
- 一覧の行の内容は、下の「案件一覧を軽くする」を参照。
- 詳細の大見出しは案件名のままにする（案件名が、その画面の主題であるため。長い名前は折り返し、スクロールするとバー中央の小さな見出しに縮む）。
- 引いて更新（PullToRefresh）は、案件一覧（`/m/cases`）に付ける。`lib/store.ts` に追加した `refetch()`（読み込み済みのデータの取り直し。成功は true、失敗は false）を `onRefresh` に渡す。既存の関数（`ensureLoaded`・`resetStore` など）の挙動は変えず、PC 版は `refetch` を呼ばないので影響しない。未読み込みなら `ensureLoaded` と同じ。実行中の再取得があれば同じ Promise を返す（二重実行の防止。部品側も実行中は無視する）。取得前に直前までの保存を待ち、取得中に保存・削除・ログアウトがあれば古い結果を捨てる。失敗しても手元の一覧と権限は変えず、全体のエラー表示にも触れない。一覧が「更新できませんでした。表示は更新前のままです。」（role=alert）を出し、「更新しました」は出さない。動きを減らす設定では引き量を動かさず文字だけ。キーボード用の「再読み込み」ボタンは、フォーカス時に 44pt 以上で出る。テストは `tests/storeRefetch.test.ts`。初回の読み込みに失敗したときは、従来どおり「もう一度読み込む」ボタンで再試行する。

## 案件一覧を軽くする（Issue #456）
- 画面の上は、大見出し・件数の 1 行（「該当 N 件（全 M 件）」）・検索欄と絞り込みボタン・一覧だけ。要点カード（SummaryCards。参照がなくなったため削除）、状態のチップ、手続・条件のメニューは置かない。
- 行（`CaseRow`）：1 行目＝案件名（太字）と、右に状態（WorkflowBadge。図形と文字）。2 行目＝申請人氏名 ・ 手続の種類。**在留期限が 30 日以内（超過を含む。`caseMetrics` の within30 と同じ）のときだけ**、末尾に赤の図形つきで「あと N 日」「本日まで」「超過」（en/ko も同じ条件）を足す。在留期限の日付、期限の段階のバッジ、未受領書類のバッジは行に出さない。未受領書類は詳細の「必要書類」（受領 N / 必要 M と不足書類の一覧）で確認できる。固定の高さを持たず、文字を大きくすると折り返す。
- 絞り込みボタン（検索欄の右）：1 つのシート（`Sheet`＋`CaseFilterSheet`）を開く。指定中の数（状態・手続の「すべて」以外、条件の各項目、既定と違う並び順。検索語は数えない）を、ボタンの数字と読み上げ名「絞り込みと並び替え（N件を指定中）」で示す。
- シート：role="dialog"・aria-modal、「完了」・Escape・背景で閉じ、開いたら「完了」にフォーカス、閉じたら元のボタンへ戻す（`useDialogA11y`）。中身は GroupedList の行（状態／手続の種類／条件［期限30日以内・未受領書類・確認未了・申請前チェック未完了・在留カード未登録。複数選択］／並び順）。選ぶとすぐ一覧へ反映する（URL のクエリは従来と同じ）。選択中は aria-pressed とチェックの印。高さは固定せず、長いときや文字拡大時はシート内でスクロール（最大 90dvh）。
- 文言は区分 `mobile`（ja/en/ko。en/ko は下書きのまま）。使わなくなったキー（要点カード・チップ・メニュー・並び順の行）は削除した。`MenuButton` と `FilterChips` の部品は、一覧では使わなくなったが、他の画面で使えるよう残している（FilterChips の `nextSelection` はシートが使う）。
- テスト：`tests/mobileCaseList.test.tsx`（行・シート・文言）、`tests/mobileCases.test.tsx`（画面）。

## ログイン（/m/login）
- 見た目だけを iPhone 向けにし、認証は PC 版（`app/login/page.tsx`）と同じ関数・同じ経路を再利用する：`signIn`・`requestPasswordReset`・`startDemo`（`lib/auth.ts`）。Supabase を画面から直接呼ばない。エラー文も PC 版と同じ（`useAuthErrorText`。メールアドレスの登録の有無が推測できない文言）。
- 形は GroupedList の入力行（項目名を左、入力欄を右）。入力欄は 16px、行と押せる範囲は 44pt 以上。メール＝`autoComplete="username"`・`inputMode="email"`・`type="email"`、パスワード＝`autoComplete="current-password"`、どちらも自動大文字化・自動修正・スペルチェックなし。パスワードは「表示する」ボタンで切り替える。
- 「パスワードを忘れた場合」は同じ画面の再設定モード（`requestPasswordReset`）。再設定メールのリンク先 `/reset-password` は PC 版のまま。「デモを試す」は `startDemo` の後に `/m/cases` へ移る。
- 文言は `auth` 区分（PC 版と共通）と、`lib/i18n/messages/mobileLogin.ts`（区分 `mobileLogin`。読み上げ名と見出しのみ。英語・韓国語は下書き）。
- AuthGate の接続（必要最小限）：`/m/login` をログイン画面として扱う（未ログインでも移動させない）。**`/m` 配下で未ログインなら `/m/login` へ、ログイン済みで `/m/login` を開くと `/m/cases` へ**移す（`/m` 以外は従来どおり `/login`、`/`）。セッションの判定・Supabase の呼び出し・表示の条件は変えていない。ログアウト後・デモ終了後（`/m/account`）の行き先も `/m/login`。
- `/m/login` では下部タブを出さない（TabBar が `isMobileLoginPath` で非表示）。

## 文字を大きくしたとき（Issue #456 の後続）
OS の文字サイズや、ブラウザーの文字拡大（html の font-size 200% で擬似的に確認）でも、表示が崩れないようにする。
- 末尾の「PC 版を開く」は、タブバーに隠れない。タブバーは文字拡大で高くなるので、`.m-footer` の下余白は固定値でなく、`MobileShell` が `ResizeObserver` で実測してセットする `--m-tabbar-total`（safe-area を含む実高さ。`.m-root` の style）に追随する。測る前や JS が無いときは、標準の高さ（`--m-tabbar-h` ＋ safe-area）に戻る。
- GroupedRow の項目名は `min-w-0 max-w-full break-words`（`shrink-0` にしない）。長い項目名や拡大時は、切り詰めず折り返して全文を読める。`truncate`・`line-clamp` は使わない。
- 検索 input は `min-h-[44px]`（外枠と同じ高さ）。
- 確認方法：390 幅・iPhone の User-Agent・`html{font-size:200%}`・英語で、`/m/cases`、`/m/cases/new`、`/m/cases/[id]`、`/m/account` の最下部までスクロールし、「PC 版を開く」の下端がタブバーの上端より上にあること、詳細の項目名が右端で切れないことを見る。回帰テストは tests/mobileParts.test.tsx。

## 書類（/m/cases/[id]/documents）
- PC 版の「書類の生成と履歴」と同じ経路（`lib/documents/store.ts` の `useGeneratedDocuments` / `generateDocuments`、`precheckRowsText`、`splitHistory`）を使う。文言は `documents` 区分を共用し、iPhone 版だけの語は `mobileDocuments` 区分。
- 載せたもの：データ状態（閲覧）、出力内容の選択と生成（公式様式を除く）、生成履歴（保管済みの表示切り替え）。案件詳細の「書類の作成と履歴」から入る。
- PC 版へ任せるもの：公式申請様式（エクセル）の生成、書類の内容の表示、Word・PDF などの出力、状態の変更、保管（`/cases/[id]/documents`。端末の振り分け対象外）。

## アカウント本格版（/m/account）
- Supabase 接続時（デモ以外）に、`components/MobileAccount.tsx`（`MobileAccountDetails`）を最初の一覧（ユーザー・ログアウト）の下に出す。PC 版 `app/account/page.tsx` と同じ関数を使う：`getAccount`・`listAudit`・`renameOrganization`（lib/store.ts）、`changePassword`（lib/auth.ts）。DB の変更は無い。デモ・仮データ方式は従来どおり説明のみ。
- 載せたもの：最終ログイン、事務所名と役割、事務所名の変更（所有者のみ。他は入力と保存が無効で、理由を一覧の下に出す）、パスワード変更（current-password / new-password、メールは隠し欄 username）、監査ログ（直近100件。操作名と、日時・案件名）。ユーザー ID は iPhone 版では出さない。
- ユーザー ID と氏名（上の「ユーザー ID は出さない」を改める）：ログイン中（Supabase 接続・デモ以外）は、最初の一覧を `components/MobileAccountIdentity.tsx` が出す。氏名・メール・ユーザー ID・ログアウトの順。
  - 氏名は Supabase Auth の `user_metadata.full_name` に保存する（`lib/auth.ts` の `updateFullName`、読み取りと検査は `lib/accountName.ts`）。データベースの表・RPC・マイグレーションは変えない。保存後は `onAuthStateChange`（USER_UPDATED）で画面が更新される。
  - 未登録のときは、注意の図形＋「氏名が未登録です」＋「登録」の行と、一覧の下の案内文を出す。登録済みなら「氏名 ○○　編集」。どちらも行を押すと、モーダルシート（左「キャンセル」・中央に題・右「完了」。ボタンは 44pt 以上、入力は 16px、シート内でスクロール）が開く。検査は、空・制御文字・100 文字超を弾く。変更が無ければ保存せず閉じる。
  - ユーザー ID は長いので、`break-all` で折り返して全文を出し、「ユーザーIDをコピー」の行（クリップボード。成功は図形＋文字、失敗は長押しの案内）を付ける。実際の氏名・メール・ID は、コード・テスト・docs に書かない（テストは架空の値）。
  - デモ・仮データ方式は従来のまま（氏名・ID の行を出さない）。PC 版は変更しない。文言は `mobileAccount` 区分（英語・韓国語は下書き）。テストは `tests/accountName.test.ts`・`tests/mobileAccountIdentity.test.tsx`。
- メンバー管理は別の PR。`MobileAccountDetails` 内の「メンバー管理の差し込み位置」に GroupedList を足す。それまで、PC 版への行はメンバー管理のみ案内する。
- 文言は `account` 区分を共用。`mobile.accountDesktop` / `accountDesktopNote` はメンバー管理のみの案内に変更。テストは `tests/mobileAccountDetails.test.tsx`。

## 残り
- 「PC 版を開く」は、各画面の末尾にある（Cookie をセットして `/` へ移る）。
- themeColor は OS の明暗に従う。画面内の「表示」切り替えには追随しない。
- iPhone 版のアカウント（本格版）・再設定の完了画面（`/reset-password`）・メンバー管理（上記のとおり最後の PR）。

## PC 版から iPhone 版への自動の振り分け（proxy.ts）
Next.js 16 の proxy（旧 Middleware。`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`）で確認した要点：ルート直下の `proxy.ts` が `proxy` 関数を export する。既定の実行環境は Node.js で、`runtime` は指定できない。`matcher` が無いと静的ファイルを含む全リクエストで動くので、対象を限る。matcher は定数でなければならない。RSC のリクエストでは `rsc`・`next-router-prefetch` などの内部ヘッダーは proxy から見えず、HTML と同じ判定になる。

### 仕様
- iPhone の User-Agent（`iPhone` を含む。512 文字を超える値と `Android` 併記は偽装らしいので対象外）で、下の PC 版の画面を開くと、`/m` の対応画面へ 307 で移す。iPad・PC・Android・UA 無しは対象外。
- 対応表（`/cases/<id>` 以外は完全一致。末尾のスラッシュは無視。照会文字列は引き継がない）：

| PC 版 | 移動先 |
| --- | --- |
| `/`、`/cases` | `/m/cases` |
| `/cases/new` | `/m/cases/new` |
| `/cases/<id>`（id は英数字・`-`・`_` の 1〜64 文字） | `/m/cases/<id>` |

- 上記以外（`/cases/<id>/…` の下位パス（edit など）、書類、`/account`、`/login`、`/reset-password`、`/about`、`/api`）は振り分けない。iPhone 版に対応画面が無い、または認証・API であるため。`/cases/new` は予約語として `/m/cases/new` に固定し、id とは扱わない。id の形に合わない値（`.`・`%`・空白・65 文字以上など）は振り分けない。
- `proxy.ts` は認証をしない。リダイレクトのみ。`/m` の画面は従来どおり `AuthGate` の内側にあり、未ログインなら `/login` へ移る。
- GET と HEAD のみ。POST（Server Function など）は触らない。
- 判定は `lib/deviceRedirect.ts`（純粋関数）、テストは `tests/deviceRedirect.test.ts`。

### 無限ループの防止
- matcher は `/`、`/cases`、`/cases/new`、`/cases/:id`（1 階層のみ）の 4 つ。`/m` 配下、`/_next`、静的ファイル、`/api`、favicon は対象に入らない。
- さらに、判定関数が対応表の完全一致と id の形の検証でのみ動く。行き先は固定値、または検証済みの id を足した `/m/cases/<id>` で、移動先（`/m/...`）は決して対象にならない。

### PC 版を選ぶ・iPhone 版へ戻る
- iPhone 版の「PC 版を開く」を押すと、Cookie `view=pc` をセットして `/` へ移る（`Link` の `prefetch={false}`。先読みが振り分け結果を残さないため）。`view=pc` があれば振り分けない。
- Cookie の属性：`path=/`（全画面で効かせる）、`SameSite=Lax`（外部サイトから来た最初の GET でも読める。CSRF の対象ではない表示の好み）、`Secure` は https のときのみ（開発の http でも動かすため）、`HttpOnly` なし（画面側で書き換えるため。秘密を入れないので問題ない）、`Max-Age` は 1 年（好みの記憶であり、長すぎると戻し忘れるため自然に失効させる）。値は `pc` のみで、個人情報は入れない。
- 戻る導線：iPhone の User-Agent のときだけ、PC 版のフッターに「iPhone 版を開く」を出す（`components/OpenMobileLink.tsx`。PC・iPad には出ない）。押すと Cookie を消して `/m/cases` へ移る。PC 版のヘッダーは変えない。

### キャッシュ・安全性
- 行き先は固定の対応表、または形を検証した id（英数字・`-`・`_`）を `/m/cases/` に足したパスのみで、Host・照会文字列を連結しないため、オープンリダイレクトは起きない。
- 振り分けの応答は `Cache-Control: private, no-store` と `Vary: User-Agent, Cookie`。振り分けない応答（PC 版の静的な画面）は端末によらず同じ内容なので `Vary` は付けない（付けても静的ページの配信には反映されないことを `next start` で確認した）。
- 307（一時的）にして、ブラウザーが恒久的に覚えないようにする。

### 未対応
- 書類などの振り分け（iPhone 版に対応画面ができてから対応表に足す）。
- iPad の振り分け、PC 版の照会文字列の引き継ぎ。

## パスワード再設定の完了（/m/reset-password）
- `app/m/reset-password/page.tsx`：新しいパスワード・確認の入力行（`InputRow` を `components/mobile/InputRow.tsx` に切り出し、ログインと共用）。認証は PC 版（`app/reset-password/page.tsx`）と同じ `useSessionState` / `setNewPassword`。判定の順序（Supabase 無効、確認中、セッション無し＝リンク無効の案内、入力）とエラー文も同じ。成功後は `/m/cases`（PC 版は `/`）。
- 再設定メールのリンク先は PC 版の `/reset-password` のまま（`lib/auth.ts` の `redirectTo` は変えていない）。`proxy.ts` の振り分けにも足していない。このため現状は、iPhone でメールのリンクを開くと PC 版の画面が開く。リンク先を `/m/reset-password` に変えるかは別途の判断（変えると、PC のブラウザーで開いたときの行き先と、Supabase の Redirect URLs の許可リストに影響する）。
- `AuthGate`：`/m/reset-password` は未ログインでも移動させない（PC 版と同じ扱い）。この画面には下部タブを出さない（`isMobileAuthPath`）。
- 文言は `auth` 区分を共用し、iPhone 版だけの読み上げ名は `mobileReset` 区分（ja/en/ko。en/ko は下書き）。
