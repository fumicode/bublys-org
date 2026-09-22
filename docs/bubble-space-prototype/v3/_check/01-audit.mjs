// 01-snap-is-parent の「踏んだこと」に書かれた数字を、1つずつ測り直す。
//   node docs/bubble-space-prototype/v3/_check/01-audit.mjs
import { openLab, V3 } from "./lab.mjs";

const FILE = `${V3}/01-snap-is-parent.html`;
const f = n => (n === null || n === undefined ? "-" : n.toFixed(2));
const results = [];
const say = (name, got, want) => { results.push({ name, got, want }); console.log(`  ${name}\n    測った: ${got}\n    書いてある: ${want}`); };

async function fresh() { const lab = await openLab(FILE); await lab.settle(); return lab; }
const pos = async (lab, id) => { const r = await lab.rect(id); return r && { x: r.x, y: r.y, w: r.w, h: r.h }; };
const d = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;

/* ── 1. 詰める大きさ（自前／見かけ）のすき間 ── */
console.log("\n【1】詰める大きさ：並びの中のすき間");
{
  for (const [side, pair] of [["left", ["list", "item"]], ["right", ["item", "list"]]]) {
    for (const size of ["own", "seen"]) {
      const lab = await fresh();
      await lab.call("setToggle", "size", size);
      await lab.call("snap", "list", "item", side);
      await lab.settle();
      const g = await lab.call("gapBetween", pair[0], pair[1], "x");
      say(`[${pair.map(x => x === "list" ? "メモ一覧" : "買い物").join(", ")}] ${size === "own" ? "自前" : "見かけ"}`,
          `${f(g)}px`, side === "left" ? (size === "own" ? "30.95px すき間" : "0.00px") : (size === "own" ? "35.08px 重なり(=-35.08)" : "0.00px"));
      await lab.close();
    }
  }
}

/* ── 2. 勤務表を並びの子にしても、中の配置は差 0 ── */
console.log("\n【2】勤務表（中に格子）を並びの子にしても、中の配置は変わらない");
{
  const lab = await fresh();
  const ids = ["seiyaku", "staff", "cal", "p0", "p4", "d0", "d6", "d13"];
  const rel = async () => { const k = await pos(lab, "kinmu"); const o = {}; for (const i of ids) { const p = await pos(lab, i); o[i] = { x: p.x - k.x, y: p.y - k.y, w: p.w }; } return o; };
  const inRow = await rel();
  // 希望シフトを遠くへ引き出す → R3 で並びが消え、勤務表が root へ
  await lab.dragBubble("kibou", { dx: 300, dy: -260 });
  const row = await lab.call("rowOf", "kinmu");
  const atRoot = await rel();
  let max = 0; for (const i of ids) max = Math.max(max, Math.abs(inRow[i].x - atRoot[i].x), Math.abs(inRow[i].y - atRoot[i].y), Math.abs(inRow[i].w - atRoot[i].w));
  say("並びの中 ↔ root での中身のずれ（最大）", `${max.toFixed(4)}px（並びは ${row === null ? "消えた" : "残った:" + row}）`, "0.0000px");
  await lab.close();
}

/* ── 3. くっつけると、相手は跳ばない ── */
console.log("\n【3】くっつける：相手は 0.0px、寄せた泡だけが縁まで動く");
{
  const lab = await fresh();
  // 本物のマウスで、メモ一覧の右の縁を 買い物 の左の縁の 21px 手前まで引く（＝縁へ寄せた状態で離す）
  const it0 = await lab.rect("item"), li0 = await lab.rect("list");
  await lab.dragBubble("list", { dx: (it0.x - 21) - (li0.x + li0.w), dy: (it0.y + 30) - li0.y });
  const before = { list: await pos(lab, "list"), item: await pos(lab, "item"), fA: await pos(lab, "fA") };
  await lab.page.waitForTimeout(30); await lab.settle();
  const after = { list: await pos(lab, "list"), item: await pos(lab, "item"), fA: await pos(lab, "fA") };
  const gap = await lab.call("gapBetween", "list", "item", "x");
  say("相手（買い物）のずれ", `${f(d(before.item, after.item))}px`, "0.0px");
  say("寄せた泡（メモ一覧）が縁まで動いた分", `離した所からの縁のすき間 ${f(gap)}px（21px 手前で離した）`, "21px 動いて縁が接する");
  say("無関係（付箋A）のずれ", `${f(d(before.fA, after.fA))}px`, "0.0px");
  say("親が生まれたか", JSON.stringify(await lab.call("implicitParents")).includes('"kids":["list","item"]') ? "生まれた [list,item]" : JSON.stringify((await lab.call("implicitParents")).map(r => r.kids)), "見えない親が生まれ、中は [メモ一覧, 買い物]");
  await lab.close();
}

/* ── 4. 本物のマウスでのくっつけ（縁へ寄せて離す） ── */
console.log("\n【4】本物のマウスで縁へ寄せる");
{
  const lab = await fresh();
  const it = await lab.rect("item"), li = await lab.rect("list");
  const before = await pos(lab, "item");
  // メモ一覧の右の縁を、買い物の左の縁の 10px 手前へ
  await lab.dragBubble("list", { dx: (it.x - 10) - (li.x + li.w), dy: (it.y + 20) - li.y });
  const rows = await lab.call("implicitParents");
  say("並びが生まれたか", rows.length ? JSON.stringify(rows.map(r => r.kids)) : "生まれなかった", "[[メモ一覧, 買い物]] を含む");
  say("相手（買い物）のずれ", `${f(d(before, await pos(lab, "item")))}px`, "0.0px");
  if (lab.errors().length) say("エラー", lab.errors()[0], "0");
  await lab.close();
}

/* ── 5. 入れ子の泡は、箱の外まで引かないと出ない（第1回の修正） ── */
console.log("\n【5】入れ子の泡を少し引いても、外の並びに飛び移らない");
{
  for (const [id, name, dx] of [["d6", "カレンダーの7", 22], ["seiyaku", "制約", 95], ["p4", "伊藤", 40]]) {
    const lab = await fresh();
    const k0 = await pos(lab, "kinmu");
    const bs0 = await lab.bubbles();
    const par0 = bs0.find(b => b.id === id).parent;
    await lab.dragBubble(id, { dx });
    const bs1 = await lab.bubbles();
    const par1 = bs1.find(b => b.id === id).parent;
    say(`${name} を ${dx}px 右へ`, `親 ${par0} → ${par1}／勤務表のずれ ${f(d(k0, await pos(lab, "kinmu")))}px`, `親は変わらない／勤務表のずれ 0.0px`);
    await lab.close();
  }
}

/* ── 6. 勤務表の外まで引き出せば、付箋C にくっつく ── */
console.log("\n【6】勤務表の外まで引き出せば、くっつく");
{
  const lab = await fresh();
  const fc = await lab.rect("fC"), d6 = await lab.rect("d6");
  // 付箋C の下の縁へ
  await lab.dragBubble("d6", { to: { x: fc.x + fc.w / 2, y: fc.y + fc.h + 12 + d6.h / 2 - 12 } });
  const bs = await lab.bubbles();
  const b = bs.find(x => x.id === "d6");
  const rows = await lab.call("implicitParents");
  say("「7」の行き先", `親=${b.parent}／並び=${JSON.stringify(rows.map(r => r.kids))}`, "付箋C と同じ並びに入る");
  await lab.close();
}

/* ── 7. 角の R4（pin）：カレンダーの角を引く ── */
console.log("\n【7】角で大きさを変えても、外側は動かない（pin）");
{
  const lab = await fresh();
  await lab.select("cal");
  await lab.settle();
  const B = {}; for (const i of ["cal", "staff", "kinmu", "kibou", "seiyaku"]) B[i] = await pos(lab, i);
  const c = await lab.rect("cal");
  await lab.dragPoint(c.x + c.w - 3, c.y + c.h - 3, c.x + c.w - 3 + 60, c.y + c.h - 3);
  await lab.settle();
  const line = [];
  for (const i of ["cal", "staff", "kinmu", "kibou", "seiyaku"]) {
    const a = await pos(lab, i);
    line.push(`${i} 左上 ${f(Math.abs(a.x - B[i].x))},${f(Math.abs(a.y - B[i].y))}`);
  }
  say("角を右へ 60px", line.join(" / "), "カレンダー・スタッフ・勤務表は 0.0px、希望シフトだけ 60px");
  if (lab.errors().length) say("エラー", lab.errors()[0], "0");
  await lab.close();
}

/* ── 8. 7つのプリセットを並びに当てても壊れない（第1回の監査） ── */
console.log("\n【8】並び（見えない親）に 7 つのプリセットを当てる");
{
  for (const p of ["自由に置く", "横に並べる", "縦に並べる", "格子", "X魚眼ビュー", "coverflow", "履歴を奥行きに"]) {
    const lab = await fresh();
    await lab.call("preset", p, "row1");
    await lab.settle();
    await lab.select("kinmu"); await lab.settle();
    const ps = await lab.placements();
    const bad = ps.filter(q => !isFinite(q.x) || !isFinite(q.y) || !isFinite(q.w) || q.w < 0);
    const row = ps.find(q => q.id === "row1");
    const km = ps.find(q => q.id === "kinmu");
    const off = ps.filter(q => q.scale > 0.2 && (q.x + q.w < 0 || q.x > 1440)).map(q => q.id);
    say(`並びに「${p}」`, `エラー ${lab.errors().length}／並びの箱 ${f(row.w)}×${f(row.h)}／勤務表 x=${f(km.x)}／画面の外 [${off.join(",")}]`, "例外 0・箱は中身ぴったり（いまは窓へ回るので並びの箱は変わらない）");
    await lab.close();
  }
}

/* ── 9. 並びの中と外で、同じ泡が同じ大きさ（R6：Z は窓のもの） ── */
console.log("\n【9】外の空間が「Z なし」なら、並びの中でも透視は効かない");
{
  const lab = await fresh();
  await lab.call("setAxis", "root", "z", { dim: "none", lens: "flat" });
  await lab.settle();
  const outW = (await lab.rect("list")).w;
  await lab.call("snap", "list", "item", "left");
  await lab.settle();
  const inW = (await lab.rect("list")).w;
  say("メモ一覧の幅（外 / 並びの中）", `${f(outW)}px / ${f(inW)}px`, "150px / 150px（前は 150 / 119）");
  await lab.close();
}

/* ── 10. どちらの縁から寄せても同じ（差し込む所より前の泡を留める） ── */
console.log("\n【10】同じすき間を、どちらの縁から指しても同じ答え");
{
  const out = {};
  for (const [label, target, side] of [["買い物の左の縁", "item", "left"], ["メモ一覧の右の縁", "list", "right"]]) {
    const lab = await fresh();
    await lab.call("snap", "list", "item", "left");   // [メモ一覧, 買い物]
    await lab.settle();
    await lab.call("snap", "fA", target, side);       // あいだへ差し込む
    await lab.settle();
    out[label] = { list: await pos(lab, "list"), item: await pos(lab, "item"), fA: await pos(lab, "fA"),
                   kids: (await lab.call("implicitParents"))[0]?.kids };
    await lab.close();
  }
  const a = out["買い物の左の縁"], b = out["メモ一覧の右の縁"];
  say("2通りの差の最大", `${f(Math.max(d(a.list, b.list), d(a.item, b.item), d(a.fA, b.fA)))}px（並び ${JSON.stringify(a.kids)} / ${JSON.stringify(b.kids)}）`, "0.0px");
  say("メモ一覧の左上（2通り）", `${f(a.list.x)} / ${f(b.list.x)}`, "同じ（差し込む所より前の泡を留める）");
}

/* ── 11. 直せなかった：並びに「自由に置く」 ── */
console.log("\n【11】直せなかったと書いてあること：並びに「自由に置く」");
{
  const lab = await fresh();
  const before = await pos(lab, "kinmu");
  await lab.call("preset", "自由に置く", "row1");
  await lab.settle();
  const after = await pos(lab, "kinmu");
  say("勤務表の左上", `${f(before.x)} → ${f(after.x)}（${f(after.x - before.x)}px）`, "（前）画面の左外へ −340px ／（いま）並びは View を選べないので 0.0px");
  await lab.close();
}

console.log("\n========");
console.log(`項目 ${results.length}`);
