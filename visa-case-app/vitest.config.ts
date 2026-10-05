import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // 画面コンポーネントを描画するテスト（tests/*.tsx）で、@/ の別名と JSX を解決する
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve(__dirname) } },
  // 公式様式（エクセル）の差し込みテストは、テンプレートの読み込みに 1 件あたり約 1.0〜1.5 秒かかる。
  // 同時実行の多い環境（CI・負荷のあるクラウド環境）では既定の 5 秒を超えて失敗するため、30 秒にする（Issue #176）。
  // 全体に適用するのは、他のテストにも遅い環境で同じ問題が起きうるため。本当に止まっているテストは 30 秒でも検出できる。
  test: { testTimeout: 30_000 },
});
