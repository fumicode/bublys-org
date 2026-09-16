// 04 の冒頭コメントに書いてある直しが、本当にそうなっているかを測り直す（書いたあと一度も測っていなかった）。
//   node docs/bubble-space-prototype/v3/_check/04-recheck.mjs
import { openLab, V3 } from "./lab.mjs";

const SP = ["s1", "s2", "s3", "s4", "s5"];
let ng = 0;
const ok = (c, msg) => { console.log(`  ${c ? "OK " : "NG "} ${msg}`); if (!c) ng++; };
const vis = async (lab) => (await lab.placements()).filter((p) => (p.alpha ?? 1) > 0.02).length;

const lab = await openLab(`${V3}/04-ops-follow-axes.html`);
await lab.settle();

console.log("=== ① ヘッダは 24px に戻っているか（表は中身の箱の中） ===");
{
  const r = await lab.rect("s1");
  const c = await lab.page.evaluate(() => {
    const p = window.__lab.placements().find((q) => q.id === "s1");
    return p;
  });
  const head = await lab.page.evaluate(() => {
    // 中身の箱の上端 − 泡の上端 ＝ ヘッダ
    const s1 = window.__lab.placements().find((q) => q.id === "s1");
    const kid = window.__lab.placements().filter((q) => q.space === "s1");
    return { y: s1.y, h: s1.h, scale: s1.scale, kids: kid.length };
  });
  console.log("  s1", JSON.stringify(head));
  const cp = await lab.call("captionPoint", "s1", 0, 0);
  ok(cp && cp.y - r.y > 20 && cp.y - r.y < 40, `表の1行目が泡の上端から ${(cp.y - r.y).toFixed(1)}px（ヘッダ 24 の下）`);
}

console.log("\n=== ② 表の字の上の点は、その空間か（12点 × 5空間） ===");
for (const s of SP) {
  const rows = await lab.call("captionRows", s);
  let bad = 0, n = 0;
  for (let r = 0; r < rows.rows; r++) for (let c = 0; c < 3; c++) {
    const p = await lab.call("captionPoint", s, r, c);
    if (!p) continue;
    n++;
    const at = await lab.call("spaceAt", p.x, p.y);
    if (at !== s) { bad++; if (bad < 3) console.log(`    row${r} col${c} → ${at}`); }
  }
  ok(bad === 0, `${s}: ${n}点 すべて ${s}（外れ ${bad}）`);
}
{
  const rows = await lab.call("captionRows", "root");
  let bad = 0, n = 0;
  for (let r = 0; r < rows.rows; r++) for (let c = 0; c < 3; c++) {
    const p = await lab.call("captionPoint", "root", r, c);
    if (!p) continue;
    n++;
    const at = await lab.call("spaceAt", p.x, p.y);
    if (at !== "root") { bad++; console.log(`    root row${r} col${c} → ${at}`); }
  }
  ok(bad === 0, `root: ${n}点 すべて root（外れ ${bad}）`);
}

console.log("\n=== ③ 表の「背景」の列と、本物の背景ドラッグが合うか（5空間 × 横・縦） ===");
for (const s of SP) {
  for (const axis of ["x", "y"]) {
    const rule = (await lab.call("rulesOf", s)).bg[axis];
    const f0 = await lab.focusOf(s);
    const p = await lab.call("captionPoint", s, 1, 0);      // 表の字の上 ＝ その空間の背景
    const d = 60;
    await lab.dragPoint(p.x, p.y, p.x + (axis === "x" ? d : 0), p.y + (axis === "y" ? d : 0));
    const f1 = await lab.focusOf(s);
    const moved = Math.abs(f1[axis] - f0[axis]) > 0.5;
    ok(rule.kind === "none" ? !moved : moved,
       `${s} 背景${axis === "x" ? "横" : "縦"}：表「${rule.word}」／実際 焦点${axis.toUpperCase()} ${f0[axis].toFixed(1)} → ${f1[axis].toFixed(1)}`);
    await lab.call("resetFocus"); await lab.settle();
  }
}

console.log("\n=== ④ 方向ロック：止めた軸はどこにも効かない（左へ 330px で s5 のまま） ===");
await lab.call("setOption", "diag", "lock");
await lab.settle();
{
  const b0 = (await lab.bubbles()).find((b) => b.id === "s5v2");
  // 縦へ動き出してロック → 左へ 330px
  const p = await lab.call("headerPointOf", "s5v2");
  await lab.page.mouse.move(p.x, p.y);
  await lab.page.mouse.down();
  for (let i = 1; i <= 8; i++) { await lab.page.mouse.move(p.x, p.y + i * 3); await lab.page.waitForTimeout(8); }
  for (let i = 1; i <= 16; i++) { await lab.page.mouse.move(p.x - i * 330 / 16, p.y + 24); await lab.page.waitForTimeout(8); }
  await lab.page.mouse.up();
  await lab.settle();
  const b1 = (await lab.bubbles()).find((b) => b.id === "s5v2");
  ok(b1.parent === "s5", `親 ${b0.parent} → ${b1.parent}（s5 のまま）`);
  ok(b1.order === b0.order, `順序（横の軸）${b0.order} → ${b1.order}（横は止まっている）`);
  console.log(`    free.y ${b0.free.y} → ${b1.free.y}（縦は効いている）`);
}
await lab.call("setOption", "diag", "each");
await lab.page.reload();
await lab.page.waitForFunction(() => !!window.__lab);
await lab.settle();

console.log("\n=== ⑤ 履歴を奥行きに：Z の等間隔は 0.6 で、一番古い 版1 の字が読めるか ===");
{
  const v = await lab.viewOf("s4");
  ok(v.z.step === 0.6, `Z の間隔 ${v.z.step}`);
  const p = (await lab.placements()).find((q) => q.id === "s4v0");
  const fs = 12 * p.scale;
  ok(fs >= 6.5, `版1 の字 ${fs.toFixed(1)}px（下限 6.5）`);
  // 外の空間を手前へ 0.4 戻したとき
  await lab.page.evaluate(() => { window.__lab.setAxis("root", "z", {}); });
  const before = fs;
  await lab.wheel(700, 860, -100);            // root の表の空き地で手前へ
  const fr = await lab.focusOf("root");
  const p2 = (await lab.placements()).find((q) => q.id === "s4v0");
  console.log(`    root 焦点Z ${fr.z.toFixed(3)} のとき 版1 の字 ${(12 * p2.scale).toFixed(1)}px（前 ${before.toFixed(1)}）`);
  await lab.call("resetFocus"); await lab.settle();
}

console.log("\n=== ⑥ ★ root で奥へ1回ホイールすると、いくつ消えるか ===");
{
  const before = await vis(lab);
  const rootKids = (await lab.bubbles()).filter((b) => !b.parent).map((b) => b.id);
  const pt = await lab.call("captionPoint", "root", 1, 0);
  const at = await lab.call("spaceAt", pt.x, pt.y);
  console.log(`  ホイールの点 ${JSON.stringify(pt)} の下の空間 ${at}`);
  await lab.wheel(pt.x, pt.y, 100);
  const f = await lab.focusOf("root");
  const after = await vis(lab);
  const ps = await lab.placements();
  const gone = rootKids.filter((id) => { const p = ps.find((q) => q.id === id); return !p || (p.alpha ?? 1) <= 0.02; });
  console.log(`  root の子 ${rootKids.length} 個：${JSON.stringify(rootKids)}`);
  console.log(`  1回ホイール（deltaY 100）→ 焦点Z ${f.z.toFixed(3)}`);
  console.log(`  消えた root の子 ${gone.length} 個：${JSON.stringify(gone)}`);
  console.log(`  見えている泡 ${before} → ${after}`);
  // 「消える」の定義どおりか：消えた泡は dz<0 か
  const dz = await lab.page.evaluate(() => {
    const bs = window.__lab.bubbles().filter((b) => !b.parent);
    const f = window.__lab.focusOf("root").z;
    return bs.map((b) => ({ id: b.id, z: b.free.z, dz: +(b.free.z - f).toFixed(4) }));
  });
  console.log("  root の子の dz:", JSON.stringify(dz));
  ok(gone.every((id) => dz.find((d) => d.id === id).dz < 0), "消えたのは dz<0 の泡だけ（定義どおり）");
  // 一番奥は残るか
  ok(gone.length < rootKids.length, `全部は消えない（残り ${rootKids.length - gone.length}）`);
  // 最小のホイール量では？
  await lab.call("resetFocus"); await lab.settle();
  await lab.wheel(pt.x, pt.y, 4);
  const f2 = await lab.focusOf("root");
  const ps2 = await lab.placements();
  const gone2 = rootKids.filter((id) => { const p = ps2.find((q) => q.id === id); return !p || (p.alpha ?? 1) <= 0.02; });
  console.log(`  deltaY 4 でも → 焦点Z ${f2.z.toFixed(4)}、消えた ${gone2.length} 個`);
  await lab.call("resetFocus"); await lab.settle();
  // 同じ穴を「自由Zは手前の面で止める」で塞げるか（＝ Z の手前の端を焦点の面にする）
  await lab.call("setOption", "cross", "stopFree"); await lab.settle();
  await lab.wheel(pt.x, pt.y, 100);
  const f3 = await lab.focusOf("root");
  const ps3 = await lab.placements();
  const gone3 = rootKids.filter((id) => { const p = ps3.find((q) => q.id === id); return !p || (p.alpha ?? 1) <= 0.02; });
  console.log(`  「自由Zは手前の面で止める」で deltaY 100 → 焦点Z ${f3.z.toFixed(4)}、消えた ${gone3.length} 個、見えている泡 ${await vis(lab)}`);
  ok(gone3.length === 0, "止めると1つも消えない（代わりに奥へ行けない）");
  await lab.call("setOption", "cross", "hide");
  await lab.call("resetFocus"); await lab.settle();
}

console.log("\n=== ⑦ 「焦点を戻す」は道筋ぜんぶ 0 に戻すか ===");
{
  await lab.page.evaluate(() => { window.__lab.select("s4v0"); });
  await lab.settle();
  const pt = await lab.call("captionPoint", "root", 1, 0);
  await lab.wheel(pt.x, pt.y, 100);                  // root を真っ暗に
  const p4 = await lab.call("captionPoint", "s4", 1, 0);
  const f0 = { root: (await lab.focusOf("root")).z, s4: (await lab.focusOf("s4")).z };
  await lab.page.click("#refocus");
  await lab.settle();
  const f1 = { root: (await lab.focusOf("root")).z, s4: (await lab.focusOf("s4")).z };
  console.log(`  前 ${JSON.stringify(f0)} → 後 ${JSON.stringify(f1)}`);
  ok(Math.abs(f1.root) < 1e-9 && Math.abs(f1.s4) < 1e-9, "道筋（s4 → root）がぜんぶ 0");
  ok((await vis(lab)) === 31, `見えている泡 ${await vis(lab)}（31 に戻る）`);
}

console.log("\n=== ⑧ 「よそへ引く」：泡が動かない空間には行が出ないか ===");
for (const s of SP) {
  const r = await lab.call("crossRuleOf", s);
  const acc = await lab.call("acceptsDrop", s);
  console.log(`  ${s}: ${r.word}（${r.kind}） acceptsDrop=${acc}`);
}
{
  // X魚眼（s3）から外へ 400px 引いても出ないか
  const b0 = (await lab.bubbles()).find((b) => b.id === "s3v0");
  await lab.dragBubble("s3v0", { dy: 400 });
  const b1 = (await lab.bubbles()).find((b) => b.id === "s3v0");
  ok(b1.parent === "s3", `s3v0 の親 ${b0.parent} → ${b1.parent}（出られない）`);
  const c0 = (await lab.bubbles()).find((b) => b.id === "s2v0");
  await lab.dragBubble("s2v0", { dy: 300 });
  const c1 = (await lab.bubbles()).find((b) => b.id === "s2v0");
  ok(c1.parent !== "s2", `s2v0 の親 ${c0.parent} → ${c1.parent}（書ける軸があるので出られる）`);
}

console.log(`\nエラー ${lab.errors().length}  NG ${ng}`);
if (lab.errors().length) console.log(lab.errors().slice(0, 3).join("\n"));
await lab.close();
process.exit(ng || lab.errors().length ? 1 : 0);
