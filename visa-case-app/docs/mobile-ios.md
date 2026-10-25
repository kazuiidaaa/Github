# iPhone 版（/m）の方針（Issue #456）

iPhone 向けに、SwiftUI の見た目（TabView、大見出しの NavigationStack、.searchable、insetGrouped の List、Menu、チップ）の画面を、別パス `/m` 配下に置く。PC 版の見た目・動作は変えない。

## 別パス /m 配下にした根拠（案 A）
Next.js 16 の資料（`node_modules/next/dist/docs/01-app/`）で確認した要点。
- ルートの `app/layout.tsx` は 1 つ。route group（`(pc)/` など）で root layout を分けると、**別の root layout 間の移動は full page load になる**（route-groups.md）。PC 版と iPhone 版の行き来が毎回全読み込みになる。
- route group で layout を共有せずに分ける方法は、PC 側のページ・フォルダーの移動を伴い、差分が大きく、PC 版への影響の確認が重い。
- layout は画面遷移で再描画されず、pathname も受け取れない（layout.md）。パスで枠を出し分けるには、`usePathname` を読む client コンポーネントを使う。
- `viewport` / `generateViewport`（`viewportFit: "cover"`、`themeColor`）は、layout または page から export でき、**入れ子の layout にも置ける**（generate-viewport.md）。`/m` の layout にだけ置けば、PC 版の `<head>` は変わらない。
- Next.js 16 では、Middleware は **Proxy**（`proxy.ts`）に改名された（proxy.md）。このアプリには `proxy.ts` が無く、認証は `AuthGate`（client）が担う。端末で自動的に振り分ける仕組みは、今回は作らない。

## 外枠の出し分け
- `components/AppFrame.tsx`（client）を `app/layout.tsx` に置く。`ToastProvider` > `LanguageProvider` > `AppFrame` の順は従来どおり。
- `/m` と `/m/…` 以外では、従来と同じ要素（Header、max-w-6xl の main、AuthGate、StoreErrorBanner、PageTransition、Footer）を同じ順序で出す。PC 版の出力は変わらない。
- `/m` 配下では、Header・Footer・max-w-6xl の main・PageTransition を出さず、`AuthGate` と `StoreErrorBanner` の内側に `app/m/layout.tsx` の枠（`MobileShell`）を置く。
- **`/m` の画面も、必ず `AuthGate` の内側に入る。** 未ログインで開くと `/login` へ移る（tests/appFrame.test.tsx、実機の確認は PR に記載）。認証・API・データ取得の経路は新設しない。データの読み書きは `lib/store.ts` を通す（保護は Supabase の RLS）。

## 構成
- `app/m/layout.tsx`：viewport（viewport-fit=cover、明暗の themeColor）、`MobileShell`。
- `app/m/page.tsx`：`/m` は `/m/cases` へ移す。
- `app/m/mobile.css`：safe-area、チップ・検索欄・区切り線。すべて `.m-root` 配下に限定。
- `components/mobile/`：TabBar、LargeTitleHeader、SearchField、FilterChips、GroupedList / GroupedRow、MenuButton、PullToRefresh、MobileShell、paths（パス判定）。案件の型や store に依存しない。props は各ファイルの日本語コメントを参照。
- 文言：`lib/i18n/messages/mobile.ts`（区分 `mobile`。日本語・英語・韓国語。英語・韓国語は他の区分と同じく下書き扱い）。

## 規則
- 色は globals.css の変数（`bg-white`、`slate`、`accent` など）だけを使い、明暗はそちらに任せる。状態は色だけでなく文字と図形（選択中のチップ＝チェックの印、タブ＝塗りつぶしアイコン、メニュー＝チェック）で示す。
- 押せる範囲は 44pt 以上。入力欄の文字は 16px 以上。
- 動き：PullToRefresh は、動きを減らす設定では内容を動かさない（文字の状態表示のみ）。メニューの表示は `motion-panel`（globals.css の規則に従う）。
- 絵文字は使わない。アイコンは SVG の線画（選択中は塗りつぶし）。

## 最初の PR の範囲と、残り
- 下部タブの「アカウント」は、既存の `/account`（PC 版の画面）へ移る。iPhone 版のアカウント・ログイン・再設定・メンバー管理の画面は、最後の PR で扱う。
- 「PC 版を開く」は、各画面の末尾（`/`）にある。PC から /m への案内や、端末による自動の振り分けは未対応。
- themeColor は OS の明暗に従う。画面内の「表示」切り替えには追随しない。
