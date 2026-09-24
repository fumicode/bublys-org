/**
 * 一覧の並べ方の決まり ── **箱の形と枚数だけ**で決まる。
 *
 *   縦に収まる … 縦に並べる ／ 収まらない ＋ 横長 … coverflow ／ 収まらない ＋ 縦長 … 奥行きに重ねる
 */
import {
  COVERFLOW_STEP_RATIO,
  LIST_BOX,
  LIST_CARD_WIDTH,
  LIST_DEPTH_INSET,
  colsFor,
  itemWidthFor,
  pickPreset,
  stepFor,
} from './listArrange.js';

/** 既定の一覧の箱（縦長） */
const BOX = { w: LIST_BOX.width, h: LIST_BOX.height };
/** 岸の上端に貼った一覧のような、横長の箱 */
const WIDE = { w: 826, h: 200 };
const CARD_H = 88;

describe('一覧の並べ方', () => {
  it('縦に収まるうちは、縦に並べる', () => {
    expect(pickPreset(BOX, 3, LIST_CARD_WIDTH, CARD_H, null)).toBe('column');
  });

  it('収まらなくなって、箱が縦長なら縦の coverflow（上下へ送る）', () => {
    // 既定の箱は札 1 枚ぶんの幅しかない ＝ 横には並べられない
    expect(pickPreset(BOX, 20, LIST_CARD_WIDTH, CARD_H, null)).toBe('coverflowY');
  });

  it('縦にも横にも 2 枚以上とれるなら、1 列に押し込まずに折り返す', () => {
    expect(pickPreset({ w: 900, h: 400 }, 20, LIST_CARD_WIDTH, CARD_H, null)).toBe('coverflowGrid');
  });

  it('折り返す列数は、箱に札が何枚とれるかで決まる', () => {
    expect(colsFor('coverflowGrid', { w: 900, h: 400 })).toBe(2);   // (900−28) ÷ 392
    expect(colsFor('coverflowGrid', { w: 1700, h: 400 })).toBe(4);
    // 折り返さない並べ方は列数を持たない
    expect(colsFor('coverflow', { w: 900, h: 400 })).toBeUndefined();
    expect(colsFor('column', BOX)).toBeUndefined();
  });

  it('収まらなくなって、箱が横長なら coverflow', () => {
    expect(pickPreset(WIDE, 20, LIST_CARD_WIDTH, CARD_H, null)).toBe('coverflow');
  });

  it('横長でも、収まっているうちは縦に並べたまま', () => {
    expect(pickPreset({ w: 826, h: 400 }, 3, LIST_CARD_WIDTH, CARD_H, null)).toBe('column');
  });

  it('正方形は横長ではない（縦の coverflow へ倒れる）', () => {
    expect(pickPreset({ w: 400, h: 400 }, 20, LIST_CARD_WIDTH, CARD_H, null)).toBe('coverflowY');
  });
});

describe('並べ方ごとの札の形', () => {
  it('詰める並びは箱の中身いっぱい、透視はそこから左右を細く', () => {
    expect(itemWidthFor('column', LIST_BOX.width)).toBe(LIST_CARD_WIDTH);
    expect(itemWidthFor('stackDepth', LIST_BOX.width)).toBe(LIST_CARD_WIDTH - LIST_DEPTH_INSET * 2);
  });

  it('縦の coverflow は箱いっぱい ── 送るのは上下なので、横は細くしない', () => {
    expect(itemWidthFor('coverflowY', LIST_BOX.width)).toBe(LIST_CARD_WIDTH);
    expect(itemWidthFor('coverflowY', 826)).toBe(826 - 28);
  });

  it('coverflow は読める幅で頭打ち ── 広い箱でも札は太らない', () => {
    expect(itemWidthFor('coverflow', WIDE.w)).toBe(LIST_CARD_WIDTH);
    // 狭い箱では箱に合わせる（頭打ちなので、それ以上は広がらないだけ）
    expect(itemWidthFor('coverflow', 200)).toBe(200 - 28);
  });

  it('送り幅は札より少し狭い ── 隣が肩を出す', () => {
    const w = itemWidthFor('coverflow', WIDE.w);
    const step = stepFor('coverflow', { w, h: CARD_H });
    expect(step).toEqual({ x: Math.round(w * COVERFLOW_STEP_RATIO) });
    expect(step?.x).toBeLessThan(w);
  });

  it('縦版の送り幅は**札の高さ**で測る（送る向きの辺）', () => {
    const w = itemWidthFor('coverflowY', LIST_BOX.width);
    expect(stepFor('coverflowY', { w, h: CARD_H })).toEqual({
      y: Math.round(CARD_H * COVERFLOW_STEP_RATIO),
    });
  });

  it('折り返す並びは両方の向きへ送るので、両方の送り幅を持つ', () => {
    const w = itemWidthFor('coverflowGrid', 900);
    expect(stepFor('coverflowGrid', { w, h: CARD_H })).toEqual({
      x: Math.round(w * COVERFLOW_STEP_RATIO),
      y: Math.round(CARD_H * COVERFLOW_STEP_RATIO),
    });
  });

  it('送り幅を決めるのは coverflow の 3 つだけ（ほかは詰める並びなので札が決める）', () => {
    expect(stepFor('column', { w: 300, h: 88 })).toBeUndefined();
    expect(stepFor('stackDepth', { w: 300, h: 88 })).toBeUndefined();
  });
});
