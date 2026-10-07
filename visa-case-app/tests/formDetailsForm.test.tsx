import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormDetailsForm } from "../components/FormDetailsForm";
import { EMPTY_FORM_DETAILS, getFormLayout } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type ProcedureType } from "../lib/types";

function html(procedureType: ProcedureType, targetStatus = ""): string {
  const record = makeRecord({ procedureType, targetStatus });
  return renderToStaticMarkup(<FormDetailsForm record={record} />);
}

function makeRecord(over: Partial<CaseRecord>): CaseRecord {
  return {
    id: "c1",
    caseName: "案件",
    procedureType: "renewal",
    currentStatus: "",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

/** 画面に出ている見出し（h2）の一覧 */
function headings(markup: string): string[] {
  return [...markup.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((m) => m[1]);
}

describe("公式様式項目タブの描画（様式ごとの表示）", () => {
  it("取得は、取得様式の見出しと項目番号で表示し、職歴・所属機関等・学歴の欄を出さない", () => {
    const m = html("acquisition", "日本人の配偶者等");
    expect(headings(m)).toEqual(["申請人等作成用（項番5〜14）", "15 在日親族及び同居者", "申請人等作成用（項番16・17、取次者）"]);
    expect(m).toContain("在留資格取得許可申請書");
    for (const label of [
      "5 出生地",
      "7 職業",
      "9 電話番号（住居地の欄）",
      "11 在留資格取得の事由",
      "12 在留の理由",
      "14 犯罪を理由とする処分を受けたことの有無",
      "16 (1) 在日身元保証人又は連絡先 氏名",
      "17 (1) 代理人 氏名（法定代理人による申請の場合）",
      "取次者 氏名",
    ]) {
      expect(m).toContain(label);
    }
    // 取得様式にない項目・欄
    for (const absent of [
      "職歴",
      "所属機関等作成用",
      "学歴の区分",
      "最終学歴",
      "勤務先 支店・事業所名",
      "法人番号",
      "派遣先等",
      "実務経験年数",
      "現に有する在留期間",
      "更新の理由",
      "変更の理由",
      "日本における連絡先",
      "入国予定年月日",
      "17 携帯電話番号",
    ]) {
      expect(m).not.toContain(absent);
    }
  });

  it("取得の「13 希望する在留資格」は、案件情報の値を表示し、ヒントは「希望する在留資格」になる", () => {
    const m = html("acquisition", "日本人の配偶者等");
    expect(m).toContain("13 希望する在留資格");
    expect(m).toContain("日本人の配偶者等");
    expect(m).toContain("案件情報の「希望する在留資格」です");
    expect(m).not.toContain("変更後の在留資格");
  });

  it("取得の事由が「その他」のときだけ、その他の内容の欄を出す", () => {
    expect(html("acquisition")).not.toContain("11 その他の内容");
    const record = makeRecord({ procedureType: "acquisition" });
    record.formDetails.acquisitionCause = "other";
    expect(renderToStaticMarkup(<FormDetailsForm record={record} />)).toContain("11 その他の内容");
  });

  it("更新は、全セクション・従来の項目名で表示し、取得固有の項目を出さない", () => {
    const m = html("renewal");
    expect(headings(m)).toEqual([
      "申請人等作成用1（項番5〜15）",
      "16 在日親族及び同居者",
      "申請人等作成用2（N）（項番17〜22）",
      "21 職歴（外国におけるものを含む）",
      "所属機関等作成用1・2（N）",
    ]);
    expect(m).toContain("5 配偶者の有無");
    expect(m).toContain("14 更新の理由");
    expect(m).toContain("18 (2) 学歴の区分");
    expect(m).not.toContain("5 出生地");
    for (const absent of ["取得の事由", "在留の理由", "身元保証人", "13 希望する在留資格"]) expect(m).not.toContain(absent);
  });

  it("変更は、出生地と「13 希望する在留資格」（ヒントは「変更後の在留資格」）を表示し、取得固有の項目を出さない", () => {
    const m = html("change", "技術・人文知識・国際業務");
    expect(headings(m)).toHaveLength(5);
    expect(m).toContain("5 出生地");
    expect(m).toContain("14 変更の理由");
    expect(m).toContain("案件情報の「変更後の在留資格」です");
    for (const absent of ["取得の事由", "在留の理由", "身元保証人"]) expect(m).not.toContain(absent);
  });

  it("認定は、認定様式の見出しで、取得固有の項目を出さない", () => {
    const m = html("coe", "技術・人文知識・国際業務");
    expect(headings(m)).toHaveLength(5);
    expect(m).toContain("11 入国目的");
    expect(m).toContain("12 入国予定年月日");
    expect(m).toContain("案件情報の「希望する在留資格」です");
    for (const absent of ["取得の事由", "在留の理由", "身元保証人"]) expect(m).not.toContain(absent);
  });

  it("その他は、更新様式と同じ表示になる", () => {
    expect(getFormLayout("other").formName).toBe("在留期間更新許可申請書");
    expect(headings(html("other"))).toEqual(headings(html("renewal")));
  });
});

describe("高度専門職のポイント計算表（Issue #186）", () => {
  it("高度専門職の案件には、号から決まるシートのチェック一覧を表示する", () => {
    const markup = html("coe", "高度専門職（1号ロ）");
    expect(headings(markup)).toContain("高度専門職のポイント計算表");
    expect(markup).toContain("使うシート：高度専門職1号ロ");
    expect(markup).toContain("博士学位（専門職学位を除く）");
    expect(markup).toContain("版として保存してダウンロード");
    expect(markup).toContain("保存せずにダウンロード");
  });

  it("号が未選択・2号の案件には、使うシートの選択を表示し、選ぶまでチェック一覧を出さない", () => {
    for (const status of ["高度専門職", "高度専門職（2号）"]) {
      const markup = html("change", status);
      expect(markup, status).toContain("使うシート");
      expect(markup, status).not.toContain("博士学位（専門職学位を除く）");
    }
  });

  it("高度専門職以外の案件には、表示しない", () => {
    expect(headings(html("coe", "技術・人文知識・国際業務"))).not.toContain("高度専門職のポイント計算表");
  });
});

describe("高度専門職の様式の案内（認定・変更・更新。Issue #212）", () => {
  const render = (over: Partial<CaseRecord>, hspActivity = "") =>
    renderToStaticMarkup(<FormDetailsForm record={makeRecord({ ...over, formDetails: { ...EMPTY_FORM_DETAILS, hspActivity } })} />);

  it("変更は、変更後の在留資格が高度専門職なら、行う活動の選択と変更用の案内を出す", () => {
    const m = render({ procedureType: "change", currentStatus: "技術・人文知識・国際業務", targetStatus: "高度専門職（1号イ）" }, "教授");
    expect(m).toContain("高度専門職の行う活動");
    expect(m).toContain("変更許可申請書で使う様式：様式 I");
    expect(m).toContain("2号で活動が変わる場合は、変更後の在留資格の案内ページの様式を確認してください");
    expect(m).not.toContain("認定申請書で使う様式");
  });

  it("更新は、現在の在留資格で解決する（変更後の在留資格には依存しない）", () => {
    const m = render({ procedureType: "renewal", currentStatus: "高度専門職（1号ロ）", targetStatus: "" }, "企業内転勤");
    expect(m).toContain("更新許可申請書で使う様式：様式 L");
    expect(render({ procedureType: "renewal", currentStatus: "高度専門職", targetStatus: "" })).toContain("「現在の在留資格」で、号（イ・ロ・ハ）を選択");
    expect(render({ procedureType: "renewal", currentStatus: "高度専門職（2号）" })).toContain("2号に更新はありません");
  });

  it("認定は、従来どおり、認定用の案内を出す", () => {
    const m = render({ procedureType: "coe", targetStatus: "高度専門職（1号イ）" }, "教授");
    expect(m).toContain("使う様式：様式 I");
    expect(m).toContain("認定申請書で使う様式");
  });

  it("高度専門職ではない変更・更新には、行う活動の選択を出さない", () => {
    expect(render({ procedureType: "change", targetStatus: "技術・人文知識・国際業務" })).not.toContain("高度専門職の行う活動");
    expect(render({ procedureType: "renewal", currentStatus: "技術・人文知識・国際業務", targetStatus: "高度専門職（1号イ）" })).not.toContain("高度専門職の行う活動");
  });
});
