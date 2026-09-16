// 案2：冒頭コメントに書いてある「踏んだこと」を、書いたあとに測り直す。
//   node docs/bubble-space-prototype/v3/_check/02-recheck.mjs
import { openLab, V3 } from "./lab.mjs";

const RULES = ["z", "min", "x", "product"];
const NAME = { z: "奥行きだけ", min: "小さい方", x: "横だけ", product: "横×縦" };
const lab = await openLab(`${V3}/02-lens-per-axis.html`);
const ok = (b, msg) => console.log(`  ${b ? "○" : "×"} ${msg}`);

async function reload() {
  await lab.page.reload();
  await lab.page.waitForFunction(() => !!window.__lab, null, { timeout: 8000 });
  await lab.settle();
}
/** その空間の中身を、空間の箱の左上からの相対位置で（盤の置き場所の差を消して比べる） */
async function shape(space) {
  const r = await lab.rect(space);
  return new Map((await lab.placements()).filter(p => p.space === space)
    .map(p => [p.id.split("-").pop(), { x: p.x - r.x, y: p.y - r.y, w: p.w, h: p.h }]));
}
function diff(a, b) {
  let sum = 0, max = 0, n = 0;
  for (const [k, va] of a) { const vb = b.get(k); if (!vb) continue; const d = Math.hypot(va.x - vb.x, va.y - vb.y); sum += d; max = Math.max(max, d); n++; }
  return { avg: sum / n, max };
}

/* ── (1) 4通りの比べ（鏡と XY魚眼） ────────────────────────── */
for (const space of ["yX", "xyMin"]) {
  console.log(`\n=== ${space === "yX" ? "鏡（Y魚眼：X 枝・平行、Y 世代・魚眼）" : "XY魚眼（X も Y も魚眼）"} ===`);
  const shapes = {};
  for (const rule of RULES) {
    await reload();
    await lab.call("setSize", space, rule);
    await lab.settle();
    const st = await lab.call("stats", space), box = await lab.call("sizeOfSpace", space);
    const fx = await lab.call("focusRoom", space, "x"), fy = await lab.call("focusRoom", space, "y");
    const same = await lab.call("sameRules", space);
    shapes[rule] = await shape(space);
    console.log(`${NAME[rule].padEnd(6)} 端 ${st.edge.toFixed(2)}倍  重なり ${String(st.overlaps).padStart(2)}組  読める ${String(st.readable).padStart(2)}/${st.total}  ` +
      `箱 ${box.w.toFixed(0)}×${box.h.toFixed(0)}  送れる焦点 X ${(fx.hi - fx.lo).toFixed(0)}/${(fx.max - fx.min).toFixed(0)} · Y ${(fy.hi - fy.lo).toFixed(0)}/${(fy.max - fy.min).toFixed(0)}` +
      `  同じ絵[${same.same.map(r => NAME[r]).join("・") || "—"}]`);
  }
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const d = diff(shapes[RULES[i]], shapes[RULES[j]]);
    console.log(`   ${NAME[RULES[i]]} / ${NAME[RULES[j]]}  箱の左上からの差 平均 ${d.avg.toFixed(2)}px 最大 ${d.max.toFixed(2)}px`);
  }
}

/* ── (2) 縦が平行のツリーは、XY魚眼の同じ決め方とどれだけ違うか ── */
await reload();
console.log("\n=== 縦が平行の世界線ツリー（X魚眼［横だけ］）は XY魚眼［横だけ］とどれだけ違うか ===");
{
  const a = await shape("xyX");
  await lab.call("setAxis", "xyX", "y", { lens: "parallel" });
  await lab.settle();
  const b = await shape("xyX");
  const d = diff(a, b);
  const st = await lab.call("stats", "xyX");
  console.log(`  平均 ${d.avg.toFixed(2)}px  最大 ${d.max.toFixed(2)}px（縦を平行にしたとき）  端 ${st.edge.toFixed(2)}倍 重なり ${st.overlaps}組 読める ${st.readable}/${st.total}`);
  const same = await lab.call("sameRules", "xyX");
  console.log(`  同じ絵[${same.same.map(r => NAME[r]).join("・")}]（${same.why}）`);
}

/* ── (3) 端での下限を上げると ─────────────────────────────── */
await reload();
console.log("\n=== 端での下限（XY魚眼［横だけ］xyX） ===");
for (const f of [0, 0.12, 0.25, 0.4]) {
  await lab.call("setFloor", f); await lab.settle();
  const st = await lab.call("stats", "xyX"), fx = await lab.call("focusRoom", "xyX", "x"), box = await lab.call("sizeOfSpace", "xyX");
  console.log(`  下限 ${String(f).padEnd(4)} 端 ${st.edge.toFixed(2)}倍  重なり ${st.overlaps}組  読める ${st.readable}/${st.total}  送れる焦点 ${(fx.hi - fx.lo).toFixed(0)}/${(fx.max - fx.min).toFixed(0)}  箱 ${box.w.toFixed(0)}×${box.h.toFixed(0)}`);
}
await lab.call("setFloor", 0.25);

/* ── (4) ホイールのヒントは fitFocus から出ているか ───────────── */
await reload();
console.log("\n=== ヒント（fitFocus から言い分ける） ===");
{
  const r = await lab.rect("xyMin");
  await lab.hover(r.x + r.w / 2, r.y + r.h * 0.6);
  const t1 = await lab.textOf("#cursor-hint");
  console.log("  比べる空間の中（Z なし）:", JSON.stringify(t1));
  await lab.hover(1006, 860);                       // 盤の外（外の空間の背景）
  const t2 = await lab.textOf("#cursor-hint");
  console.log("  外の空間の背景:", JSON.stringify(t2));
  // 外の空間の Z を「順序」にすると、ホイールは送れる向きだけを言う
  await lab.call("setAxis", "root", "z", { dim: "order", arrange: "equal", lens: "perspective", step: 0.15 });
  await lab.settle();
  await lab.hover(1006, 860);
  console.log("  外の空間の Z を 順序 に:", JSON.stringify(await lab.textOf("#cursor-hint")));
  await lab.call("setAxis", "root", "z", { dim: "free.z", arrange: "as-is", lens: "perspective", step: 1 });
  await lab.settle();
  await lab.wheel(1006, 860, -300);                 // 手前へ 1 退く
  await lab.hover(1006, 860);
  console.log("  手前へ退いたあと:", JSON.stringify((await lab.textOf("#cursor-hint")).split("\n").pop()));
}

/* ── (5) raise：触った泡はその空間の Z へ書く ─────────────────── */
await reload();
console.log("\n=== raise（触った泡は最前面へ。Z 軸が書けるなら） ===");
{
  // 比べる空間の Z は なし → 触っても順番は変わらない
  const before = (await lab.bubbles()).filter(b => b.parent === "yX").map(b => b.order);
  const p = await lab.call("headerPointOf", "yX-v5");
  await lab.page.mouse.click(p.x, p.y);
  await lab.settle();
  const after = (await lab.bubbles()).filter(b => b.parent === "yX").map(b => b.order);
  ok(JSON.stringify(before) === JSON.stringify(after), `Z が なし の空間：触っても並びは変わらない（${before.slice(0, 4)}… → ${after.slice(0, 4)}…）`);
  // Z に「順序」を刺すと最前面へ
  await lab.call("setAxis", "yX", "z", { dim: "order", arrange: "equal", lens: "perspective", step: 0.15 });
  await lab.settle();
  const q = await lab.call("headerPointOf", "yX-v5");
  await lab.page.mouse.click(q.x, q.y);
  await lab.settle();
  const b5 = (await lab.bubbles()).find(b => b.id === "yX-v5");
  const drawn = (await lab.placements()).filter(x => x.space === "yX").map(x => x.id);
  ok(b5.order === 0, `Z に 順序 を刺すと 版6 の order が 0 になる（${b5.order}）`);
  ok(drawn[drawn.length - 1] === "yX-v5", `最後に描かれる＝最前面（${drawn[drawn.length - 1]}）`);
  const hasStack = (await lab.bubbles()).some(b => "stack" in b);
  ok(!hasStack, "泡の状態に stack が無い（View の外の状態を持たない）");
}

/* ── (6) 見出しの下の1行・右上の一覧が読めるか ───────────────── */
await reload();
console.log("\n=== 画面の言葉 ===");
{
  for (const id of ["xyZ", "xyMin", "xyX", "xyProd", "yX", "yMin"]) {
    const c = await lab.call("caption", id);
    ok(c.px >= 6.5, `${id} の見出しの下 ${c.px.toFixed(1)}px（${c.px >= c.full - 0.05 ? "縮めていない" : "縮めた"}）  ${c.text} ｜ ${c.stat}`);
  }
  const spaces = await lab.textOf("#spaces"), sel = await lab.textOf("#selection");
  const orphan = spaces.split("\n").slice(1).filter(l => l.trim().length && l.trim().length <= 4);   // 1行目は見出し「空間」
  ok(orphan.length === 0, `一覧に 4 文字以下の行（折り返しの落ち）が無い：${JSON.stringify(orphan)}`);
  ok(/大きさ/.test(sel), "選択欄に「大きさ」の行がある");
  console.log("  選択欄:\n    " + sel.split("\n").join("\n    "));
}

/* ── (7) 逆写しの往復 ───────────────────────────────────── */
console.log("\n=== 逆写しの往復（unproject(project(u)) の誤差） ===");
for (const id of ["xyMin", "yX"]) {
  const rt = await lab.call("roundTrip", id);
  console.log(`  ${id}  X(${rt.x.lens}) レンズ ${rt.x.lensErr.toExponential(1)} 画面 ${rt.x.screenErr.toExponential(1)}  Y(${rt.y.lens}) レンズ ${rt.y.lensErr.toExponential(1)} 画面 ${rt.y.screenErr.toExponential(1)}`);
}

/* ── (8) 大きさの角は泡の四分の一まで ─────────────────────── */
{
  await lab.call("setSize", "xyProd", "product"); await lab.settle();
  const ps = (await lab.placements()).filter(p => p.space === "xyProd").sort((a, b) => a.w - b.w);
  const small = ps[0];
  console.log(`\n=== 大きさの角 ===\n  いちばん小さい泡 ${small.id} ${small.w.toFixed(1)}×${small.h.toFixed(1)}px`);
  await lab.select(small.id); await lab.settle();
  const hit = await lab.call("hitAt", small.x + small.w / 2 - 1, small.y + small.h / 2 - 1);
  ok(hit.id === small.id, "泡の真ん中は泡に当たる（角が泡の上の背景まで覆っていない）");
}

console.log("\nエラー:", lab.errors().length ? lab.errors() : "なし");
await lab.close();
