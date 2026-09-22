// 01-snap-is-parent の「決まり」が本当に発動するかを、場面を作って測る。
//   node docs/bubble-space-prototype/v3/_check/01-rules.mjs
import { openLab, V3 } from "./lab.mjs";

const FILE = `${V3}/01-snap-is-parent.html`;
const f = n => (n === null || n === undefined ? "-" : (+n).toFixed(2));
const P = (...a) => console.log(...a);

/** 決まりの発動をかぞえる（ファイルには入れず、検証のときだけ関数を包む） */
const COUNT = `(() => {
  if (window.__fired) return;
  const F = window.__fired = { R1: 0, R2: 0, R3: 0, R4: 0, R4wrote: 0, R5: 0, R5wrote: 0, raise: 0, raiseWrote: 0, cellNear: 0 };
  const zAll = () => JSON.stringify(window.__lab.bubbles().map(b => [b.id, b.free.x, b.free.y, b.free.z, b.order, b.cell.col, b.cell.row]));
  const _snapOp = window.snapOp;   window.snapOp   = (b, sn) => { F[sn.kind === "join" ? "R2" : "R1"]++; return _snapOp(b, sn); };
  const _tidy   = window.tidyRows; window.tidyRows = () => { const h = _tidy(); F.R3 += h.length; return h; };
  const _pin    = window.pin;      window.pin      = (id, bf) => { F.R4++; const a = zAll(); const r = _pin(id, bf); if (zAll() !== a) F.R4wrote++; return r; };
  const _keep   = window.keepSeen; window.keepSeen = (id, bf) => { F.R5++; const a = zAll(); const r = _keep(id, bf); if (zAll() !== a) F.R5wrote++; return r; };
  const _raise  = window.raise;    window.raise    = b => { F.raise++; const a = zAll(); const r = _raise(b); if (zAll() !== a) F.raiseWrote++; return r; };
  const _near   = window.freeCellNear; window.freeCellNear = (...a) => { F.cellNear++; return _near(...a); };
})()`;
const fired = lab => lab.page.evaluate("window.__fired");
async function fresh() { const lab = await openLab(FILE); await lab.settle(); await lab.page.evaluate(COUNT); return lab; }
const rect = (lab, id) => lab.rect(id);
const bub = async (lab, id) => (await lab.bubbles()).find(b => b.id === id);
const place = async (lab, id) => (await lab.placements()).find(p => p.id === id);
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ══════════ A. どの決まりが発動するか ══════════ */
P("\n══ A. 一連の操作で、どの決まりが発動するか ══");
{
  const lab = await fresh();
  const log = async label => P(`  ${label.padEnd(30)} ${JSON.stringify(await fired(lab))}`);
  await log("起動直後（場面2の R1 は起動前）");
  await lab.call("snap", "list", "item", "left");   await lab.settle(); await log("R1 くっつける");
  await lab.call("snap", "fA", "item", "left");     await lab.settle(); await log("R2 並びに加わる");
  await lab.dragBubble("fA", { dx: 0, dy: -180 });                       await log("並びから外す");
  await lab.dragBubble("list", { dx: -120, dy: -120 });                  await log("もう1つ外す → R3 で並びが消える");
  await lab.dragBubble("fB", { dx: -260, dy: 240 });                     await log("自由に置いた泡を動かす");
  const cal = await rect(lab, "cal");
  await lab.dragBubble("fC", { to: { x: cal.x + 20, y: cal.y + 20 } });  await log("外の泡をカレンダーのマスへ");
  await lab.select("cal"); await lab.settle();
  const c = await rect(lab, "cal");
  await lab.dragPoint(c.x + c.w - 3, c.y + c.h - 3, c.x + c.w + 57, c.y + c.h - 3); await log("角で大きさを変える");
  P("  エラー", lab.errors().length);
  await lab.close();
}

/* ══════════ B. R5（奥行き）が本当に値を変える場面 ══════════ */
P("\n══ B. R5「空間を移っても見えている大きさを保つ」 ══");
{
  // (1) 見えない親は Z を通す（R6）ので、root ↔ 並び では R5 は何も変えない
  const lab = await fresh();
  const z0 = (await bub(lab, "list")).free.z;
  await lab.call("snap", "list", "item", "left"); await lab.settle();
  P(`  (1) root → 並び：メモ一覧の奥行き ${f(z0)} → ${f((await bub(lab, "list")).free.z)}  ${JSON.stringify(await fired(lab))}`);
  await lab.close();

  // (2) Z が「なし」の空間から出す：奥行きが残っていると、焦点より手前で消える
  for (const withR5 of [true]) {
    const lab2 = await fresh();
    await lab2.wheel(200, 500, 300);                     // root の焦点 Z を奥へ
    const fz = (await lab2.call("focusOf", "root")).z;
    const before = await place(lab2, "seiyaku");
    // 勤務表（Z なし）の中の「制約」を root へ引き出す
    const fd = await rect(lab2, "fD");
    await lab2.dragBubble("seiyaku", { to: { x: fd.x + 260, y: fd.y - 40 } });
    const b = await bub(lab2, "seiyaku"), p = await place(lab2, "seiyaku");
    P(`  (2) 勤務表(Z なし) → root（root の焦点 Z ${f(fz)}）：`);
    P(`      制約の奥行き 0 → ${f(b.free.z)}／親 ${b.parent}／見えるか alpha=${f(p && p.alpha)}／倍率 ${f(p && p.scale)}（前 ${f(before.scale)}）`);
    P(`      ${JSON.stringify(await fired(lab2))}`);
    await lab2.close();
  }
}

/* ══════════ C. raise（触った泡は最前面へ） ══════════ */
P("\n══ C. raise：触った泡は、その空間の Z へ書く ══");
{
  // (1) Z が自由座標（root の「自由に置く」）
  const lab = await fresh();
  const b0 = await bub(lab, "list"), p0 = await place(lab, "list");
  const q = await lab.call("headerPointOf", "list");
  await lab.page.mouse.click(q.x, q.y); await lab.settle();
  const b1 = await bub(lab, "list"), p1 = await place(lab, "list");
  P(`  (1) Z 自由座標：メモ一覧を触る → 奥行き ${f(b0.free.z)} → ${f(b1.free.z)}／幅 ${f(p0.w)} → ${f(p1.w)}／alpha ${f(p1.alpha)}`);
  P(`      焦点より手前へは出さない（out = max(焦点 ${f((await lab.call("focusOf", "root")).z)}, 一番手前 0 − 0.15)）`);
  await lab.close();

  // (2) 透視は dz<0 を消す ＝ 焦点より手前へ書いたら触った泡が消える、の根拠
  const lab2 = await fresh();
  await lab2.wheel(700, 300, 120);
  const fz = (await lab2.call("focusOf", "root")).z;
  const pi = await place(lab2, "item");
  P(`  (2) root の焦点 Z を ${f(fz)} へ → 買い物（奥行き 0、dz=${f(0 - fz)}）の alpha ${f(pi && pi.alpha)}`);
  await lab2.close();

  // (3) Z が順序（重ねて置く）
  const lab3 = await fresh();
  await lab3.select("item"); await lab3.settle();
  await lab3.call("preset", "重ねて置く", "root"); await lab3.settle();
  const r1 = await rect(lab3, "fA");
  await lab3.dragBubble("fB", { to: { x: r1.x + 40, y: r1.y + 24 } });
  await lab3.dragBubble("fC", { to: { x: r1.x + 20, y: r1.y + 12 } });
  const front = async () => { const ps = await lab3.placements(); return ["fA", "fB", "fC"].map(i => ({ i, k: ps.findIndex(p => p.id === i) })).sort((a, b) => b.k - a.k)[0].i; };
  const line = [];
  for (const id of ["fA", "fB", "fC", "fA"]) {
    const h = await lab3.call("headerPointOf", id);
    await lab3.page.mouse.click(h.x, h.y); await lab3.settle();
    line.push(`${id}を触る→手前は${await front()}`);
  }
  P(`  (3) Z 順序（重ねて置く）：${line.join(" / ")}`);
  const ords = (await lab3.bubbles()).filter(b => /^f/.test(b.id)).map(b => b.id + ":" + b.order);
  P(`      順序 ${JSON.stringify(ords)}（0.. に収まる）  エラー ${lab3.errors().length}`);
  await lab3.close();

  // (4) Z がなし（並びの中・勤務表の中）
  const lab4 = await fresh();
  const before = JSON.stringify((await lab4.bubbles()).map(b => [b.id, b.order, b.free.z]));
  const h = await lab4.call("headerPointOf", "p3");
  await lab4.page.mouse.click(h.x, h.y); await lab4.settle();
  const after = JSON.stringify((await lab4.bubbles()).map(b => [b.id, b.order, b.free.z]));
  P(`  (4) Z なし（スタッフの中）：田中を触る → 状態は ${before === after ? "変わらない（正しい）" : "★変わった"}`);
  await lab4.close();

  // (5) raise と R5 のぶつかり：触って手前へ上げた泡を、別の空間へ落とす
  const lab5 = await fresh();
  const hh = await lab5.call("headerPointOf", "list");
  await lab5.page.mouse.click(hh.x, hh.y); await lab5.settle();
  const zAfterRaise = (await bub(lab5, "list")).free.z;
  await lab5.call("snap", "list", "fB", "left"); await lab5.settle();
  P(`  (5) raise で ${f(zAfterRaise)} → 並びへ入れると ${f((await bub(lab5, "list")).free.z)}（R5 が後に書く）  ${JSON.stringify(await fired(lab5))}`);
  await lab5.close();
}

/* ══════════ D. freeCellNear（同じマスへよそから入る） ══════════ */
P("\n══ D. freeCellNear：格子の同じマスへ、よその空間から入ってくる ══");
{
  const lab = await fresh();
  const d0 = await rect(lab, "d0");
  const before = (await bub(lab, "d0")).cell;
  await lab.dragBubble("fC", { to: { x: d0.x + d0.w / 2, y: d0.y + d0.h / 2 } });
  const fc = await bub(lab, "fC"), after = (await bub(lab, "d0")).cell;
  const cells = (await lab.bubbles()).filter(b => b.parent === "cal").map(b => `${b.id}(${b.cell.col},${b.cell.row})`);
  P(`  付箋C を「1」のマスへ：付箋C の親 ${fc.parent} マス(${fc.cell.col},${fc.cell.row})／「1」は (${before.col},${before.row}) → (${after.col},${after.row})`);
  const dup = new Set(); let dups = 0;
  for (const b of (await lab.bubbles()).filter(b => b.parent === "cal")) { const k = b.cell.col + "," + b.cell.row; if (dup.has(k)) dups++; dup.add(k); }
  P(`  同じマスに2つ ${dups} 件  ${JSON.stringify(await fired(lab))}  エラー ${lab.errors().length}`);
  P(`  ${cells.join(" ")}`);
  await lab.close();
}

/* ══════════ E. 未解決① 並びに「自由に置く」 ══════════ */
P("\n══ E. 未解決①：並び（見えない親）に「自由に置く」を当てる ══");
{
  const lab = await fresh();
  const k0 = await rect(lab, "kinmu"), l0 = await rect(lab, "kibou");
  await lab.select("kinmu"); await lab.settle();
  await lab.call("preset", "自由に置く", "row1"); await lab.settle();
  const k1 = await rect(lab, "kinmu"), l1 = await rect(lab, "kibou");
  const v = await lab.viewOf("row1"), vr = await lab.viewOf("root");
  P(`  並びに「自由に置く」→ 勤務表 x ${f(k0.x)} → ${f(k1.x)}（${f(k1.x - k0.x)}px）／希望シフト x ${f(l0.x)} → ${f(l1.x)}`);
  P(`  並びの View  X=${v.x.dim}/${v.x.arrange}  Y=${v.y.dim}/${v.y.arrange}  Z=${v.z.dim}`);
  P(`  root の View X=${vr.x.dim}/${vr.x.arrange}  Y=${vr.y.dim}/${vr.y.arrange}（プリセットは窓へ回った）`);
  const off = (await lab.placements()).filter(p => p.scale > 0.2 && (p.x + p.w < 0 || p.x > 1440)).map(p => p.id);
  P(`  画面の外 [${off.join(",")}]  エラー ${lab.errors().length}`);
  await lab.close();

  // 7つ全部
  const names = ["自由に置く", "横に並べる", "縦に並べる", "格子", "X魚眼ビュー", "coverflow", "履歴を奥行きに", "重ねて置く"];
  for (const n of names) {
    const l = await fresh();
    const k0 = await rect(l, "kinmu");
    await l.select("kinmu"); await l.settle();
    await l.call("preset", n, "row1"); await l.settle();
    const k1 = await rect(l, "kinmu"), row = await place(l, "row1");
    P(`  「${n}」→ 勤務表 ${f(k1.x - k0.x)}px／並びの箱 ${f(row && row.w)}×${f(row && row.h)}／エラー ${l.errors().length}`);
    await l.close();
  }
}

/* ══════════ F. 未解決② 詰める空間への差し込みで、誰が何 px 動くか ══════════ */
P("\n══ F. 未解決②：詰める空間へ差し込むと、並びは必ず伸びる ══");
{
  const lab = await fresh();
  await lab.call("snap", "list", "item", "left"); await lab.settle();
  const B = {}; for (const i of ["list", "item", "fB", "fC", "kinmu", "kibou"]) B[i] = await rect(lab, i);
  const rw = await place(lab, "row2") ?? await place(lab, "row1");
  await lab.call("snap", "fA", "item", "left"); await lab.settle();   // メモ一覧と買い物のあいだへ
  const A = {}; for (const i of ["list", "item", "fB", "fC", "kinmu", "kibou"]) A[i] = await rect(lab, i);
  P(`  [メモ一覧, 買い物] のあいだへ 付箋A（幅 ${f(B.fA ? B.fA.w : 120)}）を差し込む：`);
  for (const i of ["list", "item", "fB", "fC", "kinmu", "kibou"]) P(`    ${i.padEnd(6)} ${f(d(B[i], A[i]))}px`);
  P(`  ＝ 留められたのは 差し込む所より前（メモ一覧）。後ろ（買い物）は 付箋A の幅だけ押される`);
  await lab.close();
}

/* ══════════ G. 勤務表（格子）へ外から差し込むと誰が動くか ══════════ */
P("\n══ G. 格子（勤務表の中）へ外から入れると誰が動くか ══");
{
  const lab = await fresh();
  const B = {}; for (const i of ["kinmu", "kibou", "staff", "cal", "seiyaku"]) B[i] = await rect(lab, i);
  const st = await rect(lab, "staff");
  await lab.dragBubble("fB", { to: { x: st.x + st.w / 2, y: st.y + st.h + 40 } });
  const A = {}; for (const i of ["kinmu", "kibou", "staff", "cal", "seiyaku"]) A[i] = await rect(lab, i);
  const fb = await bub(lab, "fB");
  P(`  付箋B の行き先 ${fb.parent}（マス ${fb.cell.col},${fb.cell.row}）`);
  for (const i of ["kinmu", "kibou", "staff", "cal", "seiyaku"]) P(`    ${i.padEnd(8)} ${f(d(B[i], A[i]))}px`);
  P(`  エラー ${lab.errors().length}  ${JSON.stringify(await fired(lab))}`);
  await lab.close();
}
