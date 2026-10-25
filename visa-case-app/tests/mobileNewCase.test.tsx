import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelectRow, TextRow } from "../components/mobile/FormRows";
import { CATALOG, type MessageKey } from "../lib/i18n/messages";
import { mobileNew } from "../lib/i18n/messages/mobileNew";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";
import { translate } from "../lib/i18n/translate";
import { buildNewCaseRecord, newCaseNames, validateNewCase, type NewCaseInput } from "../lib/newCaseSubmit";
import { EMPTY_EMPLOYMENT } from "../lib/types";

const t = (key: MessageKey, params?: Record<string, string | number>) => translate("ja", key, params);

const base: NewCaseInput = {
  bulk: false,
  caseName: "テスト案件",
  procedureType: "renewal",
  currentStatus: "留学",
  targetStatus: "",
  memo: "",
  acceptedDate: "",
  employment: { ...EMPTY_EMPLOYMENT },
  groupName: "",
  names: ["", "", ""],
};

describe("新規案件の入力検証（PC 版と共通）", () => {
  it("正しい入力は誤りなし", () => {
    expect(validateNewCase(base, t, "", false)).toEqual({});
  });

  it("手続種別・案件名が空なら、それぞれの欄に誤り", () => {
    const e = validateNewCase({ ...base, caseName: "  ", procedureType: "" }, t, "", false);
    expect(e.caseName).toBe(t("caseNew.errCaseNameRequired"));
    expect(e.procedureType).toBe(t("caseNew.errProcedureRequired"));
  });

  it("案件名は 100 文字まで", () => {
    expect(validateNewCase({ ...base, caseName: "あ".repeat(101) }, t, "", false).caseName).toBe(t("caseNew.errCaseNameTooLong"));
    expect(validateNewCase({ ...base, caseName: "あ".repeat(100) }, t, "", false).caseName).toBeUndefined();
  });

  it("変更・認定・取得では、変更後（希望）の在留資格が必須。更新では不要", () => {
    const change = validateNewCase({ ...base, procedureType: "change" }, t, "変更後の在留資格", false);
    expect(change.targetStatus).toBe(t("caseNew.errTargetRequired", { label: "変更後の在留資格" }));
    expect(validateNewCase({ ...base, procedureType: "change", targetStatus: "技術・人文知識・国際業務" }, t, "", false)).toEqual({});
  });

  it("存在しない受任日は誤り、空は正常", () => {
    expect(validateNewCase({ ...base, acceptedDate: "2025-02-30" }, t, "", false).acceptedDate).toBe(t("caseNew.errAcceptedDate"));
    expect(validateNewCase({ ...base, acceptedDate: "2025-02-28" }, t, "", false).acceptedDate).toBeUndefined();
  });

  it("まとめて登録：グループ名必須、案件名の長さ、雇用開始日の誤り", () => {
    const bulk = { ...base, bulk: true, caseName: "" };
    expect(validateNewCase(bulk, t, "", false).groupName).toBe(t("caseNew.errGroupNameRequired"));
    expect(validateNewCase({ ...bulk, groupName: "あ".repeat(101) }, t, "", false).groupName).toBe(t("caseNew.errGroupNameTooLong"));
    expect(validateNewCase({ ...bulk, groupName: "G", names: [] }, t, "", false).names).toBe(t("caseNew.errNamesEmpty"));
    expect(validateNewCase({ ...bulk, groupName: "G", names: ["あ".repeat(101)] }, t, "", false).names).toBe(t("caseNew.errNamesTooLong"));
    expect(validateNewCase({ ...bulk, groupName: "G" }, t, "", true).employment).toBe(t("caseNew.errEmploymentDate"));
    expect(validateNewCase({ ...bulk, groupName: "G" }, t, "", false)).toEqual({});
  });
});

describe("新規案件の組み立て（PC 版と共通）", () => {
  it("1件ずつ：案件名は前後の空白を除く。bulk でなければ雇用情報は空", () => {
    expect(newCaseNames({ ...base, caseName: " A " })).toEqual(["A"]);
    const r = buildNewCaseRecord({ ...base, procedureType: "renewal", currentStatus: " 留学 ", targetStatus: "不要", employment: { ...EMPTY_EMPLOYMENT, companyName: "X" } as never }, "A", "id1", "2025-01-01T00:00:00.000Z");
    expect(r).toMatchObject({ id: "id1", caseName: "A", currentStatus: "留学", targetStatus: "", workflowStatus: "preparing", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" });
    expect(r.employment).toEqual(EMPTY_EMPLOYMENT);
    expect(r.documents).toEqual([]);
  });

  it("変更では変更後の在留資格を保存。まとめて登録は案件ごとに独立した雇用情報の複製", () => {
    const emp = { ...EMPTY_EMPLOYMENT };
    const input = { ...base, bulk: true, procedureType: "change" as const, targetStatus: " 特定技能1号 ", employment: emp, groupName: "G", names: ["", "山田"] };
    expect(newCaseNames(input)).toEqual(["G（1）", "山田"]);
    const a = buildNewCaseRecord(input, "G（1）", "a", "n");
    const b = buildNewCaseRecord(input, "山田", "b", "n");
    expect(a.targetStatus).toBe("特定技能1号");
    expect(a.employment).not.toBe(b.employment);
    expect(a.applicant).not.toBe(b.applicant);
  });
});

describe("iPhone 版の入力行", () => {
  it("選択の行：見出しと select が結び付き、必須は文字で示し、誤りは aria で結ぶ。文字は 16px 以上", () => {
    const m = renderToStaticMarkup(
      <SelectRow id="x" label="手続種別" required options={[{ value: "a", label: "A" }, { value: "b", label: "B", group: "G" }]} value="" onChange={() => {}} placeholder="選択してください" error="選んでください" />,
    );
    expect(m).toContain('for="x"');
    expect(m).toContain('id="x"');
    expect(m).toContain("必須");
    expect(m).toContain('aria-invalid="true"');
    expect(m).toMatch(/aria-describedby="[^"]+"/);
    expect(m).toContain("選んでください");
    expect(m).toContain("<optgroup");
    expect(m).toContain("text-base");
    expect(m).toContain("min-h-[44px]");
  });

  it("文字入力の行：16px 以上、44pt 以上。ラベル無しなら aria-label を付ける", () => {
    const m = renderToStaticMarkup(<TextRow id="y" ariaLabel="案件名 1" value="" onChange={() => {}} />);
    expect(m).toContain('aria-label="案件名 1"');
    expect(m).toContain("text-base");
    expect(m).toContain("min-h-[44px]");
    expect(m).not.toContain("<label");
  });
});

describe("mobileNew の訳表", () => {
  const ja = Object.keys(mobileNew.ja);
  it("登録され、en/ko が日本語と同じキーですべて埋まっている", () => {
    expect(CATALOG.mobileNew).toBe(mobileNew);
    expect(REVIEW_STATUS.mobileNew).toEqual({ en: "draft", ko: "draft" });
    for (const lang of ["en", "ko"] as const) {
      expect(Object.keys(mobileNew[lang]).sort()).toEqual([...ja].sort());
      for (const k of ja) expect((mobileNew[lang] as Record<string, string>)[k], k).not.toBe("");
    }
  });
});
