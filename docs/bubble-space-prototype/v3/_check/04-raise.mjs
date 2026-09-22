// 04 に入れた「触った泡は最前面へ」を、表の言葉と本物のマウスで測って突き合わせる。
//   node docs/bubble-space-prototype/v3/_check/04-raise.mjs
import { openLab, V3 } from "./lab.mjs";

let ng = 0;
const ok = (c, msg) => { console.log(`  ${c ? "OK " : "NG "} ${msg}`); if (!c) ng++; };
const snap = async (lab, ids) => {
  const bs = await lab.bubbles();
  return ids.map((id) => { const b = bs.find((x) => x.id === id); return { id, order: b.order, z: +b.free.z.toFixed(4), hist: b.hist }; });
};
const frontOf = async (lab, ids) => {
  const ps = await lab.placements();
  const idx = ids.filter((id) => ps.some((p) => p.id === id)).map((id) => ({ id, i: ps.findIndex((p) => p.id === id) }));
  return idx.sort((a, b) => b.i - a.i)[0]?.id ?? null;
};
const clickBubble = async (lab, id) => {
  const q = await lab.call("headerPointOf", id);       // 隠れていない点を探して当てる
  await lab.page.mouse.click(q.x, q.y);
  await lab.settle();
};

const lab = await openLab(`${V3}/04-ops-follow-axes.html`);
await lab.settle();

const SP = [["s1", "自由"], ["s2", "順序"], ["s3", "X魚眼"], ["s4", "履歴を奥行きに"], ["s5", "混ざった軸"]];

console.log("=== ① 5つの空間：表の「触る」の行と、本物のクリックで起きた変化 ===");
for (const [s, name] of SP) {
  const kids = [0, 1, 2, 3, 4].map((i) => `${s}v${i}`);
  const cap = (await lab.call("captionOf", s))[0];
  const rule = await lab.call("touchRuleOf", s);
  const zdim = (await lab.viewOf(s)).z.dim;
  const before = await snap(lab, kids);
  const front0 = await frontOf(lab, kids);
  await clickBubble(lab, `${s}v4`);                      // 版5（初期は一番うしろ寄り）を触る
  const after = await snap(lab, kids);
  const front1 = await frontOf(lab, kids);
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  console.log(`  ${s} ${name}  Z＝${zdim}`);
  console.log(`    表  「${cap}」`);
  console.log(`    前  ${JSON.stringify(before)}  手前 ${front0}`);
  console.log(`    後  ${JSON.stringify(after)}  手前 ${front1}`);
  if (rule.kind === "write") ok(changed && front1 === `${s}v4`, `表「${rule.word}」＝ 値が書かれ、版5 が手前になった`);
  else ok(!changed && front1 === front0, `表「${rule.word}」＝ 何も変わらない`);
}

console.log("\n=== ② 自由Z の空間で触ったとき（土台 00-core の直しを移した形） ===");
{
  const vis = async (id) => { const p = (await lab.placements()).find((q) => q.id === id); return p ? +(p.alpha ?? 1).toFixed(3) : null; };
  await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
  const zf = (await lab.focusOf("s1")).z;
  console.log(`  s1 の焦点Z ${zf}`);
  console.log(`  表  「${(await lab.call("captionOf", "s1"))[0]}」`);
  const b0 = (await lab.bubbles()).find((b) => b.id === "s1v3");
  await clickBubble(lab, "s1v3");
  const b1 = (await lab.bubbles()).find((b) => b.id === "s1v3");
  const a1 = await vis("s1v3");
  console.log(`  s1v3（版4）を触る：free.z ${b0.free.z} → ${b1.free.z}  dz ${(b1.free.z - zf).toFixed(3)}  透明度 ${a1}`);
  ok(a1 > 0.02, `触った泡は見えたまま（透明度 ${a1}）`);
  ok(Math.abs(b1.free.z - zf) < 1e-9, `書き先は焦点の面（${b1.free.z}）＝ それより手前へは出せない`);
  const gone = (await lab.placements()).filter((p) => p.space === "s1" && (p.alpha ?? 1) <= 0.02).map((p) => p.id);
  ok(gone.length === 0, `s1 で消えた泡 ${gone.length} 個`);
  // 何度触ってもずれない
  const zs = [];
  for (let i = 0; i < 4; i++) { await clickBubble(lab, "s1v0"); await clickBubble(lab, "s1v1");
    const bs = await lab.bubbles();
    zs.push([+bs.find((b) => b.id === "s1v0").free.z.toFixed(3), +bs.find((b) => b.id === "s1v1").free.z.toFixed(3)]); }
  console.log(`  版1・版2 を 4 往復：free.z ${JSON.stringify(zs)}`);
  ok(zs.every((z) => z[0] === 0 && z[1] === 0), "焦点の面で止まるので、何度触ってもずれていかない");
  // 同じ面に来たので、上下は決まらない
  const front = await frontOf(lab, [0, 1, 2, 3, 4].map((i) => `s1v${i}`));
  const zall = (await lab.bubbles()).filter((b) => b.parent === "s1").map((b) => +b.free.z.toFixed(3));
  console.log(`  s1 の free.z ${JSON.stringify(zall)}  手前 ${front}（同じ面の上下は決まらない）`);
  const vis5 = (await lab.placements()).filter((p) => p.space === "s1" && (p.alpha ?? 1) > 0.02).length;
  ok(vis5 === 5, `5つとも見えたまま（${vis5}）`);
}

console.log("\n=== ③ Z が「順序」の空間（重ねて置く）… 何度触ってもずれない ===");
{
  await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
  await lab.page.evaluate(() => { window.__lab.select("s1v0"); window.__lab.preset("stackZ", "s1"); });
  await lab.settle();
  const kids = [0, 1, 2, 3, 4].map((i) => `s1v${i}`);
  console.log(`  表  「${(await lab.call("captionOf", "s1"))[0]}」`);
  console.log(`  はじめ ${JSON.stringify((await snap(lab, kids)).map((x) => x.id + ":" + x.order))}  手前 ${await frontOf(lab, kids)}`);
  for (const id of ["s1v4", "s1v2", "s1v4", "s1v0"]) {
    await clickBubble(lab, id);
    const o = (await snap(lab, kids)).map((x) => x.id + ":" + x.order);
    console.log(`  ${id} を触る → 手前 ${await frontOf(lab, kids)}  順序 ${JSON.stringify(o)}`);
  }
  const os = (await snap(lab, kids)).map((x) => x.order).sort((a, b) => a - b);
  ok(JSON.stringify(os) === JSON.stringify([0, 1, 2, 3, 4]), `順序は 0..4 に収まったまま（${JSON.stringify(os)}）`);
  const vis = (await lab.placements()).filter((p) => p.space === "s1" && (p.alpha ?? 1) > 0.02).length;
  ok(vis === 5, `5つとも見えたまま（${vis}）`);
  await lab.shot("raise-stackZ");
}

console.log("\n=== ④ 完全に隠れた泡はクリックで当たらないので上がらない ===");
{
  // 重ねて置く の s1 で、版2 を 版1 にぴったり重ねる（同じ大きさなので完全に隠れる）
  const r1 = await lab.rect("s1v0"), r2 = await lab.rect("s1v1");
  await lab.dragBubble("s1v1", { dx: r1.x - r2.x, dy: r1.y - r2.y });
  const a = await lab.rect("s1v0"), b = await lab.rect("s1v1");
  console.log(`  版1 ${JSON.stringify(a)}  版2 ${JSON.stringify(b)}`);
  const same = Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5 && Math.abs(a.w - b.w) < 1.5;
  ok(same, "版1 と 版2 がぴったり重なった（うしろは完全に隠れる）");
  const front0 = await frontOf(lab, ["s1v0", "s1v1"]);
  const back = front0 === "s1v0" ? "s1v1" : "s1v0";
  console.log(`  手前 ${front0}／うしろ（隠れている） ${back}`);
  // うしろの泡の中心をクリック（＝手前の泡に当たる）
  for (let i = 0; i < 3; i++) { await lab.page.mouse.click(a.x + a.w / 2, a.y + 6); await lab.settle(); }
  const front1 = await frontOf(lab, ["s1v0", "s1v1"]);
  ok(front1 === front0, `同じ点を3回クリック → 手前は ${front1} のまま（隠れた ${back} は上がらない）`);
  // __lab の headerPointOf で「当たる点」を探しても見つからない
  const q = await lab.call("headerPointOf", back);
  await lab.page.mouse.click(q.x, q.y);
  await lab.settle();
  const front2 = await frontOf(lab, ["s1v0", "s1v1"]);
  console.log(`  隠れた ${back} の点 ${JSON.stringify(q)} をクリック → 手前 ${front2}`);
  ok(front2 === front0, "隠れた泡は、どの点からも触れない");
}

console.log("\n=== ⑤ 外の空間（root）… 同じ値（z=0）で並んだ兄弟は上下が決まらない ===");
{
  await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
  console.log(`  表  「${(await lab.call("captionOf", "root"))[0]}」`);
  const ids = ["s1", "s2", "s3", "s4", "s5", "deep"];
  const before = await snap(lab, ids);
  await clickBubble(lab, "s3");
  const after = await snap(lab, ids);
  console.log(`  前 ${JSON.stringify(before.map((x) => x.id + ":" + x.z))}`);
  console.log(`  後 ${JSON.stringify(after.map((x) => x.id + ":" + x.z))}`);
  ok(JSON.stringify(before) === JSON.stringify(after),
     "すでに一番手前（z=0 が5つ）なので、触っても書かれない ＝ 上下は決まらない");
  await clickBubble(lab, "deep");
  const d = (await lab.bubbles()).find((b) => b.id === "deep");
  const p = (await lab.placements()).find((q) => q.id === "deep");
  console.log(`  奥のメモ（z 1.5）を触る → free.z ${d.free.z}  透明度 ${(p.alpha ?? 1).toFixed(3)}`);
}

console.log("\n=== ⑥ 格子で、よその空間から同じマスへ来たとき（freeCellNear） ===");
{
  await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
  // s2（順序）と s5（混ざった軸）を 格子 に。s5 の版1 を s2 の版1 と同じマスへ落とす
  await lab.page.evaluate(() => { window.__lab.select("s2v0"); window.__lab.preset("grid", "s2"); });
  await lab.settle();
  const cells0 = (await lab.bubbles()).filter((b) => b.parent === "s2").map((b) => `${b.id}:${b.cell.col},${b.cell.row}`);
  console.log(`  s2 を格子に → ${JSON.stringify(cells0)}`);
  const target = await lab.rect("s2v2");
  const src = await lab.rect("s5v0");
  await lab.dragBubble("s5v0", { to: { x: target.x + target.w / 2, y: target.y + 8 } });
  const after = (await lab.bubbles()).filter((b) => b.parent === "s2").map((b) => `${b.id}:${b.cell.col},${b.cell.row}`);
  console.log(`  s5v0 を s2v2 のマスへ落とす → ${JSON.stringify(after)}`);
  const cells = (await lab.bubbles()).filter((b) => b.parent === "s2").map((b) => `${b.cell.col},${b.cell.row}`);
  ok(new Set(cells).size === cells.length, `同じマスに2つ入っていない（${cells.length} 個・${new Set(cells).size} マス）`);
  await lab.shot("freecell");
}

console.log("\n=== ⑦ 「触ると最前面へ」と「空間を移ったときの free.z」はぶつからないか ===");
{
  await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
  // 外の空間（自由Z）の焦点を奥へ送ってから、s1 の泡を外の空間へ引き出す
  const pt = await lab.call("captionPoint", "root", 2, 0);
  const f0 = (await lab.focusOf("root")).z;
  const b0 = (await lab.bubbles()).find((b) => b.id === "s1v4");
  const r = await lab.rect("deep");
  await lab.dragBubble("s1v4", { to: { x: r.x + r.w / 2 + 180, y: r.y + 10 } });
  const b1 = (await lab.bubbles()).find((b) => b.id === "s1v4");
  const f1 = (await lab.focusOf("root")).z;
  const p = (await lab.placements()).find((q) => q.id === "s1v4");
  console.log(`  版5 を 外の空間 へ引き出す：親 ${b0.parent} → ${b1.parent}  free.z ${b0.free.z} → ${b1.free.z}（外の空間の焦点Z ${f1}）  透明度 ${(p.alpha ?? 1).toFixed(3)}`);
  ok(b1.parent === null, "外の空間へ出た");
  ok(Math.abs(b1.free.z - f1) < 1e-9, "落とした先の焦点の面に置かれた（raise の書き先と同じ ＝ 打ち消し合わない）");
  ok((p.alpha ?? 1) > 0.02, "消えない");
  // もう一度触っても同じ面から動かない
  await clickBubble(lab, "s1v4");
  const b2 = (await lab.bubbles()).find((b) => b.id === "s1v4");
  ok(Math.abs(b2.free.z - f1) < 1e-9, `触っても焦点の面のまま（${b2.free.z}）`);
}

console.log(`\nエラー ${lab.errors().length}  NG ${ng}`);
if (lab.errors().length) console.log(lab.errors().slice(0, 3).join("\n"));
await lab.close();
process.exit(ng || lab.errors().length ? 1 : 0);
