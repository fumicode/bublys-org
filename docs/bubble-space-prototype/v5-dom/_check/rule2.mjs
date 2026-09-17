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
/** 引いたあと、実際に何が起きたか */
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

// ★ free.z の空間で泡を触っても消えない（焦点の面で止まる）
console.log(`\n■ 触る（② Z が自由座標なら、焦点の面まで上がって そこで止まる）`);
await lab.call("preset", "free", "root");
await lab.settle();
// 1回目：焦点を 0.2 まで奥へ送ってから、そのさらに奥（自由Z 0.4）にいる 勤務表 を触る
{ const r = await lab.rect("kinmu"); await lab.wheel(r.x + r.w / 2, r.y - 40, 50); }
for (const round of ["焦点 0.2 の面へ", "焦点 0 の面へ"]) {
  const focus = (await lab.focusOf("root")).z;
  const b0 = (await lab.bubbles()).find((b) => b.id === "kinmu");
  const p = await lab.call("headerPointOf", "kinmu");
  await lab.page.mouse.click(p.x, p.y);
  await lab.settle();
  const b = (await lab.bubbles()).find((b) => b.id === "kinmu");
  const q = (await lab.placements()).find((p) => p.id === "kinmu");
  console.log(`  ${round}：焦点 Z ${focus.toFixed(3)}・勤務表の自由Z ${b0.free.z.toFixed(3)} で触る`
            + ` → 自由Z ${b.free.z.toFixed(3)}  alpha ${q.alpha.toFixed(2)}  倍率 ${q.scale.toFixed(3)}`);
  ok(Math.abs(b.free.z - focus) < 1e-6, `触った泡は焦点の面まで上がって、そこで止まる（それより手前へは出ない）`);
  ok(q.alpha > 0.99, `触った泡は消えない（alpha ${q.alpha.toFixed(2)}）`);
  await lab.select("kinmu"); await lab.settle();
  await lab.page.click("#refocus"); await lab.settle();       // 焦点を 0 に戻して2回目へ
}
// Z が 順序 なら最前面へ。何度触ってもずれない
await lab.call("preset", "stackZ", "root");
await lab.settle();
const orders = [];
for (let i = 0; i < 4; i++) {
  const p = await lab.call("headerPointOf", "memo3");
  await lab.page.mouse.click(p.x, p.y); await lab.settle();
  const bs = await lab.bubbles();
  orders.push(bs.find((b) => b.id === "memo3").order + "/" + Math.max(...bs.filter((b) => !b.parent).map((b) => b.order)));
}
console.log(`  Z が 順序：思いつき を4回触った（順序/兄弟の最大）  ${orders.join("  ")}`);
ok(orders.every((o) => o.startsWith("0/")), `Z が 順序 なら最前面（0）へ。何度触ってもずれない`);
// Z が 履歴 なら上がらない
await lab.call("preset", "free", "root");
await lab.settle();
const h0 = (await lab.bubbles()).filter((b) => b.parent === "giji").map((b) => b.hist).join(",");
const gp = await lab.call("headerPointOf", "g0");
await lab.page.mouse.click(gp.x, gp.y); await lab.settle();
const h1 = (await lab.bubbles()).filter((b) => b.parent === "giji").map((b) => b.hist).join(",");
console.log(`  Z が 履歴：版を触っても並びは変わらない  ${h0} → ${h1}`);
ok(h0 === h1, `Z が 履歴 なら触っても上がらない`);

await lab.shot("rule2");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n規則② NG ${ng}` : `\n規則② 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
