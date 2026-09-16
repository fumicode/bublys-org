// 03-pack-or-equal：詰める×魚眼 の重なりを測る。
//   node docs/bubble-space-prototype/v3/_check/03-overlap.mjs
//
// 見るもの：coverflow（写真7枚・魚眼）の 詰める と 等間隔 で、
//   隣との間（px。負＝重なり）／重なりの数／帯の像の幅／泡の幅
import { openLab, V3 } from "./lab.mjs";

const lab = await openLab(`${V3}/03-pack-or-equal.html`);
const ids = (sfx) => [...Array(7)].map((_, i) => `c${sfx}${i}`);

async function row(sfx, host) {
  const rects = [];
  for (const id of ids(sfx)) rects.push({ id, ...(await lab.rect(id)) });
  rects.sort((a, b) => a.x - b.x);
  const gaps = rects.slice(1).map((r, i) => +(r.x - (rects[i].x + rects[i].w)).toFixed(1));
  const st = await lab.call("stats");
  const arr = await lab.call("arrangeOf", host, "x");
  const L = await lab.call("layoutOf", host);
  return { order: rects.map((r) => r.id).join(" "), w: rects.map((r) => +r.w.toFixed(1)),
           gaps, overlaps: st[host] ? st[host].overlaps : -1, pairs: st[host] ? st[host].pairs : [],
           bands: arr.bands.map((b) => [+b.start.toFixed(1), +b.end.toFixed(1)]), H: L && +L.H.x.toFixed(1) };
}

await lab.call("scene", "cover");
for (const mag of ["self", "band", "center"]) {          // self が既定
  await lab.call("setMag", mag);
  for (const gap of [0, 14, 28]) {
    await lab.call("setGap", gap);
    await lab.settle();
    const p = await row("P", "coverP");
    const e = await row("E", "coverE");
    console.log(`\n[泡の縮み ${mag}${mag === "self" ? "（既定）" : ""} / 隙間 ${gap}]`);
    console.log(`  詰める  間 ${p.gaps.join(", ")}  重なり ${p.overlaps}  幅 ${p.w.join(", ")}`);
    console.log(`          帯 ${p.bands.map((b) => (b[1] - b[0]).toFixed(0)).join(", ")}  H ${p.H}  ${p.pairs.map((q) => q.slice(0, 3).join("/")).join(" ")}`);
    console.log(`  等間隔  間 ${e.gaps.join(", ")}  重なり ${e.overlaps}  幅 ${e.w.join(", ")}`);
  }
}
console.log("\nエラー:", lab.errors());
await lab.close();
