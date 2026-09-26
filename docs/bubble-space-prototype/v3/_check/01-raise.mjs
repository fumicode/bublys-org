// raise（触った泡は最前面へ）と 決まり5（奥行き）が、この案でぶつからないかを測る。
//   node docs/bubble-space-prototype/v3/_check/01-raise.mjs
import { openLab, V3 } from "./lab.mjs";
const FILE = `${V3}/01-snap-is-parent.html`;
const f = n => (n === null || n === undefined ? "-" : (+n).toFixed(2));
const P = (...a) => console.log(...a);
async function fresh() { const l = await openLab(FILE); await l.settle(); return l; }
const bub = async (l, id) => (await l.bubbles()).find(b => b.id === id);
const pl = async (l, id) => (await l.placements()).find(p => p.id === id);
const drawIdx = async (l, id) => (await l.placements()).findIndex(p => p.id === id);

P("\n══ ① Z が自由座標の空間（root「自由に置く」）で触る ══");
{
  const l = await fresh();
  const ids = ["list", "item", "fA", "fB", "fC", "fD"];
  const before = {}; for (const i of ids) before[i] = { z: (await bub(l, i)).free.z, k: await drawIdx(l, i), w: (await pl(l, i)).w };
  const q = await l.call("headerPointOf", "list");
  P(`  当たるか: ${await l.call("hitAt", q.x, q.y)}`);
  await l.page.mouse.click(q.x, q.y); await l.settle();
  const a = { z: (await bub(l, "list")).free.z, k: await drawIdx(l, "list"), w: (await pl(l, "list")).w, alpha: (await pl(l, "list")).alpha };
  const last = (await l.placements()).filter(p => p.space === "root").slice(-1)[0];
  P(`  メモ一覧（奥 z=1）を触る → 奥行き ${f(before.list.z)} → ${f(a.z)}／幅 ${f(before.list.w)} → ${f(a.w)}／alpha ${f(a.alpha)}`);
  P(`  描く順（後ほど手前）: ${f(before.list.k)} → ${f(a.k)}／root でいちばん手前は ${last.id}`);
  P(`  ＝ 焦点の面（z=0）までは来るが、そこは兄弟と同じ面。同じ面の上下は座標では決まらない`);
  P(`  もし「一番手前の手前へ」を守って z=−0.15 に書くと dz<0 ＝ 透視が消す（②で測る）`);
  await l.close();
}

P("\n══ ② 透視は焦点より手前を消す（だから「焦点より手前へは出さない」が要る） ══");
{
  const l = await fresh();
  await l.wheel(700, 300, 120);
  const fz = (await l.call("focusOf", "root")).z;
  P(`  root の焦点 Z を ${f(fz)} へ（奥へホイール）`);
  for (const i of ["item", "fA", "list"]) {
    const b = await bub(l, i), p = await pl(l, i);
    P(`    ${i.padEnd(5)} 奥行き ${f(b.free.z)}  dz ${f(b.free.z - fz)}  alpha ${f(p.alpha)}`);
  }
  await l.close();
}

P("\n══ ③ Z が順序の空間（重ねて置く）で触る ══");
{
  const l = await fresh();
  await l.select("item"); await l.settle();
  await l.call("preset", "重ねて置く", "root"); await l.settle();
  // 少しずらして重ねる（完全に隠れた泡はクリックで当たらない ＝ 重ねる UI として当然）
  const r = await l.rect("fA");
  await l.dragBubble("fB", { to: { x: r.x + 56, y: r.y + 34 } });
  await l.dragBubble("fC", { to: { x: r.x + 112, y: r.y + 68 } });
  await l.settle();
  const frontOf = async () => { const ps = await l.placements(); return ["fA", "fB", "fC"].map(i => ({ i, k: ps.findIndex(p => p.id === i) })).sort((a, b) => b.k - a.k)[0].i; };
  for (const id of ["fA", "fB", "fC", "fA"]) {
    const q = await l.call("headerPointOf", id);
    const hit = await l.call("hitAt", q.x, q.y);
    await l.page.mouse.click(q.x, q.y); await l.settle();
    const ords = (await l.bubbles()).filter(b => /^f[ABC]$/.test(b.id)).map(b => b.id + ":" + b.order).join(" ");
    const p = await pl(l, id);
    P(`  ${id} を触る（当たった=${hit}）→ 手前は ${await frontOf()}／順序 ${ords}／alpha ${f(p.alpha)} 倍率 ${f(p.scale)}`);
  }
  P(`  エラー ${l.errors().length}`);
  await l.close();
}

P("\n══ ④ raise と 決まり5（奥行き）がぶつかるか ══");
{
  // 決まり5 が本当に値を変える場面：Z が「なし」の空間から、焦点 Z が 0 でない root へ出す
  const l = await fresh();
  await l.wheel(700, 300, 120);
  const fz = (await l.call("focusOf", "root")).z;
  const b0 = await pl(l, "seiyaku");
  const fd = await l.rect("fD");
  await l.dragBubble("seiyaku", { to: { x: fd.x + 250, y: fd.y - 20 } });
  const b = await bub(l, "seiyaku"), p = await pl(l, "seiyaku");
  P(`  root の焦点 Z ${f(fz)}。勤務表（Z なし）の中の 制約 を root へ引き出す`);
  P(`    制約の奥行き 0 → ${f(b.free.z)}（＝焦点の面）／親 ${b.parent}／alpha ${f(p && p.alpha)}／倍率 ${f(b0.scale)} → ${f(p && p.scale)}`);
  P(`    決まり5 が書かなければ 奥行き 0 のまま ＝ dz ${f(0 - fz)} < 0 ＝ 消える`);
  await l.close();

  // raise → R5 の順で書く（同じ空間の Z なので、どちらも「焦点の面」を指す）
  const l2 = await fresh();
  const q = await l2.call("headerPointOf", "list");
  await l2.page.mouse.click(q.x, q.y); await l2.settle();
  const z1 = (await bub(l2, "list")).free.z;
  await l2.call("snap", "list", "fB", "left"); await l2.settle();
  const z2 = (await bub(l2, "list")).free.z, p2 = await pl(l2, "list");
  P(`  触る（raise）で 1 → ${f(z1)}、並びへ入れる（決まり5）で ${f(z1)} → ${f(z2)}／幅 ${f(p2.w)}`);
  P(`  ＝ raise が先に手前へ寄せるので、決まり5 は同じ面を書き直すだけ。ぶつからない`);
  await l2.close();
}
