// v7 ── 旧 bubbles-ui の文型（開く・並べる・閉じる）を、泡のならべかたの規則で書けるかの実験。
//   node docs/bubble-space-prototype/v7-convergence/run.mjs
//
// A … いまの規則のまま（Z＝自由Z·そのまま·透視）。開く＝1段手前に置いて、Z の焦点を送る
// C … 「Z を使わない」で同じ文型を書けるか（masa さんの問い）。焦点を追随させる
// B … domain の**写し**を作り、arrange.ts の1語だけ変える（Z の詰めるの帯の幅を step に）。
//     開く＝いちばん手前より小さい値を書くだけ。★ 焦点は1回も書かない
//     リポジトリの bublys-libs/bubble-layout は1文字も触らない（写しは .tmp/ に作って捨てる）
import { build } from 'esbuild';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const TMP = path.join(HERE, '.tmp');

rmSync(TMP, { recursive: true, force: true });
cpSync(path.join(REPO, 'bublys-libs/bubble-layout/src'), path.join(TMP, 'bl-copy'), { recursive: true });
const arrange = path.join(TMP, 'bl-copy/lib/domain/arrange.ts');
const before = "A.arrange === 'pack' ? values.indexOf(v) : v);";
const after = "A.arrange === 'pack' ? values.indexOf(v) * A.step : v);";
const src = readFileSync(arrange, 'utf8');
if (!src.includes(before)) throw new Error('arrange.ts の形が変わった。写しに当てる1語が見つからない');
writeFileSync(arrange, src.replace(before, after));

for (const name of ['exp-a-camera', 'exp-b-pack', 'exp-c-noz']) {
  const out = path.join(TMP, name + '.mjs');
  await build({ entryPoints: [path.join(HERE, name + '.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'warning' });
  console.log('\n══════════ ' + name + ' ══════════');
  await import(pathToFileURL(out).href);
}
rmSync(TMP, { recursive: true, force: true });
