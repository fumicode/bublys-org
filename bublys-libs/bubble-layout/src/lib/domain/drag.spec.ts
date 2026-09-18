/**
 * ② 操作は、軸と、何を掴んだかで決まる ── 泡を引いたとき、値のどこへ書くか。
 *
 * | 軸の次元 | 泡を引くと |
 * | 書ける（自由・順序・列/行） | その次元へ書く |
 * | 書けない（履歴）            | 視点が動く     |
 * | なし                        | 何も起きない   |
 *
 * ★ 入力（掴んだ点との相対・当たり判定）は ui の仕事。domain へは「泡の中心を画面のどこへ持っていきたいか」
 *   （want）まで噛み砕いて渡す。下の want は、ラボで本物のマウスを1歩だけ動かしたときの
 *   `mx − (fx − 0.5)·p.w`（lab.html 1186 行）をそのまま実測したもの。
 */
import { dragBubble, dragVerbsOf } from './drag.js';
import { resolveWorld } from './resolve.js';
import { withAxis } from './view.js';
import { DEFAULT_RULES } from './rules.js';
import { labScene, placeOf, VIEWPORT } from './lab-scene.fixture.js';

describe('② 泡を引く', () => {
  it('★ 書き込む先は、その軸に刺さっている次元（free.x 決め打ちではない）', () => {
    // ラボ実測：外の空間の X に 自由Y・Y に 自由X を刺して、付箋C を (+90,+60) 引いた
    //   → 自由X 268 → 328（＝ 縦に引いた 60）／自由Y 225 → 315（＝ 横に引いた 90）と入れ替わる
    let w = withAxis(labScene(), 'root', 'x', { dim: 'free.y' });
    w = withAxis(w, 'root', 'y', { dim: 'free.x' });
    expect(dragVerbsOf(w, 'root')).toEqual({ x: 'coord', y: 'coord' });
    const layout = resolveWorld(w, VIEWPORT);
    const p = placeOf(layout, 'fC');
    expect(w.bubble('fC')?.state.free).toEqual({ x: 268, y: 225, z: 0 });
    const next = dragBubble(w, { layout, id: 'fC', space: 'root', want: { x: 1035, y: 732.75 }, m: p.m }, DEFAULT_RULES);
    expect(next.bubble('fC')?.state.free).toEqual({ x: 328, y: 315, z: 0 });
  });

  it('書けないなら視点が動く（X魚眼ビュー ＝ 履歴。泡ではなく空間の焦点に書く）', () => {
    // ラボ実測：版5 を横に 70px 引いたら、X魚眼ビューの焦点 X が 0 → −110.48881297487148
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    expect(dragVerbsOf(w, 'fish')).toEqual({ x: 'focus', y: 'focus' });
    const p = placeOf(layout, 'v4');
    const before = w.bubble('v4')?.state;
    const next = dragBubble(
      w, { layout, id: 'v4', space: 'fish', want: { x: 388.4412856837971, y: 271.75 }, m: p.m }, DEFAULT_RULES,
    );
    expect(next.bubble('fish')?.state.focus.x).toBe(-110.48881297487148);
    expect(next.bubble('fish')?.state.focus.y).toBe(0);
    // 泡そのものの値は1つも変わらない
    expect(next.bubble('v4')?.state).toEqual(before);
  });

  it('なしなら何も起きない（議事録 ＝ X・Y とも なし）', () => {
    // ラボ実測：確定 を (+70,+40) 引いても、値も焦点も動かない
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    expect(dragVerbsOf(w, 'giji')).toEqual({ x: 'none', y: 'none' });
    const p = placeOf(layout, 'g3');
    const next = dragBubble(
      w, { layout, id: 'g3', space: 'giji', want: { x: 280, y: 610.75 }, m: p.m }, DEFAULT_RULES,
    );
    expect(next.bubble('g3')?.state).toEqual(w.bubble('g3')?.state);
    expect(next.bubble('giji')?.state.focus).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('並べ替え・マス移動は引いているあいだ書かない（離したときに確定する）', () => {
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    expect(dragVerbsOf(w, 'row')).toEqual({ x: 'reorder', y: 'none' });
    expect(dragVerbsOf(w, 'cal')).toEqual({ x: 'cell', y: 'cell' });
    const p = placeOf(layout, 'row0');
    const next = dragBubble(w, { layout, id: 'row0', space: 'row', want: { x: p.x + 200, y: p.y }, m: p.m }, DEFAULT_RULES);
    expect(next.kidsOf('row').map((b) => [b.id, b.state.order])).toEqual([['row0', 0], ['row1', 1], ['row2', 2]]);
  });
});
