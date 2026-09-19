/**
 * 開く ── 「この空間に、この泡の隣に」。
 *
 * ★ 本当の受け入れ条件は、本物のバブリの画面で動かす
 *   `docs/bubble-space-prototype/v5-dom/_check/bubly.mjs`（16件）。ここは式の見張り。
 */
import { METRICS, emptyWorld, presetView, resolveWorld, viewOfSpace } from '@bublys-org/bubble-layout';
import { openAt, hueOf } from './openAt.js';

const VIEWPORT = { w: 1440, h: 810 };
const start = () => emptyWorld(presetView('free'));

describe('隣に開く', () => {
  it('最初の1つは外の空間の真ん中に置く', () => {
    const r = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: '一覧' });
    expect(r.world.bubbles.length).toBe(1);
    expect(r.world.bubble('a')?.state.free).toEqual({ x: 0, y: 0, z: 0 });
    expect(r.world.bubble('a')?.state.parent).toBe(null);
  });

  it('★ 新しい泡は opener の兄弟（子ではない）', () => {
    let w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: '一覧' }).world;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b', title: '詳細' }).world;
    expect(w.bubble('b')?.state.parent).toBe(w.bubble('a')?.state.parent);
    expect(w.kidsOf('root').map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('opener のすぐ後ろの順序に入る', () => {
    let w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: 'a' }).world;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'c', title: 'c' }).world;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b', title: 'b' }).world;
    const order = w.kidsOf('root').slice().sort((p, q) => p.state.order - q.state.order).map((x) => x.id);
    expect(order).toEqual(['a', 'b', 'c']);   // a の直後に b が割り込む
  });

  it('★ 隙間は「くっつく距離」より広い（v6 で踏んだ）', () => {
    let w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: 'a',
                     size: { w: 300, h: 200 } }).world;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b', title: 'b',
                 size: { w: 300, h: 200 } }).world;
    const a = w.bubble('a'), b = w.bubble('b');
    if (!a || !b) throw new Error('泡がいない');
    const gap = (b.state.free.x - b.state.size.w / 2) - (a.state.free.x + a.state.size.w / 2);
    expect(gap).toBeGreaterThan(METRICS.SNAP_EDGE);
  });

  it('★ 横に開くと X のレンズが魚眼になる。次元は変えない', () => {
    let w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: 'a' }).world;
    expect(viewOfSpace(w, 'root').x.lens).toBe('parallel');
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b', title: 'b' }).world;
    expect(viewOfSpace(w, 'root').x.lens).toBe('fisheye');
    expect(viewOfSpace(w, 'root').x.dim).toBe('free.x');      // 次元はそのまま
  });

  it('★ 魚眼＋焦点で、opener が小さくなり、開いた泡が手前になる', () => {
    let w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: 'a',
                     size: { w: 340, h: 380 } }).world;
    const alone = resolveWorld(w, VIEWPORT).byId.get('a');
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b', title: 'b',
                 size: { w: 300, h: 260 } }).world;
    const L = resolveWorld(w, VIEWPORT);
    const a = L.byId.get('a'), b = L.byId.get('b');
    if (!alone || !a || !b) throw new Error('配置が無い');
    expect(a.scale).toBeLessThan(alone.scale);    // 一覧は小さくなる
    expect(b.scale).toBeGreaterThan(a.scale);     // 詳細のほうが大きい
    expect(b.x).toBeGreaterThan(a.x);             // 右に出る
  });

  it('開いたら、そこへ視点が寄る（泡の値は書かない）', () => {
    let w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: 'a' }).world;
    const before = w.bubble('a')?.state;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b', title: 'b' }).world;
    expect(w.bubble('a')?.state).toEqual(before);           // 元の泡は1つも変わらない
    expect(w.focusOf('root').x).not.toBe(0);                // 視点だけ動いた
  });

  it('色は id から。同じ url なら開き直しても同じ色', () => {
    expect(hueOf('csv-importer/sheets/s1')).toBe(hueOf('csv-importer/sheets/s1'));
    expect(hueOf('a')).not.toBe(hueOf('b'));
    expect(hueOf('なんでも')).toBeGreaterThanOrEqual(0);
    expect(hueOf('なんでも')).toBeLessThan(360);
  });
});
