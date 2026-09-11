/**
 * モデルの図を生成する。**Node で走らせる。**
 *
 *   node bublys-libs/model-graph/dist/lib/extract/cli.js \
 *     --source   hotel-shift-puzzle-bubly/hotel-shift-puzzle-model/src/lib \
 *     --registry hotel-shift-puzzle-bubly/hotel-shift-puzzle-libs/src/objects/hotelObjects.tsx \
 *     --out      hotel-shift-puzzle-bubly/hotel-shift-puzzle-libs/src/model-graph/modelGraph.generated.ts
 *
 * ★ 集約の根は**引数に書かない**。書くと型を1つ足したとき図が黙って古くなる
 *   （新しい集約を「部品」と言い続ける）。宣言のあるところから読む:
 *
 *     --registry <記述子.tsx>   … `HOTEL_OBJECTS` のような記述子を持つバブリ
 *     --slices   <スライスのdir> … 記述子が無いバブリ。スライスが集約のリポジトリ
 *
 * 生成物は**コミットする**（実行時に TypeScript を積みたくない）。
 * 代わりに、生成物が古くなったら落ちるテストを置く（staleness.test.ts）。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractModelGraph } from './extractModelGraph.js';
import { extractRegistry } from './extractRegistry.js';
import { extractSliceRoots } from './extractSliceRoots.js';
import { renderGeneratedModule } from './renderGenerated.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const source = arg('source');
const out = arg('out');
const registry = arg('registry');
const slices = arg('slices');
if (!source || !out) {
  console.error(
    '使い方: cli --source <モデルのsrc/lib> --out <生成先.ts>' +
      ' [--registry <記述子.tsx> --registry-export <名前>] [--slices <スライスのdir>]'
  );
  process.exit(1);
}

// 集約の根は**宣言から読む**。引数に書くと型を足したとき黙って古くなる。
// 記述子があるバブリはそこから、無いバブリはスライス（＝集約のリポジトリ）から
const info = registry
  ? extractRegistry(registry, arg('registry-export') ?? 'HOTEL_OBJECTS')
  : slices
    ? { aliases: {}, aggregateClasses: extractSliceRoots(slices).aggregateClasses }
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
