import ExcelJS from "exceljs";
import { sheetKey } from "./renewalMapping";

interface FillLike<C> {
  sheet: string;
  cell: string;
  get: (c: C) => string;
}

interface PickLike<C> {
  sheet: string;
  get: (c: C) => string;
  writes: Record<string, Record<string, string>>;
}

/**
 * テンプレートを読み込み、対応表（fillItems・pickItems）に従って案件情報を差し込み、ワークブックをバッファで返す。
 * 差し込む範囲の絞り込みは、呼び出し側で済ませた対応表を渡す。空文字の値は、テンプレートの元の状態のまま変更しない。
 */
export async function fillWorkbook<C>(templatePath: string, ctx: C, fillItems: FillLike<C>[], pickItems: PickLike<C>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  const sheets = new Map(wb.worksheets.map((ws) => [sheetKey(ws.name), ws]));
  const sheetOf = (name: string) => {
    const ws = sheets.get(sheetKey(name));
    if (!ws) throw new Error(`テンプレートにシートがありません: ${name}`);
    return ws;
  };

  for (const it of fillItems) {
    const value = it.get(ctx);
    if (value === "") continue;
    sheetOf(it.sheet).getCell(it.cell).value = value;
  }
  for (const p of pickItems) {
    const writes = p.writes[p.get(ctx)];
    if (!writes) continue;
    const ws = sheetOf(p.sheet);
    for (const [cell, value] of Object.entries(writes)) ws.getCell(cell).value = value === "" ? null : value;
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
