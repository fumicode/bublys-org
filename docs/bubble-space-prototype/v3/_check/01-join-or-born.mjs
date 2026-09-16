// 決まり2（並びに加わる）は要るか。「いつも相手の席に並びが生まれる」だけにして比べる。
//   node docs/bubble-space-prototype/v3/_check/01-join-or-born.mjs
import { openLab, V3 } from "./lab.mjs";
const FILE = `${V3}/01-snap-is-parent.html`;
const f = n => (n === null || n === undefined ? "-" : (+n).toFixed(2));
const P = (...a) => console.log(...a);
/** born だけにする（R2 を切る） */
const BORN_ONLY = `(() => { const _s = window.snapOp; window.snapOp = (b, sn) => _s(b, { ...sn, kind: "born" }); })()`;

async function open(bornOnly) {
  const l = await openLab(FILE); await l.settle();
  if (bornOnly) await l.page.evaluate(BORN_ONLY);
  return l;
}
const snapshot = async l => {
  const ps = await l.placements();
  return ps.filter(p => !p.implicit).map(p => `${p.id}:${f(p.x)},${f(p.y)},${f(p.w)},${f(p.h)}`).sort().join(" ");
};
const treeOf = async l => JSON.stringify((await l.call("implicitParents")).map(r => [r.id, r.parent, r.kids]));

P("\n══ ① 同じ操作を、R2 あり／なし で並べて測る ══");
for (const bornOnly of [false, true]) {
  const l = await open(bornOnly);
  await l.call("snap", "list", "item", "left"); await l.settle();     // 生まれる
  await l.call("snap", "fA", "item", "left");  await l.settle();     // あいだへ（R2 or 入れ子）
  await l.call("snap", "fB", "item", "right"); await l.settle();     // 後ろへ
  const snap = await snapshot(l);
  P(`  R2 ${bornOnly ? "なし（いつも born）" : "あり"}  見えない親 ${(await l.call("implicitParents")).length} 個`);
  P(`    木 ${await treeOf(l)}`);
  P(`    泡 ${snap.split(" ").filter(s => /^(list|item|fA|fB):/.test(s)).join("  ")}`);
  if (!bornOnly) globalThis.__A = snap; else globalThis.__B = snap;
  P(`    エラー ${l.errors().length}`);
  await l.close();
}
P(`  ＝ 見た目は ${globalThis.__A === globalThis.__B ? "完全に同じ" : "★ちがう"}`);

P("\n══ ② 並びの中で並べ替えられるか（R2 なしだと入れ子になる） ══");
for (const bornOnly of [false, true]) {
  const l = await open(bornOnly);
  await l.call("snap", "list", "item", "left"); await l.settle();
  await l.call("snap", "fA", "item", "left");  await l.settle();     // [メモ一覧, 付箋A, 買い物]
  const before = (await l.placements()).filter(p => ["list", "fA", "item"].includes(p.id)).sort((a, b) => a.x - b.x).map(p => p.id);
  // いちばん後ろ（買い物）を先頭へ回す：並びの左端の外まで引く
  const li = await l.rect("list");
  await l.dragBubble("item", { to: { x: li.x - 20, y: li.y + 20 } });
  const after = (await l.placements()).filter(p => ["list", "fA", "item"].includes(p.id)).sort((a, b) => a.x - b.x).map(p => p.id);
  P(`  R2 ${bornOnly ? "なし" : "あり"}  ${before.join(" ")} → ${after.join(" ")}  木 ${await treeOf(l)}`);
  await l.close();
}

P("\n══ ③ 1つになった並びは畳まれるか（R3） ══");
for (const bornOnly of [false, true]) {
  const l = await open(bornOnly);
  await l.call("snap", "list", "item", "left"); await l.settle();
  await l.call("snap", "fA", "item", "left");  await l.settle();
  await l.dragBubble("fA", { dx: 0, dy: -200 });                      // あいだの1つを外す
  P(`  R2 ${bornOnly ? "なし" : "あり"}  外したあとの木 ${await treeOf(l)}  エラー ${l.errors().length}`);
  await l.close();
}
