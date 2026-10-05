import { HSP_PASS_POINTS, HSP_POINT_SHEETS, checkedRows, estimateHspPoints, resolveHspPointSheet } from "../hspPoints";
import type { OfficialFormContent } from "./types";

/** 保存した入力値の写しから、ポイント計算表の選択内容を組み立てる（画面・Word・PDF で共通） */
export interface HspSelectionSummary {
  sheetLabel: string;
  rows: { section: string; label: string; points: string; evidence: string }[];
  total: number;
  passPoints: number;
  reachesPass: boolean;
  notes: string[];
}

export function hspSelectionSummary(input: OfficialFormContent["input"]): HspSelectionSummary | null {
  const f = input.formDetails;
  const res = resolveHspPointSheet(input.targetStatus ?? "", f.hspPointSheet);
  if (res.kind !== "resolved") return null;
  const est = estimateHspPoints(res.sheet, f.hspPointChecks);
  return {
    sheetLabel: HSP_POINT_SHEETS[res.sheet].label,
    rows: checkedRows(res.sheet, f.hspPointChecks).map((r) => ({
      section: r.section,
      label: r.label,
      points: r.points === null ? "印字なし" : `${r.points}点`,
      evidence: r.evidence || "-",
    })),
    total: est.total,
    passPoints: HSP_PASS_POINTS,
    reachesPass: est.reachesPass,
    notes: est.notes,
  };
}
