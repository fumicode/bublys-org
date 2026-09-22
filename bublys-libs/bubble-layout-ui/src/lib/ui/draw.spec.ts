/**
 * 描く ── ラボ（v5-dom/lab.html）と同じ文字列を作るか。
 *
 * ★ 本当の受け入れ条件は、ブラウザで両方を開いて矩形を突き合わせる
 *   `docs/bubble-space-prototype/v5-dom/_check/react.mjs`（12 場面・6264 個の数・**DOM の差 0px**）。
 *   ここはその手前の、目で読める形の見張り。
 */
import { labScene, resolveWorld, VIEWPORT } from '@bublys-org/bubble-layout';
import { DRAW_MIN, drawField, markTiny, rowsOf } from './draw.js';

/** 画面が無いので、字幅は作り物（幅は「1文字 ≒ 0.62em」。ラボの実測に近い数） */
const measureText = (t: string, px: number) => Math.round(t.length * px * 0.62);

const field = (drawMin = DRAW_MIN) => {
  const world = labScene();
  const layout = resolveWorld(world, VIEWPORT);
  return { world, layout, draw: drawField({ world, layout, viewport: VIEWPORT, drawMin, selectedId: 'memo1', measureText }) };
};

describe('描く ── 配置 → DOM の属性', () => {
  it('ラボと同じ 58 枚を、描く順のまま返す', () => {
    const { layout, draw } = field();
    expect(draw.items.length).toBe(58);
    expect(draw.items.map((i) => i.id)).toEqual(layout.order.map((p) => p.id));
    // z-index ＝ 描く順の添字
    expect(draw.items.map((i) => i.style['zIndex'])).toEqual(layout.order.map((_, i) => i));
  });

  it('毎フレーム書くのは transform 1行 ── 桁もラボと同じ（x,y は 2桁・倍率は 5桁）', () => {
    const { layout, draw } = field();
    const p = layout.byId.get('memo1');
    if (!p) throw new Error('memo1 がいない');
    expect(draw.items[draw.items.findIndex((i) => i.id === 'memo1')].style['transform']).toBe(
      `translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) scale(${p.scale.toFixed(5)})`,
    );
  });

  it('逆 scale（--k）は 1/倍率 を 4桁', () => {
    const { layout, draw } = field();
    for (const it of draw.items) {
      const p = layout.byId.get(it.id);
      expect(it.style['--k']).toBe((1 / (p?.scale ?? 1)).toFixed(4));
    }
  });

  it('選んだ泡には sel、空間を持つ泡には host、見えない親には imp が付く', () => {
    const { world, draw } = field();
    const by = new Map(draw.items.map((i) => [i.id, i]));
    expect(by.get('memo1')?.className).toContain(' sel');
    expect(by.get('kinmu')?.className).toContain(' host');
    expect(world.isHost('kinmu')).toBe(true);
    expect(by.get('snap1')?.className).toContain('bub imp');
    expect(by.get('snap1')?.label).toBe('見えない親 · 横に並べる');
  });

  it('中身の行の本数は min(6, floor((箱の高さ − 24 − 12) / 11))', () => {
    expect(rowsOf(80)).toBe(4);
    expect(rowsOf(34)).toBe(0);
    expect(rowsOf(1000)).toBe(6);
    expect(rowsOf(10)).toBe(0);
  });

  describe('★ 描く下限（ui の話。domain の答えは動かない）', () => {
    it('下限を動かしても placements は1バイトも変わらない', () => {
      const a = resolveWorld(labScene(), VIEWPORT);
      const b = resolveWorld(labScene(), VIEWPORT);
      const key = (l: typeof a) => l.order.map((p) => [p.id, p.x, p.y, p.w, p.h, p.scale, p.alpha, p.vis].join(' ')).join('\n');
      expect(key(a)).toBe(key(b));
      // 下限は描く側だけを変える
      expect(markTiny(labScene(), a, 0).size).toBe(0);
      expect(markTiny(labScene(), b, 1000).size).toBe(b.order.length);
    });

    it('下限 0 なら誰も消えない。上げるほど消える泡が増える', () => {
      const counts = [0, 5, 10, 16, 20].map((v) => field(v).draw.tinyIds.length);
      expect(counts[0]).toBe(0);
      for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    });

    it('消した泡は描かない（display:none）し、掴めない', () => {
      const { draw } = field(1000);
      for (const it of draw.items) {
        expect(it.tiny).toBe(true);
        expect(it.style['display']).toBe('none');
        expect(it.grab).toBe(false);
      }
    });

    it('入れ物が消えたら中身も消える', () => {
      const { world, layout } = field();
      const tiny = markTiny(world, layout, 9999);
      for (const b of world.kidsOf('kinmu')) expect(tiny.has(b.id)).toBe(true);
    });
  });

  it('③ 見えない親に角は出ない。選んだ泡が描かれているときだけ角が出る', () => {
    const world = labScene();
    const layout = resolveWorld(world, VIEWPORT);
    const on = drawField({ world, layout, viewport: VIEWPORT, selectedId: 'memo1', measureText });
    expect(on.handle).not.toBeNull();
    const imp = drawField({ world, layout, viewport: VIEWPORT, selectedId: 'snap1', measureText });
    expect(imp.handle).toBeNull();
    const gone = drawField({ world, layout, viewport: VIEWPORT, selectedId: 'memo1', drawMin: 9999, measureText });
    expect(gone.handle).toBeNull();
  });
});
