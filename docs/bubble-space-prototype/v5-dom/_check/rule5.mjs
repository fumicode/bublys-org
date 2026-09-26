// （v4/_check の写し。DOM 版で同じことが起きるか確かめる）
// 規則⑤ 触っていない泡は、画面の上で動かない
//   泡の角を +60px 広げたとき、触っていない泡が 0.0px（pin を切れば、箱の伸びのちょうど半分だけ動く）
//   ＋ 並べ替えは留めない／差し込みでは「差し込む所より前」だけが留まる
//   node docs/bubble-space-prototype/v5-dom/_check/rule5.mjs
import { openLab } from "./lab.mjs";

const lab = await openLab();
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "  OK " : "  NG "} ${msg}`); if (!c) ng++; };

const WATCH = ["kinmu", "staff", "cal", "seiyaku", "p1", "memo1", "fA"];
const rects = async () => Object.fromEntries(await Promise.all(WATCH.map(async (id) => [id, await lab.rect(id)])));

/** 佐藤（スタッフの中の先頭）の右下の角を、本物のマウスで dx だけドラッグする */
async function widen(dx) {
  await lab.select("p0");                 // 角は選択中の泡にだけ出る（handleAt）
  await lab.settle();
  const r = await lab.rect("p0");
  await lab.page.mouse.move(r.x + r.w - 4, r.y + r.h - 4);
  await lab.page.mouse.down();
  for (let i = 1; i <= 12; i++) { await lab.page.mouse.move(r.x + r.w - 4 + dx * i / 12, r.y + r.h - 4); await lab.page.waitForTimeout(8); }
  await lab.page.mouse.up();
  await lab.settle();
}

// 下ごしらえ：スタッフは自前 120px で、佐藤（76px）より広い。そのままだと最初の伸びが自前の大きさに吸われて
// 「箱の伸び ＝ 泡の伸び」にならないので、先に一度広げて、スタッフの箱を中身が決める形にしておく
await widen(60);
console.log(`下ごしらえ：スタッフの箱は中身（佐藤）が決める形になった（${(await lab.rect("staff")).w.toFixed(1)}px）`);

for (const on of [true, false]) {
  await lab.call("setPin", on);
  const before = await rects(), box0 = (await lab.rect("staff")).w;
  await widen(60);
  const after = await rects(), box1 = (await lab.rect("staff")).w;
  console.log(`\n■ pin ${on ? "入り" : "切り"}：佐藤の角を +60px（スタッフの箱 ${box0.toFixed(1)} → ${box1.toFixed(1)}px、伸び ${(box1 - box0).toFixed(1)}px）`);
  const half = -(box1 - box0) / 2;
  for (const id of WATCH) {
    const d = after[id].x - before[id].x;
    console.log(`  ${id.padEnd(8)} 左上の横のずれ ${d >= 0 ? " " : ""}${d.toFixed(1)}px`);
  }
  if (on) {
    for (const id of ["kinmu", "staff", "memo1", "fA"])
      ok(Math.abs(after[id].x - before[id].x) < 0.05 && Math.abs(after[id].y - before[id].y) < 0.05,
         `pin 入り：${id} は 0.0px（触っていない）`);
    console.log(`  （カレンダーは帯が広がった分だけ押される：${(after.cal.x - before.cal.x).toFixed(1)}px ＝ 伸び ${(box1 - box0).toFixed(1)}px）`);
    ok(Math.abs((after.cal.x - before.cal.x) - (box1 - box0)) < 0.6, `押されるのは詰めるの意味どおり、帯の伸びちょうど`);
  } else {
    console.log(`  （伸びの半分 ＝ ${half.toFixed(1)}px。箱は中心を軸に両側へ伸びるので、左の縁は半分だけ動く）`);
    for (const id of ["kinmu", "staff"])
      ok(Math.abs((after[id].x - before[id].x) - half) < 0.6, `pin 切り：${id} は ${half.toFixed(1)}px ＝ 伸びの半分`);
  }
  // 元に戻す
  await lab.call("setPin", true);
  await widen(-60);
}

console.log(`\n■ 同じ空間の並べ替えは留めない（帯が入れ替わるだけで、塊も箱も変わらない）`);
await lab.call("setPin", true);
{
  const before = await rects();
  const list0 = (await lab.bubbles()).filter((b) => b.parent === "staff").sort((a, b) => a.order - b.order).map((b) => b.title);
  await lab.dragBubble("p4", { dy: -130 });                 // 伊藤を先頭へ
  const after = await rects();
  const list1 = (await lab.bubbles()).filter((b) => b.parent === "staff").sort((a, b) => a.order - b.order).map((b) => b.title);
  console.log(`  スタッフ ${list0.join("→")}  ⇒  ${list1.join("→")}`);
  for (const id of ["kinmu", "staff", "cal"])
    console.log(`  ${id.padEnd(8)} ずれ ${(after[id].x - before[id].x).toFixed(2)}, ${(after[id].y - before[id].y).toFixed(2)}px`);
  ok(list1.join() !== list0.join() && list1.indexOf("伊藤") < list0.indexOf("伊藤"), `並べ替わった（伊藤が前へ）`);
  for (const id of ["kinmu", "staff", "cal"])
    ok(Math.abs(after[id].x - before[id].x) < 0.05 && Math.abs(after[id].y - before[id].y) < 0.05, `並べ替えでは ${id} は 0.00px`);
}

console.log(`\n■ 詰める空間への差し込み：留められるのは「差し込む所より前」だけ（後ろは差し込んだ泡の幅ちょうど動く）`);
{
  const row = (await lab.call("implicitParents"))[0].id;
  const b0 = await lab.rect("fA"), c0 = await lab.rect("fB"), m0 = await lab.rect("memo1");
  await lab.call("snap", "fC", "fA", "right");              // 付箋A と 付箋B の間へ差し込む
  await lab.settle();
  const b1 = await lab.rect("fA"), c1 = await lab.rect("fB"), m1 = await lab.rect("memo1"), w = (await lab.rect("fC")).w;
  console.log(`  差し込んだ 付箋C の幅 ${w.toFixed(2)}px`);
  console.log(`  前の泡 付箋A    ${(b1.x - b0.x).toFixed(2)}px`);
  console.log(`  後ろの泡 付箋B  ${(c1.x - c0.x).toFixed(2)}px`);
  console.log(`  並びの外 メモ   ${(m1.x - m0.x).toFixed(2)}px`);
  ok(Math.abs(b1.x - b0.x) < 0.05, `差し込む所より前の泡は 0.00px`);
  ok(Math.abs((c1.x - c0.x) - w) < 0.05, `後ろの泡は差し込んだ泡の幅ちょうど（${w.toFixed(2)}px）`);
  ok(Math.abs(m1.x - m0.x) < 0.05, `並びの外は 0.00px`);
}

await lab.shot("rule5");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n規則⑤ NG ${ng}` : `\n規則⑤ 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
