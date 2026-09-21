/**
 * 抽出した図を、そのまま import できる TypeScript のモジュールにする。
 *
 * JSON ではなく .ts にするのは、型が付いた状態でバンドルに入るから。
 * JSON だと `resolveJsonModule` の設定がバブリごとに要る。
 */
import type { ModelGraph } from '../domain/ModelGraph.js';

export function renderGeneratedModule(graph: ModelGraph): string {
  return `/**
 * ★ 自動生成。手で編集しないこと。
 *
 * 出どころ: ${graph.diagnostics.sourceRoot}
 * 生成: bublys-libs/model-graph の generate ターゲット
 *
 * 古くなったら \`modelGraph.staleness.test.ts\` が落ちる。落ちたら生成し直すこと。
 */
import type { ModelGraph } from '@bublys-org/model-graph';

export const MODEL_GRAPH: ModelGraph = ${JSON.stringify(graph, null, 2)};
`;
}
