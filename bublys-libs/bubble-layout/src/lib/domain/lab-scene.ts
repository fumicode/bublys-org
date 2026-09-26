/**
 * ラボと同じ場面 ── 隣の *.spec.ts はぜんぶこれを使う（テストではなく、テストの材料）。
 *
 * 元：docs/bubble-space-prototype/v5-dom/lab.html 446-482 行の7つの場面と、
 *     1830 行「起動時に 付箋A と 付箋B をくっつける」あとの状態。
 * 画面は 1440 × 809.5（lab.html を 1440×900 で開いたときの #stage の大きさ）。
 *
 * ★ この隣のテストに焼いてある数は、ぜんぶ **このラボを headless Chromium（playwright）で開いて
 *   `__lab.placements()` などから実測した値**。手で作った数は1つも無い。
 *   21 場面（起動直後・魚眼3通り・帯3通り・触る3通り・ドラッグする3通り・pin 2通り・差し込み・並びが消える）を
 *   px で突き合わせて、いちばん大きい差は 5.7e-14px（倍精度の粒）だった。
 *
 * ★ ラボそのものは `node docs/bubble-space-prototype/v5-dom/_check/all.mjs` の 14 本で守られている
 *   （当たり判定・掴んで動かす・画面の約束はブラウザが要るので、そちらに残した）。
 */
import { METRICS } from './types.js';
import { Bubble } from './bubble.js';
import { BubbleWorld } from './world.js';
import { presetView, snapView } from './view.js';
import type { View } from './view.js';
import type { Layout } from './resolve.js';
import type { SeenRects } from './act.js';

/** lab.html を 1440×900 で開いたときの #stage */
export const VIEWPORT = { w: 1440, h: 809.5 };

/** ラボの7つの場面（＋ 起動時のくっつけ） */
export function labScene(): BubbleWorld {
  const bs: Bubble[] = [];
  /**
   * ★ **ラボの数は「箱」で書かれている。** 泡が持つのは**中身の大きさ**なので、
   *   入口で装いのぶん（帯 24）を引く ── こうすると解いたあとの箱はラボと 1px も違わない。
   *   ③ 見えない親は体を持たないので、装いも無い（引かない）。
   */
  const add = (init: Parameters<typeof Bubble.create>[0]) => {
    const h = init.implicit ? init.h : (init.h ?? 0) - METRICS.HEADER;
    bs.push(Bubble.create({ ...init, h }));
  };

  // 1. メモ
  add({ id: 'memo1', title: 'メモ', hue: 35, w: 130, h: 80, order: 0, free: { x: -625, y: -338 } });
  add({ id: 'memo2', title: '買い物', hue: 60, w: 130, h: 80, order: 1, free: { x: -482, y: -290 } });
  add({ id: 'memo3', title: '思いつき', hue: 15, w: 130, h: 80, order: 2, free: { x: -615, y: -237 } });

  // 2. 横に並べる（順序を詰める）
  add({ id: 'row', title: '横に並べる', hue: 170, w: 368, h: 130, order: 3, free: { x: -215, y: -315 }, view: presetView('row') });
  ([['小', 80, 50], ['中', 104, 64], ['大', 128, 78]] as const).forEach(([t, w, h], i) =>
    add({ id: 'row' + i, title: t, hue: 158 + i * 20, w, h, parent: 'row', order: i, free: { x: (i - 1) * 120, y: 0 } }),
  );

  // 3. coverflow（順序を等間隔・X に魚眼）
  add({ id: 'cover', title: 'coverflow', hue: 205, w: 340, h: 124, order: 4, free: { x: 150, y: -318 }, view: presetView('coverflow') });
  for (let i = 0; i < 7; i++)
    add({ id: 'cf' + i, title: '写真' + (i + 1), hue: 188 + i * 12, w: 90, h: 64, parent: 'cover', order: i, free: { x: (i - 3) * 40 } });

  // 4. X魚眼ビュー（世代を X の魚眼、枝を Y の平行）
  add({ id: 'fish', title: 'X魚眼ビュー', hue: 285, w: 420, h: 180, order: 5, free: { x: -490, y: -101 }, view: presetView('fisheyeX') });
  ([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [3, 1], [4, 1], [5, 1], [5, 2]] as const).forEach(([hist, branch], i) =>
    add({ id: 'v' + i, title: '版' + (i + 1), hue: [290, 325, 350][branch], w: 58, h: 34, parent: 'fish', hist, branch,
          free: { x: (hist - 2.5) * 60, y: (branch - 1) * 44 } }),
  );

  // 5. 議事録（履歴の古さを Z に。X・Y は なし）
  add({ id: 'giji', title: '議事録（版）', hue: 265, w: 300, h: 310, order: 6, free: { x: -510, y: 154 }, view: presetView('histZ') });
  ['初稿', '加筆', '指摘反映', '確定'].forEach((t, i) =>
    add({ id: 'g' + i, title: t, hue: 252 + i * 8, w: 150, h: 60, parent: 'giji', hist: i, order: i, free: { x: (i - 1.5) * 40 } }),
  );

  // 6. 勤務表（格子を詰めるだけ）
  add({ id: 'kinmu', title: '勤務表', hue: 355, w: 482, h: 340, order: 7, free: { x: -11, y: 18, z: 0.4 }, view: presetView('grid') });
  add({ id: 'seiyaku', title: '制約', hue: 40, w: 260, h: 56, parent: 'kinmu', cell: { col: 1, row: 0 }, free: { x: 60, y: -110 } });
  add({ id: 'staff', title: 'スタッフ', hue: 130, w: 120, h: 120, parent: 'kinmu', cell: { col: 0, row: 1 }, free: { x: -180, y: 40 }, view: presetView('column') });
  add({ id: 'cal', title: 'カレンダー', hue: 95, w: 336, h: 114, parent: 'kinmu', cell: { col: 1, row: 1 }, free: { x: 60, y: 40 }, view: presetView('grid') });
  ['佐藤', '鈴木', '高橋', '田中', '伊藤'].forEach((t, i) =>
    add({ id: 'p' + i, title: t, hue: 130, w: 76, h: 22, parent: 'staff', order: i, free: { y: (i - 2) * 30 } }),
  );
  for (let i = 0; i < 14; i++)
    add({ id: 'd' + i, title: String(i + 1), hue: 95, w: 32, h: 24, parent: 'cal', cell: { col: i % 7, row: Math.floor(i / 7) },
          free: { x: ((i % 7) - 3) * 46, y: (Math.floor(i / 7) - 0.5) * 38 } });

  // 7. くっつける ── 起動時に 付箋B が 付箋A の右へ入って、見えない親 snap1 が生まれたあとの状態
  //   （lab.html 1830 行。生む所は reshape の担当。ここは「生まれたあとの値」を置いて解くだけ）
  //   ★ 外の空間の 順序 が 0.. になっているのはそのため：泡が抜けた空間は renumber される（reshape）。
  //     ここを 0 のままにすると、外の空間の軸に「順序」を刺した場面だけラボと食い違う（実測で捕まえた）
  add({ id: 'fA', title: '付箋A', hue: 200, w: 120, h: 76, parent: 'snap1', order: 0, free: { x: 0, y: 235 } });
  add({ id: 'fB', title: '付箋B', hue: 250, w: 130, h: 96, parent: 'snap1', order: 1, free: { x: 152, y: 235 } });
  add({ id: 'fC', title: '付箋C', hue: 150, w: 96, h: 60, order: 8, free: { x: 268, y: 225 } });
  // 見えない親は最後に生まれる（並ぶ順＝泡の配列の順。描く順の同点はここで決まる）
  add({ id: 'snap1', title: '並び（見えない親）', hue: 215, w: 0, h: 0, order: 9, implicit: true,
        free: { x: 65, y: 245 }, view: snapView('x') as View });

  return new BubbleWorld({
    bubbles: bs.map((b) => b.state),
    root: { title: '外の空間', view: presetView('free'), focus: { x: 0, y: 0, z: 0 } },
    implicitSeq: 1,
  });
}

/**
 * 解いた配置 → 「さっき画面に見えていた矩形」（⑤ pin と ③ の付け替えの起点）。
 * ラボの reshape 1439 行 `before` と同じ中身（x,y は画面の左上、w,h は箱の素の大きさ、scale は合成倍率）。
 * ★ ラボは frameItems（補間・持ち上げを通したあと）から作る。domain はそれを持たないので、ここで作って渡す。
 */
export function seenOf(layout: Layout): SeenRects {
  return new Map(layout.order.map((p) => [p.id, { x: p.x, y: p.y, w: p.box.w, h: p.box.h, scale: p.scale }]));
}

/** 配置を id で取り出す（無ければ落とす。取り違えを黙って通さないため） */
export function placeOf(layout: Layout, id: string) {
  const p = layout.byId.get(id);
  if (!p) throw new Error('配置が無い: ' + id);
  return p;
}

/** ラボの `__lab.placements()` を空間でまとめたもの（起動直後・58 個） */
export const LAB_SPACES: Readonly<Record<string, readonly string[]>> = {
  root: ['cover', 'fC', 'fish', 'giji', 'kinmu', 'memo1', 'memo2', 'memo3', 'row', 'snap1'],
  kinmu: ['cal', 'seiyaku', 'staff'],
  staff: ['p0', 'p1', 'p2', 'p3', 'p4'],
  cal: ['d0', 'd1', 'd10', 'd11', 'd12', 'd13', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9'],
  row: ['row0', 'row1', 'row2'],
  cover: ['cf0', 'cf1', 'cf2', 'cf3', 'cf4', 'cf5', 'cf6'],
  fish: ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'],
  giji: ['g0', 'g1', 'g2', 'g3'],
  snap1: ['fA', 'fB'],
};

/** ラボの起動直後の 順序（`__lab.bubbles()` の実測）。外の空間は くっつけ の renumber で 0.. になっている */
export const LAB_ROOT_ORDER: readonly (readonly [string, number])[] = [
  ['memo1', 0], ['memo2', 1], ['memo3', 2], ['row', 3], ['cover', 4],
  ['fish', 5], ['giji', 6], ['kinmu', 7], ['fC', 8], ['snap1', 9],
];
