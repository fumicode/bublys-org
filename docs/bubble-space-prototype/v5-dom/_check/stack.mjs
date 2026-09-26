// 手前の泡スタック ── 焦点より手前（dz<0）へ抜けて消えた泡を、画面の右端に積む。
//   ★ 状態を持たない。カメラの位置の関数（戻せば勝手に空になる）
//   ★ 積むのは、その空間の中だけ（入れ子の奥までは拾わない）
//   ★ アイコンを押すと、カメラが戻る（触ると視点が寄る、と同じ枝）
//   node docs/bubble-space-prototype/v5-dom/_check/stack.mjs
import { openLab } from "./lab.mjs";

const lab = await openLab();
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "  OK " : "  NG "} ${msg}`); if (!c) ng++; };
await lab.settle();

/** 画面に出ている札（DOM）。__lab.stack() と突き合わせる */
const chips = () => lab.page.evaluate(() => [...document.querySelectorAll("#stack .stk")].map((e) => {
  const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return { id: e.dataset.id, text: e.innerText, hint: !!e.dataset.hint,
           x: r.x, y: r.y, w: r.width, h: r.height, bg: cs.backgroundColor };
}));
const title = () => lab.page.evaluate(() => document.querySelector("#stack .stk-t")?.innerText ?? "");

console.log("■ はじめは空（焦点が動いていないので、手前へ抜けた泡は無い）");
{
  const ids = await lab.call("stack"), c = await chips();
  console.log(`  __lab.stack() = [${ids.join(" ")}]　札 ${c.length} 枚`);
  ok(ids.length === 0 && c.length === 0, "はじめは 0 個");
}

console.log("\n■ 議事録（版）の中でカメラを奥へ送ると、手前の版から順に積まれる");
await lab.select("g0"); await lab.settle();                 // 軸セレクタと同じ「その空間」＝ 議事録（版）の中
const r = await lab.rect("giji"), c0 = { x: r.x + r.w / 2, y: r.y + r.h * 0.8 };
const seen = [];
for (const n of [0, 1, 2, 3, 4]) {
  if (n) await lab.wheel(c0.x, c0.y, 120);
  const ids = await lab.call("stack"), dom = (await chips()).map((q) => q.id);
  const f = (await lab.focusOf("giji")).z;
  console.log(`  ホイール ${n} 回  焦点 Z ${f.toFixed(2)}　積まれた ${ids.length} 個 [${ids.join(" ")}]　札 [${dom.join(" ")}] "${await title()}"`);
  ok(ids.join(" ") === dom.join(" "), `__lab.stack() と画面の札が一致（${n} 回目）`);
  seen.push(ids.length);
}
ok(seen[0] === 0 && Math.max(...seen) >= 2, `カメラを送るほど積まれる（${seen.join(" → ")}）`);

console.log("\n■ ★ 状態を持たない：カメラを戻すと、何もしていないのに空になる");
for (let i = 0; i < 4; i++) await lab.wheel(c0.x, c0.y, -120);
{
  const ids = await lab.call("stack"), f = (await lab.focusOf("giji")).z;
  console.log(`  戻した  焦点 Z ${f.toFixed(2)}　積まれた ${ids.length} 個　札 ${(await chips()).length} 枚`);
  ok(ids.length === 0, "戻すと勝手に空になる（「積んだ」配列を持っていない）");
}

console.log("\n■ アイコンを押すと、カメラが戻る（その泡が見える所まで焦点 Z が戻る）");
for (let i = 0; i < 4; i++) await lab.wheel(c0.x, c0.y, 120);
{
  const cs = await chips();
  const first = cs[0];
  const z0 = (await lab.focusOf("giji")).z;
  const was = (await lab.placements()).find((p) => p.id === first.id);
  console.log(`  積まれている [${cs.map((q) => q.id + "(" + q.text + ")").join(" ")}]　焦点 Z ${z0.toFixed(2)}`
            + `　${first.id} の vis ${was.vis}`);
  await lab.page.mouse.click(first.x + first.w / 2, first.y + first.h / 2);
  await lab.settle();
  const z1 = (await lab.focusOf("giji")).z;
  const now = (await lab.placements()).find((p) => p.id === first.id);
  const ids = await lab.call("stack");
  console.log(`  押したあと  焦点 Z ${z0.toFixed(2)} → ${z1.toFixed(2)}　${first.id} の vis ${now.vis} 倍率 ${now.scale.toFixed(3)}`
            + `　積まれた ${ids.length} 個 [${ids.join(" ")}]　選択中 ${await lab.call("selectedId")}`);
  ok(z1 < z0, `カメラが戻る（焦点 Z ${z0.toFixed(2)} → ${z1.toFixed(2)}）`);
  ok(now.vis > 0, `押した泡が見えるようになる`);
  ok(!ids.includes(first.id), `押した泡はスタックから降りる（状態ではなく、カメラの関数だから）`);
  // ★ 値は1つも書いていない（触るのと同じ枝）
  const b = (await lab.bubbles()).find((q) => q.id === first.id);
  ok(b.hist === +first.id.slice(1) && b.free.z === 0, `押しても泡の値は書かれない（hist ${b.hist} 自由Z ${b.free.z}）`);
}

console.log("\n■ ★ 積むのは、その空間の中だけ（入れ子の奥までは拾わない）");
await lab.select("memo1"); await lab.settle();
await lab.page.click("#refocus"); await lab.settle();
{
  // 外の空間（自由）で、いちばん奥にいる 勤務表（自由Z 0.4）を触る → 手前の兄弟が全部消える
  const p = await lab.call("headerPointOf", "kinmu");
  await lab.page.mouse.click(p.x, p.y);
  await lab.settle();
  const ps = await lab.placements();
  const hidden = ps.filter((q) => !(q.vis > 0));
  const ids = await lab.call("stack");
  const spaces = [...new Set(hidden.map((q) => q.space))];
  console.log(`  勤務表を触った（焦点 Z ${(await lab.focusOf("root")).z.toFixed(2)}）`);
  console.log(`  画面から消えた泡 ${hidden.length} 個（いる空間 ${spaces.join(" ")}）　積まれた ${ids.length} 個 [${ids.join(" ")}]`);
  ok(hidden.length > ids.length, `消えた泡ぜんぶは積まない（${hidden.length} 個消えて、積むのは ${ids.length} 個）`);
  const sp = ps.filter((q) => ids.includes(q.id)).map((q) => q.space);
  ok(new Set(sp).size === 1 && sp[0] === "root", `積まれたのは その空間（外の空間）の直の子だけ`);
  await lab.shot("stack-root");
}

console.log("\n■ 画面の約束（1440×900 で破綻しない・泡と同じ色・題名・data-hint・右上の欄と重ならない）");
{
  const cs = await chips();
  const side = await lab.page.evaluate(() => { const r = document.getElementById("side").getBoundingClientRect(); return { x: r.x, right: r.right }; });
  const last = cs[cs.length - 1];
  const hues = await lab.page.evaluate((ids) => ids.map((id) => window.__lab.bubbles().find((b) => b.id === id).hue), cs.map((q) => q.id));
  console.log(`  札 ${cs.length} 枚　いちばん下の札の下端 ${(last.y + last.h).toFixed(1)} / 900　左端 ${last.x.toFixed(1)}（右上の欄の右端 ${side.right.toFixed(1)}）`);
  console.log(`  札の題名 ${cs.map((q) => q.text).join(" ｜ ")}`);
  console.log(`  札の色 ${cs.slice(0, 3).map((q, i) => `${q.text} ${q.bg}（泡の hue ${hues[i]}）`).join("　")}`);
  ok(last.y + last.h <= 900 && last.x + last.w <= 1440, "1440×900 に入る（切れない）");
  ok(last.x >= side.right - 0.5, "右上の一覧・選択の欄と重ならない");
  ok(cs.every((q) => q.text.length > 0), "札に題名が入る");
  ok(cs.every((q) => q.hint), "札に data-hint が付いている（画面の約束）");
  const bgs = new Set(cs.map((q) => q.bg));
  ok(bgs.size > 1, `札の色は泡ごとに違う（${bgs.size} 色）`);
  // ヒント行に出るか
  await lab.page.hover("#stack .stk");
  await lab.page.mouse.move(cs[0].x + cs[0].w / 2, cs[0].y + cs[0].h / 2 + 1);
  await lab.page.waitForTimeout(80);
  const hint = await lab.textOf("#hint");
  console.log(`  札に乗せたときのヒント行：${hint}`);
  ok(hint.includes("カメラが戻る") && hint.includes(cs[0].text),
     "札に乗せると、その泡の名前と「押したら何が起きるか」がヒント行に出る");
}

const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
ok(errs.length === 0, `コンソールエラー 0（${errs.length}）・ネットワーク 0`);
await lab.shot("stack");
console.log(ng ? `\n手前の泡スタック NG ${ng}` : `\n手前の泡スタック 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
