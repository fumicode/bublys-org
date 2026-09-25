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
  LENS_GRID_BOX,
  LENS_GRID_GAP,
  LENS_GRID_SHARE,
  colsFor,
  fitBoxFor,
  itemWidthFor,
  pickPreset,
  stepFor,
  LIST_GAP,
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

  it('詰める格子の折り返しは、箱に札が何枚とれるかで決まる', () => {
    expect(colsFor('grid', { w: 900, h: 400 }, LIST_CARD_WIDTH)).toBe(2);   // (900−28) ÷ 392
    expect(colsFor('grid', { w: 1700, h: 400 }, LIST_CARD_WIDTH)).toBe(4);
    // 札が細ければ、同じ箱でも列は増える（列数は**札と箱の関係**）
    expect(colsFor('grid', { w: 900, h: 400 }, 240)).toBe(3);
    // 折り返さない並べ方は列数を持たない
    expect(colsFor('coverflow', { w: 900, h: 400 }, LIST_CARD_WIDTH)).toBeUndefined();
    expect(colsFor('column', BOX, LIST_CARD_WIDTH)).toBeUndefined();
  });

  /**
   * ★ **折り返す魚眼は「入る枚数」で折り返さない。**
   *   端へ行くほど小さく写るのに並べる数が詰める格子と同じままなら、
   *   小さくなったぶんは**ただの余白**で、魚眼の甲斐がない（実測で踏んだ）。
   *   何枚入るかはレンズが面倒を見るので、こちらは**形**だけ決める。
   */
  it('折り返す魚眼の列数は**枚数と箱の形**から ── 箱の大きさでは変わらない', () => {
    const card = { w: LIST_CARD_WIDTH, h: CARD_H };
    const cols = (box: { w: number; h: number }, n = 16) =>
      colsFor('coverflowGrid', box, card.w, n, card.h);
    // 箱を半分にしても列は変わらない（小さくなったぶんはレンズが受け持つ）
    expect(cols({ w: 900, h: 400 })).toBe(3);
    expect(cols({ w: 450, h: 200 })).toBe(3);
    // 形には従う ── 横長なら列が増え、縦長なら行が増える
    expect(cols({ w: 1800, h: 400 })).toBe(5);
    expect(cols({ w: 900, h: 800 })).toBe(3);
    /**
     * ★ **奇数** ── 中心の 1 つが原寸で写る並べ方なので、中心が列と列のあいだに落ちてはいけない。
     *   偶数だと原寸の札が 1 枚も無くなり、いちばん外は縮みが重なって消える。
     */
    for (const box of [{ w: 900, h: 400 }, { w: 1800, h: 400 }, { w: 400, h: 900 }])
      for (const n of [4, 9, 16, 25, 40]) expect(cols(box, n) % 2).toBe(1);
    // 枚数が増えれば列も増える（四角に近い形を保つ）
    expect(cols({ w: 900, h: 400 }, 40)).toBeGreaterThan(cols({ w: 900, h: 400 }, 16));
  });

  it('格子は 2×2 が最低 ── 1 列ぶんしか無い箱でも 2 列にする（はみ出しは見切れる）', () => {
    expect(colsFor('grid', BOX, LIST_CARD_WIDTH)).toBe(GRID_MIN_SIDE);
    // 魚眼の格子は中心が要るので、いちばん小さい形は 3（2 では中心が無い）
    expect(colsFor('coverflowGrid', { w: 100, h: 400 }, LIST_CARD_WIDTH, 16, CARD_H)).toBe(3);
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

  /**
   * ★ **折り返す魚眼の刻みは「札 ＋ 素の隙間」。**
   *   並べ方に直した魚眼は「大きさ ＋ 隙間」の 2 つで歪みを言う。隙間を 0 にすると
   *   札が地続きの 1 枚に見えて、どこまでが 1 枚か読めない。素の隙間を置いておけば、
   *   中心では素のまま・端へ行くほどレンズが詰める ＝ 小さいもの同士ほどマージンが小さい。
   *   肩を出して重ねる（札より狭い刻み）のは横・縦の coverflow の語彙で、格子では階段に見える。
   */
  it('折り返す魚眼の刻みは**札 ＋ 素の隙間** ── 隙間もレンズで歪む', () => {
    const w = itemWidthFor('coverflowGrid', 900);
    expect(stepFor('coverflowGrid', { w, h: CARD_H })).toEqual({
      x: w + LENS_GRID_GAP,
      y: CARD_H + LENS_GRID_GAP,
    });
    // 肩を出して重ねるのは横・縦の coverflow だけ（札より狭い刻み）
    expect(stepFor('coverflow', { w, h: CARD_H })!.x).toBeLessThan(w);
    expect(stepFor('coverflowY', { w, h: CARD_H })!.y).toBeLessThan(CARD_H);
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

  /** 平らな 3 つは札と札のあいだに隙間を持つ（`LIST_GAP`）。箱にもそのぶんが要る */
  const gaps = (k: number) => Math.max(0, k - 1) * LIST_GAP;

  it('縦に並べる ── 幅は札 1 枚、高さは枚数ぶん（＋隙間・口の取り分）', () => {
    expect(fitBoxFor('column', 6, CARD, 0)).toEqual({ w: 308 + PAD2, h: 6 * 84 + gaps(6) + PAD2 });
    expect(fitBoxFor('column', 6, CARD, 52)).toEqual({ w: 308 + PAD2, h: 6 * 84 + gaps(6) + 52 + PAD2 });
  });

  it('横に並べる ── 縦と横が入れ替わるだけ', () => {
    expect(fitBoxFor('row', 4, CARD, 0)).toEqual({ w: 4 * 308 + gaps(4) + PAD2, h: 84 + PAD2 });
  });

  it('格子は四角に近い形から出す（箱がまだ無いので、箱からは数えない）', () => {
    // 6 枚 → 3 列 2 行
    expect(fitBoxFor('grid', 6, CARD, 0)).toEqual({
      w: 3 * 308 + gaps(3) + PAD2,
      h: 2 * 84 + gaps(2) + PAD2,
    });
    // 2 枚でも 2 列（格子の下限。`GRID_MIN_SIDE`）
    expect(fitBoxFor('grid', 2, CARD, 0)).toEqual({ w: 2 * 308 + gaps(2) + PAD2, h: 1 * 84 + PAD2 });
  });

  it('魚眼は**一回り小さい箱**になる ── そこではじめてレンズが働く', () => {
    const r = COVERFLOW_STEP_RATIO;
    expect(fitBoxFor('coverflowY', 6, CARD, 0)).toEqual({
      w: 308 + PAD2,
      h: 5 * (84 * r) + 84 + PAD2,                        // 縮めた刻み ×5 ＋ 札 1 枚
    });
    // 詰める並びより低い ＝ 端の何枚かにだけレンズが効く
    expect(fitBoxFor('coverflowY', 6, CARD, 0)!.h).toBeLessThan(fitBoxFor('column', 6, CARD, 0)!.h);
    expect(fitBoxFor('coverflow', 6, CARD, 0)!.w).toBeLessThan(fitBoxFor('row', 6, CARD, 0)!.w);
    // 折り返す魚眼も同じ ── **敷き詰まる刻み（札そのもの）とは別に**、箱は一回り小さい
    expect(fitBoxFor('coverflowGrid', 6, CARD, 0)!.w).toBeLessThan(fitBoxFor('grid', 6, CARD, 0)!.w);
  });

  /**
   * ★ **折り返す魚眼の箱は、枚数で変わらない。**
   *   全部が原寸で入る大きさにしては魚眼の意味が無く、際限なく小さくすると真ん中まで読めない。
   *   「中心 ＋ 上下左右がちょうど収まって、その外はチラ見え」がいちばん働く形。
   */
  it('折り返す魚眼の箱は「中心と上下左右の 3 列で 9 割」から決まる ── 枚数では変わらない', () => {
    const want = { w: 308 * LENS_GRID_BOX + PAD2, h: 84 * LENS_GRID_BOX + PAD2 };
    expect(fitBoxFor('coverflowGrid', 16, CARD, 0)).toEqual(want);
    expect(fitBoxFor('coverflowGrid', 40, CARD, 0)).toEqual(want);
    expect(fitBoxFor('coverflowGrid', 4, CARD, 0)).toEqual(want);
    // 画は tanh ── 3 列ぶん（札 1.5 枚）の像が、ちょうど箱の 9 割になる
    const H = (308 * LENS_GRID_BOX) / 2;
    expect(Math.tanh((1.5 * 308) / H)).toBeCloseTo(LENS_GRID_SHARE, 6);
  });

  it('透視は「手前の札 ＋ 奥へ逃げるぶん」── 刻みでは測れないので、細くする量ぶん見ておく', () => {
    expect(fitBoxFor('stackDepth', 6, CARD, 0)).toEqual({
      w: 308 + LIST_DEPTH_INSET + PAD2,
      h: 84 + LIST_DEPTH_INSET + PAD2,
    });
    // 枚数では変わらない（奥へ行くほど重なって、広がりは頭打ちになる）
    expect(fitBoxFor('stackDepth', 20, CARD, 0)).toEqual(fitBoxFor('stackDepth', 2, CARD, 0));
  });

  it('置ける広さで頭打ちにする ── 海より大きい箱は置けない', () => {
    const room = { w: 900, h: 800 };
    expect(fitBoxFor('row', 6, CARD, 0, room)).toEqual({ w: 900, h: 84 + PAD2 });
    // ただし札 1 枚は切らない（札より狭い箱を返しても仕方がない）
    expect(fitBoxFor('row', 6, CARD, 0, { w: 100, h: 800 })?.w).toBe(308);
  });
});
