import { describe, expect, it } from "vitest";
import { precheckRows, precheckWarnings, type PrecheckInput } from "../lib/documents/precheck";

const ready: PrecheckInput = {
  applicantConfirmed: true,
  hasRuleSet: true,
  requiredCount: 5,
  receivedCount: 5,
  checksTotal: 8,
  checksUnresolved: 0,
};

describe("申請書類作成前の状態判定", () => {
  it("すべて整っていれば注意書きは出ない", () => {
    expect(precheckWarnings(precheckRows(ready))).toEqual([]);
  });
  it("申請人情報が未確認なら注意書きが出る", () => {
    const rows = precheckRows({ ...ready, applicantConfirmed: false });
    expect(rows[0].status).toBe("未確認");
    expect(precheckWarnings(rows)).toEqual(["申請人情報が未確認です"]);
  });
  it("必要書類が不足なら件数つきで注意書きが出る", () => {
    const rows = precheckRows({ ...ready, receivedCount: 3 });
    expect(rows[1].status).toBe("不足あり");
    expect(precheckWarnings(rows)).toEqual(["必要書類に未収集があります（2件）"]);
  });
  it("規則の対象外の手続では必要書類は警告しない", () => {
    const rows = precheckRows({ ...ready, hasRuleSet: false, requiredCount: 0, receivedCount: 0 });
    expect(rows[1].unresolved).toBe(false);
    expect(precheckWarnings(rows)).toEqual([]);
  });
  it("チェックが未実施・未解決なら注意書きが出る", () => {
    expect(precheckWarnings(precheckRows({ ...ready, checksTotal: 0 }))).toEqual(["申請前チェックが未実施です"]);
    expect(precheckWarnings(precheckRows({ ...ready, checksUnresolved: 2 }))).toEqual(["申請前チェックに未解決があります（2件）"]);
  });
  it("複数該当するときはすべて列挙する", () => {
    const rows = precheckRows({ applicantConfirmed: false, hasRuleSet: true, requiredCount: 4, receivedCount: 1, checksTotal: 0, checksUnresolved: 0 });
    expect(precheckWarnings(rows)).toHaveLength(3);
  });
  it("各行は該当タブを指す", () => {
    expect(precheckRows(ready).map((r) => r.tab)).toEqual(["applicant", "requirements", "checks"]);
  });
});
