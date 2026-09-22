// 決まり5（空間を移っても見えている大きさを保つ）を、切って比べる。
//   node docs/bubble-space-prototype/v3/_check/01-rule5.mjs
import { openLab, V3 } from "./lab.mjs";
const FILE = `${V3}/01-snap-is-parent.html`;
const f = n => (n === null || n === undefined ? "-" : (+n).toFixed(3));
const P = (...a) => console.log(...a);
const bub = async (l, id) => (await l.bubbles()).find(b => b.id === id);
const pl = async (l, id) => (await l.placements()).find(p => p.id === id);

/** on=false なら 決まり5 を切る */
async function run(on, label, body) {
  const l = await openLab(FILE); await l.settle();
  if (!on) await l.page.evaluate("window.keepSeen = () => {}");
  const out = await body(l);
  P(`  ${label.padEnd(34)} 決まり5 ${on ? "あり" : "なし"}  ${out}`);
  if (l.errors().length) P("    エラー:", l.errors()[0]);
  await l.close();
}

const scenes = {
  /* root ↔ 並び（見えない親は Z を通すので、同じ窓の中の引っ越し） */
  async 並びへ入れる(l) {
    await l.call("snap", "list", "item", "left"); await l.settle();
    const b = await bub(l, "list"), p = await pl(l, "list");
    return `メモ一覧 奥行き ${f(b.free.z)}／幅 ${f(p.w)}`;
  },
  /* Z なしの空間（勤務表の格子）を通って戻る。古い奥行きを持ったまま出られるか */
  async 勤務表を通って戻る(l) {
    await l.wheel(700, 300, -120);                       // root の焦点 Z を手前へ
    const fz = (await l.call("focusOf", "root")).z;
    const st = await l.rect("staff");
    await l.dragBubble("list", { to: { x: st.x + st.w / 2, y: st.y + st.h + 30 } });   // 勤務表の中へ
    const inz = (await bub(l, "list")).free.z, inp = await pl(l, "list");
    const fd = await l.rect("fD");
    await l.dragBubble("list", { to: { x: fd.x + 230, y: fd.y + 40 } });               // root へ戻す
    const b = await bub(l, "list"), p = await pl(l, "list");
    return `焦点Z ${f(fz)}／中で 奥行き ${f(inz)} 幅 ${f(inp.w)} 親 ${(await bub(l, "list")).parent}／出たら 奥行き ${f(b.free.z)} 幅 ${f(p.w)} alpha ${f(p.alpha)}`;
  },
  /* 魚眼で縮んだ空間から出す（縮みが Z 由来でないとき） */
  async 魚眼で縮んだ中から出す(l) {
    await l.call("setAxis", "root", "x", { lens: "fisheye" }); await l.settle();
    const k = await pl(l, "kinmu");
    const fd = await l.rect("fD");
    await l.dragBubble("seiyaku", { to: { x: fd.x + 200, y: fd.y + 60 } });
    const b = await bub(l, "seiyaku"), p = await pl(l, "seiyaku");
    return `勤務表の倍率 ${f(k.scale)}／制約 奥行き 0 → ${f(b.free.z)} 幅 ${f(p && p.w)} 親 ${b.parent}`;
  },
};

for (const [name, body] of Object.entries(scenes)) {
  P(`\n══ ${name} ══`);
  await run(true, name, body);
  await run(false, name, body);
}
