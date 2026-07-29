/**
 * world-line 機能の初期化（副作用）
 *
 * 本ファイルを import するだけで worldLineGraphSlice +
 * worldLineGraph 標準 listener が store に注入される。
 *
 * ドメイン固有の mutation を世界線に記録したい場合は、
 * 専用 listener を作成して injectMiddleware(...) を追記する。
 */
import { initWorldLineGraph } from "@bublys-org/world-line-graph";

initWorldLineGraph();
