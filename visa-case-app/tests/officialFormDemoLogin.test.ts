import { beforeEach, describe, expect, it, vi } from "vitest";

// 値はすべてダミー。Supabase 設定済みのデモモードで、公式様式の生成を送信前に止めることを検証する（Issue #120）。
const state = vi.hoisted(() => ({ supabaseEnabled: false, demo: false }));
vi.mock("../lib/supabase", () => ({
  get isSupabaseEnabled() {
    return state.supabaseEnabled;
  },
  supabase: null,
  usesSupabase: () => state.supabaseEnabled && !state.demo,
}));
vi.mock("../lib/demo", () => ({ isDemo: () => state.demo }));

import { requestOfficialXlsx } from "../lib/documents/officialFormClient";
import { OFFICIAL_FORM_LOGIN_REQUIRED, officialFormNeedsLogin } from "../lib/documents/officialFormAccess";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT } from "../lib/types";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";

const input = {
  applicant: { ...EMPTY_APPLICANT },
  employment: { ...EMPTY_EMPLOYMENT },
  formDetails: { ...EMPTY_FORM_DETAILS },
  currentStatus: "技術・人文知識・国際業務",
};

describe("officialFormNeedsLogin", () => {
  beforeEach(() => {
    state.supabaseEnabled = false;
    state.demo = false;
  });

  it("Supabase 設定済みのデモモードだけ、ログインが必要", () => {
    state.supabaseEnabled = true;
    expect(officialFormNeedsLogin(true)).toBe(true);
    expect(officialFormNeedsLogin(false)).toBe(false);
  });

  it("Supabase 未設定のデモモード（ローカル）は、従来どおり使える", () => {
    state.supabaseEnabled = false;
    expect(officialFormNeedsLogin(true)).toBe(false);
  });
});

describe("requestOfficialXlsx（デモモード）", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    state.supabaseEnabled = false;
    state.demo = false;
  });

  it("Supabase 設定済み＋デモモードでは、fetch を呼ばずにログインを案内する", async () => {
    state.supabaseEnabled = true;
    state.demo = true;
    await expect(requestOfficialXlsx("renewal", input)).rejects.toThrow(OFFICIAL_FORM_LOGIN_REQUIRED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Supabase 未設定のデモモードでは、従来どおり X-Demo-Mode を付けて送信する", async () => {
    state.demo = true;
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ xlsxBase64: "AAAA", warnings: ["w"] }) });
    const r = await requestOfficialXlsx("renewal", input);
    expect(r.warnings).toEqual(["w"]);
    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers["X-Demo-Mode"]).toBe("1");
  });
});
