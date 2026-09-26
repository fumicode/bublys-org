/**
 * ② 離したら確定するところ（マスの先客・順序の振り直し）と、
 * ③ 並びは2つ以上（子が1つになった見えない親は消え、残った泡が席を継ぐ）。
 *
 * ラボ実測：本物のマウスでドラッグして離したあとの `__lab.bubbles()` と `__lab.implicitParents()`。
 */
import { commitDrop, freeCellNear, renumber, tidyRows } from './reshape.js';
import { actContext } from './act.js';
import { resolveWorld } from './resolve.js';
import { DEFAULT_RULES } from './rules.js';
import { labScene, placeOf, seenOf, VIEWPORT } from './lab-scene.js';

const seat = (w: ReturnType<typeof labScene>, id: string) => {
  const b = w.bubble(id);
  if (!b) throw new Error('泡が無い: ' + id);
  return { parent: b.state.parent, order: b.state.order, cell: b.state.cell, free: b.state.free };
};

describe('② マスの先客は、いちばん近い空きマスへ逃げる', () => {
  // ラボ実測：スタッフの 佐藤 を カレンダーの日へ落とした（カレンダーは 7×2 が全部埋まっている）
  it.each([
    ['「9」（1,1）へ落とすと、先客は1つ下（1,2）へ', { col: 1, row: 1 }, 'd8', { col: 1, row: 2 }],
    ['「6」（5,0）へ落とすと、隣も下も埋まっているので2つ右（7,0）へ', { col: 5, row: 0 }, 'd5', { col: 7, row: 0 }],
  ])('%s', (_name, cell, occupant, escaped) => {
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    const ctx = actContext(VIEWPORT, seenOf(layout), DEFAULT_RULES);
    const res = commitDrop(
      w, ctx,
      { id: 'p0', space: 'staff', rect: placeOf(layout, 'p0'), skip: w.subtreeOf('p0'), lift: true },
      { space: 'cal', out: false, order: null, cell, snap: null, occupants: [occupant] },
    );
    expect(seat(res.world, 'p0').parent).toBe('cal');
    expect(seat(res.world, 'p0').cell).toEqual(cell);
    expect(seat(res.world, occupant).cell).toEqual(escaped);
    // 同じマスに2つは入らない
    const taken = res.world.kidsOf('cal').map((b) => `${b.state.cell.col},${b.state.cell.row}`);
    expect(new Set(taken).size).toBe(taken.length);
    // freeCellNear 単体でも同じ答え（逃がし方は集約の外に出していない）
    const placed = w.withBubble(w.bubble('p0').withParent('cal').withCell(cell));
    expect(freeCellNear(placed, 'cal', cell, occupant)).toEqual(escaped);
  });

  it('★ 出た空間と入った空間の兄弟は 0.. に振り直す（欠番を残さない）', () => {
    // ラボ実測：佐藤 が抜けたあとの スタッフ は 鈴木0 高橋1 田中2 伊藤3、
    //   佐藤 はカレンダーの一番後ろ（14）、先客の「9」は 8 のまま
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    const ctx = actContext(VIEWPORT, seenOf(layout), DEFAULT_RULES);
    const res = commitDrop(
      w, ctx,
      { id: 'p0', space: 'staff', rect: placeOf(layout, 'p0'), skip: w.subtreeOf('p0'), lift: true },
      { space: 'cal', out: false, order: null, cell: { col: 1, row: 1 }, snap: null, occupants: ['d8'] },
    );
    expect(res.world.kidsOf('staff').map((b) => [b.id, b.state.order]))
      .toEqual([['p1', 0], ['p2', 1], ['p3', 2], ['p4', 3]]);
    expect(seat(res.world, 'p0').order).toBe(14);
    expect(seat(res.world, 'd8').order).toBe(8);
  });

  it('renumber は渡した並びのとおりに 0.. を振る', () => {
    const w = renumber(labScene(), ['row2', 'row0', 'row1']);
    expect(w.kidsOf('row').map((b) => [b.id, b.state.order])).toEqual([['row0', 1], ['row1', 2], ['row2', 0]]);
  });
});

describe('③ 並びは2つ以上', () => {
  it('★ 子が1つになった見えない親は消え、残った泡が席（親・順序・マス）を継ぐ', () => {
    // ラボ実測：付箋A を並びの外の空いた所へ (+430,+150) ドラッグして離した
    //   → snap1 が消え、付箋B が 親 null・順序 9・自由座標 (125,245) を継ぐ（＝ 画面の上では動かない）
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    expect(w.rowOf('fB')?.id).toBe('snap1');
    // 並びの中は 順序・詰める なので、ドラッグしているあいだ値は書かれない。泡は「持ち上げ」でカーソルに
    // ついてくるだけ（ui の持ちもの）。だから見えていた矩形だけを動かして渡す
    const seen = new Map(seenOf(layout));
    const fa = placeOf(layout, 'fA');
    seen.set('fA', { x: fa.x + 430, y: fa.y + 150, w: fa.box.w, h: fa.box.h, scale: fa.scale });
    const ctx = actContext(VIEWPORT, seen, DEFAULT_RULES);
    const res = commitDrop(
      w, ctx,
      { id: 'fA', space: 'snap1', rect: fa, skip: w.subtreeOf('fA'), lift: true },
      { space: 'root', out: true, order: null, cell: {}, snap: null, occupants: [] },
    );
    expect(res.world.bubbles.some((b) => b.state.implicit)).toBe(false);          // 並びが消えた
    expect(seat(res.world, 'fB')).toEqual({ parent: null, order: 9, cell: { col: 0, row: 0 }, free: { x: 125, y: 245, z: 0 } });
    expect(seat(res.world, 'fA')).toEqual({ parent: null, order: 10, cell: { col: 0, row: 0 }, free: { x: 430, y: 385, z: 0 } });
    expect(res.pinned).toContain('fB');
    // ⑤ 席を継いだ 付箋B は、画面の上では1px も動かない
    const after = resolveWorld(res.world, VIEWPORT);
    expect(placeOf(after, 'fB').x).toBe(placeOf(layout, 'fB').x);
    expect(placeOf(after, 'fB').y).toBe(placeOf(layout, 'fB').y);
  });

  it('tidyRows 単体：子が 0 の並びは、席を継ぐ泡なしで消えるだけ', () => {
    const w = labScene();
    const gone = w.without('fA').without('fB');
    const tidied = tidyRows(gone);
    expect(tidied.world.bubble('snap1')).toBeNull();
    expect(tidied.heirs).toEqual([]);
  });

  it('子が2つ以上ある並びは残る', () => {
    const tidied = tidyRows(labScene());
    expect(tidied.world.bubble('snap1')).not.toBeNull();
    expect(tidied.heirs).toEqual([]);
  });
});
