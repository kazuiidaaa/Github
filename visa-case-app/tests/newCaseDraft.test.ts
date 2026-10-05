import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_EMPLOYMENT } from "../lib/types";
import { clearNewCaseDraft, isNewCaseDirty, loadNewCaseDraft, NEW_CASE_DRAFT_KEY, saveNewCaseDraft, type NewCaseDraft } from "../lib/newCaseDraft";

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

const blank = { caseName: "", procedureType: "", currentStatus: "", targetStatus: "", memo: "", groupName: "", names: ["", "", ""], employment: { ...EMPTY_EMPLOYMENT } };
const draft: NewCaseDraft = {
  procedureType: "change",
  currentStatus: "留学",
  targetStatus: "",
  groupName: "ダミー商事 変更 2名",
  names: ["", "テスト太郎"],
  employment: { ...EMPTY_EMPLOYMENT, companyName: "ダミー商事株式会社", withholdingSpecial: true },
};

describe("isNewCaseDirty", () => {
  it("初期状態は未入力", () => {
    expect(isNewCaseDirty(blank)).toBe(false);
  });
  it("どれか1項目でも変わると入力あり", () => {
    expect(isNewCaseDirty({ ...blank, caseName: "a" })).toBe(true);
    expect(isNewCaseDirty({ ...blank, memo: "a" })).toBe(true);
    expect(isNewCaseDirty({ ...blank, names: ["", "", "", ""] })).toBe(true);
    expect(isNewCaseDirty({ ...blank, names: ["", "x", ""] })).toBe(true);
    expect(isNewCaseDirty({ ...blank, employment: { ...EMPTY_EMPLOYMENT, withholdingSpecial: true } })).toBe(true);
  });
});

describe("一時保存", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("保存した入力を復元できる", () => {
    saveNewCaseDraft(draft);
    expect(loadNewCaseDraft()).toEqual(draft);
  });
  it("クリアすると復元されない", () => {
    saveNewCaseDraft(draft);
    clearNewCaseDraft();
    expect(loadNewCaseDraft()).toBeNull();
  });
  it("空の入力は復元しない", () => {
    saveNewCaseDraft({ ...draft, procedureType: "", currentStatus: "", groupName: "", names: ["", "", ""], employment: { ...EMPTY_EMPLOYMENT } });
    expect(loadNewCaseDraft()).toBeNull();
  });
  it("壊れた内容・想定外の型でも例外にならない", () => {
    sessionStorage.setItem(NEW_CASE_DRAFT_KEY, "{not json");
    expect(loadNewCaseDraft()).toBeNull();
    sessionStorage.setItem(NEW_CASE_DRAFT_KEY, JSON.stringify({ groupName: 1, names: "x", employment: { companyName: 5 } }));
    expect(loadNewCaseDraft()).toBeNull();
    sessionStorage.setItem(NEW_CASE_DRAFT_KEY, JSON.stringify({ groupName: "A", names: [1, "b"], employment: { companyName: 5, industry: "i" } }));
    const d = loadNewCaseDraft();
    expect(d?.names).toEqual(["", "b"]);
    expect(d?.employment.companyName).toBe("");
    expect(d?.employment.industry).toBe("i");
  });
});

describe("sessionStorage が使えない場合", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("アクセスで例外が出ても、保存・復元・削除は例外にならない", () => {
    const boom = () => {
      throw new Error("denied");
    };
    vi.stubGlobal("sessionStorage", { getItem: boom, setItem: boom, removeItem: boom });
    expect(() => saveNewCaseDraft(draft)).not.toThrow();
    expect(loadNewCaseDraft()).toBeNull();
    expect(() => clearNewCaseDraft()).not.toThrow();
  });
  it("sessionStorage 自体が未定義でも例外にならない", () => {
    vi.stubGlobal("sessionStorage", undefined);
    expect(() => saveNewCaseDraft(draft)).not.toThrow();
    expect(loadNewCaseDraft()).toBeNull();
  });
});
