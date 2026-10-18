import { describe, expect, it } from "vitest";
import { RULE_SETS, procedureCommonRules, type CommonProcedure } from "../lib/requirements/rules";

// 申請書・写真・パスポート及び在留カードは、在留資格によらず手続ごとに共通（Issue #291）。
// 在留資格別の規則集合が増えても、共通書類が抜けない・重複しないことを確かめる。
const COMMON_PROCEDURES: CommonProcedure[] = ["renewal", "change", "coe"];

describe("手続共通の書類（Issue #291）", () => {
  it("申請書と写真は認定・変更・更新のすべてに、在留カードの提示は更新・変更だけにある。認定は旅券の写しを任意で持つ（Issue #312）", () => {
    const ids = (p: CommonProcedure) => procedureCommonRules(p).map((r) => r.id);
    expect(ids("coe")).toEqual(["application_form", "photo", "passport_copy"]);
    expect(ids("renewal")).toEqual(["application_form", "photo", "passport_card"]);
    expect(ids("change")).toEqual(["application_form", "photo", "passport_card"]);
    for (const p of COMMON_PROCEDURES) {
      expect(procedureCommonRules(p).every((r) => r.party === "applicant"), p).toBe(true);
      // 旅券の写し以外は必須
      expect(procedureCommonRules(p).filter((r) => r.level !== "required").map((r) => r.id), p).toEqual(p === "coe" ? ["passport_copy"] : []);
    }
  });

  it("認定の旅券の写しは任意で、要確認（verify）にしない。注記に、提示不要と実務の通例を書く", () => {
    const passport = procedureCommonRules("coe").find((r) => r.id === "passport_copy");
    expect(passport?.level).toBe("optional");
    expect(passport?.verify).toBeUndefined();
    expect(passport?.note).toContain("入管庁の案内では提示不要。実務では取得するのが通例");
  });

  it("旅券の写しは共通書類にだけある。規則集合ごとに持たせない（同じ id は共通書類と同一）", () => {
    const common = procedureCommonRules("coe").find((r) => r.id === "passport_copy");
    for (const set of RULE_SETS) {
      const found = set.rules.filter((r) => r.id === "passport_copy");
      if (set.procedureType === "coe") expect(found, set.id).toEqual([common]);
      else expect(found, set.id).toEqual([]);
    }
  });

  it("認定・変更・更新の規則集合は、すべて共通書類をそのまま持つ（在留資格ごとに書き分けない）", () => {
    const targets = RULE_SETS.filter((r) => COMMON_PROCEDURES.includes(r.procedureType as CommonProcedure));
    expect(targets.length).toBeGreaterThan(0);
    for (const set of targets) {
      for (const common of procedureCommonRules(set.procedureType as CommonProcedure)) {
        const found = set.rules.find((r) => r.id === common.id);
        expect(found, `${set.id}:${common.id}`).toEqual(common);
      }
    }
  });

  it("認定の規則集合には、在留カードの提示を入れない", () => {
    for (const set of RULE_SETS.filter((r) => r.procedureType === "coe")) {
      expect(set.rules.some((r) => r.id === "passport_card"), set.id).toBe(false);
    }
  });

  it("取得の規則集合（事由別・高度専門職）は、申請書・写真・旅券の提示を持ち、在留カードは持たない", () => {
    for (const set of RULE_SETS.filter((r) => r.procedureType === "acquisition")) {
      const ids = set.rules.map((r) => r.id);
      expect(ids, set.id).toEqual(expect.arrayContaining(["application_form", "photo", "passport_presentation"]));
      expect(ids.includes("passport_card"), set.id).toBe(false);
    }
  });

  it("1つの規則集合に、同じ id の書類が重複しない", () => {
    for (const set of RULE_SETS) {
      const ids = set.rules.map((r) => r.id);
      expect(new Set(ids).size, set.id).toBe(ids.length);
    }
  });

  it("変更・更新の写真の注記に、令和8年6月14日以降は1歳以上が必要という記載がある。認定には足さない（原文の確認範囲が変更・更新だけのため）", () => {
    const note = (p: CommonProcedure) => procedureCommonRules(p).find((r) => r.id === "photo")?.note ?? "";
    for (const p of ["change", "renewal"] as const) {
      expect(note(p), p).toContain("令和8年6月14日以降");
      expect(note(p), p).toContain("1歳以上");
    }
    expect(note("coe")).not.toContain("令和8年6月14日");
  });
});
