import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIT_LABELS } from "../lib/auditLabels";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === "node_modules" || f === ".next" || f === "tests") return [];
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("監査ログの操作名", () => {
  it("コード内で記録しているすべての操作に、表示名がある", () => {
    const used = new Set<string>();
    for (const f of files(".")) {
      const src = readFileSync(f, "utf8");
      // logAudit(id, "x") と logAudit(id, cond ? "x" : "y")
      for (const m of src.matchAll(/logAudit\([^,]+,\s*(?:\w+ \? )?"([a-z_]+)"(?:\s*:\s*"([a-z_]+)")?/g)) {
        used.add(m[1]);
        if (m[2]) used.add(m[2]);
      }
      // 必要書類パネルの onPatch(id, {...}, "x")
      for (const m of src.matchAll(/\},\s*"(requirement_[a-z]+)"\)/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(5);
    for (const a of used) expect(AUDIT_LABELS, `表示名なし: ${a}`).toHaveProperty(a);
  });
});
