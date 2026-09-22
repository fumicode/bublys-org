/**
 * 開く ── 「この空間に、この泡の隣に」。
 *
 * ★ 本当の受け入れ条件は、本物のバブリの画面で動かす
 *   `docs/bubble-space-prototype/v5-dom/_check/bubly.mjs`（16件）。ここは式の見張り。
 */
import { METRICS, emptyWorld, presetView, resolveWorld, viewOfSpace } from '@bublys-org/bubble-layout';
import { openAt, hueOf, settlePlaneAfterClose, PLANE_STEP } from './openAt.js';

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
describe('面に開く（旧の layers を Z で）', () => {
  const P = { viewport: VIEWPORT, depth: 'plane' as const };
  const list = () => openAt({ ...P, world: start(), openerId: null, newId: 'list', title: '一覧', size: { w: 340, h: 380 } }).world;
  const scaleOf = (w: ReturnType<typeof start>, id: string) => resolveWorld(w, VIEWPORT).byId.get(id)?.scale ?? NaN;

  it('★ 別の種類を開くと、元の泡は1段下がって 0.90、開いた泡は 1.00', () => {
    const w = openAt({ ...P, world: list(), openerId: 'list', newId: 'd1', title: '詳細', size: { w: 300, h: 260 } }).world;
    expect(scaleOf(w, 'list')).toBeCloseTo(0.9, 10);
    expect(scaleOf(w, 'd1')).toBeCloseTo(1, 10);
  });

  it('★ 元の泡の値は1つも書かない。X の魚眼も点けない。X・Y の焦点も動かない（画面が滑らない）', () => {
    const w0 = list();
    const before = w0.bubble('list')?.state;
    const w = openAt({ ...P, world: w0, openerId: 'list', newId: 'd1', title: '詳細' }).world;
    expect(w.bubble('list')?.state).toEqual(before);
    expect(viewOfSpace(w, 'root').x.lens).toBe('parallel');
    expect(w.focusOf('root').x).toBe(0);
    expect(w.focusOf('root').y).toBe(0);
    expect(w.focusOf('root').z).toBeCloseTo(-PLANE_STEP, 10);
  });

  it('★ 縁が接する ── 元の泡が「下がった後」の右辺に、測らずに置く（隙間 0px）', () => {
    const w = openAt({ ...P, world: list(), openerId: 'list', newId: 'd1', title: '詳細', size: { w: 300, h: 260 } }).world;
    const L = resolveWorld(w, VIEWPORT);
    const a = L.byId.get('list'), b = L.byId.get('d1');
    if (!a || !b) throw new Error('配置が無い');
    expect(b.x - (a.x + a.w)).toBeCloseTo(0, 6);
    expect(b.y).toBeCloseTo(a.y, 6);      // 上がそろう
  });

  it('★ 同じ種類を3つ開いても、全員 1.00 のまま（魚眼だと 0.755 まで落ちて一覧より小さくなった）', () => {
    let w = openAt({ ...P, world: list(), openerId: 'list', newId: 'd1', title: 'd1', size: { w: 300, h: 260 } }).world;
    w = openAt({ ...P, world: w, openerId: 'list', newId: 'd2', title: 'd2', size: { w: 300, h: 260 }, joinWith: 'd1' }).world;
    w = openAt({ ...P, world: w, openerId: 'list', newId: 'd3', title: 'd3', size: { w: 300, h: 260 }, joinWith: 'd2' }).world;
    for (const id of ['d1', 'd2', 'd3']) expect(scaleOf(w, id)).toBeCloseTo(1, 10);
    expect(scaleOf(w, 'list')).toBeCloseTo(0.9, 10);
    // 並びの中で縁が接している
    const L = resolveWorld(w, VIEWPORT);
    const [p1, p2, p3] = ['d1', 'd2', 'd3'].map((id) => L.byId.get(id));
    if (!p1 || !p2 || !p3) throw new Error('配置が無い');
    expect(p2.x - (p1.x + p1.w)).toBeCloseTo(0, 6);
    expect(p3.x - (p2.x + p2.w)).toBeCloseTo(0, 6);
  });

  it('★ 窓からはみ出したら、はみ出したぶんだけ視点を送る（真ん中へは寄せない）', () => {
    let w = openAt({ ...P, world: list(), openerId: 'list', newId: 'd1', title: 'd1', size: { w: 300, h: 260 } }).world;
    w = openAt({ ...P, world: w, openerId: 'list', newId: 'd2', title: 'd2', size: { w: 300, h: 260 }, joinWith: 'd1' }).world;
    expect(w.focusOf('root').x).not.toBe(0);                      // 2枚目で右へ溢れたので送った
    const L = resolveWorld(w, VIEWPORT);
    const d2 = L.byId.get('d2');
    if (!d2) throw new Error('配置が無い');
    expect(d2.x + d2.w).toBeCloseTo(VIEWPORT.w - 24, 6);          // 右の余白ちょうど。真ん中ではない
    expect(L.byId.get('list')?.scale).toBeCloseTo(0.9, 10);       // 奥行きは変わらない
  });

  it('並びの中の泡からさらに開くと、3段になる（1.00 / 0.90 / 0.818）', () => {
    let w = openAt({ ...P, world: list(), openerId: 'list', newId: 'd1', title: 'd1' }).world;
    w = openAt({ ...P, world: w, openerId: 'list', newId: 'd2', title: 'd2', joinWith: 'd1' }).world;
    w = openAt({ ...P, world: w, openerId: 'd2', newId: 'e1', title: 'e1' }).world;
    expect(w.bubble('e1')?.state.parent).toBe(null);          // 並びの中ではなく、窓に新しい面ができる
    expect(scaleOf(w, 'e1')).toBeCloseTo(1, 10);
    expect(scaleOf(w, 'd2')).toBeCloseTo(0.9, 10);
    expect(scaleOf(w, 'list')).toBeCloseTo(1 / (1 + 0.26 * 2 * PLANE_STEP), 10);   // 0.818…
  });

  it('★ 面が空になったら、後ろの面が上がってくる。まだ兄弟がいるなら動かない', () => {
    let w = openAt({ ...P, world: list(), openerId: 'list', newId: 'd1', title: 'd1' }).world;
    const two = openAt({ ...P, world: w, openerId: 'list', newId: 'd2', title: 'd2', joinWith: 'd1' }).world;
    // 兄弟が残る：焦点は動かない
    const kept = settlePlaneAfterClose(w, VIEWPORT, 'root');
    expect(kept.focusOf('root').z).toBe(w.focusOf('root').z);
    void two;
    // 面が空く：一覧が 1.00 に戻る
    w = settlePlaneAfterClose(w.without('d1'), VIEWPORT, 'root');
    expect(scaleOf(w, 'list')).toBeCloseTo(1, 10);
  });
});
