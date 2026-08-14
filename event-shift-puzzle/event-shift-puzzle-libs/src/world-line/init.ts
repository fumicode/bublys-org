/**
 * world-line 機能の初期化（副作用）
 *
 * 本ファイルを import するだけで以下が行われる:
 * - worldLineGraphSlice + worldLineGraph 標準 listener の注入
 * - shift-plan mutation を記録する独自 listener の注入
 */
import { injectMiddleware } from "@bublys-org/state-management";
import { initWorldLineGraph } from "@bublys-org/world-line-graph";
import { shiftPlanWorldLineListener } from "./shiftPlanWorldLineListener.js";

initWorldLineGraph();
injectMiddleware(shiftPlanWorldLineListener.middleware);
