/**
 * ③ 見えない親は、体を持たない。
 *
 * > 箱も、奥行きも、View も、自分のものは何ひとつ持たない。持っているのは並べ方ひとつだけ。
 *
 * ・箱はヘッダ 0・余白 0 で、どの並べ方でも中身ぴったり
 * ・Z は軸まるごと外の窓のもの（次元・並べ方・レンズ・焦点のぜんぶ）
 * ・View を選べない。軸セレクタもプリセットも外へたどった窓へ回る
 */
import { headOf, padOf, measureAll } from './measure.js';
import { METRICS } from './types.js';
import { resolveWorld } from './resolve.js';
import { presetView, viewOfSpace, withAxis, withPreset } from './view.js';
import { DEFAULT_RULES } from './rules.js';
import { labScene, placeOf, VIEWPORT } from './lab-scene.fixture.js';

const world = labScene();
const layout = resolveWorld(world, VIEWPORT);

describe('③ 見えない親は、体を持たない', () => {
  it('箱はヘッダ 0・余白 0（体のある泡は 24 と 14）', () => {
    expect(headOf(world, 'snap1')).toBe(0);
    expect(padOf(world, 'snap1')).toBe(0);
    expect(headOf(world, 'kinmu')).toBe(METRICS.HEADER);
    expect(padOf(world, 'kinmu')).toBe(METRICS.PAD);
  });

  it('★ どの並べ方でも中身ぴったり（付箋A 120 ＋ 付箋B 130 ＝ 250・高さは大きい方の 96）', () => {
    // ラボ実測：snap1 は x 660 / w 250 / h 96。付箋A の左の縁と、付箋B の右の縁にちょうど接する
    expect(measureAll(world, DEFAULT_RULES).get('snap1')).toEqual({ w: 250, h: 96 });
    expect(placeOf(layout, 'snap1').w).toBe(250);
    expect(placeOf(layout, 'snap1').h).toBe(96);
    expect(placeOf(layout, 'snap1').x).toBe(placeOf(layout, 'fA').x);
    expect(placeOf(layout, 'fB').x).toBe(placeOf(layout, 'fA').x + placeOf(layout, 'fA').w);   // 隙間 0
    expect(placeOf(layout, 'snap1').x + placeOf(layout, 'snap1').w)
      .toBe(placeOf(layout, 'fB').x + placeOf(layout, 'fB').w);
    expect(placeOf(layout, 'snap1').x).toBe(660);
  });

  it('★ Z は軸まるごと外の窓のもの（窓の Z を差し替えると、並びの中の泡もそのまま従う）', () => {
    expect(viewOfSpace(world, 'snap1').z).toEqual(presetView('free').z);
    expect(placeOf(layout, 'fA').scale).toBe(1);
    // 窓（外の空間）の Z を「重ねて置く（順序・等間隔・透視）」に差し替えると、並びの中の Z も入れ替わる
    const stacked = withPreset(world, 'stackZ', 'root');
    expect(viewOfSpace(stacked, 'snap1').z).toEqual(presetView('stackZ').z);
    // 見えない親は奥行きに置かれない（体が無い）ので、中の泡の奥行きは窓の焦点から測る
    expect(placeOf(resolveWorld(stacked, VIEWPORT), 'snap1').scale).toBe(1);
  });

  it('★ View を選べない ── 軸セレクタは外へたどった窓へ回る', () => {
    expect(world.windowOf('snap1')).toBe('root');
    const w = withAxis(world, 'snap1', 'x', { dim: 'free.x' });
    expect(w.bubble('snap1')?.state.view?.x.dim).toBe('order');      // 並びの View は変わらない
    expect(w.state.root.view.x.dim).toBe('free.x');                  // 外の窓が受け取った
    // プリセットも同じ（並びには当たらない）
    const w2 = withPreset(world, 'grid', 'snap1');
    expect(w2.bubble('snap1')?.state.view?.x.dim).toBe('order');
    expect(w2.state.root.view.x.dim).toBe('col');
  });

  it('★ 窓の View を8つのプリセットどれに差し替えても、並びの箱は中身ぴったり（250×96）', () => {
    // ラボ実測：`__lab.preset(name, "root")` を8つぜんぶ当てて `__lab.placements()` を読んだ
    const PRESET_IDS = ['free', 'row', 'column', 'grid', 'fisheyeX', 'coverflow', 'histZ', 'stackZ'] as const;
    for (const id of PRESET_IDS) {
      const w = withPreset(world, id, 'root');
      expect(measureAll(w, DEFAULT_RULES).get('snap1')).toEqual({ w: 250, h: 96 });
      const l = resolveWorld(w, VIEWPORT);
      // 左の縁は、いつも中身の左の縁
      expect(placeOf(l, 'snap1').x).toBeCloseTo(placeOf(l, 'fA').x, 9);
      if (id === 'stackZ') continue;
      // 縁が接する（隙間 0）
      expect(placeOf(l, 'fB').x - (placeOf(l, 'fA').x + placeOf(l, 'fA').w)).toBeCloseTo(0, 9);
      expect(placeOf(l, 'snap1').x + placeOf(l, 'snap1').w)
        .toBeCloseTo(placeOf(l, 'fB').x + placeOf(l, 'fB').w, 9);
    }
    // ★ 「重ねて置く」だけは縁が 4.5px 食い込む ── Z が 順序・等間隔なので、並びの中の2枚が別の面に乗るから
    //   （③ Z は軸まるごと窓のもの ＝ 窓が奥行きを散らせば、並びの中も散る）。ラボ実測 −4.504331087584205
    const st = resolveWorld(withPreset(world, 'stackZ', 'root'), VIEWPORT);
    expect(placeOf(st, 'fB').x - (placeOf(st, 'fA').x + placeOf(st, 'fA').w)).toBeCloseTo(-4.504331087584205, 9);
    expect(placeOf(st, 'fA').scale).not.toBe(placeOf(st, 'fB').scale);
  });

  it('見えない親は、見えている子がいるときだけ見える', () => {
    expect(placeOf(layout, 'snap1').vis).toBe(1);
    // 外の空間の焦点 Z を子より手前へ送ると、子が透視に消え、並びも消える
    const gone = resolveWorld(world.withFocus('root', { z: 1 }), VIEWPORT);
    expect(placeOf(gone, 'fA').vis).toBe(0);
    expect(placeOf(gone, 'fB').vis).toBe(0);
    expect(placeOf(gone, 'snap1').vis).toBe(0);
  });

  it('体のある泡は自前の大きさを持つ（そのままの軸では中身で伸びない）', () => {
    // 議事録は X・Y とも なし・そのまま。中身（版4つ）が居ても箱は自前の 300×310
    expect(measureAll(world, DEFAULT_RULES).get('giji')).toEqual({ w: 300, h: 310 });
  });
});
