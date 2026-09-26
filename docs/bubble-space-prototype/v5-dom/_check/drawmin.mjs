// ★ 描く下限（ui の話。規則には無い）── 小さくなりすぎた泡は描かない／掴めない。
//   もとの「端での下限 0.32」の代わりに入れたもの（../DECISIONS.md「端での下限 ── 入れたが、翌日に取り消した」）。
//
//   > 「別に奥に行ったバブルは読めなくてもいいよ。雰囲気だけでも残ってることに意味がある。
//   >  だからこれは全然 OK。ある程度小さくなったバブルは描画さえしなくていいし」（masa さん）
//
//   ★ いくつにするかは未決。ここは「つまみが効くか」と「いくつだと何が消えるか」を測るだけで、
//     どの数がよいとは言わない。★ スタックに積むかも未決なので、両方を並べて出す。
//
//   node docs/bubble-space-prototype/v5-dom/_check/drawmin.mjs
import { openLab, SHOT_DIR } from "./lab.mjs";

const lab = await openLab();
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "  OK " : "  NG "} ${msg}`); if (!c) ng++; };
const setMin = async (v) => { await lab.call("setDrawMin", v); await lab.settle(); };
const shortOf = (p) => Math.min(p.w, p.h);
/** いま描いていない泡（見えない親は別に数える） */
const tiny = async () => (await lab.placements()).filter((p) => p.tiny && !p.implicit);

await lab.settle();

// ── 1. 既定の下限と、その理由が測れるか ──
console.log(`■ つまみ（未決の数を、動かして決めるための口）`);
const def = await lab.call("drawMinOf");
console.log(`  既定 ${def}px　枠は倍率によらず画面 1.1px なので、5.0px で 1.1 + 2.8 + 1.1 ── 中身が枠2本ぶんより広い`);
ok(def > 0, `既定の下限がある（${def}px）`);
const readout = await lab.textOf("#drawmin-v");
console.log(`  ツールバーの表示「${readout}」`);
ok(/px/.test(readout), `いまの下限が画面に出ている`);

// ── 2. coverflow の端を触って、端を潰す（下限を取り消したので端は 0 まで潰れる） ──
console.log(`\n■ coverflow の端を触って、端を潰す`);
await lab.call("preset", "coverflow", "cover");
await lab.select("cf3"); await lab.settle();
{ const q = await lab.call("headerPointOf", "cf6"); await lab.page.mouse.click(q.x, q.y); await lab.settle(); }
await setMin(0);
const cover = (await lab.placements()).filter((p) => p.space === "cover").sort((a, b) => a.x - b.x);
console.log(`  写真7つの画面での大きさ　${cover.map((p) => `${p.w.toFixed(1)}×${p.h.toFixed(1)}`).join("  ")}`);
console.log(`  短辺　${cover.map((p) => shortOf(p).toFixed(1)).join("  ")}`);
ok(shortOf(cover[0]) < 3, `端は 3px を切るところまで潰れる（${shortOf(cover[0]).toFixed(1)}px）── 端での下限は無い`);

// ── 3. しきい値を動かすと、消える数が変わる ──
console.log(`\n■ しきい値を動かすと、消える数が変わる（★ どれがよいかは未決）`);
for (const t of [0, 3, 5, 6.5, 10, 16, 20]) {
  await setMin(t);
  const g = await tiny();
  const all = (await lab.placements()).filter((p) => !p.implicit && p.vis > 0);
  console.log(`  下限 ${String(t).padStart(4)}px  描かない ${String(g.length).padStart(2)} / ${all.length}`
            + `　${g.map((p) => `${p.id}(${shortOf(p).toFixed(1)}px)`).join(" ") || "なし"}`);
}
await setMin(5);
const at5 = await tiny();
ok(at5.length > 0 && at5.length <= 3, `既定 5px で消えるのは、線の切れはしになった ${at5.length} 個だけ（雰囲気は残る）`);
ok(at5.every((p) => shortOf(p) < 5), `消えたのはどれも短辺 5px 未満`);
{
  const kept = (await lab.placements()).filter((p) => p.space === "cover" && !p.tiny);
  console.log(`  残った写真 ${kept.length} 個の短辺 ${kept.map((p) => shortOf(p).toFixed(1)).join(" ")}`);
  ok(kept.length >= 5, `★ 消しすぎない ── 7 つのうち ${kept.length} つは残る（雰囲気ごと消さない）`);
}

// ── 4. 描かない泡は、DOM に出ていない／掴めない ──
console.log(`\n■ 描かない泡は掴めない（当たり判定からも外れているか）`);
{
  const p = at5[0];
  const dom = await lab.page.evaluate((id) => {
    const el = document.querySelector(`.bub[data-id="${id}"]`);
    return el ? { display: el.style.display, cls: el.className } : null;
  }, p.id);
  console.log(`  ${p.id}（短辺 ${shortOf(p).toFixed(1)}px）の DOM  display="${dom.display}"  class="${dom.cls}"`);
  ok(dom.display === "none", `描かない泡は display:none（DOM にも出ない）`);
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const hit = await lab.hitAt(cx, cy), hitM = await lab.call("hitModelAtNoSkip", cx, cy);
  console.log(`  その真ん中 (${cx.toFixed(1)}, ${cy.toFixed(1)}) を突く：DOM の当たり ${hit}　模型の当たり ${hitM}`);
  ok(hit !== p.id, `突いても、その泡は掴めない（DOM）`);
  ok(hitM !== p.id, `突いても、その泡は掴めない（模型。v4 と同じ式のほう）`);
  // 下限を 0 に戻せば、また掴める
  await setMin(0);
  const back = await lab.hitAt(cx, cy);
  console.log(`  下限を 0 に戻すと ${back}`);
  ok(back === p.id, `下限を 0 に戻せば、また掴める（状態は持たない。下限の関数）`);
  await setMin(5);
}

// ── 5. 入れ物が描かれないなら、中身も描かれない ──
console.log(`\n■ 入れ物が描かれないなら、中身も描かれない（箱ごと消える）`);
await setMin(20);
{
  const ps = await lab.placements();
  const byId = Object.fromEntries(ps.map((p) => [p.id, p]));
  const orphan = ps.filter((p) => !p.tiny && p.space !== "root" && byId[p.space] && byId[p.space].tiny);
  const carried = ps.filter((p) => p.tiny && shortOf(p) >= 20);
  console.log(`  下限 20px：描かない ${ps.filter((p) => p.tiny).length} 個（うち道連れ ${carried.length} 個）`);
  console.log(`  入れ物が消えたのに中身だけ描いている泡 ${orphan.length} 個`);
  ok(orphan.length === 0, `入れ物が消えたら中身も消える（宙に浮いた中身 0）`);
}
await setMin(5);

// ── 6. domain（倍率・位置）には手を出していない ──
console.log(`\n■ 描く下限は ui の話 ── placements の中身は1つも変わらない`);
{
  const key = (ps) => ps.map((p) => `${p.id} ${p.x.toFixed(6)} ${p.y.toFixed(6)} ${p.w.toFixed(6)} ${p.h.toFixed(6)} ${p.scale.toFixed(9)}`).join("\n");
  const a = key(await lab.placements());
  await setMin(0);
  const b = key(await lab.placements());
  await setMin(20);
  const c = key(await lab.placements());
  await setMin(5);
  console.log(`  下限 5 / 0 / 20 の placements を突き合わせ（泡 ${a.split("\n").length} 個 × 5 つの数）`);
  ok(a === b && b === c, `位置も大きさも倍率も、下限では1つも変わらない`);
}

// ── 7. ★ 消しすぎると、雰囲気ごと消える（masa さんの釘） ──
//     「雰囲気だけでも残ってることに意味がある」── 数を上げすぎると、入れ物だけ残って中身が空になる
console.log(`\n■ ★ 消しすぎるとどうなるか（勤務表とカレンダーを 格子 × 魚眼 で潰した場面）`);
await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
for (const sp of ["kinmu", "cal"]) for (const ax of ["x", "y"]) await lab.call("setAxis", sp, ax, { lens: "fisheye" });
await lab.settle();
{
  const rows = [];
  for (const t of [0, 5, 10, 16, 20]) {
    await setMin(t);
    const ps = await lab.placements();
    const cal = ps.filter((p) => p.space === "cal");
    rows.push({ t, kept: cal.filter((p) => !p.tiny).length, all: cal.length, gone: ps.filter((p) => p.tiny && !p.implicit).length });
    console.log(`  下限 ${String(t).padStart(2)}px  カレンダーの日 ${rows.at(-1).kept}/${cal.length} 残る　画面ぜんぶで 描かない ${rows.at(-1).gone}`);
  }
  const at5 = rows.find((r) => r.t === 5), at16 = rows.find((r) => r.t === 16);
  ok(at5.kept === at5.all, `既定 5px では、14 日ぜんぶ残る（一番小さい日は 9.7px ＝ 数字は出ないが「色のついた面」は残る＝雰囲気）`);
  ok(at16.kept === 0, `★ 16px まで上げると カレンダーの中身が 0 個になる（入れ物だけ残って空になる＝雰囲気ごと消える）`);
  console.log(`  ★ だから既定は低く置いた。上げるのはつまみでいつでもできる`);
}
await setMin(5);

// ── 8. ★ 未決：描かなかった泡を、手前の泡スタックに積むか（両方を並べて出す） ──
console.log(`\n■ ★ 未決：描かなかった泡を、手前の泡スタックに積むか`);
console.log(`  A ＝ いまのまま（積むのは「焦点より手前へ抜けた泡」だけ）　B ＝ 小さくて描かなかった泡も積む`);
const SCENES = [
  ["coverflow の端を触る（選択は写真＝その空間の中）", async () => {
    await lab.call("preset", "coverflow", "cover"); await lab.select("cf3"); await lab.settle();
    const q = await lab.call("headerPointOf", "cf6"); await lab.page.mouse.click(q.x, q.y); await lab.settle(); }],
  ["★ 同じ画面で、選択だけ外の泡に移す（消えたのは coverflow の中）", async () => {
    await lab.call("preset", "coverflow", "cover"); await lab.select("cf3"); await lab.settle();
    const q = await lab.call("headerPointOf", "cf6"); await lab.page.mouse.click(q.x, q.y); await lab.settle();
    await lab.select("memo1"); await lab.settle(); }],
  ["X魚眼ビューの端を触る（選択は版＝その空間の中）", async () => {
    await lab.select("v0"); await lab.settle();
    const q = await lab.call("headerPointOf", "v9"); await lab.page.mouse.click(q.x, q.y); await lab.settle(); }],
  ["自由の空間で奥の泡を触る（選択は外の空間）", async () => {
    await lab.call("preset", "free", "root"); await lab.select("memo1"); await lab.settle();
    await lab.page.click("#refocus"); await lab.settle();
    const q = await lab.call("headerPointOf", "kinmu"); await lab.page.mouse.click(q.x, q.y); await lab.settle(); }],
  ["勤務表を格子×魚眼で潰す（選択は外の空間）", async () => {
    await lab.call("preset", "free", "root"); await lab.select("memo1"); await lab.settle();
    await lab.page.click("#refocus"); await lab.settle();
    await lab.call("setAxis", "kinmu", "x", { lens: "fisheye" }); await lab.call("setAxis", "kinmu", "y", { lens: "fisheye" });
    await lab.call("setAxis", "cal", "x", { lens: "fisheye" }); await lab.settle(); }],
];
let bShowed = 0, tinyOutside = 0;
for (const [name, go] of SCENES) {
  await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
  await go();
  await setMin(5);
  const g = await tiny();
  await lab.call("setStackTiny", false); await lab.settle();
  const A = await lab.call("stackRows");
  await lab.call("setStackTiny", true); await lab.settle();
  const B = await lab.call("stackRows");
  await lab.call("setStackTiny", false); await lab.settle();
  const outside = g.filter((p) => !B.some((r) => r.id === p.id));
  if (B.length > A.length) bShowed++;
  tinyOutside += outside.length;
  console.log(`  ${name}`);
  console.log(`    描かなかった泡 ${g.length}（${g.map((p) => `${p.id}@${p.space}`).join(" ") || "なし"}）`);
  console.log(`    スタック  A ${A.length}（${A.map((r) => r.id).join(" ") || "空"}）`
            + `　B ${B.length}（${B.map((r) => `${r.id}:${r.why}`).join(" ") || "空"}）`);
  console.log(`    ★ B でも拾えない泡 ${outside.length}（スタックはその空間の中だけ。よその空間の泡は積まれない）`);
  const n = await lab.textOf("#drawmin-v");
  console.log(`    ツールバーの数「${n}」 ── ★ 減ったことに気づける唯一の口（スタックはその空間の中しか出さない）`);
}
console.log(`\n  まとめ：${SCENES.length} 場面のうち、B がスタックを増やせたのは ${bShowed} 場面。`);
console.log(`  　　　　B にしても拾えなかった泡は ${tinyOutside} 個（どれも「選んでいる空間の外」にいる）。`);
ok(true, `A と B を両方まわして測った（どちらを採るかは masa さんが決める）`);

// ── 9. B を採るなら、札を押して戻せるか（A は stack.mjs で見ている） ──
console.log(`\n■ B を採ったとき、札を押すと戻ってこられるか`);
await lab.page.reload(); await lab.page.waitForFunction(() => !!window.__lab); await lab.settle();
await lab.call("preset", "coverflow", "cover"); await lab.select("cf3"); await lab.settle();
{ const q = await lab.call("headerPointOf", "cf6"); await lab.page.mouse.click(q.x, q.y); await lab.settle(); }
await setMin(5);
await lab.page.click("#stacktiny"); await lab.settle();
{
  const rows = await lab.call("stackRows");
  const n = await lab.page.$$eval("#stack .stk.tiny", (es) => es.length);
  console.log(`  積まれた札 ${rows.map((r) => `${r.id}:${r.why}`).join(" ")}　うち点線（小さすぎ）の札 ${n} 枚`);
  ok(n === rows.filter((r) => r.why === "tiny").length, `小さすぎて消えた札は、手前へ抜けた札と見た目で分かれている（点線）`);
  const id = rows[0].id;
  const was = (await lab.placements()).find((p) => p.id === id);
  await lab.page.click(`#stack .stk[data-id="${id}"]`);
  await lab.settle();
  const now = (await lab.placements()).find((p) => p.id === id);
  console.log(`  ${id} の札を押す：短辺 ${shortOf(was).toFixed(1)}px → ${shortOf(now).toFixed(1)}px　描かない ${was.tiny} → ${now.tiny}`);
  ok(!now.tiny && shortOf(now) > shortOf(was), `札を押すとカメラが寄って、また描かれる（戻ってこられる）`);
}
await lab.page.click("#stacktiny"); await lab.settle();

await lab.shot("drawmin");
const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n描く下限 NG ${ng}` : `\n描く下限 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
