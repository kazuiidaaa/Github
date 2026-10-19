import { describe, expect, it } from "vitest";
import { requirementNameCell } from "../lib/documents/clientGuide";
import { REQUIREMENT_NAME_TRANSLATIONS, translatedRequirementName } from "../lib/documents/clientGuideNames";
import { LEGACY_REQUIREMENT_NAME_TRANSLATIONS } from "../lib/documents/clientGuideLegacyNames";
import { CLIENT_GUIDE_TEXTS } from "../lib/documents/clientGuideText";
import { HSP_EVIDENCE } from "../lib/hspPoints";
import { RULE_SETS, hspEvidenceRule } from "../lib/requirements/rules";

// Issue #369：書類の名称を変えたあとも、古い名称のまま保存された案内書類に訳が付くこと
const OTHER = ["en", "ko"] as const;
const LEGACY_NAMES = Object.keys(LEGACY_REQUIREMENT_NAME_TRANSLATIONS);

const currentRuleNames = new Set<string>([
  ...RULE_SETS.flatMap((s) => s.rules.map((r) => r.name)),
  ...Object.keys(HSP_EVIDENCE).map((m) => hspEvidenceRule(m).name),
]);

describe("古い名称の訳（別表）", () => {
  it("古い名称の書類は、英語・韓国語で「訳文（原文）」になる（訳なしの目印は付かない）", () => {
    expect(LEGACY_NAMES.length).toBe(18);
    for (const name of LEGACY_NAMES) {
      for (const lang of OTHER) {
        const cell = requirementNameCell("passport_card", name, lang);
        const [en, ko] = LEGACY_REQUIREMENT_NAME_TRANSLATIONS[name];
        expect(cell).toEqual({ text: `${lang === "en" ? en : ko}（${name}）`, untranslated: false });
        expect(cell.text).not.toContain(CLIENT_GUIDE_TEXTS[lang].untranslatedMark);
      }
      expect(requirementNameCell("passport_card", name, "ja")).toEqual({ text: name, untranslated: false });
    }
  });

  it("規則の id が今は無い書類（技人国・更新の事業内容・経営状況の資料。3つに分けた元の id）も、訳が付く", () => {
    const name = "勤務先の事業内容・経営状況を明らかにする資料（決算文書の写し等）";
    expect(LEGACY_NAMES).toContain(name);
    for (const lang of OTHER) {
      const cell = requirementNameCell("business_materials", name, lang);
      expect(cell.untranslated).toBe(false);
      expect(cell.text.endsWith(`（${name}）`)).toBe(true);
      expect(cell.text).not.toBe(name);
    }
  });

  it("行政書士が追加した書類（規則の id がなく、古い名称でもない）は、これまでどおり原文のまま", () => {
    for (const lang of OTHER) expect(requirementNameCell("custom-1", "追加した書類", lang)).toEqual({ text: "追加した書類", untranslated: false });
  });

  it("別表の名称は、現在の書類名・現在の訳表と重複しない（現在の訳が、古い訳に隠れない）", () => {
    for (const name of LEGACY_NAMES) {
      expect(currentRuleNames.has(name), `現在の規則に同じ名称がある：${name}`).toBe(false);
      expect(REQUIREMENT_NAME_TRANSLATIONS[name], `現在の訳表に同じ名称がある：${name}`).toBeUndefined();
    }
  });

  it("別表の訳は、空でなく、書類名と同じでもない", () => {
    for (const [name, [en, ko]] of Object.entries(LEGACY_REQUIREMENT_NAME_TRANSLATIONS)) {
      for (const t of [en, ko]) {
        expect(t.length).toBeGreaterThan(0);
        expect(t).not.toBe(name);
      }
    }
  });

  it("納期の特例：旧い名称（申請書の写し）にも、新しい名称（承認を受けていることを明らかにする資料）にも、別々の訳がある", () => {
    const oldName = "源泉所得税の納期の特例の承認に関する申請書の写し";
    const newName = "源泉所得税の納期の特例の承認を受けていることを明らかにする資料";
    for (const lang of OTHER) {
      const o = translatedRequirementName(oldName, lang);
      const n = translatedRequirementName(newName, lang);
      expect(o).toBeTruthy();
      expect(n).toBeTruthy();
      expect(o).not.toBe(n);
    }
  });
});
