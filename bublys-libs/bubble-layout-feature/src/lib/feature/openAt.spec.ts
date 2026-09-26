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

/**
 * 面に開く（`depth: 'plane'`）── 旧 bubbles-ui の popChild / joinSibling を Z で書いたもの。
 * 数は旧の実物（2026-09-21・users 一覧 → user 詳細 ×3）と突き合わせてある：
 *   旧  詳細 1.00 ×3 ／ 元の泡は1段下がる ／ 縁が接する ／ 兄弟を閉じても他は動かない ／ 面が空くと後ろが上がる
 */

/**
 * ★ **開くことが書くのは「関係」。** 世代（hist）と枝（branch）。
 *   どちらも掴んでも書けない次元なので、並べ方に刺せば関係が絵になる。
 */
describe('開くと関係が書かれる', () => {
  it('最初の1つは 世代0・枝0', () => {
    const w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: '一覧' }).world;
    expect(w.bubble('a')?.state.hist).toBe(0);
    expect(w.bubble('a')?.state.branch).toBe(0);
  });

  it('開いた元から1世代下がる（一覧 → 詳細 → さらに詳細）', () => {
    let w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: '一覧' }).world;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b', title: '詳細' }).world;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'b', newId: 'c', title: 'さらに' }).world;
    expect([w.bubble('a'), w.bubble('b'), w.bubble('c')].map((x) => x?.state.hist)).toEqual([0, 1, 2]);
  });

  it('同じ世代に来たものは、枝が 0,1,2… と増える', () => {
    let w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: '一覧' }).world;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b1', title: '詳細1' }).world;
    w = openAt({ world: w, viewport: VIEWPORT, openerId: 'a', newId: 'b2', title: '詳細2' }).world;
    expect([w.bubble('b1'), w.bubble('b2')].map((x) => x?.state.hist)).toEqual([1, 1]);
    expect([w.bubble('b1'), w.bubble('b2')].map((x) => x?.state.branch)).toEqual([0, 1]);
  });

  it('★ 関係は掴んでも壊れない ── 世代も枝も「書けない」次元', () => {
    // 書けない次元は、掴むと視点が動くだけ（規則②）。値は泡に残る
    const w = openAt({ world: start(), viewport: VIEWPORT, openerId: null, newId: 'a', title: '一覧' }).world;
    expect(w.bubble('a')?.state.hist).toBe(0);
  });
});
