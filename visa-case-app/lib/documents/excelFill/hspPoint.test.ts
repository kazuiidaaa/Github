import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../../formDetails";
import { HSP_EVIDENCE, HSP_POINT_SHEETS, estimateHspPoints, evidenceNumbers, hspPointConfirmLines, pointCheckId, resolveHspPointSheet, sanitizePointChecks, type HspPointSheetKey } from "../../hspPoints";
import { HSP_POINT_TEMPLATE_PATH, fillHspPointExcel } from "./hspPoint";
import { sheetKey } from "./renewalMapping";

// 値はすべてダミー。実案件の個人情報は書かない。

async function open(buffer: Buffer | string) {
  const wb = new ExcelJS.Workbook();
  if (typeof buffer === "string") await wb.xlsx.readFile(buffer);
  else await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}
const sheetOf = (wb: ExcelJS.Workbook, name: string) => wb.worksheets.find((s) => sheetKey(s.name) === sheetKey(name));
const checks = (sheet: HspPointSheetKey, rows: number[]) => rows.map((r) => pointCheckId(sheet, r));

describe("ポイント計算表の行の定義とテンプレートの整合", () => {
  it("すべての行が、実在するシートのチェック欄（AF列のロック解除セル。例外は col で指定）を指す", async () => {
    const wb = await open(HSP_POINT_TEMPLATE_PATH);
    for (const [key, def] of Object.entries(HSP_POINT_SHEETS)) {
      const ws = sheetOf(wb, def.sheetName);
      expect(ws, key).toBeDefined();
      for (const r of def.rows) {
        const c = ws!.getCell(`${r.col ?? "AF"}${r.row}`);
        if (r.blankInTemplate) {
          // ラジオボタン（フォーム部品）で選ぶ欄。セルは空で、ロック解除されている
          expect(c.protection?.locked, `${key}:${r.row} ${r.label}`).toBe(false);
          expect(String(c.value ?? ""), `${key}:${r.row} ${r.label}`).toBe("");
        } else if (r.col) {
          // ロック済みの「□」（B の投資運用業等）。差し込みは、ロックと無関係に値を書く
          expect(String(c.value), `${key}:${r.row} ${r.label}`).toBe("□");
        } else {
          expect(c.protection?.locked, `${key}:${r.row} ${r.label}`).toBe(false);
          expect(String(c.value), `${key}:${r.row} ${r.label}`).toBe("□");
        }
      }
    }
  });

  it("定義に漏れがない（シートのロック解除された□のうち、AF列のものがすべて含まれる）", async () => {
    const wb = await open(HSP_POINT_TEMPLATE_PATH);
    for (const [key, def] of Object.entries(HSP_POINT_SHEETS)) {
      const ws = sheetOf(wb, def.sheetName)!;
      const rows = new Set(def.rows.map((r) => r.row));
      ws.eachRow((row) => {
        const c = row.getCell("AF");
        if (c.isMerged && c.master.address !== c.address) return; // 結合セルの2行目以降は、左上と同じ値を返す
        if (c.protection?.locked === false && String(c.value) === "□") expect(rows.has(row.number), `${key}:${row.number}`).toBe(true);
      });
    }
  });

  it("疎明資料の番号は、様式に印字された番号（①〜㉑）の範囲である", () => {
    for (const def of Object.values(HSP_POINT_SHEETS)) {
      for (const r of def.rows) expect(r.evidence).toMatch(/^([①-㉑]( [①-㉑])*)?$/);
    }
  });
});

describe("疎明資料の番号", () => {
  it("各行の番号は、様式のAL列（結合セルの範囲を含む）の番号と一致する。「直前の行と共通」ではない（⑮・⑰は、直前の⑭・⑯と異なる）", async () => {
    const wb = await open(HSP_POINT_TEMPLATE_PATH);
    for (const [key, def] of Object.entries(HSP_POINT_SHEETS)) {
      const ws = sheetOf(wb, def.sheetName)!;
      for (const r of def.rows) {
        // 結合セルは、範囲内のどの行でも、左上のセルの値を返す
        const sheetValue = String(ws.getCell(`AL${r.row}`).value ?? "").replace(/\s+/g, " ").trim();
        expect(r.evidence, `${key}:${r.row} ${r.label}`).toBe(sheetValue);
      }
    }
  });

  it("番号の記載がない行は、年齢のみ", () => {
    for (const def of Object.values(HSP_POINT_SHEETS)) {
      expect(def.rows.filter((r) => r.evidence === "").map((r) => r.section)).toEqual(def.rows.filter((r) => r.section === "年齢").map((r) => r.section));
    }
  });

  it("行に出る番号は、すべて、番号の表（①〜㉑）にある", () => {
    for (const def of Object.values(HSP_POINT_SHEETS)) {
      for (const r of def.rows) for (const m of r.evidence.split(" ").filter(Boolean)) expect(HSP_EVIDENCE[m], `${r.label} ${m}`).toBeDefined();
    }
    expect(Object.keys(HSP_EVIDENCE)).toHaveLength(21);
  });

  it("選んだ項目から、番号順・重複なしで導く。日本語能力は⑮、指定の大学は⑰、中小企業者の研究費は⑩⑫", () => {
    // A：修士(①)・職歴(②)・年収(③)・日本語能力Ⅰ(⑮)・指定の大学Ⅰ(⑰)・中小企業者の研究費(⑩⑫)・年齢（番号なし）
    expect(evidenceNumbers("A", checks("A", [15, 20, 24, 32, 51, 65, 73]))).toEqual(["①", "②", "③", "⑩", "⑫", "⑮", "⑰"]);
    // 同じ番号の項目を複数選んでも、1つ（学歴の2項目→①）
    expect(evidenceNumbers("A", checks("A", [14, 17]))).toEqual(["①"]);
    // C：取締役(⑳)・投資運用業等(㉑)・1億円以上の投資(⑲)
    expect(evidenceNumbers("C", checks("C", [33, 80, 81]))).toEqual(["⑲", "⑳", "㉑"]);
    expect(evidenceNumbers("B", [])).toEqual([]);
    expect(evidenceNumbers("B", checks("B", [35]))).toEqual([]);
  });
});

describe("使うシートの決定・目安の合計点", () => {
  it("号からシートを決める。2号・号が未選択は、案件で選ぶまで決まらない", () => {
    expect(resolveHspPointSheet("高度専門職（1号ロ）", "")).toEqual({ kind: "resolved", sheet: "B", fromGrade: true });
    expect(resolveHspPointSheet("高度専門職（2号）", "")).toEqual({ kind: "needs_choice" });
    expect(resolveHspPointSheet("高度専門職（2号）", "C")).toEqual({ kind: "resolved", sheet: "C", fromGrade: false });
    expect(resolveHspPointSheet("高度専門職", "A")).toEqual({ kind: "resolved", sheet: "A", fromGrade: false });
    expect(resolveHspPointSheet("技術・人文知識・国際業務", "A")).toEqual({ kind: "not_applicable" });
  });

  it("印字点数の単純合計を出し、70点の基準・択一の重複・点数のない項目を注意する", () => {
    // B（1号ロ）：修士20＋職歴10年以上20＋年収800〜900万円30
    const ok = estimateHspPoints("B", checks("B", [15, 20, 27]));
    expect(ok.total).toBe(70);
    expect(ok.reachesPass).toBe(true);
    expect(ok.notes).toEqual([]);
    const low = estimateHspPoints("B", checks("B", [15]));
    expect(low.reachesPass).toBe(false);
    expect(low.notes.join("\n")).toContain("年収が未選択");
    expect(estimateHspPoints("B", checks("B", [20, 21, 27])).notes.join("\n")).toContain("「職歴」は、1つだけ");
    const unscored = estimateHspPoints("B", checks("B", [27, 40]));
    expect(unscored.unscored.map((r) => r.row)).toEqual([40]);
    expect(unscored.notes.join("\n")).toContain("点数が印字されていない項目");
  });

  it("ダウンロード前の確認の文言：合計欄の書き込み有無・判定していない事項・行政書士の確認を含む", () => {
    const ok = hspPointConfirmLines(estimateHspPoints("B", checks("B", [15, 20, 27]))).join("\n");
    expect(ok).toContain("合計欄へ、選んだ項目の印字点数の単純合計 70 点を書き込みます");
    expect(ok).toContain("判定していません");
    expect(ok).toContain("行政書士が内容を確認してから使用");
    const dup = hspPointConfirmLines(estimateHspPoints("B", checks("B", [20, 21, 27]))).join("\n");
    expect(dup).toContain("合計欄は書き込みません");
    expect(dup).toContain("「職歴」は、1つだけ");
    expect(hspPointConfirmLines(estimateHspPoints("B", [])).join("\n")).toContain("合計欄は書き込みません");
  });

  it("保存値から、存在しないチェックと重複を除く", () => {
    expect(sanitizePointChecks(["B:20", "B:20", "B:999", "X:1", 5, null])).toEqual(["B:20"]);
    expect(sanitizePointChecks("B:20")).toEqual([]);
  });
});

describe("fillHspPointExcel", () => {
  it("選んだチェック欄だけが■になり、使わないシートは除かれる。合計欄には合計点を書き込む", async () => {
    const { buffer, warnings } = await fillHspPointExcel("高度専門職（1号ロ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("B", [15, 20, 27]) });
    const wb = await open(buffer);
    const names = wb.worksheets.map((w) => w.name);
    expect(names.some((n) => n.startsWith("B "))).toBe(true);
    expect(names.some((n) => n.startsWith("A ") || n.startsWith("C "))).toBe(false);
    expect(names.some((n) => n.includes("疎明資料"))).toBe(true);
    const ws = sheetOf(wb, HSP_POINT_SHEETS.B.sheetName)!;
    for (const r of HSP_POINT_SHEETS.B.rows) expect(String(ws.getCell(`${r.col ?? "AF"}${r.row}`).value), `row ${r.row}`).toBe([15, 20, 27].includes(r.row) ? "■" : "□");
    expect(ws.getCell(HSP_POINT_SHEETS.B.totalCell).value).toBe(70);
    expect(warnings.join("\n")).toContain("合計欄へ書き込みました");
    expect(warnings.join("\n")).toContain("単純合計は 70 点");
  });

  it("合計欄は、各シートの「合計」の結合セルの左上で、元は空である", async () => {
    const wb = await open(HSP_POINT_TEMPLATE_PATH);
    for (const [key, def] of Object.entries(HSP_POINT_SHEETS)) {
      const ws = sheetOf(wb, def.sheetName)!;
      const c = ws.getCell(def.totalCell);
      expect(c.master.address, key).toBe(def.totalCell);
      expect(c.value ?? null, key).toBeNull();
      const label = ws.getCell(`AF${Number(def.totalCell.replace("AI", ""))}`);
      expect(String(label.value), key).toBe("合計");
    }
  });

  it("点数の印字がない項目・択一の重複・未選択のときは、合計欄を書き込まず、警告する", async () => {
    const cases: [string, number[]][] = [
      ["点数の印字がない項目", [27, 40]],
      ["択一の重複", [20, 21, 27]],
    ];
    for (const [name, rows] of cases) {
      const { buffer, warnings } = await fillHspPointExcel("高度専門職（1号ロ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("B", rows) });
      const ws = sheetOf(await open(buffer), HSP_POINT_SHEETS.B.sheetName)!;
      expect(ws.getCell(HSP_POINT_SHEETS.B.totalCell).value ?? null, name).toBeNull();
      expect(warnings.join("\n"), name).toContain("合計欄は書き込んでいません");
    }
    const empty = await fillHspPointExcel("高度専門職（1号ロ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: [] });
    expect(sheetOf(await open(empty.buffer), HSP_POINT_SHEETS.B.sheetName)!.getCell(HSP_POINT_SHEETS.B.totalCell).value ?? null).toBeNull();
    expect(estimateHspPoints("B", []).totalWritable).toBe(false);
  });

  it("1号イ・ハも、合計欄へ書き込む", async () => {
    const a = await fillHspPointExcel("高度専門職（1号イ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("A", [14, 20, 24]) });
    expect(sheetOf(await open(a.buffer), HSP_POINT_SHEETS.A.sheetName)!.getCell(HSP_POINT_SHEETS.A.totalCell).value).toBe(85);
    const c = await fillHspPointExcel("高度専門職（1号ハ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("C", [14, 24]) });
    expect(sheetOf(await open(c.buffer), HSP_POINT_SHEETS.C.sheetName)!.getCell(HSP_POINT_SHEETS.C.totalCell).value).toBe(75);
  });

  it("2号は、案件で選んだシートへ差し込む。シート未選択なら、差し込まずに警告する", async () => {
    const chosen = await fillHspPointExcel("高度専門職（2号）", { ...EMPTY_FORM_DETAILS, hspPointSheet: "C", hspPointChecks: checks("C", [14]) });
    const ws = sheetOf(await open(chosen.buffer), HSP_POINT_SHEETS.C.sheetName)!;
    expect(String(ws.getCell("AF14").value)).toBe("■");
    const none = await fillHspPointExcel("高度専門職（2号）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("C", [14]) });
    expect(none.warnings.join("\n")).toContain("使うシート");
    const wb = await open(none.buffer);
    expect(String(sheetOf(wb, HSP_POINT_SHEETS.C.sheetName)!.getCell("AF14").value)).toBe("□");
  });

  it("別のシートのチェックは、差し込まない", async () => {
    const { buffer } = await fillHspPointExcel("高度専門職（1号イ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("B", [15]) });
    const ws = sheetOf(await open(buffer), HSP_POINT_SHEETS.A.sheetName)!;
    expect(String(ws.getCell("AF15").value)).toBe("□");
  });

  it("B の資格（1つ・複数）は、択一で、選んだ欄を「■」、選ばない欄を「□」にする。点数は合計に含める", async () => {
    const one = await fillHspPointExcel("高度専門職（1号ロ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("B", [27, 46]) });
    const ws1 = sheetOf(await open(one.buffer), HSP_POINT_SHEETS.B.sheetName)!;
    expect(String(ws1.getCell("AF46").value)).toBe("■");
    expect(String(ws1.getCell("AF48").value)).toBe("□");
    expect(ws1.getCell(HSP_POINT_SHEETS.B.totalCell).value).toBe(35); // 年収 30 + 資格（1つ）5
    const many = await fillHspPointExcel("高度専門職（1号ロ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("B", [27, 48]) });
    const ws2 = sheetOf(await open(many.buffer), HSP_POINT_SHEETS.B.sheetName)!;
    expect(String(ws2.getCell("AF46").value)).toBe("□");
    expect(String(ws2.getCell("AF48").value)).toBe("■");
    expect(ws2.getCell(HSP_POINT_SHEETS.B.totalCell).value).toBe(40); // 年収 30 + 資格（複数）10
    const none = await fillHspPointExcel("高度専門職（1号ロ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("B", [27]) });
    const ws3 = sheetOf(await open(none.buffer), HSP_POINT_SHEETS.B.sheetName)!;
    expect(String(ws3.getCell("AF46").value)).toBe("□");
    expect(String(ws3.getCell("AF48").value)).toBe("□");
  });

  it("資格の「1つ」と「複数」を両方選ぶと、択一の重複として、合計欄を書き込まず、注意する", async () => {
    const est = estimateHspPoints("B", checks("B", [27, 46, 48]));
    expect(est.totalWritable).toBe(false);
    expect(est.notes.join("\n")).toContain("「資格」は、1つだけ選ぶ項目です");
  });

  it("B の投資運用業等は、AG95 の「□」を「■」にし、10点を合計に含める", async () => {
    const { buffer } = await fillHspPointExcel("高度専門職（1号ロ）", { ...EMPTY_FORM_DETAILS, hspPointChecks: checks("B", [27, 95]) });
    const ws = sheetOf(await open(buffer), HSP_POINT_SHEETS.B.sheetName)!;
    expect(String(ws.getCell("AG95").value)).toBe("■");
    expect(ws.getCell(HSP_POINT_SHEETS.B.totalCell).value).toBe(40); // 年収 30 + 投資運用業等 10
  });

  it("特別加算には上限がないため、選んだ点数をそのまま合計する", () => {
    const est = estimateHspPoints("B", checks("B", [27, 48, 52, 54, 95]));
    expect(est.total).toBe(30 + 10 + 10 + 10 + 10); // 年収・資格（複数）・特別加算Ⅰ・Ⅱ・投資運用業等
    expect(estimateHspPoints("B", checks("B", [27])).notes.join("\n")).not.toContain("上限");
    expect(hspPointConfirmLines(est).join("\n")).not.toContain("上限");
  });

  it("資格・投資運用業等を選ぶと、疎明資料の番号（⑧・㉑）が導かれる", () => {
    expect(evidenceNumbers("B", checks("B", [46]))).toEqual(["⑧"]);
    expect(evidenceNumbers("B", checks("B", [48, 95]))).toEqual(["⑧", "㉑"]);
    expect(evidenceNumbers("C", checks("C", [81]))).toEqual(["㉑"]);
  });
});
