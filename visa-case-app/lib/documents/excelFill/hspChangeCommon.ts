import { ADVANCED_PROFESSIONAL_GRADE_2 } from "../../types";
import type { CoeFormCode, FormResolution } from "../../hspForm";
import { describeHspForm } from "../../hspFormGuide";
import type { Table2Mapping } from "./table2Common";

/** 2号の変更は、様式が活動だけで決まる。活動が変わるときは、変更後の在留資格の案内ページの様式が正になる */
export const GRADE2_CHANGE_NOTE = "2号で活動が変わる場合は、変更後の在留資格の案内ページの様式を確認してください。";

/**
 * 高度専門職の変更・更新（様式 I・L・M・N・U の切り替え）に関する警告。
 * 様式を特定できない場合は、他の様式の表を流用せず、第1表のみを差し込んだ旨を伝える（認定と同じ扱い）。
 * @param firstSheet 第1表のシート名（警告文に表示）
 * @param status 変更は変更後、更新は現在の在留資格（号つき）。2号の注意の判定に使う
 */
export function hspChangeWarnings(opts: {
  resolution: FormResolution<CoeFormCode>;
  procedure: "change" | "renewal";
  firstSheet: string;
  status: string;
  table2: Table2Mapping | null;
}): string[] {
  const { resolution: r, procedure, firstSheet, status, table2 } = opts;
  const w: string[] = [];
  if (r.kind === "grade_missing" || r.kind === "activity_missing" || r.kind === "unknown" || r.kind === "no_renewal") {
    w.push(`${describeHspForm(r, procedure)}第1表（${firstSheet}）のみ差し込んでいます。使う様式を確認し、必要なら別の様式へ転記してください。`);
  }
  if (table2) {
    w.push(
      table2.fill.length === 0
        ? `${table2.name}の第2表以降は、差し込んでいません。様式上で記入してください。`
        : `${table2.name}の次の欄は、案件情報に項目がないため差し込んでいません。様式上で記入してください：${table2.manual}。`,
    );
  }
  if (procedure === "change" && status.trim() === ADVANCED_PROFESSIONAL_GRADE_2) w.push(GRADE2_CHANGE_NOTE);
  return w;
}
