// 03-pack-or-equal：泡の縮み「中心の倍率」と「帯の像」を比べる。
//   node docs/bubble-space-prototype/v3/_check/03-mag.mjs
//
//   A 詰める×魚眼 の重なり（隙間 0/14/28）
//   B X も Y も魚眼のとき（勤務表・詰める の両軸を魚眼に）── 倍率は1つの数のままか
//   C ゴム膜（背景を引いて掴んだ点がずれないか。泡が膜からどれだけずれるか）
//   D 平行のレンズの空間が1つも変わらないか（帯の像は平行では倍率 1）
import { openLab, V3 } from "./lab.mjs";

const lab = await openLab(`${V3}/03-pack-or-equal.html`);
const num = (v) => +(+v).toFixed(2);
const setMag = (m) => lab.call("setMag", m);
const MAGS = ["center", "band", "self"];
/** その空間の焦点を 0 に戻す（比べる前に必ず） */
async function refocus(spaceId, pick) { await lab.select(pick); await lab.page.click("#refocus"); await lab.settle(); }

async function rects(ids) {
  const o = {};
  for (const id of ids) o[id] = await lab.rect(id);
  return o;
}
async function gapsOf(ids) {
  const r = await rects(ids);
  const list = ids.map((id) => ({ id, ...r[id] })).sort((a, b) => a.x - b.x);
  return list.slice(1).map((x, i) => num(x.x - (list[i].x + list[i].w)));
}
const covP = [...Array(7)].map((_, i) => `cP${i}`);

/* ── A ── */
console.log("A 詰める×魚眼（coverflow・詰める）");
await lab.call("scene", "cover");
for (const mag of MAGS) {
  await setMag(mag);
  for (const gap of [0, 14, 28]) {
    await lab.call("setGap", gap);
    await lab.settle();
    const st = (await lab.call("stats"))["coverP"];
    console.log(`  ${mag.padEnd(6)} 隙間 ${String(gap).padStart(2)}  重なり ${st.overlaps}  隣との間 ${(await gapsOf(covP)).join(", ")}`);
  }
}
await lab.call("setGap", 14);

/* ── B X も Y も魚眼 ── */
console.log("\nB X も Y も魚眼（勤務表・詰める。制約・スタッフ・カレンダー）");
await lab.call("scene", "kinmu");
const kin = ["seiyakuP", "staffP", "calP"];
for (const mag of MAGS) {
  await setMag(mag);
  for (const lens of ["parallel", "fisheye"]) {
    await lab.call("setAxis", "kinmuP", "x", { lens });
    await lab.call("setAxis", "kinmuP", "y", { lens });
    await lab.settle();
    const st = (await lab.call("stats"))["kinmuP"];
    const ps = (await lab.placements()).filter((p) => kin.includes(p.id));
    const sc = ps.map((p) => `${p.id.replace("P", "")} ${num(p.local)}`).join("  ");
    console.log(`  ${mag.padEnd(6)} ${lens.padEnd(8)} 重なり ${st.overlaps} ${st.pairs.map((q) => q.slice(0, 3).join("/")).join(" ")}  はみ出し ${st.overflows}  倍率 ${sc}`);
  }
}
await lab.call("setAxis", "kinmuP", "x", { lens: "parallel" });
await lab.call("setAxis", "kinmuP", "y", { lens: "parallel" });

/* ── C ゴム膜 ── */
console.log("\nC ゴム膜（coverflow・詰める の背景を 60px 引く）");
await lab.call("scene", "cover");
for (const mag of MAGS) {
  await setMag(mag);
  await refocus("coverP", "cP0");
  const before = await rects(covP);
  const bp = await lab.call("backgroundPointOf", "coverP");
  const f0 = await lab.focusOf("coverP");
  // 掴んだ点の空間の中の位置（膜の点）
  const p0 = await lab.call("posAt", "coverP", "x", bp.x);
  await lab.dragPoint(bp.x, bp.y, bp.x - 60, bp.y);
  const f1 = await lab.focusOf("coverP");
  const at = await lab.call("screenAt", "coverP", "x", p0);
  const after = await rects(covP);
  const dev = covP.map((id) => num(after[id].x + after[id].w / 2 - (before[id].x + before[id].w / 2)));
  console.log(`  ${mag.padEnd(6)} 焦点 ${num(f0.x)} → ${num(f1.x)}  掴んだ点 ${num(bp.x)} → ${num(at)}（狙い ${num(bp.x - 60)}、ずれ ${num(at - (bp.x - 60))}px）`);
  console.log(`         泡の中心の動き ${dev.join(", ")}`);
}

/* ── D 平行の空間は変わらないか ── */
console.log("\nD 平行のレンズの空間（全部の場面の泡の矩形を比べる）");
const snap = async () => {
  const o = {};
  for (const sc of ["kinmu", "row", "cover", "nest"]) {
    await lab.call("scene", sc);
    await lab.settle();
    for (const p of await lab.placements()) o[sc + "/" + p.id] = [num(p.x), num(p.y), num(p.w), num(p.h)];
  }
  return o;
};
await setMag("center"); const A = await snap();
for (const mag of ["band", "self"]) {
  await setMag(mag); const B = await snap();
  const diff = [...new Set(Object.keys(A).filter((k) => A[k].some((v, i) => Math.abs(v - B[k][i]) > 0.05)).map((k) => k.split("/")[1]))];
  console.log(`  ${mag}: 中心の倍率 と違った泡 ${diff.length} / ${new Set(Object.keys(A).map((k) => k.split("/")[1])).size}  ${diff.join(" ")}`);
}

/* ── E トグルの組み合わせでも重ならないか（詰める×魚眼） ── */
console.log("\nE 詰める×魚眼、トグルを総当たり（coverflow・詰める の重なり）");
await lab.call("scene", "cover");
await refocus("coverP", "cP0");          // C のドラッグで焦点が動いているので戻す
for (const mag of MAGS) {
  const bad = [];
  let cnt = 0;
  for (const align of ["start", "center"]) for (const span of ["bubbles", "bands"]) for (const grow of [true, false]) for (const gap of [0, 14, 28]) {
    await setMag(mag); await lab.call("setAlign", align); await lab.call("setSpan", span); await lab.call("setGrow", grow); await lab.call("setGap", gap);
    await lab.settle();
    const st = (await lab.call("stats"))["coverP"];
    cnt++;
    if (st.overlaps) bad.push(`${align}/${span}/箱${grow ? "伸" : "自"}/隙${gap}:${st.overlaps}`);
  }
  console.log(`  ${mag.padEnd(6)} ${cnt} 通りのうち 重なったのは ${bad.length}  ${bad.join(" ")}`);
}
await lab.call("setAlign", "start"); await lab.call("setSpan", "bubbles"); await lab.call("setGrow", true); await lab.call("setGap", 14);

console.log("\nエラー:", lab.errors());
await lab.close();
