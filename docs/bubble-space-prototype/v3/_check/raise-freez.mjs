// 自由座標の Z で「最前面へ」を書くと、触った泡が消えないか。
//   透視は焦点より手前（dz<0）を消す。焦点の面にいる兄弟の「手前」は、必ず焦点より手前。
//   node docs/bubble-space-prototype/v3/_check/raise-freez.mjs
import { openLab, V3 } from "./lab.mjs";

const lab = await openLab(`${V3}/00-core.html`);
await lab.settle();

// root（自由に置く ＝ Z は 自由Z・透視）の泡を、奥に1つ置く
const kids = (await lab.bubbles()).filter((b) => !b.parent);
console.log("root の泡:", kids.map((b) => `${b.id}(z=${b.free.z})`).join(" "));

const back = kids.find((b) => b.free.z > 0) ?? kids[0];
const show = async (tag) => {
  const ps = await lab.placements();
  const p = ps.find((q) => q.id === back.id);
  const b = (await lab.bubbles()).find((q) => q.id === back.id);
  const a = await lab.page.evaluate((id) => {
    const t = (window.__lab.placements() || []).find((x) => x.id === id);
    return t && "alpha" in t ? t.alpha : null;
  }, back.id);
  console.log(`  ${tag.padEnd(12)} free.z ${String(b.free.z).padStart(6)}  倍率 ${p ? p.scale.toFixed(3) : "-"}  alpha ${a}  焦点Z ${(await lab.focusOf("root")).z}`);
  return p;
};

console.log(`\n■ ${back.id}（root のいちばん奥）を触る`);
await show("触る前");
const q = await lab.call("headerPointOf", back.id);
await lab.page.mouse.click(q.x, q.y);
await lab.settle();
const after = await show("触った後");
const pix = await lab.page.evaluate((id) => {
  const t = (window.__lab.placements() || []).find((x) => x.id === id);
  return t ? { alpha: t.alpha } : null;
}, back.id);
console.log("  画面に出ているか:", JSON.stringify(pix));
const hit = await lab.call("headerPointOf", back.id);
console.log("  掴める点:", hit ? `(${hit.x.toFixed(0)}, ${hit.y.toFixed(0)})` : "★無い（消えている）");

console.log("\nエラー:", lab.errors().length);
await lab.close();
