// （v4/_check の写し。DOM 版で同じことが起きるか確かめる）
// 規則② 操作は、軸と、何を掴んだかで決まる
//   5つの空間 × 横・縦・ホイール・触る で、画面に出ている表の言葉と、本物のマウスで起きたことが合うか。
//   とくに free.z の空間で泡を触っても消えない（焦点の面で止まる。alpha が 0 にならない）
//   node docs/bubble-space-prototype/v5-dom/_check/rule2.mjs
import { openLab } from "./lab.mjs";

const lab = await openLab();
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "    OK " : "    NG "} ${msg}`); if (!c) ng++; };

/** 選択パネルに出ている言葉（規則の番号は落とす） */
async function panel(id) {
  await lab.select(id);
  await lab.settle();
  const t = await lab.textOf("#selection");
  const row = (key) => (t.split("\n").find((l) => l.replace(/[①-⑤]/g, "").trim().startsWith(key)) ?? "")
    .replace(/[①-⑤]/g, "").replace(key, "").trim();
  return { 横: row("横ドラッグ"), 縦: row("縦ドラッグ"), ホイール: row("ホイール") };
}
const snap = async () => ({ b: Object.fromEntries((await lab.bubbles()).map((b) => [b.id, JSON.parse(JSON.stringify(b))])),
                            p: Object.fromEntries((await lab.placements()).map((p) => [p.id, p])) });
/** ドラッグしたあと、実際に何が起きたか */
function what(a, z, id, space, axis) {
  const k = axis === "x" ? "x" : "y", cellKey = axis === "x" ? "col" : "row";
  const d = (v) => Math.abs(v) > 1e-6;
  if (d(z.b[id].free[k] - a.b[id].free[k])) return "動く";
  if (z.b[id].order !== a.b[id].order) return "並べ替わる";
  if (z.b[id].cell[cellKey] !== a.b[id].cell[cellKey]) return `${cellKey === "col" ? "列" : "行"}を移る`;
  if (d(z.focus[axis] - a.focus[axis])) return "視点が動く";
  return "何も起きない";
}

const CASES = [
  { space: "root", id: "memo1", name: "外の空間（自由）",              dx: 90,  dy: 60 },
  { space: "row",  id: "row0",  name: "横に並べるの中（順序）",        dx: 180, dy: 40 },
  { space: "cal",  id: "d3",    name: "カレンダーの中（列・行）",      dx: 46,  dy: 38 },
  { space: "fish", id: "v4",    name: "X魚眼ビューの中（履歴）",       dx: 70,  dy: 40 },
  { space: "giji", id: "g3",    name: "議事録（版）の中（X・Y なし）", dx: 70,  dy: 40 },
];

for (const c of CASES) {
  console.log(`\n■ ${c.name}`);
  const words = await panel(c.id);
  for (const [axis, d] of [["x", { dx: c.dx }], ["y", { dy: c.dy }]]) {
    const before = { ...(await snap()), focus: await lab.focusOf(c.space) };
    await lab.dragBubble(c.id, d);
    const after = { ...(await snap()), focus: await lab.focusOf(c.space) };
    const got = what(before, after, c.id, c.space, axis);
    const said = axis === "x" ? words.横 : words.縦;
    console.log(`  ${axis === "x" ? "横" : "縦"}に ${axis === "x" ? c.dx : c.dy}px  画面の言葉「${said}」  起きたこと「${got}」`);
    ok(said.includes(got) || (got === "視点が動く" && said.includes("視点")) || (got === "何も起きない" && said.includes("何も起きない")),
       `${c.name}：${axis === "x" ? "横" : "縦"}ドラッグ`);
  }
  // ホイール
  const r = await lab.rect(c.id);
  const f0 = (await lab.focusOf(await lab.call("windowOf", c.space))).z;
  await lab.wheel(r.x + r.w / 2, r.y + r.h / 2, 120);
  const f1 = (await lab.focusOf(await lab.call("windowOf", c.space))).z;
  const moved = Math.abs(f1 - f0) > 1e-6;
  console.log(`  ホイール  画面の言葉「${words.ホイール}」  焦点 Z ${f0.toFixed(3)} → ${f1.toFixed(3)}`);
  ok(moved === !words.ホイール.includes("何も起きない"), `${c.name}：ホイール`);
  // 焦点を戻す（外の空間の焦点 Z を送ったままだと、z=0 の場面が全部 dz<0 で消えて次の場面を掴めない）
  await lab.select(c.id); await lab.settle();
  await lab.page.click("#refocus"); await lab.settle();
}

// ★★ ② 触った泡へ、視点が寄る（2026-09-19 規則が変わった。raise を消した）
//    もとはここで「触った泡は焦点の面まで上がる（Z に書く）」を見ていた。いまは値を1つも書かない。
//    「触った」と「掴んでドラッグした」は、pointerdown から 3px 動いたか（drag.started）で分ける。
const ids = (o) => o.map((b) => b.id).join(" ");
const valsOf = async (space) => (await lab.bubbles()).filter((b) => (b.parent ?? "root") === space)
  .map((b) => `${b.id}:${b.order}/${b.free.x.toFixed(1)},${b.free.y.toFixed(1)},${b.free.z.toFixed(2)}/${b.cell.col},${b.cell.row}`).join(" ");
const scalesOf = async (space) => (await lab.placements()).filter((p) => p.space === space)
  .sort((a, b) => a.id.localeCompare(b.id)).map((p) => p.scale);
/** ドラッグせずに離す＝触る（本物のマウスで、押した所と同じ所で離す） */
const touch = async (id) => { const q = await lab.call("headerPointOf", id); await lab.page.mouse.click(q.x, q.y); await lab.settle(); };

console.log(`\n■ 触る（coverflow・X＝順序·等間隔·魚眼）：焦点が寄る／値は1つも書かれない`);
await lab.call("preset", "coverflow", "cover");
await lab.select("cf3"); await lab.settle();
{
  const v0 = await valsOf("cover"), s0 = await scalesOf("cover"), f0 = (await lab.focusOf("cover")).x;
  await touch("cf6");
  const v1 = await valsOf("cover"), s1 = await scalesOf("cover"), f1 = (await lab.focusOf("cover")).x;
  console.log(`  倍率  ${s0.map((v) => v.toFixed(2)).join(" ")}`);
  console.log(`   →    ${s1.map((v) => v.toFixed(2)).join(" ")}`);
  console.log(`  焦点 X ${f0.toFixed(2)} → ${f1.toFixed(2)}`);
  ok(v0 === v1, `触っても泡の値は1つも変わらない（順序・自由・マス）`);
  ok(Math.abs(f1 - f0) > 1e-6, `触ると、その泡がその軸の焦点になる（焦点 X が動く）`);
  ok(s0.some((v, i) => Math.abs(v - s1[i]) > 0.01), `焦点が動いたので、倍率の山が動く（絵は変わる）`);
  // ★ 掴んでドラッグしたら、今までどおり値を書く（触ったのと同じ泡で比べる）
  const b0 = await valsOf("cover");
  await lab.dragBubble("cf6", { dx: -150 });
  const b1 = await valsOf("cover");
  console.log(`  掴んで 150px ドラッグしたら  ${b0 === b1 ? "値は変わらない" : "値が変わった"}`);
  ok(b0 !== b1, `掴んでドラッグするのは今までどおり値を書く（触るとドラッグするを分けている）`);
}

console.log(`\n■ 「触った」と「掴んでドラッグした」の境目（pointerdown から 3px。drag.started と同じ1つのしきい値）`);
await lab.call("preset", "coverflow", "cover");
await lab.select("cf3"); await lab.settle();
await lab.page.click("#refocus"); await lab.settle();
for (const dx of [2, 8, -150]) {
  const v0 = await valsOf("cover"), f0 = (await lab.focusOf("cover")).x;
  await lab.dragBubble("cf5", { dx, steps: 4 });
  const v1 = await valsOf("cover"), f1 = (await lab.focusOf("cover")).x;
  const wrote = v0 !== v1, moved = Math.abs(f1 - f0) > 1e-6;
  console.log(`  ${String(dx).padStart(4)}px ドラッグして離す  値を書いた ${wrote ? "はい" : "いいえ"}`
            + `　焦点が寄った ${moved ? "はい" : "いいえ"}（${f0.toFixed(2)} → ${f1.toFixed(2)}）`);
  if (dx === 2) ok(!wrote && moved, `2px（3px 未満）は「触った」── 値を書かず、焦点だけ寄る`);
  if (dx === 8) ok(!moved, `8px は「掴んでドラッグした」── 焦点は寄らない（ドラッグが足りず、並べ替えも起きない）`);
  if (dx === -150) ok(wrote && !moved, `-150px は「掴んでドラッグした」── 今までどおり値を書く（焦点は寄らない）`);
  await lab.page.click("#refocus"); await lab.settle();
}

console.log(`\n■ 触る（自由の空間）：Z にも書かない。代わりに焦点 Z がその泡の面へ`);
await lab.call("preset", "free", "root");
await lab.select("memo1"); await lab.settle();
await lab.page.click("#refocus"); await lab.settle();
{
  const b0 = (await lab.bubbles()).find((b) => b.id === "kinmu");
  const f0 = await lab.focusOf("root");
  await touch("kinmu");
  const b1 = (await lab.bubbles()).find((b) => b.id === "kinmu");
  const f1 = await lab.focusOf("root");
  const q = (await lab.placements()).find((p) => p.id === "kinmu");
  console.log(`  勤務表（自由Z ${b0.free.z}）を触る → 自由Z ${b1.free.z}　焦点 Z ${f0.z.toFixed(2)} → ${f1.z.toFixed(2)}`
            + `　焦点 X ${f0.x.toFixed(1)} → ${f1.x.toFixed(1)}　勤務表の alpha ${q.alpha.toFixed(2)} 倍率 ${q.scale.toFixed(3)}`);
  ok(Math.abs(b1.free.z - b0.free.z) < 1e-9, `触っても自由Z は書かれない（raise が消えた）`);
  ok(Math.abs(f1.z - b1.free.z) < 1e-6, `焦点 Z が、その泡の面へ寄る`);
  ok(q.alpha > 0.99, `触った泡は消えない（alpha ${q.alpha.toFixed(2)}）`);
  // 手前にいた兄弟は dz<0 で消える ── それでよい（消えたものは右端のスタックに積まれる。stack.mjs）
  const gone = await lab.call("stack");
  console.log(`  手前へ抜けて消えた兄弟 ${gone.length} 個  ${gone.join(" ")}`);
  ok(gone.length > 0, `奥の泡を触ると、手前のものは消える（消えたものはスタックに積まれる）`);
  await lab.select("memo1"); await lab.settle(); await lab.page.click("#refocus"); await lab.settle();
}

console.log(`\n■ 送れない軸では何も起きない（議事録（版）の X・Y は「なし」）`);
{
  const f0 = await lab.focusOf("giji");
  await touch("g0");
  const f1 = await lab.focusOf("giji");
  console.log(`  版を触る → 議事録の焦点 X ${f0.x.toFixed(2)} → ${f1.x.toFixed(2)}　Y ${f0.y.toFixed(2)} → ${f1.y.toFixed(2)}`);
  ok(Math.abs(f1.x) < 1e-9 && Math.abs(f1.y) < 1e-9, `なしの軸には焦点が無い（何も起きない）`);
}

// Z が 順序 でも、触って並べ替わることはもう無い（値を書かない）
await lab.select("memo1"); await lab.settle(); await lab.page.click("#refocus"); await lab.settle();
await lab.call("preset", "stackZ", "root");
await lab.settle();
{
  const o0 = (await lab.bubbles()).filter((b) => !b.parent).map((b) => b.id + ":" + b.order).join(" ");
  for (let i = 0; i < 4; i++) await touch("memo3");
  const o1 = (await lab.bubbles()).filter((b) => !b.parent).map((b) => b.id + ":" + b.order).join(" ");
  console.log(`  Z が 順序：思いつき を4回触った  ${o0 === o1 ? "順序はどれも変わらない" : "順序が変わった"}`);
  ok(o0 === o1, `Z が 順序 でも、触って並べ替わらない（重なりの上下は触っても変わらない）`);
}
// Z が 履歴 なら、もともと書けない
await lab.call("preset", "free", "root");
await lab.select("memo1"); await lab.settle(); await lab.page.click("#refocus"); await lab.settle();
const h0 = (await lab.bubbles()).filter((b) => b.parent === "giji").map((b) => b.hist).join(",");
await touch("g0");
const h1 = (await lab.bubbles()).filter((b) => b.parent === "giji").map((b) => b.hist).join(",");
console.log(`  Z が 履歴：版を触っても並びは変わらない  ${h0} → ${h1}`);
ok(h0 === h1, `Z が 履歴 なら触っても上がらない`);

await lab.shot("rule2");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n規則② NG ${ng}` : `\n規則② 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
