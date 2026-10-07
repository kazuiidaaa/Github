import type { CoeFormCode } from "../../hspForm";
import { HSP_CHANGE_SPEC_I } from "./hspChangeTable2I";
import { HSP_CHANGE_SPEC_L } from "./hspChangeTable2L";
import { HSP_CHANGE_SPEC_M } from "./hspChangeTable2M";
import { HSP_CHANGE_SPEC_U } from "./hspChangeTable2U";
import { build, type Table2Mapping } from "./table2Common";

/**
 * 変更・更新（高度専門職）の様式 I・L・M・U の、第2表以降の対応表（Issue #212）。変更と更新で座標が同一のため、1組を共有する。
 * 第1表は様式 N と同じ座標のため、changeMapping.ts / renewalMapping.ts の対応表を使う。
 * 座標は様式ごとのファイル（hspChangeTable2{I,L,M,U}.ts）にあり、公式の雛形（docs/official/）のロック解除セルから特定した。
 */
export const HSP_CHANGE_TABLE2: Record<Exclude<CoeFormCode, "N">, Table2Mapping> = {
  I: build(HSP_CHANGE_SPEC_I),
  L: build(HSP_CHANGE_SPEC_L),
  M: build(HSP_CHANGE_SPEC_M),
  U: build(HSP_CHANGE_SPEC_U),
};
