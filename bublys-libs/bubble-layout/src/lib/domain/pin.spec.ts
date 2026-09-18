/**
 * ⑤ 触っていない泡は、画面の上で動かない。
 *
 * > 泡の位置は、箱の中心。だから中身が変わって箱が伸び縮みしたら、
 * > 触っていない泡の見えている場所を保つように、位置を書き直す。
 *
 * ラボ実測（_check/rule5.mjs と同じ手順）：
 *   佐藤（スタッフの先頭）の右下の角を、本物のマウスで +60px 引く。
 *   ・pin 入り … 勤務表・スタッフ・メモ・付箋A は 0.0px。カレンダーだけ帯の伸びちょうど（+60px）押される
 *   ・pin 切り … 勤務表・スタッフ が −30.0px（箱は中心を軸に両側へ伸びるので、左の縁は伸びの半分だけ動く）
 *
 * ★ 下ごしらえ：スタッフは自前 120px で 佐藤（76px）より広い。そのままだと最初の伸びが自前の大きさに
 *   吸われて「箱の伸び ＝ 泡の伸び」にならないので、先に一度 +60px 広げておく（ラボと同じ）。
 */
import { resizeBubble } from './drag.js';
import { applySnap, commitDrop } from './reshape.js';
import { withoutPin } from './pin.js';
import { actContext } from './act.js';
import { resolveWorld } from './resolve.js';
import type { Layout } from './resolve.js';
import { DEFAULT_RULES } from './rules.js';
import { labScene, placeOf, seenOf, VIEWPORT } from './lab-scene.js';

/** 佐藤の右下の角を、画面で +60px 引く（ラボの widen と同じ） */
function widen(world: ReturnType<typeof labScene>, run = resizeBubble) {
  const layout = resolveWorld(world, VIEWPORT);
  const ctx = actContext(VIEWPORT, seenOf(layout), DEFAULT_RULES);
  const p = placeOf(layout, 'p0');
  return run(world, ctx, { id: 'p0', size0: p.box, by: { x: 60, y: 0 }, scale: p.scale, at: { x: p.x, y: p.y } });
}
const dx = (a: Layout, b: Layout, id: string) => placeOf(b, id).x - placeOf(a, id).x;
const dy = (a: Layout, b: Layout, id: string) => placeOf(b, id).y - placeOf(a, id).y;

/** 下ごしらえのあと（スタッフの箱を中身が決める形にしてから） */
const ready = widen(labScene());
const before = resolveWorld(ready, VIEWPORT);

describe('⑤ 触っていない泡は、画面の上で動かない', () => {
  it('★ 角を +60px 引いても、触っていない泡は 0.0px（勤務表・スタッフ・メモ・付箋A）', () => {
    const after = resolveWorld(widen(ready), VIEWPORT);
    // 箱はちゃんと 60px 伸びた（伸びていなければ「動かない」は当たり前になってしまう）
    expect(placeOf(after, 'staff').w - placeOf(before, 'staff').w).toBeCloseTo(60, 9);
    expect(placeOf(after, 'kinmu').w - placeOf(before, 'kinmu').w).toBeCloseTo(60, 9);
    for (const id of ['kinmu', 'staff', 'memo1', 'fA', 'p0']) {
      expect(Math.abs(dx(before, after, id))).toBeLessThan(1e-9);
      expect(Math.abs(dy(before, after, id))).toBeLessThan(1e-9);
    }
    // 押されるのは「詰める」の意味どおり、帯の伸びちょうど（カレンダー・制約は 勤務表 の隣の帯）
    expect(dx(before, after, 'cal')).toBeCloseTo(60, 9);
    expect(dx(before, after, 'seiyaku')).toBeCloseTo(60, 9);
  });

  it('★ pin を切ると −30.0px 動く（伸び 60.0px の半分 ＝ 箱が中心を軸に伸びるぶん）', () => {
    const after = resolveWorld(withoutPin(() => widen(ready)), VIEWPORT);
    expect(dx(before, after, 'kinmu')).toBeCloseTo(-30, 9);
    expect(dx(before, after, 'staff')).toBeCloseTo(-30, 9);
    expect(dx(before, after, 'cal')).toBeCloseTo(30, 9);
    expect(dx(before, after, 'memo1')).toBe(0);            // 並びの外は元から動かない
  });

  it('同じ空間の中の並べ替えは留めない（帯が入れ替わるだけで、塊も箱も変わらない）', () => {
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    const ctx = actContext(VIEWPORT, seenOf(layout), DEFAULT_RULES);
    const res = commitDrop(
      w, ctx,
      { id: 'p4', space: 'staff', rect: placeOf(layout, 'p4'), skip: w.subtreeOf('p4'), lift: true },
      { space: 'staff', out: false, order: { idx: 0, list: ['p0', 'p1', 'p2', 'p3'] }, cell: {}, snap: null, occupants: [] },
    );
    expect(res.pinned).toEqual([]);                        // 留めない
    expect(res.world.kidsOf('staff').map((b) => [b.id, b.state.order]))
      .toEqual([['p0', 1], ['p1', 2], ['p2', 3], ['p3', 4], ['p4', 0]]);
    const after = resolveWorld(res.world, VIEWPORT);
    for (const id of ['kinmu', 'staff', 'cal'])
      expect([dx(layout, after, id), dy(layout, after, id)]).toEqual([0, 0]);
  });

  it('★ 詰めるへの差し込みでは、差し込む所より前だけが留まる（後ろは差し込んだ泡の幅ちょうど動く）', () => {
    // ラボ実測：付箋C（幅 96）を 付箋A の右へ差し込む
    //   → 付箋A 660 のまま・付箋B 780 → 876（＋96）・並びの箱 250 → 346・並びの外のメモは 30 のまま
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    const ctx = actContext(VIEWPORT, seenOf(layout), DEFAULT_RULES);
    const res = applySnap(w, ctx, 'fC', { kind: 'join', target: 'fA', axis: 'x', after: true, dist: 0 });
    expect(res.pinned).toContain('fA');
    const after = resolveWorld(res.world, VIEWPORT);
    expect(res.world.kidsOf('snap1').slice().sort((a, b) => a.state.order - b.state.order).map((b) => b.id))
      .toEqual(['fA', 'fC', 'fB']);
    expect(placeOf(after, 'fA').x).toBe(660);                       // 差し込む所より前 ── 0px
    expect(placeOf(after, 'fC').x).toBe(780);
    expect(placeOf(after, 'fB').x).toBe(876);                       // 後ろ ── 差し込んだ 96px ちょうど
    expect(placeOf(after, 'fB').x - placeOf(layout, 'fB').x).toBe(placeOf(after, 'fC').w);
    expect(placeOf(after, 'snap1').w).toBe(346);                    // 250 ＋ 96
    expect(placeOf(after, 'memo1').x).toBe(30);                     // 並びの外は 0px
  });
});
