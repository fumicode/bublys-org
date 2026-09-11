/**
 * 抽出の入口。**Node 専用**（`typescript` を静的 import している）。
 *
 * ★ 本体のバレル（`src/index.ts`）とは別の入口にしてある。
 *   混ぜるとブラウザのバンドルに数 MB のコンパイラが入り、Jest（jsdom）からも
 *   読めなくなる。到達してよいのは生成コマンドと Node 環境のテストだけ。
 */
export { extractModelGraph, type ExtractOptions } from './extractModelGraph.js';
export { extractRegistry, type RegistryInfo } from './extractRegistry.js';
export { extractSliceRoots, type SliceRoots } from './extractSliceRoots.js';
export { renderGeneratedModule } from './renderGenerated.js';
