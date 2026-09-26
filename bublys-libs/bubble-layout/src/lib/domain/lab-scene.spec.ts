/**
 * 場面そのものが、ラボと同じ木になっているか。
 * （ここが狂うと、隣のテストに焼いてある実測値はぜんぶ別の場面の数になってしまう）
 */
import { labScene, LAB_ROOT_ORDER, LAB_SPACES } from './lab-scene.js';

describe('場面 ── ラボと同じ木か', () => {
  it('58 個の泡が、ラボと同じ空間にいる', () => {
    const world = labScene();
    expect(world.bubbles.length).toBe(58);
    for (const [space, ids] of Object.entries(LAB_SPACES))
      expect(world.kidsOf(space).map((b) => b.id).sort()).toEqual([...ids]);
    // 木ぜんぶで 58（どこにも行き場の無い泡がいない）
    expect(Object.values(LAB_SPACES).reduce((n, ids) => n + ids.length, 0)).toBe(58);
  });

  it('★ 外の空間の 順序 は 0.. （くっつけで 付箋A・付箋B が抜けたときの renumber の跡）', () => {
    // ここを 0 のままにすると、外の空間の軸に「順序」を刺した場面だけラボと食い違う
    const world = labScene();
    expect(LAB_ROOT_ORDER.map(([id]) => [id, world.bubble(id)?.state.order])).toEqual(LAB_ROOT_ORDER.map((r) => [...r]));
  });

  it('外の空間は「自由に置く」、焦点は 0（ラボの起動直後）', () => {
    const world = labScene();
    expect(world.state.root.view.x.dim).toBe('free.x');
    expect(world.state.root.focus).toEqual({ x: 0, y: 0, z: 0 });
    expect(world.state.implicitSeq).toBe(1);
    expect(world.bubble('snap1')?.state.implicit).toBe(true);
  });
});
