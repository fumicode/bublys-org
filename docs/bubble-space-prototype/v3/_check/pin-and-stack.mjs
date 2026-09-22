// ⑤ pin と ⑥ 置いた順（stack）が、実際に何を支えているかを測る。
//   node docs/bubble-space-prototype/v3/_check/pin-and-stack.mjs
import { openLab, V3 } from "./lab.mjs";

const show = (r) => r ? `(${r.x.toFixed(1)}, ${r.y.toFixed(1)})` : "-";

// ── ⑤ pin：05-kinmuhyo で「触っていない泡が動かないか」 ──
{
  const lab = await openLab(`${V3}/05-kinmuhyo.html`);
  const bs = await lab.bubbles();
  console.log("【05-kinmuhyo の泡】", bs.map((b) => b.id).join(" "));

  const kinmu = bs.find((b) => /勤務表/.test(b.title))?.id;
  const kibou = bs.find((b) => /希望/.test(b.title))?.id;
  const sato = bs.find((b) => /佐藤/.test(b.title))?.id;
  console.log(`勤務表=${kinmu} 希望シフト=${kibou} 佐藤=${sato}\n`);

  // (a) 希望シフトを引き剥がす → 勤務表は動くか
  const before = await lab.rect(kinmu);
  await lab.dragBubble(kibou, { dx: 360, dy: 260 });
  const after = await lab.rect(kinmu);
  console.log("⑤-a 希望シフトを引き剥がす");
  console.log(`     勤務表の左上 ${show(before)} → ${show(after)}  ずれ ${Math.hypot(after.x - before.x, after.y - before.y).toFixed(3)}px`);
  await lab.shot("pin-a-detached");
  await lab.close();
}

// (b) 佐藤の大きさを変える → 勤務表は動くか（中の兄弟は押される）
{
  const lab = await openLab(`${V3}/05-kinmuhyo.html`);
  const bs = await lab.bubbles();
  const kinmu = bs.find((b) => /勤務表/.test(b.title))?.id;
  const cal = bs.find((b) => /カレンダー/.test(b.title))?.id;
  const sato = bs.find((b) => /佐藤/.test(b.title))?.id;
  const k0 = await lab.rect(kinmu), c0 = await lab.rect(cal);
  await lab.select(sato);
  const s = await lab.rect(sato);
  // 右下の角を掴んで広げる
  await lab.dragPoint(s.x + s.w - 4, s.y + s.h - 4, s.x + s.w + 60, s.y + s.h + 4);
  const k1 = await lab.rect(kinmu), c1 = await lab.rect(cal);
  console.log("\n⑤-b 佐藤を右へ60px広げる");
  console.log(`     勤務表の左上 ${show(k0)} → ${show(k1)}  ずれ ${Math.hypot(k1.x - k0.x, k1.y - k0.y).toFixed(3)}px  ← 触っていない`);
  console.log(`     カレンダー   ${show(c0)} → ${show(c1)}  ずれ ${(c1.x - c0.x).toFixed(1)}px  ← 押される（これは正しい）`);
  await lab.shot("pin-b-resized");
  await lab.close();
}

// ── ⑥ 置いた順：00-core で「同じマスに重なったとき、どちらが手前か」 ──
{
  const lab = await openLab(`${V3}/00-core.html`);
  const bs = await lab.bubbles();
  const omoi = bs.find((b) => /思いつき/.test(b.title))?.id;
  const seiyaku = bs.find((b) => /制約/.test(b.title))?.id;
  console.log(`\n⑥ 00-core：思いつき=${omoi} 制約=${seiyaku}`);
  const s0 = await lab.rect(seiyaku);
  const before = (await lab.bubbles()).find((b) => b.id === omoi);
  console.log(`     落とす前の 思いつき の stack=${before.stack}  制約の stack=${(await lab.bubbles()).find((b) => b.id === seiyaku).stack}`);
  // 制約のマスへ落とす
  await lab.dragBubble(omoi, { to: { x: s0.x + s0.w / 2, y: s0.y + s0.h / 2 } });
  const bs2 = await lab.bubbles();
  const o2 = bs2.find((b) => b.id === omoi), s2 = bs2.find((b) => b.id === seiyaku);
  console.log(`     落とした後       思いつき stack=${o2.stack} parent=${o2.parent}  制約 stack=${s2.stack}`);
  const ps = await lab.placements();
  const io = ps.findIndex((p) => p.id === omoi), is = ps.findIndex((p) => p.id === seiyaku);
  console.log(`     描く順（後のほうが手前）: 思いつき ${io} / 制約 ${is} → ${io > is ? "思いつきが手前" : "制約が手前"}`);
  await lab.shot("stack-dropped");
  await lab.close();
}
