// 案2：「泡の像」（案3 の projectIn）を入れたうえで、決め方4通りを測り直す。
//   node docs/bubble-space-prototype/v3/_check/02-image.mjs
//
// 測ること
//   (A) 鏡（Y魚眼）と XY魚眼 で、中心の倍率 / 泡の像 の両方で4通り
//   (B) 泡は自分の像に収まるか（食み出し px）── min が「両方の像に収まるうち いちばん大きい」ことの確かめ
//   (C) min が合わせなかった軸に何 px の隙間が空くか
import { openLab, V3 } from "./lab.mjs";

const RULES = ["z", "min", "x", "product"];
const NAME = { z: "奥行きだけ", min: "小さい方", x: "横だけ", product: "横×縦" };
const lab = await openLab(`${V3}/02-lens-per-axis.html`);

async function reload() {
  await lab.page.reload();
  await lab.page.waitForFunction(() => !!window.__lab, null, { timeout: 8000 });
  await lab.settle();
}
/** 泡の像からの食み出しと、余った隙間（Z は flat なので m＝1。倍率は local、像は k） */
async function fit(space) {
  const ps = (await lab.placements()).filter(p => p.space === space);
  let outX = 0, outY = 0, gapX = 0, gapY = 0, gapXs = 0, gapYs = 0;
  for (const p of ps) {
    const wImg = p.w / p.local * p.k.x, hImg = p.h / p.local * p.k.y;   // 像の幅・高さ（画面 px）
    outX = Math.max(outX, p.w - wImg); outY = Math.max(outY, p.h - hImg);
    gapX = Math.max(gapX, wImg - p.w); gapY = Math.max(gapY, hImg - p.h);
    gapXs += Math.max(0, wImg - p.w); gapYs += Math.max(0, hImg - p.h);
  }
  return { outX, outY, gapX, gapY, gapXavg: gapXs / ps.length, gapYavg: gapYs / ps.length };
}

for (const mag of ["center", "self"]) {
  for (const space of ["yX", "xyMin"]) {
    console.log(`\n=== ${mag === "self" ? "泡の像" : "中心の倍率"} × ${space === "yX" ? "鏡（X 枝・平行、Y 世代・魚眼）" : "XY魚眼（横も縦も曲がる）"} ===`);
    for (const floor of [0, 0.25]) {
      for (const rule of RULES) {
        await reload();
        await lab.call("setMag", mag);
        await lab.call("setFloor", floor);
        await lab.call("setSize", space, rule);
        await lab.settle();
        const st = await lab.call("stats", space), box = await lab.call("sizeOfSpace", space);
        const fy = await lab.call("focusRoom", space, "y"), f = await fit(space);
        console.log(`  下限 ${String(floor).padEnd(4)} ${NAME[rule].padEnd(6)} 端 ${st.edge.toFixed(2)}倍  重なり ${String(st.overlaps).padStart(2)}組  読める ${String(st.readable).padStart(2)}/${st.total}  ` +
          `箱 ${box.w.toFixed(0)}×${box.h.toFixed(0)}  縦の焦点 ${(fy.hi - fy.lo).toFixed(0)}/${(fy.max - fy.min).toFixed(0)}  ` +
          `像からの食み出し 横 ${f.outX.toFixed(1)}px 縦 ${f.outY.toFixed(1)}px  像に余る隙間 横 ${f.gapX.toFixed(1)}px 縦 ${f.gapY.toFixed(1)}px（平均 ${f.gapXavg.toFixed(1)}/${f.gapYavg.toFixed(1)}）`);
      }
    }
  }
}

console.log("\nエラー:", lab.errors().length ? lab.errors() : "なし");
await lab.close();
