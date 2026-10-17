import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT } from "../../types";
import { fillOfficialExcel } from "./index";
import { COE_PURPOSE_CHECKBOXES, COE_SHEET_APPLICANT_1 as S1, coePurposeStatus } from "./coeMapping";
import { sheetKey } from "./renewalMapping";
import { tokuteiKatsudoWarnings } from "./tokuteiKatsudo";

// 特定活動（研究活動等。告示36号）の案件の、様式Nの差し込み（Issue #299）。値はすべてダミー。
const applicant = { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", confirmationStatus: "confirmed" as const };
const formWith = (over: Partial<FormDetails>): FormDetails => ({ ...EMPTY_FORM_DETAILS, ...over });
const WARN_ROOM = "「4 研究室」";
const WARN_OCC = "職種の番号は、特定活動（特定研究等活動・告示36号）では";

async function cellText(buffer: Buffer, cell: string): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets.find((s) => sheetKey(s.name) === sheetKey(S1));
  if (!ws) throw new Error("no sheet");
  const v = ws.getCell(cell).value;
  return String(typeof v === "object" && v !== null && "richText" in v ? v.richText.map((r) => r.text).join("") : (v ?? "")).trim();
}

describe("入国目的（11）：特定活動（研究活動等）の□（M43）", () => {
  const fill = (targetStatus: string, tokuteiKatsudoType: FormDetails["tokuteiKatsudoType"]) =>
    fillOfficialExcel({
      procedureType: "coe",
      currentStatus: "",
      applicant,
      employment: EMPTY_EMPLOYMENT,
      formDetails: formWith({ tokuteiKatsudoType }),
      targetStatus,
    });

  it("希望する在留資格が特定活動で、種別が tokuteiKenkyu なら、M43 を■にし、一致しない旨の警告は出さない", async () => {
    const { buffer, warnings } = await fill("特定活動", "tokuteiKenkyu");
    expect(await cellText(buffer, "M43")).toBe("■");
    expect(warnings.join("\n")).not.toContain("様式の選択肢と一致しない");
    // 選ばれなかったほかの特定活動の□は、そのまま
    expect(await cellText(buffer, COE_PURPOSE_CHECKBOXES["特定活動（本邦大学卒業者）"])).toBe("□");
  });

  it.each(["", "other"] as const)("種別が「%s」のときは、M43 を■にせず、一致しない旨の警告を出す", async (type) => {
    const { buffer, warnings } = await fill("特定活動", type);
    expect(await cellText(buffer, "M43")).toBe("□");
    expect(warnings.join("\n")).toContain("入国目的（特定活動）は、様式の選択肢と一致しないため");
  });

  it("希望する在留資格が特定活動で、種別が tokuteiJoho（告示37号）なら、様式Nの職種一覧の注記が36号と同じ扱いのため、M43 を■にし、警告は出さない", async () => {
    const { buffer, warnings } = await fill("特定活動", "tokuteiJoho");
    expect(await cellText(buffer, "M43")).toBe("■");
    expect(warnings.join("\n")).not.toContain("様式の選択肢と一致しない");
  });

  it("希望する在留資格が特定活動で、種別が daigakuSotsugyo なら、AD43（特定活動（本邦大学卒業者））を■にし、研究活動等の M43 は□のまま。警告は出さない", async () => {
    const { buffer, warnings } = await fill("特定活動", "daigakuSotsugyo");
    expect(await cellText(buffer, "AD43")).toBe("■");
    expect(await cellText(buffer, "M43")).toBe("□");
    expect(warnings.join("\n")).not.toContain("様式の選択肢と一致しない");
    expect(coePurposeStatus("特定活動", "daigakuSotsugyo")).toBe("特定活動（本邦大学卒業者）");
  });

  it("特定活動ではない在留資格には、種別が残っていても影響しない", async () => {
    const { buffer } = await fill("技術・人文知識・国際業務", "tokuteiKenkyu");
    expect(await cellText(buffer, "M43")).toBe("□");
    expect(await cellText(buffer, COE_PURPOSE_CHECKBOXES["技術・人文知識・国際業務"])).toBe("■");
  });

  it("様式の選択肢と一字一句一致する表記は、今までどおり■になる（種別によらない）", async () => {
    const { buffer } = await fill("特定活動（研究活動等）", "");
    expect(await cellText(buffer, "M43")).toBe("■");
    expect(coePurposeStatus("特定活動（本邦大学卒業者）", "tokuteiKenkyu")).toBe("特定活動（本邦大学卒業者）");
  });
});

describe("特定活動（研究活動等）の注意（研究室・職種）", () => {
  it("特定研究等活動のときは、研究室の欄を差し込めない旨を出す。そうでなければ出さない", () => {
    expect(tokuteiKatsudoWarnings(true, { occupationCode: "" }).join("\n")).toContain(WARN_ROOM);
    expect(tokuteiKatsudoWarnings(false, { occupationCode: "1" })).toEqual([]);
  });

  it.each(["12", "42", "43", "44", "999"])("職種の番号 %s は、一覧の範囲内なので警告しない", (code) => {
    expect(tokuteiKatsudoWarnings(true, { occupationCode: code }).join("\n")).not.toContain(WARN_OCC);
  });

  it.each(["3", "11", "45", "1"])("職種の番号 %s は、一覧の範囲外なので警告する", (code) => {
    expect(tokuteiKatsudoWarnings(true, { occupationCode: code }).join("\n")).toContain(WARN_OCC);
  });

  it("未入力・番号ではない職種は、職種の範囲の警告を出さない（番号ではない旨は各様式の警告が出す）", () => {
    for (const code of ["", "研究者"]) expect(tokuteiKatsudoWarnings(true, { occupationCode: code }).join("\n")).not.toContain(WARN_OCC);
  });

  it.each([
    ["coe", "", "特定活動"],
    ["change", "留学", "特定活動"],
    ["renewal", "特定活動", ""],
  ] as const)("認定・変更・更新（%s）の差し込み結果に、種別が tokuteiKenkyu のときだけ研究室の注意が付く", async (procedureType, currentStatus, targetStatus) => {
    const base = { procedureType, currentStatus, applicant: { ...applicant, residenceStatus: procedureType === "renewal" ? "特定活動" : "" }, employment: EMPTY_EMPLOYMENT, targetStatus };
    const yes = await fillOfficialExcel({ ...base, formDetails: formWith({ tokuteiKatsudoType: "tokuteiKenkyu", occupationCode: "3" }) });
    expect(yes.warnings.join("\n")).toContain(WARN_ROOM);
    expect(yes.warnings.join("\n")).toContain(WARN_OCC);
    for (const type of ["", "other"] as const) {
      const no = await fillOfficialExcel({ ...base, formDetails: formWith({ tokuteiKatsudoType: type, occupationCode: "3" }) });
      expect(no.warnings.join("\n"), type).not.toContain(WARN_ROOM);
    }
  });
});

describe("特定活動（本邦大学卒業者。告示46号）の注意（職種）", () => {
  const WARN_DAIGAKU = "職種の番号は、特定活動（本邦大学卒業者・告示46号）では";
  const daigaku = (occupationCode: string) => ({ occupationCode, tokuteiKatsudoType: "daigakuSotsugyo" as const });

  it("研究室の注意（告示36号の項目）は出さない", () => {
    expect(tokuteiKatsudoWarnings(true, daigaku("")).join("\n")).not.toContain(WARN_ROOM);
  });

  it.each(["2", "4", "10", "18", "24", "31", "51", "54", "999"])("職種の番号 %s は、一覧（2、4〜18、24〜31、51〜54、999）の範囲内なので警告しない", (code) => {
    expect(tokuteiKatsudoWarnings(true, daigaku(code))).toEqual([]);
  });

  it.each(["1", "3", "19", "23", "32", "50", "55", "12x", "12"])("職種の番号 %s は、範囲外または番号ではない（12 は範囲内）", (code) => {
    const warned = tokuteiKatsudoWarnings(true, daigaku(code)).join("\n").includes(WARN_DAIGAKU);
    expect(warned).toBe(["1", "3", "19", "23", "32", "50", "55"].includes(code));
  });

  it("告示36号の職種の番号（42〜44）は、本邦大学卒業者では範囲外", () => {
    expect(tokuteiKatsudoWarnings(true, daigaku("42")).join("\n")).toContain(WARN_DAIGAKU);
  });

  it.each([
    ["coe", "", "特定活動"],
    ["change", "留学", "特定活動"],
    ["renewal", "特定活動", ""],
  ] as const)("認定・変更・更新（%s）の差し込み結果に、種別が daigakuSotsugyo のとき職種の注意だけが付く", async (procedureType, currentStatus, targetStatus) => {
    const base = { procedureType, currentStatus, applicant: { ...applicant, residenceStatus: procedureType === "renewal" ? "特定活動" : "" }, employment: EMPTY_EMPLOYMENT, targetStatus };
    const r = await fillOfficialExcel({ ...base, formDetails: formWith({ tokuteiKatsudoType: "daigakuSotsugyo", occupationCode: "3" }) });
    expect(r.warnings.join("\n")).toContain(WARN_DAIGAKU);
    expect(r.warnings.join("\n")).not.toContain(WARN_ROOM);
    const ok = await fillOfficialExcel({ ...base, formDetails: formWith({ tokuteiKatsudoType: "daigakuSotsugyo", occupationCode: "10" }) });
    expect(ok.warnings.join("\n")).not.toContain(WARN_DAIGAKU);
  });
});

describe("特定活動（特定情報処理活動。告示37号）の注意（職種）", () => {
  const joho = (occupationCode: string) => ({ occupationCode, tokuteiKatsudoType: "tokuteiJoho" as const });
  const WARN_JOHO = "職種の番号は、特定活動（特定情報処理活動・告示37号）では";

  it("研究室の欄（告示36号の項目）の注意は出さない", () => {
    expect(tokuteiKatsudoWarnings(true, joho("")).join("\n")).not.toContain(WARN_ROOM);
  });

  it.each(["12", "42", "43", "44", "999"])("職種の番号 %s は、一覧の範囲内なので警告しない", (code) => {
    expect(tokuteiKatsudoWarnings(true, joho(code))).toEqual([]);
  });

  it.each(["3", "11", "45", "1"])("職種の番号 %s は、一覧の範囲外なので、告示37号の文面で警告する（告示36号の文面は出さない）", (code) => {
    const text = tokuteiKatsudoWarnings(true, joho(code)).join("\n");
    expect(text).toContain(WARN_JOHO);
    expect(text).not.toContain(WARN_OCC);
  });

  it("様式Nの対象でない案件には、注意を付けない", () => {
    expect(tokuteiKatsudoWarnings(false, joho("3"))).toEqual([]);
  });
});
