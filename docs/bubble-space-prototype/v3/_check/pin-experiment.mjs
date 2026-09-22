// ⑤ pin は本当に「公理の外」か。
//   pin を切ったとき、触っていない泡がどれだけ動くか。
//   そして「塊を始端に留める」と、それが消えるか。
//   node docs/bubble-space-prototype/v3/_check/pin-experiment.mjs
import { openLab, V3 } from "./lab.mjs";

const D = (a, b) => a && b ? Math.hypot(b.x - a.x, b.y - a.y) : NaN;

/** 1つの操作を、指定の条件で走らせて「誰がどれだけ動いたか」を返す */
async function run(op, { pin, anchor }) {
  const lab = await openLab(`${V3}/05-kinmuhyo.html`);
  await lab.page.evaluate(([p, a]) => { window.__lab.setPin(p); window.__lab.setBlockAnchor(a); }, [pin, anchor]);
  await lab.settle();

  const watch = ["kinmu", "seiyaku", "cal", "staff", "sekai", "kibou", "p0", "p4"];
  const before = {};
  for (const id of watch) before[id] = await lab.rect(id);

  await op(lab);

  const moved = [];
  for (const id of watch) {
    const d = D(before[id], await lab.rect(id));
    if (d > 0.5) moved.push(`${id}:${d.toFixed(0)}px`);
  }
  const errs = lab.errors().length;
  await lab.close();
  return { moved, errs };
}

const OPS = {
  "希望シフトを引き剥がす": async (lab) => { await lab.dragBubble("kibou", { dx: 380, dy: 280 }); },
  "佐藤の角を60px広げる": async (lab) => {
    await lab.select("p0");
    const s = await lab.rect("p0");
    await lab.dragPoint(s.x + s.w - 4, s.y + s.h - 4, s.x + s.w + 60, s.y + s.h + 4);
  },
  "伊藤を先頭へ並べ替え": async (lab) => {
    const p4 = await lab.call("headerPointOf", "p4"), p0 = await lab.rect("p0");
    await lab.dragBubble("p4", { to: { x: p4.x, y: p0.y - 6 } });
  },
};

const CONDS = [
  { label: "pin ON ・塊は中央（いまの姿）", pin: true, anchor: "center" },
  { label: "pin OFF・塊は中央", pin: false, anchor: "center" },
  { label: "pin OFF・塊は始端", pin: false, anchor: "start" },
];

for (const [name, op] of Object.entries(OPS)) {
  console.log(`\n■ ${name}`);
  for (const c of CONDS) {
    const r = await run(op, c);
    console.log(`   ${c.label.padEnd(26)} 動いた: ${r.moved.length ? r.moved.join(" ") : "なし"}${r.errs ? "  ★エラー" + r.errs : ""}`);
  }
}
console.log("\n（kinmu=勤務表 seiyaku=制約 cal=カレンダー staff=スタッフ sekai=世界線 kibou=希望シフト p0=佐藤 p4=伊藤）");
console.log("※ 操作した本人が動くのは正しい。見るのは「触っていない泡」が動いたかどうか。");
