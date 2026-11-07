import { describe, expect, it } from "vitest";
import { metricsOf, type CaseRow } from "./caseMetrics";
import { CASE_LIST_CSV_HEADERS, caseListCsvBlob, caseListCsvFileName, caseListToCsv, escapeCsvField } from "./caseListCsv";
import { buildDemoSeedCases } from "./demoSeed";
import type { CaseRecord } from "./types";

// ダミーの案件データ（buildDemoSeedCases。実在の人物・会社とは無関係）に、試験ごとの差分を当てて行を作る
function rowOf(overrides: Omit<Partial<CaseRecord>, "applicant"> & { applicant?: Partial<CaseRecord["applicant"]> } = {}): CaseRow {
  const base = buildDemoSeedCases()[0];
  const record: CaseRecord = {
    ...base,
    ...overrides,
    applicant: { ...base.applicant, ...overrides.applicant },
  };
  return { record, metrics: metricsOf(record) };
}

describe("escapeCsvField", () => {
  it("カンマ・改行・ダブルクオートを含まない値はそのまま返す", () => {
    expect(escapeCsvField("サンプル案件A")).toBe("サンプル案件A");
  });

  it("カンマを含む値はダブルクオートで囲む", () => {
    expect(escapeCsvField("山田,太郎")).toBe('"山田,太郎"');
  });

  it("改行（LF・CRLF）を含む値はダブルクオートで囲む", () => {
    expect(escapeCsvField("1行目\n2行目")).toBe('"1行目\n2行目"');
    expect(escapeCsvField("1行目\r\n2行目")).toBe('"1行目\r\n2行目"');
  });

  it("ダブルクオートを含む値は、内部を2重にしてダブルクオートで囲む", () => {
    expect(escapeCsvField('"注意"案件')).toBe('"""注意""案件"');
  });
});

describe("caseListToCsv", () => {
  it("1行目は見出し行（列の順序どおり）", () => {
    const csv = caseListToCsv([]);
    expect(csv).toBe(CASE_LIST_CSV_HEADERS.join(",") + "\r\n");
  });

  it("行が無いときは見出しのみ", () => {
    expect(caseListToCsv([]).split("\r\n").filter(Boolean)).toHaveLength(1);
  });

  it("案件名・申請人氏名・手続種別・状態・最終更新を列の値に反映する", () => {
    const row = rowOf({ caseName: "サンプル案件X", workflowStatus: "application_ready" });
    const lines = caseListToCsv([row]).split("\r\n");
    const fields = lines[1].split(",");
    expect(fields[0]).toBe("サンプル案件X");
    expect(fields[1]).toBe("サンプル申請人A");
    expect(fields[2]).toBe("在留期間更新許可申請");
    expect(fields[5]).toBe("申請準備完了");
  });

  it("在留資格（申請後）は、変更後の在留資格が要る手続のときだけ値を出す（更新は常に空）", () => {
    const renewalWithStrayTarget = rowOf({ procedureType: "renewal", targetStatus: "技能" });
    expect(caseListToCsv([renewalWithStrayTarget]).split("\r\n")[1].split(",")[4]).toBe("");

    const change = rowOf({ procedureType: "change", targetStatus: "技術・人文知識・国際業務" });
    expect(caseListToCsv([change]).split("\r\n")[1].split(",")[4]).toBe("技術・人文知識・国際業務");
  });

  it("在留期限が未入力の案件は、期限の列を空にする", () => {
    const row = rowOf({ applicant: { residenceExpiryDate: "" } });
    expect(caseListToCsv([row]).split("\r\n")[1].split(",")[6]).toBe("");
  });

  it("カンマ・改行・ダブルクオートを含む案件名は、1行のCSVとして正しくエスケープする", () => {
    const row = rowOf({ caseName: 'サンプル,"案件"\nY' });
    const csv = caseListToCsv([row]);
    const lines = csv.split("\r\n").filter(Boolean);
    // 見出し＋データ1行のみ（改行を含む値でも、エスケープにより行数が増えない）
    expect(lines).toHaveLength(2);
    expect(lines[1].startsWith('"サンプル,""案件""\nY",')).toBe(true);
  });
});

describe("caseListCsvBlob", () => {
  it("Excel で文字化けしないよう、BOM 付き UTF-8 の Blob を返す", async () => {
    const blob = caseListCsvBlob([rowOf()]);
    expect(blob.type).toBe("text/csv;charset=utf-8");
    // BOM（EF BB BF）が先頭3バイトにあることを、デコード前のバイト列で確認する
    // （Blob#text() の既定の UTF-8 デコードは、BOM を読み取り後に取り除くため、文字列の比較では確認できない）
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = await blob.text();
    expect(text).toBe(caseListToCsv([rowOf()]));
  });
});

describe("caseListCsvFileName", () => {
  it("案件一覧_YYYYMMDD.csv の形式になる", () => {
    expect(caseListCsvFileName(new Date(2026, 10, 7))).toBe("案件一覧_20261107.csv");
  });

  it("月・日が1桁のときも2桁に揃える", () => {
    expect(caseListCsvFileName(new Date(2026, 0, 3))).toBe("案件一覧_20260103.csv");
  });
});
