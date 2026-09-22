// v4 がいまも動くかを、ひととおり確かめる。
//   node docs/bubble-space-prototype/v4/_check/smoke.mjs
import { openLab, listPrototypes, V4, SHOT_DIR } from "./lab.mjs";

let ng = 0;
for (const f of listPrototypes()) {
  const lab = await openLab(`${V4}/${f}`);
  const out = [];
  try {
    const ps = await lab.placements();
    const depth = Math.max(...ps.map((p) => p.depth ?? 0));
    out.push(`泡 ${String(ps.length).padStart(3)}  最大の入れ子 ${depth}`);

    // 合成 scale は数値1つか（いちばん深い泡が、親の scale の積になっているか）
    const deepest = ps.filter((p) => (p.depth ?? 0) === depth)[0];
    out.push(`いちばん深い泡の倍率 ${deepest ? deepest.scale.toFixed(4) : "-"}`);

    // 画面からはみ出している泡（見えているのに全部画面外）
    const off = ps.filter((p) => p.scale > 0.2 && (p.x + p.w < 0 || p.x > 1440 || p.y + p.h < 0 || p.y > 900)).length;
    out.push(`画面の外 ${off}`);

    // 泡どうしの重なり（同じ空間の兄弟だけ。重なりが「多すぎ」でないか）
    const bySpace = {};
    for (const p of ps) (bySpace[p.space] ||= []).push(p);
    let ov = 0;
    for (const list of Object.values(bySpace))
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) ov++;
      }
    out.push(`兄弟の重なり ${ov}`);

    await lab.shot("smoke");
  } catch (e) {
    out.push("例外: " + e.message);
  }
  const errs = lab.errors();
  if (errs.length) { ng++; out.push("エラー " + errs.length + ": " + errs[0].slice(0, 80)); }
  console.log(`${f.padEnd(26)} ${out.join("  |  ")}`);
  await lab.close();
}
console.log(`\nスクショ: ${SHOT_DIR}`);
process.exit(ng ? 1 : 0);
