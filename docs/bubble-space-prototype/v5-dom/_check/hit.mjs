// 当たり判定：DOM（elementsFromPoint）が「描いた順の逆・内側と手前が勝つ」を満たすか。憶測でなく実測で。
import { openLab, ok, num } from "./lab.mjs";

const lab = await openLab();
await lab.settle();

// ── 1. 画面じゅうを 5px 格子で突いて、DOM と 解いた配置（canvas 版と同じ式）の答えを突き合わせる ──
const grid = await lab.page.evaluate(() => {
  const L = window.__lab, ps = L.placements();
  const ORD = new Map(ps.map((p, i) => [p.id, i])), P = new Map(ps.map((p) => [p.id, p]));
  const radOf = (p) => p.implicit ? 0 : Math.max(2, (p.h / p.scale <= 34 ? 6 : 10) * p.scale);
  const outsideRound = (p, x, y) => {
    const r = radOf(p);
    if (!(Math.abs(x - (p.x + p.w / 2)) > p.w / 2 - r && Math.abs(y - (p.y + p.h / 2)) > p.h / 2 - r)) return false;
    const cx = x < p.x + p.w / 2 ? p.x + r : p.x + p.w - r, cy = y < p.y + p.h / 2 ? p.y + r : p.y + p.h - r;
    return Math.hypot(x - cx, y - cy) > r - 0.6;
  };
  let n = 0, same = 0, boundary = 0, corner = 0;
  const other = [], kinds = new Set();
  for (let y = 100; y < 900; y += 5)
    for (let x = 4; x < 1050; x += 5) {
      n++;
      const d = L.hitAt(x, y), m = L.hitModelAt(x, y);
      kinds.add(d);
      if (d === m) { same++; continue; }
      const hi = (ORD.get(d) ?? -1) > (ORD.get(m) ?? -1) ? d : m;   // 食い違いの原因になった（描く順で上の）泡
      const p = P.get(hi);
      const edge = p ? Math.min(x - p.x, p.x + p.w - x, y - p.y, p.y + p.h - y) : null;
      // ③ 見えない親は箱ではなく外周 12px の縁が当たり所なので、縁の内と外どちらの境目かで見る
      const near = p && (p.implicit ? Math.min(Math.abs(edge), Math.abs(edge + 12)) : Math.abs(edge));
      if (p && near <= 1.0) boundary++;                              // 当たり所の境目 ±1px（Chrome は当たり矩形を画素に丸める）
      else if (p && edge > 0 && outsideRound(p, x, y)) corner++;      // 丸い角の外：DOM は塗っていない所を当てない
      else if (other.length < 12) other.push({ x, y, dom: d, model: m, edge: edge == null ? null : +edge.toFixed(3) });
      else other.push(null);
    }
  return { n, same, boundary, corner, otherN: other.length, other: other.filter(Boolean), kinds: kinds.size };
});
console.log(`格子 ${grid.n} 点（5px 刻み・右の説明パネルの外）／当たった相手 ${grid.kinds} 種`);
console.log(`  そろった ${grid.same}（${(100 * grid.same / grid.n).toFixed(2)}%）`
  + ` ／ 縁 ±1px ${grid.boundary} ／ 丸い角の外 ${grid.corner} ／ それ以外 ${grid.otherN}`);
ok(grid.otherN === 0, `DOM の答えは「縁 ±1px」と「丸い角の外」以外は canvas 版と1点も違わない`);
for (const o of grid.other) console.log(`      (${o.x},${o.y}) DOM=${o.dom} 配置=${o.model} 縁から ${o.edge}px`);

// ── 2. 空間の背景：親の箱の隙間を突くと親（＝その空間）が返るか ──
const bg = await lab.page.evaluate(() => {
  const L = window.__lab, P = new Map(L.placements().map((p) => [p.id, p]));
  const probe = (id, fx, fy) => { const p = P.get(id); const x = p.x + p.w * fx, y = p.y + p.h * fy;
    return { at: [Math.round(x), Math.round(y)], hit: L.hitAt(x, y), space: L.spaceAt(x, y), el: L.elAt(x, y).kind }; };
  return {
    kinmuGap: probe("kinmu", 0.12, 0.28),      // 勤務表の中身の箱の、子のいない所
    kinmuHead: probe("kinmu", 0.5, 0.02),      // 勤務表のヘッダ（外の空間のもの）
    rootBg: { hit: L.hitAt(600, 850), space: L.spaceAt(600, 850), el: L.elAt(600, 850).kind },
  };
});
console.log("  " + JSON.stringify(bg));
ok(bg.kinmuGap.hit === "kinmu" && bg.kinmuGap.space === "kinmu", "親の箱の隙間を突くと、その空間（勤務表の中）が返る");
ok(bg.kinmuHead.hit === "kinmu" && bg.kinmuHead.space === "root", "ヘッダは外側の空間のもの（掴む）");
ok(bg.rootBg.hit === null && bg.rootBg.space === "root" && bg.rootBg.el === "background", "何も無い所は外の空間の背景");

// ── 3. ③ 見えない親：箱の中は空洞、当たるのは外周 12px の縁だけ ──
const ring = await lab.page.evaluate(() => {
  const L = window.__lab, p = L.placements().find((q) => q.implicit);
  if (!p) return null;
  const at = (x, y) => ({ hit: L.hitAt(x, y), kind: L.elAt(x, y).kind });
  return {
    id: p.id,
    inside: at(p.x + p.w / 2, p.y + p.h / 2),          // 箱の中（子のいる所）
    gapInside: at(p.x + p.w / 2, p.y + p.h - 2),       // 箱の中で、子がいちばん薄い所
    ring6: at(p.x + p.w / 2, p.y - 6),                 // 縁（外へ 6px）
    ring11: at(p.x - 11, p.y + p.h / 2),               // 縁（外へ 11px）
    out14: at(p.x + p.w / 2, p.y - 14),                // 縁の外（14px）
    corner: at(p.x - 6, p.y - 6),
  };
});
console.log("  " + JSON.stringify(ring));
ok(ring && ring.ring6.hit === ring.id && ring.ring11.hit === ring.id, "見えない親は外周 12px の縁で掴める");
ok(ring && ring.ring6.kind === "ring", "当たっているのは縁のストリップ（.rg）");
ok(ring && ring.inside.hit !== ring.id, "箱の中は空洞（見えない親には当たらない）");
ok(ring && ring.out14.hit !== ring.id, "縁より外（14px）では当たらない");

// ── 4. 大きさの角は選択中の泡にだけ。手前の泡に隠れた角は勝たない ──
const hnd = await lab.page.evaluate(() => {
  const L = window.__lab;
  const cornerOf = (id) => { const p = L.placements().find((q) => q.id === id); return { x: p.x + p.w - 4, y: p.y + p.h - 4 }; };
  const out = {};
  L.select("memo1"); L.settle();
  out.selected = (() => { const c = cornerOf("memo1"); return L.elAt(c.x, c.y).kind; })();
  L.select("memo2"); L.settle();
  out.notSelected = (() => { const c = cornerOf("memo1"); return L.elAt(c.x, c.y).kind; })();
  // 手前に泡が重なった角：議事録の「確定」の角の上に、そのまま重なっている版があるか見る
  L.select("g0"); L.settle();
  const g0 = L.placements().find((q) => q.id === "g0"), c = { x: g0.x + g0.w - 4, y: g0.y + g0.h - 4 };
  out.hidden = { el: L.elAt(c.x, c.y), covered: L.hitAt(c.x, c.y) };
  L.select("memo1"); L.settle();
  return out;
});
console.log("  " + JSON.stringify(hnd));
ok(hnd.selected === "handle", "選択中の泡には角が出る");
ok(hnd.notSelected !== "handle", "選んでいない泡には角が出ない");
ok(hnd.hidden.el.kind !== "handle" || hnd.hidden.covered === "g0",
   "手前の泡に隠れた角は勝たない（隠れていなければ角が勝つ）");

const errs = lab.errors();
ok(errs.length === 0, `コンソールエラー 0（${errs.length}）`);
errs.forEach((e) => console.log("      " + e));
await lab.close();
