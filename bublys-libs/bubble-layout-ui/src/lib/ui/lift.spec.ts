/**
 * 持ち上げ ── 掴んでいる泡を一番上へ。並べ替え・マス移動ではカーソルについてくる。
 *
 * ★ 本当の受け入れ条件は、ラボと React を本物のマウスで同じに触って値を突き合わせる
 *   `docs/bubble-space-prototype/v5-dom/_check/react-drag.mjs`（9 件）。ここは形の見張り。
 */
import { labScene, resolveWorld, VIEWPORT } from '@bublys-org/bubble-layout';
import { withLift } from './lift.js';
import type { LiftState } from './lift.js';

const world = labScene();
const layout = resolveWorld(world, VIEWPORT);

const held = (over: Partial<LiftState> = {}): LiftState => ({
  id: 'row0',
  skip: world.subtreeOf('row0'),
  lift: true,
  out: false,
  verbs: { x: 'reorder', y: 'none' },
  scale0: layout.byId.get('row0')?.scale ?? 1,
  fx: 0.5, fy: 0.5,
  mx: 400, my: 300,
  ...over,
});

describe('持ち上げ', () => {
  it('掴んでいる泡は一番上に描かれる（順番だけ変わり、泡は増えも減りもしない）', () => {
    const next = withLift(layout, held());
    expect(next.order.length).toBe(layout.order.length);
    expect(next.order[next.order.length - 1].id).toBe('row0');
    expect(new Set(next.order.map((p) => p.id))).toEqual(new Set(layout.order.map((p) => p.id)));
  });

  it('ついてくる軸だけカーソルに寄る。ついてこない軸は View の答えのまま', () => {
    const before = layout.byId.get('row0');
    const next = withLift(layout, held({ mx: 400, my: 300 }));
    const p = next.byId.get('row0');
    if (!before || !p) throw new Error('row0 がいない');
    // X は 並べ替え ＝ ついてくる（掴んだ点が真ん中なので、中心がカーソルに来る）
    expect(p.x + p.w / 2).toBeCloseTo(400, 10);
    // Y は なし ＝ ついてこない（中心が動かない）
    expect(p.y + p.h / 2).toBeCloseTo(before.y + before.h / 2, 10);
  });

  it('空間の外へ引き出したら、両方の軸でついてくる', () => {
    const next = withLift(layout, held({ out: true, mx: 400, my: 300 }));
    const p = next.byId.get('row0');
    if (!p) throw new Error('row0 がいない');
    expect(p.x + p.w / 2).toBeCloseTo(400, 10);
    expect(p.y + p.h / 2).toBeCloseTo(300, 10);
  });

  it('★ 中身の泡も、掴んだ泡と同じだけ動いて同じだけ伸びる（compose が1次式だから）', () => {
    const grabbed = 'kinmu';
    const state = held({
      id: grabbed, skip: world.subtreeOf(grabbed),
      scale0: (layout.byId.get(grabbed)?.scale ?? 1) * 2, // わざと倍率を変える
      mx: 700, my: 400, out: true, verbs: { x: 'coord', y: 'coord' },
    });
    const p0 = layout.byId.get(grabbed);
    const next = withLift(layout, state);
    const p1 = next.byId.get(grabbed);
    if (!p0 || !p1) throw new Error('kinmu がいない');
    const k = p1.scale / p0.scale;
    expect(k).toBeCloseTo(2, 10);
    for (const kid of world.subtreeOf(grabbed)) {
      if (kid === grabbed) continue;
      const q0 = layout.byId.get(kid);
      const q1 = next.byId.get(kid);
      if (!q0 || !q1) continue;
      // 掴んだ泡の左上から見た位置が、ちょうど k 倍になっている
      expect(q1.x - p1.x).toBeCloseTo((q0.x - p0.x) * k, 9);
      expect(q1.y - p1.y).toBeCloseTo((q0.y - p0.y) * k, 9);
      expect(q1.w).toBeCloseTo(q0.w * k, 9);
      expect(q1.scale).toBeCloseTo(q0.scale * k, 12);
    }
  });

  it('持ち上げないなら、一番上へ動かすだけで場所は変わらない', () => {
    const next = withLift(layout, held({ lift: false }));
    const p0 = layout.byId.get('row0');
    const p1 = next.byId.get('row0');
    expect([p1?.x, p1?.y, p1?.w, p1?.h]).toEqual([p0?.x, p0?.y, p0?.w, p0?.h]);
  });

  it('掴んでいなければ、配置はそのまま', () => {
    expect(withLift(layout, null)).toBe(layout);
  });
});
