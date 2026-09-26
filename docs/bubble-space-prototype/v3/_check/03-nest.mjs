// 03-pack-or-equal：(B) 外が等間隔だと、中の箱の伸びが外に伝わらない — を測り直す。
//   node docs/bubble-space-prototype/v3/_check/03-nest.mjs
//
// 中の泡を 60px 広げて、隣の組がどれだけ押されるか・重なるか。
// 「等間隔でも中身を見る」（帯の幅 ＝ max(間隔, その値の泡の最大)）も、その場で当てて比べる。
import { openLab, V3 } from "./lab.mjs";

const n = (v) => +(+v).toFixed(1);
const lab = await openLab(`${V3}/03-pack-or-equal.html`);

for (const [host, inner, label] of [["nestPE", "gPE", "詰めるの中に等間隔（外＝詰める）"], ["nestEP", "gEP", "等間隔の中に詰める（外＝等間隔 150）"]]) {
  const lab2 = await openLab(`${V3}/03-pack-or-equal.html`);
  await lab2.call("scene", "nest");
  await lab2.settle();
  const ids = [0, 1, 2].map((i) => inner + i);
  const before = {};
  for (const id of ids) before[id] = await lab2.rect(id);
  const u0 = await lab2.call("statsUnder", host);
  // A組の中の泡を 60px 広げる
  await lab2.select(inner + "0-0");
  await lab2.settle();
  const r = await lab2.rect(inner + "0-0");
  const p = (await lab2.placements()).find((q) => q.id === inner + "0-0");
  await lab2.dragPoint(r.x + r.w - 4, r.y + r.h - 4, r.x + r.w - 4 + 60 * p.scale, r.y + r.h - 4, 20);
  await lab2.settle();
  const after = {};
  for (const id of ids) after[id] = await lab2.rect(id);
  const u1 = await lab2.call("statsUnder", host);
  const sc = p.scale;
  console.log(`\n${label}`);
  console.log(`  A組の中の泡を +60（外の座標）`);
  for (const id of ids) console.log(`   ${id} 左端 ${n(before[id].x)} → ${n(after[id].x)}（${n((after[id].x - before[id].x) / sc)}）  幅 ${n(before[id].w / sc)} → ${n(after[id].w / sc)}`);
  const gap = (a, b) => n((after[b].x - (after[a].x + after[a].w)) / sc);
  const gap0 = (a, b) => n((before[b].x - (before[a].x + before[a].w)) / sc);
  console.log(`   組どうしの間 A-B ${gap0(ids[0], ids[1])} → ${gap(ids[0], ids[1])}   B-C ${gap0(ids[1], ids[2])} → ${gap(ids[1], ids[2])}`);
  console.log(`   ${host} の中の 重なり ${u0.pairs} → ${u1.pairs}  はみ出し ${u0.outs} → ${u1.outs}`);
  console.log("   エラー", lab2.errors().length);
  await lab2.shot("03-nest-" + host);
  await lab2.close();
}
await lab.close();
