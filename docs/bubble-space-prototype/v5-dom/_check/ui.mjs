// 画面の口（ツールバー）を本物のクリックで触る。軸セレクタ・プリセット・外から継ぐ・焦点を戻す・ヒント行。
//   node docs/bubble-space-prototype/v5-dom/_check/ui.mjs
import { openLab, ok, num } from "./lab.mjs";

const lab = await openLab();
await lab.settle();

// ── 1. 軸セレクタは「選択中の泡がいる空間」に効く ──
await lab.select("d3"); await lab.settle();          // カレンダーの「4」
const scope0 = await lab.textOf("#axis-scope");
await lab.page.selectOption('select[data-axis="x"][data-part="lens"]', "fisheye");
await lab.settle();
const V = await lab.viewOf("cal");
console.log(`  軸セレクタの見出し「${scope0}」／ カレンダーの中 の X レンズ = ${V.x.lens}`);
ok(scope0.startsWith("カレンダーの中"), "セレクタは選択中の泡がいる空間を指す");
ok(V.x.lens === "fisheye", "選んだ通りに、その空間の X が魚眼になった");
const Vroot = await lab.viewOf("root");
ok(Vroot.x.lens === "parallel", "外の空間は変わっていない");
await lab.page.selectOption('select[data-axis="x"][data-part="lens"]', "parallel");
await lab.settle();

// ── 2. 次元を変えると、並べ方が次元に合う形へ直る ──
await lab.page.selectOption('select[data-axis="y"][data-part="dim"]', "order");
await lab.settle();
const V2 = await lab.viewOf("cal");
console.log(`  カレンダーの Y を 順序 に → ${V2.y.dim}·${V2.y.arrange}`);
ok(V2.y.dim === "order" && V2.y.arrange !== "as-is", "次元に合う並べ方に直る（順序に そのまま は無い）");

// ── 3. プリセット（8つ）を本物のクリックで当てる ──
const presets = await lab.page.$$eval("[data-preset]", (es) => es.map((e) => e.dataset.preset));
console.log(`  プリセット ${presets.length} 個：${presets.join(" ")}`);
let bad = [];
for (const name of presets) {
  await lab.select("d3"); await lab.settle();
  await lab.page.click(`[data-preset="${name}"]`);
  await lab.settle();
  const v = await lab.viewOf("cal");
  const ps = await lab.placements();
  const gone = ps.filter((p) => p.space === "cal" && !(p.w > 0));
  if (gone.length) bad.push(`${name}: 泡が消えた ${gone.length}`);
  const f = await lab.focusOf("cal");
  if (Math.abs(f.x) > 1e-9 || Math.abs(f.y) > 1e-9 || Math.abs(f.z) > 1e-9) bad.push(`${name}: 焦点が 0 に戻っていない`);
}
ok(bad.length === 0, `8つのプリセットを当てても、泡が消えたり焦点が残ったりしない（${bad.join(" / ") || "なし"}）`);
await lab.page.click('[data-preset="grid"]'); await lab.settle();

// ── 4. 外から継ぐ／焦点を戻す ──
const own0 = (await lab.viewOf("cal")).own;
await lab.page.click("#inherit"); await lab.settle();
const own1 = (await lab.viewOf("cal")).own;
console.log(`  外から継ぐ：自前 ${own0} → ${own1}`);
ok(own0 === true && own1 === false, "自前の View を捨てて外から継ぐ");
await lab.page.click('[data-preset="grid"]'); await lab.settle();

await lab.select("g0"); await lab.settle();
const r = await lab.rect("giji");
await lab.wheel(r.x + r.w / 2, r.y + r.h - 20, 200);
const z0 = (await lab.focusOf("giji")).z;
await lab.page.click("#refocus"); await lab.settle();
const z1 = (await lab.focusOf("giji")).z;
console.log(`  焦点を戻す：${num(z0, 3)} → ${num(z1, 3)}`);
ok(Math.abs(z0) > 1e-6 && Math.abs(z1) < 1e-9, "焦点を 0 に戻せる");

// ── 5. ツールバー下のヒント行（乗せると1行、離すと規則5つ） ──
await lab.page.mouse.move(1300, 18); await lab.page.waitForTimeout(80);   // まずボタンから離れる
const def = (await lab.textOf("#hint")).trim();
await lab.page.hover('[data-preset="coverflow"]');
await lab.page.waitForTimeout(80);
const hov = (await lab.textOf("#hint")).trim();
await lab.page.mouse.move(1300, 18);   // ツールバーの何も無い所へ（#help は pointer-events:none）
await lab.page.waitForTimeout(80);
const back = (await lab.textOf("#hint")).trim();
console.log(`  既定「${def.slice(0, 40)}…」\n  乗せた「${hov.slice(0, 44)}…」`);
ok(/①.*②.*③.*④.*⑤/.test(def), "何も乗せていないときは規則5つの並び");
ok(hov !== def && hov.includes("coverflow"), "乗せると、そのボタンの説明が1行出る");
ok(back === def, "離すと規則5つに戻る");

const errs = lab.errors();
ok(errs.length === 0, `コンソールエラー 0（${errs.length}）`);
errs.forEach((e) => console.log("      " + e));
await lab.shot("ui");
await lab.close();
