/* ============================================================================
   scene.js —— 場面の定義。**5案で共有する。ここは触らない**

   DOM の案も canvas の基準も、同じこのファイルを読む。
   1440×900 で、どの場面も泡が画面の中に入るように置いてある（画面の外の泡は描かれず、速く見えてしまうため）。
   ============================================================================ */

/* ────────────────────────────────────────────────────────────
   場面A「勤務表」── v4 の実物と同じ構成
   docs/bubble-space-prototype/v4/lab.html の §状態 を写し、
   起動時の「付箋B を 付箋A にくっつける」を済ませた形（見えない親 snap1）を最初から書いてある。
   実測：泡 58（うち 見えない親 1）・入れ子 3 段（root → 勤務表 → カレンダー → 日）。
   ★ v4 の「泡 53・6段」という数え方ではなく、走らせて数えた値。placements() で数え直せる
   ──────────────────────────────────────────────────────────── */
const A = [];
const add = p => { A.push(p); return p; };

/* 1. メモ：自由に置いた普通の泡 */
add({ id: "memo1", title: "メモ",     hue: 35, w: 130, h: 80, order: 0, free: { x: -625, y: -338 } });
add({ id: "memo2", title: "買い物",   hue: 60, w: 130, h: 80, order: 1, free: { x: -482, y: -290 } });
add({ id: "memo3", title: "思いつき", hue: 15, w: 130, h: 80, order: 2, free: { x: -615, y: -237 } });
/* 2. 横に並べる */
add({ id: "row", title: "横に並べる", hue: 170, w: 368, h: 130, order: 3, free: { x: -215, y: -315 }, view: "row" });
[["小", 80, 50], ["中", 104, 64], ["大", 128, 78]].forEach(([t, w, h], i) =>
  add({ id: "row" + i, title: t, hue: 158 + i * 20, w, h, parent: "row", order: i, free: { x: (i - 1) * 120, y: 0 } }));
/* 3. coverflow：順序を等間隔に並べ、X に魚眼 */
add({ id: "cover", title: "coverflow", hue: 205, w: 340, h: 124, order: 4, free: { x: 150, y: -318 }, view: "coverflow" });
for (let i = 0; i < 7; i++)
  add({ id: "cf" + i, title: "写真" + (i + 1), hue: 188 + i * 12, w: 90, h: 64, parent: "cover", order: i, free: { x: (i - 3) * 40 } });
/* 4. X魚眼ビュー */
add({ id: "fish", title: "X魚眼ビュー", hue: 285, w: 420, h: 180, order: 5, free: { x: -490, y: -101 }, view: "fisheyeX" });
[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [3, 1], [4, 1], [5, 1], [5, 2]].forEach(([hist, branch], i) =>
  add({ id: "v" + i, title: "版" + (i + 1), hue: [290, 325, 350][branch], w: 58, h: 34, parent: "fish", hist, branch,
        free: { x: (hist - 2.5) * 60, y: (branch - 1) * 44 } }));
/* 5. 議事録（版）：履歴の古さを Z に */
add({ id: "giji", title: "議事録（版）", hue: 265, w: 300, h: 310, order: 6, free: { x: -510, y: 154 }, view: "histZ" });
["初稿", "加筆", "指摘反映", "確定"].forEach((t, i) =>
  add({ id: "g" + i, title: t, hue: 252 + i * 8, w: 150, h: 60, parent: "giji", hist: i, order: i, free: { x: (i - 1.5) * 40 } }));
/* 6. 勤務表：格子を詰めるだけ（ここが入れ子のいちばん深い所） */
add({ id: "kinmu", title: "勤務表", hue: 355, w: 482, h: 340, order: 7, free: { x: -11, y: 18, z: 0.4 }, view: "grid" });
add({ id: "seiyaku", title: "制約",       hue: 40,  w: 260, h: 56,  parent: "kinmu", cell: { col: 1, row: 0 }, free: { x: 60,  y: -110 } });
add({ id: "staff",   title: "スタッフ",   hue: 130, w: 120, h: 120, parent: "kinmu", cell: { col: 0, row: 1 }, free: { x: -180, y: 40 }, view: "column" });
add({ id: "cal",     title: "カレンダー", hue: 95,  w: 336, h: 114, parent: "kinmu", cell: { col: 1, row: 1 }, free: { x: 60,  y: 40 }, view: "grid" });
["佐藤", "鈴木", "高橋", "田中", "伊藤"].forEach((t, i) =>
  add({ id: "p" + i, title: t, hue: 130, w: 76, h: 22, parent: "staff", order: i, free: { y: (i - 2) * 30 } }));
for (let i = 0; i < 14; i++)
  add({ id: "d" + i, title: String(i + 1), hue: 95, w: 32, h: 24, parent: "cal", cell: { col: i % 7, row: Math.floor(i / 7) },
        free: { x: (i % 7 - 3) * 46, y: (Math.floor(i / 7) - 0.5) * 38 } });
/* 7. くっつける：③ 見えない親（v4 の起動直後と同じ状態） */
add({ id: "fC", title: "付箋C", hue: 150, w: 96, h: 60, order: 8, free: { x: 268, y: 225 } });
add({ id: "snap1", title: "並び（見えない親）", hue: 215, w: 0, h: 0, order: 9, implicit: true, free: { x: 65, y: 245 },
      view: { x: { dim: "order", arrange: "pack", lens: "parallel", step: 110, gap: 0 },
              y: { dim: "none",  arrange: "pack", lens: "parallel", step: 80,  gap: 0 } } });
add({ id: "fA", title: "付箋A", hue: 200, w: 120, h: 76, parent: "snap1", order: 0, free: { x: 0,   y: 235 } });
add({ id: "fB", title: "付箋B", hue: 250, w: 130, h: 96, parent: "snap1", order: 1, free: { x: 152, y: 235 } });

/* ────────────────────────────────────────────────────────────
   場面B「大きい」── 同じ形のまま数を増やす
   何を増やしたか：
     場面A の「勤務表 → カレンダー → 日」という 格子の入れ子 を、そのまま 1段深く・横に広げた。
       大勤務表（格子）           … 深さ1
         └ 週 ×4（格子 2×2）      … 深さ2
             └ 日 ×8（縦に並べる） … 深さ3
                 └ コマ ×15        … 深さ4
     1 + 4 + 32 + 480 = 517。これに メモ4つ を足して 521。
   隙間（gap）は View の軸が持つので（④）、詰めるの隙間を小さくして中身を画面に収めた。
   箱は「中身が収まるまで伸びる」ので、大きさは書かずに中身から決まる。
   実測の見え：大勤務表 は およそ 996×682 で 1440×900 の中に入る（画面の外の泡 0）
   ──────────────────────────────────────────────────────────── */
const B = [];
const gridGap = g => ({ x: { dim: "col", arrange: "pack", lens: "parallel", step: 110, gap: g },
                        y: { dim: "row", arrange: "pack", lens: "parallel", step: 80,  gap: g },
                        z: { dim: "none", arrange: "as-is", lens: "flat", step: 1 } });
const colGap = g => ({ x: { dim: "none",  arrange: "pack", lens: "parallel", step: 110, gap: g },
                       y: { dim: "order", arrange: "pack", lens: "parallel", step: 80,  gap: g },
                       z: { dim: "none",  arrange: "as-is", lens: "flat", step: 1 } });
B.push({ id: "big", title: "大勤務表", hue: 355, w: 60, h: 60, order: 0, free: { x: -160, y: 0 }, view: gridGap(6) });
for (let wk = 0; wk < 4; wk++) {
  B.push({ id: `w${wk}`, title: `第${wk + 1}週`, hue: 200 + wk * 30, w: 60, h: 60, parent: "big",
           cell: { col: wk % 2, row: Math.floor(wk / 2) }, view: gridGap(3) });
  for (let d = 0; d < 8; d++) {
    B.push({ id: `w${wk}d${d}`, title: `${d + 1}日`, hue: 95 + d * 6, w: 40, h: 40, parent: `w${wk}`,
             cell: { col: d, row: 0 }, view: colGap(2) });
    for (let s = 0; s < 15; s++)
      B.push({ id: `w${wk}d${d}s${s}`, title: String(s + 1), hue: 130 + s * 4, w: 26, h: 12,
               parent: `w${wk}d${d}`, order: s });
  }
}
["メモ", "買い物", "思いつき", "予定"].forEach((t, i) =>
  B.push({ id: "bm" + i, title: t, hue: 35 + i * 20, w: 120, h: 62, free: { x: 560, y: -300 + i * 110 } }));

/* ────────────────────────────────────────────────────────────
   場面C「魚眼」── 倍率が泡ごとに全部ちがう
   root の View が X も Y も魚眼、Z は透視。
   ・魚眼は 倍率 k = 1/cosh²(u/H) なので、位置がちがえば倍率がちがう（①「泡の像」）
   ・そのうえ Z の自由座標がばらばらなので、倍率 m = 1/(1+0.26·dz) もばらばら
   → 焦点を動かすと、全部の泡の transform が毎フレーム書き換わる。いちばん厳しいはず
   広がりは ±1100 / ±700。tanh で 画面の中（±720 / ±450）に必ず収まる（画面の外の泡 0）
   ──────────────────────────────────────────────────────────── */
const C = [];
const COLS = 18, ROWS = 10;
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const i = r * COLS + c;
  C.push({ id: "c" + i, title: "泡" + (i + 1), hue: (i * 13) % 360, w: 70, h: 44,
           free: { x: (c - (COLS - 1) / 2) * (2200 / (COLS - 1)),
                   y: (r - (ROWS - 1) / 2) * (1400 / (ROWS - 1)),
                   z: ((i * 7) % 13) / 13 * 1.5 } });
}
/* 入れ子も1つ2つ混ぜる（魚眼の中で合成 scale が効くか見るため） */
["cg0", "cg1"].forEach((id, n) => {
  C.push({ id, title: n ? "束B" : "束A", hue: 285 + n * 40, w: 60, h: 60,
           free: { x: n ? 430 : -430, y: n ? 330 : -330, z: 0.3 + n * 0.4 }, view: "grid" });
  for (let k = 0; k < 10; k++)
    C.push({ id: `${id}k${k}`, title: String(k + 1), hue: 285 + n * 40, w: 30, h: 20, parent: id,
             cell: { col: k % 5, row: Math.floor(k / 5) } });
});

/* ────────────────────────────────────────────────────────────
   台本が掴む所。場面ごとに1つずつ決めておく（全案で同じ泡を掴む）
     drag   … いちばん外の泡（root の子。X も Y も「自由」なので、位置だけが変わる）
     resize … 右下の角を引く泡（⑤ pin が働いて、外の泡の座標が書き換わる所を選ぶ）
   ──────────────────────────────────────────────────────────── */
export const SCENES = {
  A: { id: "A", label: "勤務表（v4 の実物）", rootView: "free", selected: "memo1", bubbles: A,
       drag: "memo1", resize: "staff",
       note: "v4/lab.html と同じ構成。入れ子は root → 勤務表 → カレンダー → 日" },
  B: { id: "B", label: "大きい（521）",       rootView: "free", selected: "bm0",   bubbles: B,
       drag: "bm0", resize: "w0d0",
       note: "場面A の格子の入れ子を1段深く・横に広げたもの。1+4+32+480+4" },
  C: { id: "C", label: "魚眼（202）",         rootView: "fisheyeXY", selected: "c0", bubbles: C,
       drag: "c90", resize: "cg0",
       note: "X も Y も魚眼・Z は透視。倍率が泡ごとに全部ちがう" },
};
export const sceneOf = id => SCENES[id] ?? SCENES.A;
