/**
 * 一覧の並べ方の決まり ── **箱の形と枚数だけ**で決まる。
 *
 *   縦に収まる … 縦に並べる ／ 収まらない ＋ 横長 … coverflow ／ 収まらない ＋ 縦長 … 奥行きに重ねる
 */
import {
  COVERFLOW_STEP_RATIO,
  GRID_MIN_SIDE,
  LIST_BOX,
  LIST_CARD_WIDTH,
  LIST_DEPTH_INSET,
  colsFor,
  fitBoxFor,
  itemWidthFor,
  pickPreset,
  stepFor,
} from './listArrange.js';
import { METRICS } from '@bublys-org/bubble-layout';

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
    expect(colsFor('coverflowGrid', { w: 900, h: 400 }, LIST_CARD_WIDTH)).toBe(2);   // (900−28) ÷ 392
    expect(colsFor('coverflowGrid', { w: 1700, h: 400 }, LIST_CARD_WIDTH)).toBe(4);
    // 札が細ければ、同じ箱でも列は増える（列数は**札と箱の関係**）
    expect(colsFor('coverflowGrid', { w: 900, h: 400 }, 240)).toBe(3);
    // 格子（平行）も同じ式で折り返す
    expect(colsFor('grid', { w: 900, h: 400 }, LIST_CARD_WIDTH)).toBe(2);
    // 折り返さない並べ方は列数を持たない
    expect(colsFor('coverflow', { w: 900, h: 400 }, LIST_CARD_WIDTH)).toBeUndefined();
    expect(colsFor('column', BOX, LIST_CARD_WIDTH)).toBeUndefined();
  });

  it('格子は 2×2 が最低 ── 1 列ぶんしか無い箱でも 2 列にする（はみ出しは見切れる）', () => {
    expect(colsFor('grid', BOX, LIST_CARD_WIDTH)).toBe(GRID_MIN_SIDE);
    expect(colsFor('coverflowGrid', { w: 100, h: 400 }, LIST_CARD_WIDTH)).toBe(GRID_MIN_SIDE);
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
  it('札の幅は札のもの ── **箱は決めない**', () => {
    // 箱をいくら広げても、札は自分の幅のまま（前は 箱−余白 だったので窓と一緒に太った）
    for (const preset of ['column', 'coverflow', 'coverflowY', 'coverflowGrid'] as const) {
      expect(itemWidthFor(preset, LIST_CARD_WIDTH)).toBe(LIST_CARD_WIDTH);
      expect(itemWidthFor(preset, 240)).toBe(240);
    }
  });

  it('透視だけは左右を細くする（後ろの札の肩を出すため）', () => {
    expect(itemWidthFor('stackDepth', LIST_CARD_WIDTH)).toBe(LIST_CARD_WIDTH - LIST_DEPTH_INSET * 2);
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

/**
 * **その並べ方に合う箱の大きさ。**
 *
 * 箱と並べ方が追いかけ合うとき（`follows`）、並べ方を選んだらこの大きさへ移る。
 * 出るのは詰める 3 つだけ ── 魚眼と透視はレンズが何でも箱に収めてしまうので、
 * 中身から大きさが出ない（出ないものを決め打ちで与えない）。
 */
describe('並べ方に合う箱の大きさ', () => {
  const CARD = { w: 308, h: 84 };
  const PAD2 = METRICS.PAD * 2;   // 並びの左右・上下の余白（28）

  it('縦に並べる ── 幅は札 1 枚、高さは枚数ぶん（＋口の取り分）', () => {
    expect(fitBoxFor('column', 6, CARD, 0)).toEqual({ w: 308 + PAD2, h: 6 * 84 + PAD2 });
    expect(fitBoxFor('column', 6, CARD, 52)).toEqual({ w: 308 + PAD2, h: 6 * 84 + 52 + PAD2 });
  });

  it('横に並べる ── 縦と横が入れ替わるだけ', () => {
    expect(fitBoxFor('row', 4, CARD, 0)).toEqual({ w: 4 * 308 + PAD2, h: 84 + PAD2 });
  });

  it('格子は四角に近い形から出す（箱がまだ無いので、箱からは数えない）', () => {
    // 6 枚 → 3 列 2 行
    expect(fitBoxFor('grid', 6, CARD, 0)).toEqual({ w: 3 * 308 + PAD2, h: 2 * 84 + PAD2 });
    // 2 枚でも 2 列（格子の下限。`GRID_MIN_SIDE`）
    expect(fitBoxFor('grid', 2, CARD, 0)).toEqual({ w: 2 * 308 + PAD2, h: 1 * 84 + PAD2 });
  });

  it('魚眼と透視は大きさを返さない ── 箱に触らない', () => {
    for (const preset of ['coverflow', 'coverflowY', 'coverflowGrid', 'stackDepth'] as const) {
      expect(fitBoxFor(preset, 6, CARD, 0)).toBeUndefined();
    }
  });

  it('置ける広さで頭打ちにする ── 海より大きい箱は置けない', () => {
    const room = { w: 900, h: 800 };
    expect(fitBoxFor('row', 6, CARD, 0, room)).toEqual({ w: 900, h: 84 + PAD2 });
    // ただし札 1 枚は切らない（札より狭い箱を返しても仕方がない）
    expect(fitBoxFor('row', 6, CARD, 0, { w: 100, h: 800 })?.w).toBe(308);
  });
});
