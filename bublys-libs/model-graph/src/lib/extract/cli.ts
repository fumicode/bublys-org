/**
 * モデルの図を生成する。**Node で走らせる。**
 *
 *   npx tsx bublys-libs/model-graph/src/lib/extract/cli.ts \
 *     --source hotel-shift-puzzle-bubly/hotel-shift-puzzle-model/src/lib \
 *     --out    hotel-shift-puzzle-bubly/hotel-shift-puzzle-libs/src/model-graph/modelGraph.generated.ts \
 *     --aggregates Staff,MonthlyStaffSchedule,WorkShiftSet,...
 *
 * 生成物は**コミットする**（実行時に TypeScript を積みたくない）。
 * 代わりに、生成物が古くなったら落ちるテストを置く（staleness.test.ts）。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractModelGraph } from './extractModelGraph.js';
import { extractRegistry } from './extractRegistry.js';
import { renderGeneratedModule } from './renderGenerated.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const source = arg('source');
const out = arg('out');
const registry = arg('registry');
if (!source || !out) {
  console.error(
    '使い方: cli --source <モデルのsrc/lib> --out <生成先.ts>' +
      ' [--registry <記述子.tsx> --registry-export <名前>]'
  );
  process.exit(1);
}

// 集約の根と別名は**記述子から読む**。引数に書くと型を足したとき黙って古くなる
const info = registry
  ? extractRegistry(registry, arg('registry-export') ?? 'HOTEL_OBJECTS')
  : { aliases: {}, aggregateClasses: [] };

const graph = extractModelGraph({
  sourceRoot: source,
  displayRoot: source,
  aggregateTypes: info.aggregateClasses,
  typeAliases: info.aliases,
});

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, renderGeneratedModule(graph), 'utf-8');
console.log(
  `モデル図を生成しました: ${out}\n` +
    `  クラス ${graph.classes.length} / つながり ${graph.relations.length} / ` +
    `読んだファイル ${graph.diagnostics.fileCount}`
);
