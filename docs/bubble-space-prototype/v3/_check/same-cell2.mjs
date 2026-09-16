// ① をもっと細かく見る：同じ空間の中で、どんなときに重なるのか
import { openLab, V3 } from "./lab.mjs";
const R = (r) => `x${r.x.toFixed(0)} y${r.y.toFixed(0)} w${r.w.toFixed(0)} h${r.h.toFixed(0)}`;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const dump = async (lab, label) => {
  const bs = await lab.bubbles();
  const ids = ["seiyaku", "staff", "cal"];
  console.log(`  ${label}`);
  for (const id of ids) {
    const b = bs.find((x) => x.id === id);
    console.log(`    ${id.padEnd(8)} cell=${JSON.stringify(b.cell)}  ${R(await lab.rect(id))}`);
  }
  const a = await lab.rect("seiyaku"), c = await lab.rect("cal"), s = await lab.rect("staff");
  console.log(`    重なり: 制約×カレンダー ${overlap(a, c)}  制約×スタッフ ${overlap(a, s)}`);
};

// (a) 先客のいるマス（スタッフ = col0,row1）へ落とす → 入れ替わるはず
{
  const lab = await openLab(`${V3}/00-core.html`);
  console.log("(a) 制約 を スタッフのマス（先客あり）へ");
  await dump(lab, "前");
  const t = await lab.rect("staff");
  await lab.dragBubble("seiyaku", { to: { x: t.x + t.w / 2, y: t.y + t.h / 2 } });
  await dump(lab, "後");
  await lab.shot("cell-a");
  await lab.close();
}

// (b) 空きマス（col0,row0 = 左上の穴）へ落とす → 誰もいないので重ならないはず
{
  const lab = await openLab(`${V3}/00-core.html`);
  console.log("\n(b) 制約 を 左上の空きマス（col0,row0）へ");
  const s = await lab.rect("staff"), c = await lab.rect("cal");
  // 左上の穴 ＝ スタッフの左端あたり × カレンダーより上
  await lab.dragBubble("seiyaku", { to: { x: s.x + 30, y: c.y - 40 } });
  await dump(lab, "後");
  await lab.shot("cell-b");
  await lab.close();
}
