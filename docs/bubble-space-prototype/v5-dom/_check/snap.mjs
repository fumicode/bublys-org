// ③ くっつける ── 本物のマウスで。縁へ寄せる → 並ぶ／引き離す → 抜ける／入れ子／
//   くっつけるは「落とし込みの1つ」（入れ子の中の泡が、少し引いただけで外の並びへ飛ばないか）
//   node docs/bubble-space-prototype/v5-dom/_check/snap.mjs
import { openLab } from "./lab.mjs";

const lab = await openLab();
let ng = 0;
const ok = (c, msg) => { console.log(`${c ? "  OK " : "  NG "} ${msg}`); if (!c) ng++; };
const rows = () => lab.call("implicitParents");

console.log(`■ 縁へ寄せて離す → くっつく（本物のマウス）`);
{
  const before = await lab.rect("fA"), b2 = await lab.rect("fB"), c = await lab.rect("fC");
  // 付箋C を 付箋B の右の縁から 20px 手前まで引く（SNAP_EDGE は 24px）
  const dx = (b2.x + b2.w + 20) - c.x, dy = (b2.y + 10) - c.y;
  await lab.dragBubble("fC", { dx, dy });
  const rs = await rows(), after = await lab.rect("fA");
  console.log(`  見えない親 ${rs.length} 個  [${rs.map((r) => r.kids.join(",")).join("] [")}]`
            + `　付箋A のずれ ${(after.x - before.x).toFixed(2)}, ${(after.y - before.y).toFixed(2)}px`);
  ok(rs.length === 1 && rs[0].kids.join(",") === "fA,fB,fC", `並びに加わる（親は増えない）`);
  ok(Math.abs(after.x - before.x) < 0.02 && Math.abs(after.y - before.y) < 0.02, `⑤ 相手（前の泡）は 0.00px`);
  const gap = (await lab.rect("fC")).x - ((await lab.rect("fB")).x + (await lab.rect("fB")).w);
  console.log(`  縁のすき間 ${gap.toFixed(2)}px`);
  ok(Math.abs(gap) < 0.02, `縁が接する（隙間 0）`);
  await lab.shot("snap-joined");
}

console.log(`\n■ 入れ子：並びの中の泡の下の縁へ寄せると、その席に新しい並びが生まれる`);
{
  await lab.call("snap", "memo3", "fB", "bottom");
  await lab.settle();
  const rs = await rows();
  console.log(`  見えない親 ${rs.length} 個  ${rs.map((r) => `${r.id}(親 ${r.parent ?? "root"})[${r.kids.join(",")}]`).join(" ")}`);
  ok(rs.length === 2 && rs.some((r) => r.parent && r.parent.startsWith("snap")), `見えない親が入れ子になる`);
  const depth = (await lab.placements()).find((p) => p.id === "memo3").depth;
  console.log(`  思いつき の深さ ${depth}`);
  ok(depth === 3, `深さが1段増える（外の空間 → 並び → 並び → 泡）`);
  await lab.shot("snap-nested");
}

console.log(`\n■ 引き離す → 抜ける。子が1つになった見えない親は消える`);
{
  await lab.dragBubble("memo3", { dx: -420, dy: -330 });
  const rs = await rows();
  const parent = (await lab.bubbles()).find((b) => b.id === "memo3").parent;
  console.log(`  見えない親 ${rs.length} 個  [${rs.map((r) => r.kids.join(",")).join("] [")}]　思いつき の親 ${parent ?? "root（外の空間）"}`);
  ok(rs.length === 1, `入れ子の並びは畳まれる（並びは2つ以上）`);
  // 落とした先は「カーソルの下の空間」なので、たまたま別の空間の中身の上なら、その子になる（土台の決まりどおり）
  ok(!parent || !parent.startsWith("snap"), `引き離した泡は並びから抜ける（落ちた先は ${parent ?? "外の空間"}）`);
}

console.log(`\n■ くっつけるは「落とし込みの1つ」── 入れ子の中の泡を少し引いても、外の並びへ飛ばない`);
for (const [id, dx] of [["d6", 22], ["seiyaku", 95], ["p4", 40]]) {
  const k0 = await lab.rect("kinmu");
  const b0 = (await lab.bubbles()).find((b) => b.id === id);
  await lab.dragBubble(id, { dx });
  const b1 = (await lab.bubbles()).find((b) => b.id === id);
  const k1 = await lab.rect("kinmu");
  console.log(`  ${id.padEnd(8)} を右へ ${String(dx).padStart(3)}px　親 ${b0.parent} → ${b1.parent}`
            + `　勤務表のずれ ${(k1.x - k0.x).toFixed(2)}, ${(k1.y - k0.y).toFixed(2)}px`);
  ok(b0.parent === b1.parent, `${id}：中に留まる（外の並びへ飛ばない）`);
  ok(Math.abs(k1.y - k0.y) < 0.02, `${id}：勤務表は縦に 0.00px`);
}

console.log(`\n■ 箱の外まで引き出せば、外の泡にくっつく`);
{
  const f = await lab.rect("fC"), p = await lab.rect("p4");
  await lab.dragBubble("p4", { dx: (f.x + f.w + 14) - p.x, dy: (f.y + 6) - p.y });
  const b = (await lab.bubbles()).find((b) => b.id === "p4");
  const rs = await rows();
  console.log(`  伊藤 の親 ${b.parent}　見えない親 [${rs.map((r) => r.kids.join(",")).join("] [")}]`);
  ok(rs.some((r) => r.kids.includes("p4")), `勤務表の外まで引き出せば、並びに加われる`);
  await lab.shot("snap-out");
}

const errs = lab.errors();
if (errs.length) { console.log("エラー:", errs); ng++; }
console.log(ng ? `\n③ くっつける NG ${ng}` : `\n③ くっつける 全部 OK`);
await lab.close();
process.exit(ng ? 1 : 0);
