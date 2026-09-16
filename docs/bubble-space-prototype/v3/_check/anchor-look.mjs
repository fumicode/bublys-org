// 「塊を始端に留める」にしたとき、画面がどうなっているかを見る
import { openLab, V3 } from "./lab.mjs";

for (const anchor of ["center", "start"]) {
  const lab = await openLab(`${V3}/05-kinmuhyo.html`);
  await lab.page.evaluate((a) => { window.__lab.setPin(false); window.__lab.setBlockAnchor(a); }, anchor);
  await lab.settle();
  const ps = await lab.placements();
  const vis = ps.filter((p) => p.scale > 0.05);
  const onScreen = vis.filter((p) => p.x + p.w > 0 && p.x < 1440 && p.y + p.h > 0 && p.y < 900);
  console.log(`\n塊＝${anchor}:  泡 ${ps.length}  見えている ${vis.length}  画面の中 ${onScreen.length}`);
  for (const id of ["kinmu", "staff", "cal", "kibou"]) {
    const r = await lab.rect(id);
    console.log(`   ${id.padEnd(8)} ${r ? `x${r.x.toFixed(0)} y${r.y.toFixed(0)} w${r.w.toFixed(0)} h${r.h.toFixed(0)}` : "-"}`);
  }
  console.log("   shot:", await lab.shot(`anchor-${anchor}`));
  await lab.close();
}
