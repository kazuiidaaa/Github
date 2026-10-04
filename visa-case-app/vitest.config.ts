import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // 画面コンポーネントを描画するテスト（tests/*.tsx）で、@/ の別名と JSX を解決する
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
