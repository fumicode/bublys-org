// pin を切ったときの移動量は「箱の伸び縮みの半分」か？
// そうなら、原因は「泡の位置＝箱の中心」であって、公理の穴ではない。
import { openLab, V3 } from "./lab.mjs";

async function trial(pin) {
  const lab = await openLab(`${V3}/05-kinmuhyo.html`);
  await lab.page.evaluate((p) => window.__lab.setPin(p), pin);
  await lab.settle();

  const row = (await lab.bubbles()).find((b) => b.implicit && (b.title || "").includes("並び") || b.id === "row1")?.id ?? "row1";
  const b0 = { staff: await lab.rect("staff"), cal: await lab.rect("cal"), kinmu: await lab.rect("kinmu"), p0: await lab.rect("p0") };

  await lab.select("p0");
  const s = b0.p0;
  await lab.dragPoint(s.x + s.w - 4, s.y + s.h - 4, s.x + s.w + 60, s.y + s.h + 4);

  const b1 = { staff: await lab.rect("staff"), cal: await lab.rect("cal"), kinmu: await lab.rect("kinmu"), p0: await lab.rect("p0") };
  const r = {
    pin,
    佐藤の幅: `${b0.p0.w.toFixed(0)} → ${b1.p0.w.toFixed(0)} (＋${(b1.p0.w - b0.p0.w).toFixed(0)})`,
    スタッフの箱の幅: `${b0.staff.w.toFixed(0)} → ${b1.staff.w.toFixed(0)} (＋${(b1.staff.w - b0.staff.w).toFixed(0)})`,
    佐藤の左上: `${(b1.p0.x - b0.p0.x).toFixed(1)}px`,
    スタッフの左上: `${(b1.staff.x - b0.staff.x).toFixed(1)}px`,
    カレンダーの左上: `${(b1.cal.x - b0.cal.x).toFixed(1)}px`,
    勤務表の左上: `${(b1.kinmu.x - b0.kinmu.x).toFixed(1)}px`,
  };
  await lab.close();
  return r;
}

for (const pin of [true, false]) {
  const r = await trial(pin);
  console.log(`\n■ pin ${pin ? "ON" : "OFF"}  ── 佐藤の右下の角を +60px`);
  for (const [k, v] of Object.entries(r)) if (k !== "pin") console.log(`   ${k.padEnd(16)} ${v}`);
}
