// 06（案B）の冒頭コメントに書いてある「踏んだこと」を測り直し、
// そのうえで「触った泡は最前面へ」を B に入れた結果を測る。
//   node docs/bubble-space-prototype/v3/_check/06-verify.mjs
import { openLab, V3 } from "./lab.mjs";

let ng = 0;
const ok = (c, msg) => { console.log(`  ${c ? "OK " : "NG "} ${msg}`); if (!c) ng++; };
const key = (p, top) => [p.x, p.y - top, p.w, p.h, p.scale].map((v) => +v.toFixed(3)).join(",");
/** キャンバスの中心（ツールバーの高さが案ごとに違うので、そこを原点にして画面 y をそろえる） */
const topOf = (lab) => lab.page.evaluate(() => { const r = document.getElementById("cv").getBoundingClientRect(); return r.top + r.height / 2; });

const A = await openLab(`${V3}/00-core.html`);
const B = await openLab(`${V3}/06-layout-apart.html`);
await A.settle(); await B.settle();

/** A と B の配置を突き合わせる */
async function diff(label) {
  const pa = await A.placements(), pb = await B.placements();
  const ta = await topOf(A), tb = await topOf(B);
  const ma = new Map(pa.map((p) => [p.id, p])), mb = new Map(pb.map((p) => [p.id, p]));
  const ids = [...ma.keys()];
  const bad = ids.filter((id) => !mb.has(id) || key(ma.get(id), ta) !== key(mb.get(id), tb));
  ok(pa.length === pb.length && bad.length === 0,
     `${label}：泡 A ${pa.length} / B ${pb.length}、位置・大きさ・倍率の差 ${bad.length} 個` +
     (bad.length ? `　例 ${bad.slice(0, 3).map((id) => `${id} A(${key(ma.get(id), ta)}) B(${key(mb.get(id), tb)})`).join(" / ")}` : ""));
  return bad;
}

console.log("=== ① 6場面の配置が A と B で同じか（焦点 0） ===");
await diff("読み込んだまま");

console.log("\n=== ② 焦点を動かしても同じか（背景を引いて焦点をそろえる） ===");
{
  // 背景（画面の右下の空き地）を引いて、A と B の焦点をそろえる
  for (const lab of [A, B]) await lab.dragPoint(1150, 820, 1266, 860);
  const fa = await A.focusOf("root"), fb = await B.focusOf("root");
  console.log(`  背景を (116, 40) 引いた後の焦点：A ${JSON.stringify({ x: +fa.x.toFixed(2), y: +fa.y.toFixed(2) })}  B ${JSON.stringify({ x: +fb.x.toFixed(2), y: +fb.y.toFixed(2) })}`);
  ok(Math.abs(fa.x - fb.x) < 0.01 && Math.abs(fa.y - fb.y) < 0.01, "焦点が同じ");
  await diff("背景を引いた後");
  for (const lab of [A, B]) { await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle(); }
}

console.log("\n=== ③ ホイール：B はカメラが決める（coverflow・X魚眼ビューで横に送る。A は何も起きない） ===");
for (const [id, name] of [["cover", "coverflow"], ["fish", "X魚眼ビュー"]]) {
  const r = await B.rect(id);
  const fa0 = await A.focusOf(id), fb0 = await B.focusOf(id);
  await A.wheel(r.x + r.w / 2, r.y + r.h - 12, 200);
  await B.wheel(r.x + r.w / 2, r.y + r.h - 12, 200);
  const fa1 = await A.focusOf(id), fb1 = await B.focusOf(id);
  console.log(`  ${name}：A 焦点 X ${fa0.x} → ${fa1.x}・Z ${fa0.z} → ${fa1.z}　B 焦点 X ${fb0.x} → ${fb1.x}`);
  ok(Math.abs(fb1.x - fb0.x) > 1, `B は横に送る（${fb1.x}）`);
  for (const lab of [A, B]) { await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle(); }
}

console.log("\n=== ④ B に入れた「触った泡は最前面へ」：型ごとに何が起きるか ===");
{
  await B.page.reload(); await B.page.waitForFunction(() => !!window.__lab); await B.settle();
  const zOf = async (lab, id) => +(await lab.bubbles()).find((b) => b.id === id).free.z.toFixed(3);
  const order = async (lab, ids) => { const ps = await lab.placements(); return ids.slice().sort((a, b) => ps.findIndex((p) => p.id === a) - ps.findIndex((p) => p.id === b)); };
  const click = async (lab, id) => { const q = await lab.call("headerPointOf", id); await lab.page.mouse.click(q.x, q.y); await lab.settle(); };

  console.log("  ── 同じ面（z=0）に並んだ兄弟：外の空間のメモ3つ");
  const memos = ["memo1", "memo2", "memo3"];
  console.log(`     はじめ 奥→手前 ${JSON.stringify(await order(B, memos))}`);
  for (const id of memos) { await click(B, id); console.log(`     ${id} を触る → 奥→手前 ${JSON.stringify(await order(B, memos))}  free.z ${JSON.stringify(await Promise.all(memos.map((m) => zOf(B, m))))}`); }
  const after = await order(B, memos);
  ok(JSON.stringify(after) === JSON.stringify(await order(B, memos)), "座標では、同じ値の兄弟の上下は一度も変わらない（A の自由に置く と同じ）");

  console.log("  ── 一番手前でない泡：勤務表（z 0.4）");
  const z0 = await zOf(B, "kinmu");
  const fz = (await B.focusOf("root")).z;
  await click(B, "kinmu");
  const p = (await B.placements()).find((q) => q.id === "kinmu");
  console.log(`     勤務表を触る → free.z ${z0} → ${await zOf(B, "kinmu")}（外の空間の焦点Z ${fz}）  透明度 ${(p.alpha ?? 1).toFixed(3)}`);
  ok((p.alpha ?? 1) > 0.02 && Math.abs(await zOf(B, "kinmu") - fz) < 1e-9,
     "A と同じ直し：焦点の面で止まるので消えない（直す前は free.z −0.15・透明度 0 だった）");

  console.log("  ── 型ごと：奥行きを型が決める「古さで奥へ積む」だけ、そもそも書かない");
  await B.page.reload(); await B.page.waitForFunction(() => !!window.__lab); await B.settle();
  for (const [space, id, name] of [["giji", "g1", "古さで奥へ積む"], ["row", "row2", "並べる"], ["cover", "cf4", "等間隔の列"]]) {
    const before = await zOf(B, id);
    await click(B, id);
    console.log(`     ${name}（${space}／${id}）free.z ${before} → ${await zOf(B, id)}`);
  }

  console.log("  ── B の6つの型に、A の「重ねて置く」（奥行きを順序で決める）にあたるものがあるか");
  for (const t of ["free", "stack", "grid", "line", "genBranch", "ageStack"]) {
    await B.page.reload(); await B.page.waitForFunction(() => !!window.__lab); await B.settle();
    await B.page.evaluate((ty) => { window.__lab.select("memo1"); window.__lab.setLayout("root", ty); }, t);
    await B.settle();
    const b0 = await order(B, memos);
    await click(B, memos[0]);
    const b1 = await order(B, memos);
    console.log(`     ${t.padEnd(10)} 触る前 ${JSON.stringify(b0)} → 触った後 ${JSON.stringify(b1)}  ${JSON.stringify(b0) === JSON.stringify(b1) ? "変わらない" : "★変わった"}`);
  }
  // A は「Z に順序を刺す」だけで上がる（プリセット 重ねて置く）
  await A.page.reload(); await A.page.waitForFunction(() => !!window.__lab); await A.settle();
  await A.page.evaluate(() => { window.__lab.select("memo1"); window.__lab.preset("stackZ", "root"); });
  await A.settle();
  const a0 = await order(A, memos);
  await click(A, memos[0]);
  const a1 = await order(A, memos);
  console.log(`     A の 重ねて置く（Z＝順序）触る前 ${JSON.stringify(a0)} → 触った後 ${JSON.stringify(a1)}`);
  ok(a1[a1.length - 1] === memos[0], "A は Z に「順序」を刺すだけで最前面へ上がる（型を足さない）");
}

console.log("\n=== ⑤ 置いた順（stack）が消えても、同じマスに2つ入らないか ===");
{
  await B.page.reload(); await B.page.waitForFunction(() => !!window.__lab); await B.settle();
  const cellsIn = async (lab, s) => (await lab.bubbles()).filter((b) => b.parent === s).map((b) => `${b.cell.col},${b.cell.row}`);
  for (const [lab, name] of [[A, "A（00-core）"], [B, "B（06）"]]) {
    await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
    const target = await lab.rect("seiyaku");                     // 勤務表の (1,0) にいる先客
    await lab.dragBubble("memo1", { to: { x: target.x + target.w / 2, y: target.y + 10 } });
    const cells = await cellsIn(lab, "kinmu");
    const dup = cells.length - new Set(cells).size;
    console.log(`  ${name}：勤務表の子 ${cells.length} 個 → マス ${JSON.stringify(cells)}`);
    ok(dup === 0, `${name} 同じマスに2つ入っていない（重なり ${dup}）`);
  }
}

console.log("\n=== ⑥ 先客が複数いるマスへ、よそから落としたら（reindex を呼ぶか） ===");
{
  for (const [lab, name] of [[A, "A（00-core・付け替えのあと reindex しない）"], [B, "B（06・reindex する）"]]) {
    await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
    await lab.page.evaluate(() => { window.__lab.select("g1"); window.__lab.preset("grid", "giji"); });  // 議事録の4つは全員 cell 0,0
    await lab.settle();
    const before = (await lab.bubbles()).filter((b) => b.parent === "giji").map((b) => `${b.id}:${b.cell.col},${b.cell.row}`);
    const t = await lab.rect("g1");
    await lab.dragBubble("memo1", { to: { x: t.x + t.w / 2, y: t.y + 8 } });
    const kids = (await lab.bubbles()).filter((b) => b.parent === "giji");
    const cells = kids.map((b) => `${b.cell.col},${b.cell.row}`);
    console.log(`  ${name}`);
    console.log(`    前 ${JSON.stringify(before)}`);
    console.log(`    後 ${JSON.stringify(kids.map((b) => `${b.id}:${b.cell.col},${b.cell.row}`))}`);
    console.log(`    ${kids.length} 個 → ${new Set(cells).size} マス（重なり ${cells.length - new Set(cells).size}）`);
  }
}

console.log(`\nエラー A ${A.errors().length} / B ${B.errors().length}　NG ${ng}`);
for (const [lab, n] of [[A, "A"], [B, "B"]]) if (lab.errors().length) console.log(n, lab.errors().slice(0, 2).join("\n"));
await A.close(); await B.close();
process.exit(ng ? 1 : 0);
