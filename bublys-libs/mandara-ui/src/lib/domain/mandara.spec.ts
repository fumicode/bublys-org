import { describe, expect, it } from 'vitest';
import { mandaraOf, sideOf, KEY, PAD } from './mandara.js';

const VP = { w: 900, h: 600 };
const E = { w: 150, h: 100 };   // 900/6, 600/6

describe('曼荼羅の区画', () => {
  it('泡が 1 つも居なければ、線は出ず、中央が画面ぜんぶ', () => {
    const m = mandaraOf(VP, []);
    expect(m.lines).toHaveLength(0);
    expect(m.center).toEqual({ x: 0, y: 0, w: 900, h: 600 });
    expect(m.region('E')).toBeNull();
  });

  it('東にだけ居れば、縦線 1 本。中央は左端から線まで（＝居ない向きの帯は中央が吸収する）', () => {
    const m = mandaraOf(VP, ['E']);
    expect(m.lines).toEqual([{ axis: 'v', at: 900 - E.w }]);
    expect(m.center).toEqual({ x: 0, y: 0, w: 750, h: 600 });
    expect(m.region('E')).toEqual({ x: 750, y: 0, w: 150, h: 600 });
    expect(m.region('W')).toBeNull();
  });

  it('斜め 1 つで、線が 2 本出る（中央が 2 方向から削られる）', () => {
    const m = mandaraOf(VP, ['NE']);
    expect(m.lines).toHaveLength(2);
    expect(m.center).toEqual({ x: 0, y: 100, w: 750, h: 500 });
    expect(m.region('NE')).toEqual({ x: 750, y: 0, w: 150, h: 100 });
  });

  it('四方が埋まれば、中央は 2/3 × 2/3 で、線は 4 本', () => {
    const m = mandaraOf(VP, ['N', 'S', 'E', 'W']);
    expect(m.lines).toHaveLength(4);
    expect(m.center).toEqual({ x: 150, y: 100, w: 600, h: 400 });
  });

  it('同じ向きに 2 つ以上いても、区画は 1 つ（2 つとも同じ区画に入る）', () => {
    const one = mandaraOf(VP, ['E']);
    const two = mandaraOf(VP, ['E', 'E']);
    expect(two.region('E')).toEqual(one.region('E'));
    expect(two.lines).toEqual(one.lines);
  });

  it('区画は重ならず、隙間なく画面を埋める', () => {
    const m = mandaraOf(VP, ['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE']);
    const all = [m.center, ...(['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE'] as const).map((d) => m.region(d)!)];
    expect(all.reduce((s, r) => s + r.w * r.h, 0)).toBeCloseTo(VP.w * VP.h, 6);
  });
});

describe('テンキーの並び', () => {
  it('数字と向きが、テンキーの見た目どおりに対応する', () => {
    expect(PAD['8']).toBe('N');
    expect(PAD['2']).toBe('S');
    expect(PAD['4']).toBe('W');
    expect(PAD['6']).toBe('E');
    expect(PAD['7']).toBe('NW');
    expect(PAD['3']).toBe('SE');
    // 5 と 0 は向きではない（中へ／戻る）
    expect(PAD['5']).toBeUndefined();
    expect(PAD['0']).toBeUndefined();
  });

  it('向き → 数字 は、数字 → 向き の裏返しになっている', () => {
    for (const [k, d] of Object.entries(PAD)) expect(KEY[d]).toBe(k);
  });
});

describe('向きの成分', () => {
  it('四正はひとつの辺、四隅はふたつの辺を持つ', () => {
    const count = (d: Parameters<typeof sideOf>[0]) =>
      Object.values(sideOf(d)).filter(Boolean).length;
    expect(count('N')).toBe(1);
    expect(count('E')).toBe(1);
    expect(count('NE')).toBe(2);
    expect(count('SW')).toBe(2);
  });
});
