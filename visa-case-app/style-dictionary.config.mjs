// デザイントークンの生成設定（段階0）。正本は tokens/*.tokens.json（W3C DTCG 形式）。
// 出力は tokens/build/ に置いてコミットする。実際の書き出しは tokens/lib.mjs の関数に任せ、
// 回帰テスト（tests/designTokens.test.ts）と同じ読み取り処理を使う。
import StyleDictionary from "style-dictionary";
import { generateCss, generateSwift, TOKEN_FILES, EXT_KEY } from "./tokens/lib.mjs";

const toEntries = (dictionary) =>
  dictionary.allTokens.map((t) => {
    const ext = t.original.$extensions?.[EXT_KEY] ?? {};
    return {
      path: t.path,
      type: t.$type ?? t.original.$type,
      value: t.original.$value,
      dark: ext.dark,
      platforms: ext.platforms,
      legacyAlias: ext.legacyAlias === true,
    };
  });

StyleDictionary.registerFormat({
  name: "app/css",
  format: ({ dictionary }) => generateCss(toEntries(dictionary)),
});
StyleDictionary.registerFormat({
  name: "app/swift",
  format: ({ dictionary }) => generateSwift(toEntries(dictionary)),
});

// 名前の衝突（slate.50 と blue.50 など）を避けるため、名前は経路全体にする。出力は経路から自前で作る。
StyleDictionary.registerTransform({
  name: "name/app-path",
  type: "name",
  transform: (token) => token.path.join("-"),
});

const config = {
  source: TOKEN_FILES.map((f) => `tokens/${f}`),
  platforms: {
    css: {
      transforms: ["name/app-path"],
      buildPath: "tokens/build/",
      files: [{ destination: "tokens.generated.css", format: "app/css" }],
    },
    swift: {
      transforms: ["name/app-path"],
      buildPath: "tokens/build/",
      files: [{ destination: "DesignTokens.swift", format: "app/swift" }],
    },
  },
};

export default config;
