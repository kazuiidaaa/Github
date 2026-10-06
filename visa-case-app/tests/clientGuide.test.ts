import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildClientGuide, cautionsOf, sourceHintOf } from "../lib/documents/clientGuide";
import { buildDocx } from "../lib/documents/docx";
import { buildBlocks } from "../lib/documents/model";
import { buildContent } from "../lib/documents/snapshot";
import { INTERNAL_DOCUMENT_TYPES, type GeneratedDocument } from "../lib/documents/types";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

const record: CaseRecord = {
  id: "c1",
  caseName: "テスト案件 在留期間更新",
  procedureType: "renewal",
  currentStatus: "技術・人文知識・国際業務",
  targetStatus: "",
  memo: "内部メモ",
  workflowStatus: "preparing",
  createdAt: "",
  updatedAt: "2026-10-01T00:00:00.000Z",
  applicant: { ...EMPTY_APPLICANT, legalName: "TEST TARO" },
  employment: { ...EMPTY_EMPLOYMENT, category: "3", companyName: "株式会社テスト" },
  formDetails: { ...EMPTY_FORM_DETAILS },
  requirementStates: {},
  customRequirements: [],
  acceptedDate: "",
  plannedApplicationDate: "",
  checkMemo: "",
  checks: [],
  documents: [],
};

function ids(c: CaseRecord, includeReceived = false) {
  return buildClientGuide(c, includeReceived).items.map((i) => i.id);
}

describe("ご案内書類の対象の抽出", () => {
  it("必要と判定された、未受領・依頼済みの書類だけを載せる", () => {
    const c: CaseRecord = {
      ...record,
      requirementStates: {
        photo: { status: "received" },
        passport_card: { status: "requested", dueDate: "2026-11-10" },
      },
    };
    const items = buildClientGuide(c).items;
    expect(items.map((i) => i.id)).not.toContain("photo");
    expect(items.find((i) => i.id === "passport_card")?.dueDate).toBe("2026-11-10");
    expect(items.every((i) => i.status === "not_received" || i.status === "requested")).toBe(true);
  });

  it("申請書そのもの（事務所が作成するもの）は載せない", () => {
    expect(ids(record)).not.toContain("application_form");
  });

  it("受領済み・確認済みは、選択した場合のみ載せる", () => {
    const c: CaseRecord = { ...record, requirementStates: { photo: { status: "received" }, passport_card: { status: "reviewed" } } };
    expect(ids(c)).not.toContain("photo");
    expect(ids(c)).not.toContain("passport_card");
    expect(ids(c, true)).toContain("photo");
    expect(ids(c, true)).toContain("passport_card");
  });

  it("不要とされた書類は、選択しても載せない", () => {
    const c: CaseRecord = { ...record, requirementStates: { photo: { status: "not_received", override: "not_required" } } };
    expect(ids(c, true)).not.toContain("photo");
  });

  it("行政書士が追加した必要書類は載せ、不要の追加書類は載せない", () => {
    const c: CaseRecord = {
      ...record,
      customRequirements: [
        { id: "x1", name: "追加書類A", party: "organization", isRequired: true, status: "not_received" },
        { id: "x2", name: "追加書類B", party: "organization", isRequired: false, status: "not_received" },
      ],
    };
    expect(ids(c)).toContain("x1");
    expect(ids(c)).not.toContain("x2");
  });

  it("宛名は、申請人の氏名。未入力なら案件名", () => {
    expect(buildClientGuide(record).addressee).toBe("TEST TARO");
    expect(buildClientGuide({ ...record, applicant: { ...EMPTY_APPLICANT } }).addressee).toBe(record.caseName);
  });
});

describe("提出時の注意・取得先", () => {
  it("規則に書かれた条件だけを抜き出す", () => {
    expect(cautionsOf("住民票の写し")).toEqual(["写しで提出"]);
    expect(cautionsOf("証明書", "発行日から3か月以内のもの")).toEqual(["発行日から3か月以内のもの"]);
    expect(cautionsOf("写真", "申請前6か月以内に撮影")).toEqual(["申請前6か月以内に撮影したもの"]);
    expect(cautionsOf("直近3か月分の所得税徴収高計算書")).toEqual([]);
  });

  it("取得先の該当がない書類は、担当者への確認を案内する", () => {
    expect(sourceHintOf("登記事項証明書")).toBe("法務局");
    expect(sourceHintOf("その他の資料")).toContain("担当者");
  });
});

function make(c: CaseRecord, includeReceived = false): GeneratedDocument {
  return {
    id: "d1",
    caseId: c.id,
    outputFormat: "docx",
    documentType: "client_guide",
    title: "ご案内",
    version: 1,
    content: buildContent(c, "client_guide", new Date(), [], { includeReceived }),
    status: "draft",
    createdAt: "",
  };
}

describe("ご案内書類の生成", () => {
  it("内部情報（メモ・在留カード番号等）を含まず、確認前の注記を持つ", () => {
    const c = make({ ...record, applicant: { ...record.applicant, residenceCardNumber: "AB1234567CD" } });
    const json = JSON.stringify(c.content);
    expect(json).not.toContain("内部メモ");
    expect(json).not.toContain("AB1234567CD");
    expect(c.content.notices.join("")).toContain("行政書士による確認前");
  });

  it("審査の見込み・許可の可否を示す表現がない", () => {
    const text = JSON.stringify(buildBlocks(make(record)));
    for (const w of ["許可されます", "許可される", "審査に通", "必ず許可", "不許可になり"]) expect(text).not.toContain(w);
    expect(text).toContain("許可の見込み");
  });

  it("連絡先の空欄と、期限・受領の状況を含む", () => {
    const c: CaseRecord = { ...record, requirementStates: { passport_card: { status: "requested", dueDate: "2026-11-10" } } };
    const text = JSON.stringify(buildBlocks(make(c)));
    expect(text).toContain("事務所名");
    expect(text).toContain("担当者名");
    expect(text).toContain("2026/11/10");
    expect(text).toContain("依頼済み");
  });

  it("Word に出力でき、宛名が入る", async () => {
    const blob = await buildDocx(make(record));
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("お願いする書類のご案内");
    expect(xml).toContain("TEST TARO");
    expect(xml).toContain("行政書士確認前");
  });

  it("既存の文書の内容に、ご案内書類の項目が混ざらない", () => {
    for (const type of INTERNAL_DOCUMENT_TYPES.filter((t) => t !== "client_guide" && t !== "official_application_form")) {
      expect(buildContent(record, type).clientGuide).toBeUndefined();
    }
  });
});
