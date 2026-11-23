import { milestoneFlagShape } from './milestoneMark.js';

describe('milestoneFlagShape（節目の旗）', () => {
  test('竿はノードの縁から上へ伸び、旗は竿の先から右へなびく', () => {
    const { pole, pennant } = milestoneFlagShape(100, 50, 6);

    expect(pole.x1).toBe(pole.x2);
    expect(pole.y2).toBeLessThan(50 - 6); // ノードより上
    expect(pennant[0]).toEqual([pole.x2, pole.y2]);
    expect(pennant[1][0]).toBeGreaterThan(pole.x2);
  });

  test('拡大率に合わせて小さくなる', () => {
    const full = milestoneFlagShape(0, 0, 6, 1);
    const half = milestoneFlagShape(0, 0, 6, 0.5);
    const height = (s: typeof full) => s.pole.y1 - s.pole.y2;

    expect(height(half)).toBeLessThan(height(full));
  });
});
