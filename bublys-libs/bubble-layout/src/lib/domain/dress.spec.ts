/**
 * **装いは並べ方を変えない。**
 *
 * 一覧の札を選ぶと装い（枠と帯）が出る。そのとき、
 *   - 選んだ泡の**中身は 1px も動かない**
 *   - 周りだけが、装いの取ったぶん逃げる（重ならないように）
 *   - 魚眼・透視では**誰も動かない**（装いが出るだけ）
 */
import { Bubble } from './bubble.js';
import { BubbleWorld } from './world.js';
import { presetView, withPreset } from './view.js';
import type { PresetId } from './view.js';
import { resolveWorld } from './resolve.js';
import { CHROME } from './chrome.js';

const VP = { w: 900, h: 700 };
const CARD = { w: 300, h: 80 };

const list = (n: number, preset: PresetId): BubbleWorld => {
  const bs = [];
  for (let i = 0; i < n; i++)
    bs.push(Bubble.create({ id: 'b' + i, title: 'b' + i, w: CARD.w, h: CARD.h, order: i }));
  return withPreset(
    new BubbleWorld({
      bubbles: bs.map((x) => x.state),
      root: { title: '外', view: presetView('free'), focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
      implicitSeq: 0,
    }),
    preset,
    'root',
  );
};

/** b2 に装いを出した配置と、出していない配置 */
const pair = (preset: PresetId) => {
  const w = list(5, preset);
  return {
    off: resolveWorld(w, VP),
    on: resolveWorld(w, VP, undefined, undefined, undefined, new Map([['b2', CHROME.plain]])),
  };
};

describe('装いは並べ方を変えない', () => {
  describe('縦に並べる（詰める）', () => {
    const { off, on } = pair('column');
    const at = (l: typeof off, id: string) => l.byId.get(id)!;

    it('選んだ泡の中身は 1px も動かない（装いは外へ出る）', () => {
      const a = at(off, 'b2');
      const b = at(on, 'b2');
      // 箱は装いのぶん広がり、中身（箱 ＋ 装いの左上）はもとの箱の左上と同じ
      expect(b.w).toBeCloseTo(a.w + CHROME.plain.left + CHROME.plain.right);
      expect(b.h).toBeCloseTo(a.h + CHROME.plain.top + CHROME.plain.bottom);
      expect(b.x + CHROME.plain.left).toBeCloseTo(a.x);
      expect(b.y + CHROME.plain.top).toBeCloseTo(a.y);
    });

    it('手前の泡は上の装いぶん戻り、向こうの泡は下の装いぶん進む', () => {
      expect(at(on, 'b1').y - at(off, 'b1').y).toBeCloseTo(-CHROME.plain.top);
      expect(at(on, 'b0').y - at(off, 'b0').y).toBeCloseTo(-CHROME.plain.top);
      expect(at(on, 'b3').y - at(off, 'b3').y).toBeCloseTo(CHROME.plain.bottom);
      expect(at(on, 'b4').y - at(off, 'b4').y).toBeCloseTo(CHROME.plain.bottom);
    });

    it('並べていない向き（横）は、誰も動かない', () => {
      for (const id of ['b0', 'b1', 'b3', 'b4'])
        expect(at(on, id).x).toBeCloseTo(at(off, id).x);
    });
  });

  for (const preset of ['coverflowY', 'fisheyeX', 'stackDepth'] as const) {
    it(`${preset} ── 周りは 1px も動かない（装いが出るだけ）`, () => {
      const { off, on } = pair(preset);
      for (const id of ['b0', 'b1', 'b3', 'b4']) {
        const a = off.byId.get(id)!;
        const b = on.byId.get(id)!;
        expect([b.x, b.y, b.w, b.h]).toEqual([a.x, a.y, a.w, a.h]);
      }
    });
  }
});
