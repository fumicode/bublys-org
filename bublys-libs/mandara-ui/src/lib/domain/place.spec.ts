import { describe, expect, it } from 'vitest';
import { placeOf } from './place.js';

const VP = { w: 900, h: 600 };

const rectOf = (p: ReturnType<typeof placeOf>, id: string) =>
  p.placed.find((x) => x.id === id)?.rect;

describe('曼荼羅に置く', () => {
  it('中央に誰も居なければ、仕切りだけ 4 本すべて出て、泡は 1 つも置かれない', () => {
    const p = placeOf(VP, null, []);
    expect(p.placed).toHaveLength(0);
    expect(p.mandara.lines).toHaveLength(4);
    expect(p.mandara.center).toEqual({ x: 150, y: 100, w: 600, h: 400 });
  });

  it('中央の泡だけなら、線は出ず、中央が画面ぜんぶ（余白のぶん内側）', () => {
    const p = placeOf(VP, 'a', [], 8);
    expect(p.mandara.lines).toHaveLength(0);
    expect(rectOf(p, 'a')).toEqual({ x: 8, y: 8, w: 884, h: 584 });
  });

  it('東に 1 つ開けば、縦線 1 本。中央は残りを吸収する', () => {
    const p = placeOf(VP, 'a', [{ id: 'b', dir: 'E' }], 0);
    expect(p.mandara.lines).toEqual([{ axis: 'v', at: 750 }]);
    expect(rectOf(p, 'a')).toEqual({ x: 0, y: 0, w: 750, h: 600 });
    expect(rectOf(p, 'b')).toEqual({ x: 750, y: 0, w: 150, h: 600 });
  });

  it('同じ向きに 2 つなら、1 つの区画を分け合う（重ならず、合わせて区画ちょうど）', () => {
    const p = placeOf(VP, 'a', [{ id: 'b', dir: 'E' }, { id: 'c', dir: 'E' }], 0);
    const b = rectOf(p, 'b')!;
    const c = rectOf(p, 'c')!;
    // 東の区画は縦長（150×600）なので、縦に分ける
    expect(b).toEqual({ x: 750, y: 0, w: 150, h: 300 });
    expect(c).toEqual({ x: 750, y: 300, w: 150, h: 300 });
    expect(b.h + c.h).toBe(600);
  });

  it('向きが 2 つに分かれれば、線もそのぶん出る', () => {
    const p = placeOf(VP, 'a', [{ id: 'b', dir: 'E' }, { id: 'c', dir: 'W' }], 0);
    expect(p.mandara.lines).toHaveLength(2);
    expect(rectOf(p, 'a')).toEqual({ x: 150, y: 0, w: 600, h: 600 });
    expect(rectOf(p, 'c')).toEqual({ x: 0, y: 0, w: 150, h: 600 });
  });

  it('余白は区画の内側に取る（区画そのものは痩せない）', () => {
    const p = placeOf(VP, 'a', [{ id: 'b', dir: 'E' }], 10);
    expect(p.mandara.region('E')).toEqual({ x: 750, y: 0, w: 150, h: 600 });
    expect(rectOf(p, 'b')).toEqual({ x: 760, y: 10, w: 130, h: 580 });
  });
});
