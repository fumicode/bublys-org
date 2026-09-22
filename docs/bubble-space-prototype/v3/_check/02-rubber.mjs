// 案2：ゴム膜 ──「掴んだ点がカーソルからずれないか」を、決め方4通りで測る。
// あわせて、小さい方（min）が横から縦に入れ替わる所が画面のどこで、そこで絵が飛ばないかを見る。
//   node docs/bubble-space-prototype/v3/_check/02-rubber.mjs
//
// 測り方（1回の pointerdown のまま少しずつ動かし、1手ごとに測る）
//   (1) 背景を掴んで掃く … 掴んだ点は「中身の座標」。1手ごとに、その点の画面位置とカーソルの差
//   (2) 泡を掴んで引く   … 掴んだ点は「泡の面の上の割合 f」。1手ごとに、泡の f の所とカーソルの差
//   (3) 掃くあいだ、泡の大きさが飛ばないか（1手ごとの倍率の変化の最大）と、min が入れ替わる手
import { openLab, V3 } from "./lab.mjs";

const RULES = ["z", "min", "x", "product"];
const NAME = { z: "奥行きだけ", min: "小さい方", x: "横だけ", product: "横×縦" };
const SPACE = "xyMin";          // X も Y も魚眼（両軸とも曲がる）
const MAG = process.env.MAG || "self";   // 泡の縮み："self"＝泡の像（既定）｜ "center"＝中心の倍率
const STEP = 8, STEPS = 10;     // 8px を 10 手 ＝ 80px

const lab = await openLab(`${V3}/02-lens-per-axis.html`);
const off = await lab.page.evaluate(() => { const r = document.querySelector("#cv").getBoundingClientRect(); return { x: r.left, y: r.top }; });

async function reload() {
  await lab.page.reload();
  await lab.page.waitForFunction(() => !!window.__lab, null, { timeout: 8000 });
  await lab.call("setMag", MAG);
  await lab.settle();
}
/** 中身の座標 → 画面（m=1 の面） */
async function fwd(space) {
  const L = await lab.call("layoutOf", space), f = await lab.call("focusOf", space), V = await lab.viewOf(space);
  return (axis, pos) => {
    const H = L.H[axis], u = pos - f[axis];
    const s = V[axis].lens === "fisheye" ? H * Math.tanh(u / H) : u;
    return (axis === "x" ? L.host.cx : L.host.cy) + s * L.host.scale + (axis === "x" ? off.x : off.y);
  };
}
async function inv(space) {
  const L = await lab.call("layoutOf", space), f = await lab.call("focusOf", space), V = await lab.viewOf(space);
  return (axis, screen) => {
    const H = L.H[axis];
    const s = (screen - (axis === "x" ? off.x : off.y) - (axis === "x" ? L.host.cx : L.host.cy)) / L.host.scale;
    return (V[axis].lens === "fisheye" ? H * Math.atanh(Math.max(-1 + 1e-12, Math.min(1 - 1e-12, s / H))) : s) + f[axis];
  };
}
async function backgroundIn(space) {
  const r = await lab.rect(space);
  for (let ty = 0.3; ty <= 0.92; ty += 0.04) for (let tx = 0.08; tx <= 0.92; tx += 0.03) {
    const x = r.x + r.w * tx, y = r.y + r.h * ty;
    const h = await lab.call("hitAt", x, y);
    if ((!h.id || h.id === space) && h.space === space) return { x, y };
  }
  return null;
}
const snap = async space => (await lab.placements()).filter(p => p.space === space)
  .map(p => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, scale: p.scale, kx: p.k.x, ky: p.k.y }));

/* ── (1) 背景を掃く ─────────────────────────────────────────── */
console.log(`泡の縮み＝${MAG === "self" ? "泡の像" : "中心の倍率"}　背景を掴んで ${STEP}px × ${STEPS}手 掃く（${SPACE}：X も Y も魚眼）`);
for (const floor of [0, 0.25]) {
  console.log(`\n── 端での下限 ${floor} ──`);
  for (const dir of [[1, 0, "→"], [-1, 0, "←"], [0, 1, "↓"], [0.707, 0.707, "↘（入れ替わりの対角線ぞい）"]]) {
    const line = [];
    for (const rule of RULES) {
      await reload();
      await lab.call("setFloor", floor);
      await lab.call("setSize", SPACE, rule);
      await lab.settle();
      const bg = await backgroundIn(SPACE);
      const inv0 = await inv(SPACE);
      const pos0 = { x: inv0("x", bg.x), y: inv0("y", bg.y) };
      let prev = await snap(SPACE), drift = 0, jump = 0, swaps = new Set(), jumpAtSwap = 0;
      await lab.page.mouse.move(bg.x, bg.y);
      await lab.page.mouse.down();
      for (let n = 1; n <= STEPS; n++) {
        const cx = bg.x + dir[0] * STEP * n, cy = bg.y + dir[1] * STEP * n;
        await lab.page.mouse.move(cx, cy);
        await lab.settle();
        const f = await fwd(SPACE);
        drift = Math.max(drift, Math.hypot(f("x", pos0.x) - cx, f("y", pos0.y) - cy));
        const now = await snap(SPACE);
        const was = new Map(prev.map(p => [p.id, p]));      // ★ 描く順は焦点で変わるので、添字ではなく id で突き合わせる
        for (const p of now) {
          const q = was.get(p.id); if (!q) continue;
          const d = Math.abs(p.scale - q.scale);
          jump = Math.max(jump, d);
          if ((q.kx <= q.ky) !== (p.kx <= p.ky)) { swaps.add(p.id); jumpAtSwap = Math.max(jumpAtSwap, d); }
        }
        prev = now;
      }
      await lab.page.mouse.up();
      line.push(`${NAME[rule]} ずれ ${drift.toFixed(2)}px・1手の倍率変化 最大 ${jump.toFixed(4)}` +
                (swaps.size ? `・入れ替わった泡 ${swaps.size}（そこでの変化 ${jumpAtSwap.toFixed(4)}）` : ""));
    }
    console.log(`${dir[2]}`);
    for (const l of line) console.log("   " + l);
  }
}

/* ── (2) 泡を掴んで引く ─────────────────────────────────────── */
console.log(`\n泡（版12：幹のいちばん新しい版）を掴んで ${STEP}px × ${STEPS}手 引く`);
for (const rule of RULES) {
  await reload();
  await lab.call("setFloor", 0);
  await lab.call("setSize", SPACE, rule);
  await lab.settle();
  const id = `${SPACE}-v11`;
  const p0 = await lab.call("headerPointOf", id);
  const r0 = await lab.rect(id);
  const f = { x: (p0.x - r0.x) / r0.w, y: (p0.y - r0.y) / r0.h };
  let drift = 0;
  await lab.page.mouse.move(p0.x, p0.y);
  await lab.page.mouse.down();
  for (let n = 1; n <= STEPS; n++) {
    const cx = p0.x - STEP * n, cy = p0.y;
    await lab.page.mouse.move(cx, cy);
    await lab.settle();
    const r = await lab.rect(id);
    drift = Math.max(drift, Math.hypot(r.x + f.x * r.w - cx, r.y + f.y * r.h - cy));
  }
  await lab.page.mouse.up();
  console.log(`  ${NAME[rule].padEnd(6)} 掴んだ点のずれ 最大 ${drift.toFixed(2)}px`);
}

/* ── (3) min が入れ替わる線は画面のどこか ─────────────────────── */
await reload();
await lab.call("setSize", SPACE, "min");
await lab.settle();
{
  const L = await lab.call("layoutOf", SPACE);
  const r = await lab.rect(SPACE);
  const ps = await snap(SPACE);
  console.log(`\n小さい方が入れ替わる線（${SPACE}）  箱 ${r.w.toFixed(0)}×${r.h.toFixed(0)}  半幅 H.x ${L.H.x.toFixed(1)} H.y ${L.H.y.toFixed(1)}`);
  console.log("  式：kx = ky ⇔ |u_x|/H.x = |u_y|/H.y ⇔ |画面x|/H.x = |画面y|/H.y ＝ 中身の箱の対角線（× の形）");
  const near = ps.map(p => ({ id: p.id, kx: p.kx, ky: p.ky, d: Math.abs(p.kx - p.ky) / Math.max(p.kx, p.ky) }))
                 .sort((a, b) => a.d - b.d).slice(0, 4);
  for (const n of near) console.log(`  ${n.id.padEnd(11)} kx ${n.kx.toFixed(3)} ky ${n.ky.toFixed(3)} 差 ${(n.d * 100).toFixed(1)}%`);
  console.log(`  横が小さい泡 ${ps.filter(p => p.kx <= p.ky).length} / 縦が小さい泡 ${ps.filter(p => p.kx > p.ky).length}（${ps.length}個中）`);
}

console.log("\nエラー:", lab.errors().length ? lab.errors() : "なし");
await lab.close();
