// 03-pack-or-equal：冒頭コメント「踏んだこと（第2回…）」に書いたことを、書いたあとで測り直す。
//   node docs/bubble-space-prototype/v3/_check/03-r2.mjs
import { openLab, V3 } from "./lab.mjs";

const n = (v) => +(+v).toFixed(1);

/* ① 上下も見えない親の並び：スタッフを下へ 300px 伸ばすと、下の場面は押されるか・重なりは 0 か */
{
  const lab = await openLab(`${V3}/03-pack-or-equal.html`);
  await lab.call("scene", "kinmu");
  await lab.settle();
  const tops = async () => Object.fromEntries((await lab.call("scenes")).map((s) => [s.id, n(s.top)]));
  const before = await tops();
  const kin0 = await lab.rect("kinmuP");
  await lab.select("staffP");
  await lab.settle();
  const r = await lab.rect("staffP");
  const p = await lab.placements();
  const sc = p.find((q) => q.id === "staffP").scale;
  await lab.dragPoint(r.x + r.w - 4, r.y + r.h - 4, r.x + r.w - 4, r.y + r.h - 4 + 300 * sc, 24);
  await lab.settle();
  const after = await tops();
  const kin1 = await lab.rect("kinmuP");
  const cross = await lab.call("cross");
  const st = await lab.call("stats");
  const all = Object.values(st).reduce((a, x) => a + x.overlaps, 0);
  console.log("① 場面どうしの押し合い（スタッフを下へ 300 伸ばす。倍率 " + n(sc) + "）");
  console.log(`   勤務表の箱 ${n(kin0.h)} → ${n(kin1.h)}px（画面）`);
  console.log(`   場面の上端 ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  console.log(`   下の場面が押された量 ${["row", "cover", "nest"].map((k) => k + " " + n(after[k] - before[k])).join(", ")}（外の空間の座標）`);
  const sceneOf = (id) => /kinmu|seiyaku|staff|cal|^p[PE]|^d[PE]/.test(id) ? "勤務表" : /row|^r[PE]/.test(id) ? "横に並べる" : /cover|^c[PE]/.test(id) ? "coverflow" : "入れ子";
  const between = cross.filter((q) => sceneOf(q[0]) !== sceneOf(q[1]));
  console.log(`   重なり：またぐ ${cross.length}（うち場面どうし ${between.length}）  兄弟 ${all}`);
  console.log(`     またぐ組 ${cross.map((q) => q.slice(0, 2).join("×")).join(" ")}`);
  const kinE = await lab.rect("kinmuE"), kinP = await lab.rect("kinmuP");
  console.log(`   場面の高さ：勤務表・詰める ${n(kinP.h / sc)} / 勤務表・等間隔 ${n(kinE.h / sc)}（外の空間の座標。高い方が場面の高さ）`);
  console.log(`   場面の並びの X ${JSON.stringify(await lab.viewOf("scenes")).slice(0, 120)}`);
  console.log(`   外の空間の子 ${(await lab.bubbles()).filter((b) => !b.parent).map((b) => b.id).join(" ")}`);
  console.log("   エラー", lab.errors().length);
  await lab.shot("03-r2-grow-staff");
  await lab.close();
}

/* ② 一覧と選択欄が画面に入るか（第2回は「選択欄の下端 861 / canvas 873」と書いた） */
{
  const lab = await openLab(`${V3}/03-pack-or-equal.html`);
  console.log("\n② 右上の一覧と選択欄（1440×900）");
  for (const s of ["kinmu", "row", "cover", "nest"]) {
    await lab.call("scene", s);
    await lab.settle();
    const o = await lab.page.evaluate(() => {
      const sp = document.getElementById("spaces"), sel = document.getElementById("selection"), cv = document.getElementById("cv");
      return { 切れ: sp.scrollHeight - sp.clientHeight, 下端: +sel.getBoundingClientRect().bottom.toFixed(1),
               canvas: +cv.getBoundingClientRect().bottom.toFixed(1), 行: sp.innerText.split("\n").length };
    });
    console.log(`   ${s.padEnd(6)} 一覧の行 ${o.行}  切れ ${o.切れ}px  選択欄の下端 ${o.下端}  canvas の下端 ${o.canvas}`);
  }
  await lab.close();
}

/* ③ 重なり＝親子でない泡どうしが画面で交わること（自前の大きさのままで数が出るか）と、1フレームの時間 */
{
  const lab = await openLab(`${V3}/03-pack-or-equal.html`);
  console.log("\n③ 重なりの数え方（箱が「自前の大きさのまま」）");
  for (const grow of [true, false]) {
    await lab.call("setGrow", grow);
    for (const [scene, ids] of [["row", ["rowP", "rowE"]], ["nest", ["nestPE", "nestEP"]]]) {
      await lab.call("scene", scene);
      await lab.settle();
      const out = [];
      for (const id of ids) { const u = await lab.call("statsUnder", id); out.push(`${id} 重なり ${u.pairs} はみ出し ${u.outs}`); }
      console.log(`   箱 ${grow ? "伸びる" : "自前"}  ${out.join("  /  ")}`);
    }
  }
  await lab.call("setGrow", true);
  const ms = await lab.page.evaluate(() => { const t = performance.now(); for (let i = 0; i < 30; i++) window.__lab.frame(); return (performance.now() - t) / 30; });
  const np = (await lab.placements()).length;
  console.log(`   1フレーム ${ms.toFixed(1)}ms（泡 ${np}個）`);
  console.log("\n④ 題名（⊃ をやめて言葉に）:", (await lab.bubbles()).filter((b) => /^nest/.test(b.id)).map((b) => b.title).join(" / "));
  console.log("   エラー", lab.errors().length);
  await lab.close();
}
