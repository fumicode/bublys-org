// 掴んで動かせるか。── masa さんが困っていたのはここ。
//   ★ 掴んだ点がカーソルからずれないこと（canvas 版は 0px。魚眼の中でも軸ごとに逆写しして合わせている）
//   ★ 並べ替え・マス移動は、引いている間カーソルについてきて、差し込まれる位置に印が出る
//   node docs/bubble-space-prototype/v5-dom/_check/drag.mjs
import { openLab, ok, num } from "./lab.mjs";

const lab = await openLab();
await lab.settle();

/** 泡を掴んで引き、引いている途中ずっと「掴んだ点」がカーソルからどれだけずれるか測る */
async function grabDrift(id, dx, dy, label) {
  await lab.settle();
  const p0 = await lab.headerPointOf(id);
  const r0 = await lab.rect(id);
  const fx = (p0.x - r0.x) / r0.w, fy = (p0.y - r0.y) / r0.h;
  const off = await lab.page.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(); return { x: r.left, y: r.top }; });
  let worst = 0, last = null;
  await lab.page.mouse.move(p0.x, p0.y);
  await lab.page.mouse.down();
  const N = 14;
  for (let i = 1; i <= N; i++) {
    const mx = p0.x + dx * i / N, my = p0.y + dy * i / N;
    await lab.page.mouse.move(mx, my);
    await lab.page.waitForTimeout(8);
    const r = await lab.rect(id);
    const gx = r.x + fx * r.w, gy = r.y + fy * r.h;
    last = { d: Math.max(Math.abs(gx - mx), Math.abs(gy - my)), gx, gy, mx, my };
    worst = Math.max(worst, last.d);
  }
  await lab.page.mouse.up();
  await lab.settle();
  console.log(`  ${label}：${dx},${dy}px 引くあいだ、掴んだ点とカーソルのずれ 最大 ${num(worst, 3)}px`);
  return worst;
}

console.log("■ 掴んだ点がカーソルからずれないか（自由に動く空間）");
ok(await grabDrift("memo1", 140, 90, "メモ（外の空間・自由）") < 0.6, "自由な空間：ずれ < 0.6px");
ok(await grabDrift("seiyaku", 60, 40, "制約（勤務表の中・マス移動）") < 0.6, "入れ子の中：ずれ < 0.6px");

console.log("\n■ 魚眼の中でもずれないか");
await lab.select("cf3"); await lab.settle();
ok(await grabDrift("cf3", 90, 0, "写真4（coverflow・X 魚眼・順序）") < 0.6, "魚眼 × 並べ替え：ずれ < 0.6px");

console.log("\n■ 並べ替え（横に並べる）");
{
  const before = (await lab.bubbles()).filter((b) => b.parent === "row").sort((a, b) => a.order - b.order).map((b) => b.title);
  let mark = null;
  await lab.dragBubble("row0", { dx: 230, steps: 14, onMove: async (i) => {
    if (i === 9) mark = await lab.page.evaluate(() => { const e = document.querySelector("#marks .mk-line");
      return e ? (({ left, top, width, height }) => ({ left: +left.toFixed(1), top: +top.toFixed(1), width, height }))(e.getBoundingClientRect()) : null; });
  } });
  const after = (await lab.bubbles()).filter((b) => b.parent === "row").sort((a, b) => a.order - b.order).map((b) => b.title);
  console.log(`  小 を右へ 230px：${before.join("→")}  ⇒  ${after.join("→")}`);
  console.log(`  引いている間の「差し込まれる位置」の印：${JSON.stringify(mark)}`);
  ok(before.join() !== after.join(), "並べ替わった");
  ok(mark && mark.width <= 4 && mark.height > 40, "差し込まれる位置に縦の印が出ていた");
}

console.log("\n■ マスを移る（カレンダー）");
{
  const b0 = (await lab.bubbles()).find((b) => b.id === "d3");
  let rect = null;
  await lab.dragBubble("d3", { dx: 46, dy: 38, steps: 14, onMove: async (i) => {
    if (i === 10) rect = await lab.page.evaluate(() => !!document.querySelector("#marks .mk-cell"));
  } });
  const b1 = (await lab.bubbles()).find((b) => b.id === "d3");
  console.log(`  「4」を右下へ：マス (${b0.cell.col},${b0.cell.row}) → (${b1.cell.col},${b1.cell.row})　引いている間のマスの印 ${rect}`);
  ok(b1.cell.col !== b0.cell.col || b1.cell.row !== b0.cell.row, "別のマスへ移った");
  ok(rect === true, "入るマスに印が出ていた");
}

console.log("\n■ 背景を引く／ホイール（視点）");
{
  const f0 = await lab.focusOf("cover");
  const r = await lab.rect("cover");
  await lab.dragPoint(r.x + r.w / 2, r.y + r.h - 12, r.x + r.w / 2 - 80, r.y + r.h - 12);
  const f1 = await lab.focusOf("cover");
  console.log(`  coverflow の背景を横に −80px：焦点 X ${num(f0.x, 3)} → ${num(f1.x, 3)}`);
  ok(Math.abs(f1.x - f0.x) > 1e-6, "背景を引くと、カーソルの下の空間の焦点が動く");

  const g = await lab.rect("giji");
  const z0 = (await lab.focusOf("giji")).z;
  await lab.wheel(g.x + g.w / 2, g.y + g.h - 20, 150);
  const z1 = (await lab.focusOf("giji")).z;
  console.log(`  議事録（版）の中でホイール：焦点 Z ${num(z0, 3)} → ${num(z1, 3)}`);
  ok(Math.abs(z1 - z0) > 1e-6, "ホイールで奥行きの視点が動く");

  const rw = await lab.rect("row");
  const w0 = await lab.focusOf("row");
  await lab.wheel(rw.x + rw.w / 2, rw.y + rw.h - 10, 150);
  const w1 = await lab.focusOf("row");
  console.log(`  横に並べるの中（Z は なし）でホイール：焦点 Z ${num(w0.z, 3)} → ${num(w1.z, 3)}`);
  ok(Math.abs(w1.z - w0.z) < 1e-9, "Z が なし なら、ホイールは何も起きない");
}

console.log("\n■ 右下の角で大きさを変える（選択中の泡だけ）");
{
  const ID = "fC";                         // 付箋C（ほかの泡と重なっていない）
  await lab.select(ID); await lab.settle();
  const r0 = await lab.rect(ID);
  const cx = r0.x + r0.w - 5, cy = r0.y + r0.h - 5;
  const at = await lab.elAt(cx, cy);
  console.log(`  角の点 (${num(cx)},${num(cy)}) に当たったもの：${JSON.stringify(at)}`);
  ok(at && at.kind === "handle" && at.id === ID, "角が掴める（.hnd が当たる）");
  const pos0 = { x: r0.x, y: r0.y };
  const others0 = Object.fromEntries((await lab.placements()).map((p) => [p.id, [p.x, p.y]]));
  await lab.dragPoint(cx, cy, cx + 70, cy + 40);
  const r1 = await lab.rect(ID);
  const others1 = Object.fromEntries((await lab.placements()).map((p) => [p.id, [p.x, p.y]]));
  const moved = Object.entries(others1).filter(([id, v]) => others0[id] && id !== ID
    && (Math.abs(v[0] - others0[id][0]) > 0.05 || Math.abs(v[1] - others0[id][1]) > 0.05));
  console.log(`  付箋C の角を +70,+40：${num(r0.w)}x${num(r0.h)} → ${num(r1.w)}x${num(r1.h)}`
            + `　左上 (${num(pos0.x)},${num(pos0.y)}) → (${num(r1.x)},${num(r1.y)})　動いた他の泡 ${moved.length} 個`);
  if (moved.length) console.log(`    動いた：${moved.map(([id, v]) => `${id} (${num(others0[id][0])},${num(others0[id][1])})→(${num(v[0])},${num(v[1])})`).join(" / ")}`);
  ok(r1.w > r0.w + 60 && r1.h > r0.h + 35, "角を引いた分だけ大きくなった");
  ok(Math.abs(r1.x - pos0.x) < 0.5 && Math.abs(r1.y - pos0.y) < 0.5, "⑤ 大きさを変えた泡の左上は動かない");
  ok(moved.length === 0, "⑤ 触っていない泡は画面の上で動かない");
}

console.log("\n■ 空間の出入り");
{
  // 外の泡を 勤務表 の中へ落とす
  const before = (await lab.bubbles()).find((b) => b.id === "memo3").parent;
  const k = await lab.rect("cal");
  await lab.dragBubble("memo3", { to: { x: k.x + k.w * 0.5, y: k.y + k.h * 0.5 } });
  const mid = (await lab.bubbles()).find((b) => b.id === "memo3").parent;
  console.log(`  思いつき を カレンダーの中へ：親 ${before} → ${mid}`);
  ok(mid !== before, "空間を持つ泡の中へ落とすと、その子になる");
  // 外へ大きく引き出す
  await lab.dragBubble("memo3", { to: { x: 240, y: 840 } });
  const out = (await lab.bubbles()).find((b) => b.id === "memo3").parent;
  console.log(`  そこから外へ大きく引き出す：親 ${mid} → ${out}`);
  ok(out === null || out === undefined, "外へ大きく引き出すと、外の空間へ出る");
}

console.log("\n■ 同じマスに2つ入れない（よそから来た泡に押された先客は、1人ずつ順に一番近い空きマスへ）");
{
  await lab.dragBubble("d13", { to: { x: 200, y: 850 } });      // 「14」を外へ出して (6,1) を空ける
  const t6 = await lab.rect("d6");
  await lab.dragBubble("p0", { to: { x: t6.x + t6.w / 2, y: t6.y + t6.h / 2 } });   // 佐藤を「7」のマスへ
  const bs = (await lab.bubbles()).filter((b) => b.parent === "cal");
  const dup = {};
  for (const b of bs) { const k = b.cell.col + "," + b.cell.row; dup[k] = (dup[k] || 0) + 1; }
  const over = Object.entries(dup).filter(([, n]) => n > 1);
  console.log(`  カレンダーの中：${bs.map((b) => `${b.id}(${b.cell.col},${b.cell.row})`).join(" ")}`);
  ok(bs.some((b) => b.id === "p0"), "よその空間（スタッフ）から来た泡が カレンダーの中に入った");
  ok(over.length === 0, `同じマスに2つ入らない（先客が一番近い空きマスへ逃げた）${JSON.stringify(over)}`);
  const ps = (await lab.placements()).filter((q) => q.space === "cal");
  let hit = 0;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j];
    if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) hit++;
  }
  console.log(`  画面で重なっている組 ${hit}`);
  ok(hit === 0, "画面でも重なっていない");
}

await lab.shot("drag");
const errs = lab.errors();
ok(errs.length === 0, `コンソールエラー 0（${errs.length}）`);
errs.forEach((e) => console.log("      " + e));
await lab.close();
