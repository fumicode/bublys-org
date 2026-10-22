/**
 * ② 操作は、軸と、何を掴んだかで決まる ── 泡をドラッグしたとき、値のどこへ書くか。
 *
 * | 軸の次元 | 泡をドラッグすると |
 * | 書ける（自由・順序・列/行） | その次元へ書く |
 * | 書けない（履歴）            | 視点が動く     |
 * | なし                        | 何も起きない   |
 *
 * ★ 入力（掴んだ点との相対・当たり判定）は ui の仕事。domain へは「泡の中心を画面のどこへ持っていきたいか」
 *   （want）まで噛み砕いて渡す。下の want は、ラボで本物のマウスを1歩だけ動かしたときの
 *   `mx − (fx − 0.5)·p.w`（lab.html 1186 行）をそのまま実測したもの。
 */
import { dragBubble, dragVerbsOf, wheelScroll, wheelZ, zoomedBy } from './drag.js';
import { resolveWorld } from './resolve.js';
import { presetView, viewOfSpace, withAxis, withPreset } from './view.js';
import type { PresetId } from './view.js';
import { DEFAULT_RULES, resolveRules } from './rules.js';
import { Bubble } from './bubble.js';
import { BubbleWorld } from './world.js';
import { labScene, placeOf, VIEWPORT } from './lab-scene.js';
import { METRICS } from './types.js';

/** 箱の真ん中を掴む（掴んだ点 ＝ 中心 ＝ 「中心をここへ」と同じ意味になる） */
const mid = (p: { box: { w: number; h: number } }) => ({ x: p.box.w / 2, y: p.box.h / 2 });

describe('② 泡をドラッグする', () => {
  it('★ 書き込む先は、その軸に刺さっている次元（free.x 決め打ちではない）', () => {
    // ラボ実測：外の空間の X に 自由Y・Y に 自由X を刺して、付箋C を (+90,+60) ドラッグした
    //   → 自由X 268 → 328（＝ 縦にドラッグした 60）／自由Y 225 → 315（＝ 横にドラッグした 90）と入れ替わる
    let w = withAxis(labScene(), 'root', 'x', { dim: 'free.y' });
    w = withAxis(w, 'root', 'y', { dim: 'free.x' });
    expect(dragVerbsOf(w, 'root')).toEqual({ x: 'coord', y: 'coord' });
    const layout = resolveWorld(w, VIEWPORT);
    const p = placeOf(layout, 'fC');
    expect(w.bubble('fC')?.state.free).toEqual({ x: 268, y: 225, z: 0 });
    const next = dragBubble(w, { layout, id: 'fC', space: 'root', pointer: { x: 1035, y: 732.75 }, grab: mid(p), m: p.m }, DEFAULT_RULES);
    expect(next.bubble('fC')?.state.free).toEqual({ x: 328, y: 315, z: 0 });
  });

  it('書けないなら視点が動く（X魚眼ビュー ＝ 履歴。泡ではなく空間の焦点に書く）', () => {
    // ラボ実測：版5 を横に 70px ドラッグしたら、X魚眼ビューの焦点 X が 0 → −110.48881297487148
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    expect(dragVerbsOf(w, 'fish')).toEqual({ x: 'focus', y: 'focus' });
    const p = placeOf(layout, 'v4');
    const before = w.bubble('v4')?.state;
    const next = dragBubble(
      w, { layout, id: 'v4', space: 'fish', pointer: { x: 388.4412856837971, y: 271.75 }, grab: mid(p), m: p.m }, DEFAULT_RULES,
    );
    /**
     * ★ **ラボとの違い（承知の上）。** ラボは −110.48881297487148。
     *
     *   ラボの逆写しは「中心1点の像」を戻すが、泡が写る所は**両端をレンズに通した間の中点**
     *   （`imageOf`）で、魚眼では別の点になる。ラボの数で焦点を動かすと、掴んだ点は
     *   **カーソルから 1.299px 外れる**（実測）。像の逆で戻すと **0.000px** ── 指の下に残る。
     *   ずれは歪むほど開くので、ここはラボに合わせない（`project.ts` の `unprojectBubble`）。
     */
    expect(next.bubble('fish')?.state.focus.x).toBe(-113.49667278006098);
    /**
     * ★ **ラボとの違い（承知の上）。** ラボは 0。
     *   この空間は枝（Y・平行・刻み 44）が 3 本で 132、箱の中身は 128 ── **4px はみ出している**。
     *   「収まらない並びは端より外へは行かない」の規則（`fitFocus`）で、縦に動けるのは
     *   その 4px だけ。掴んだ点を指の下に保つには 24.5px 動かす要るので、**端で止まる**。
     *   ラボにこの規則は無かった（はみ出しても中央ぞろえのままだった）。
     *
     * ★ 前は 2 だった（点の逆で戻していたぶん、狙いが手前になって途中で収まっていた）。
     *   像の逆にすると狙いは端より外になるので、動けるところまで ＝ 4。
     *   縦のずれは 25.368px → 24.521px と近づくが、**ここは止まり方（規則）で決まっていて、
     *   逆写しでは埋まらない**。
     */
    expect(next.bubble('fish')?.state.focus.y).toBe(4);
    // 泡そのものの値は1つも変わらない
    expect(next.bubble('v4')?.state).toEqual(before);
  });

  /**
   * ★ **掴んだ点はカーソルの下に残る ── 歪んでいても。**
   *
   * 泡を写す道は「① 泡の像（両端の間の中点）→ ② 曲がり → ③ 奥行き」の 3 段なので、
   * 逆写しも同じ 3 段を戻す（`unprojectBubble`）。点の逆（`unprojectLocal`）で戻していたころは、
   * ① と ② のぶんがそのままずれになり、**歪むほど開いていった**
   * （実測・海の魚眼X で右下へ 480px 動かしたとき 縦 −134.03px。両軸魚眼なら 横 −215.98px）。
   */
  it('★ 掴んだ泡は狙った所へ来る（魚眼でも、両軸が魚眼でも）', () => {
    const make = (both: boolean) => {
      let w = new BubbleWorld({
        bubbles: [
          Bubble.create({ id: 'a', title: 'a', w: 260, h: 180, free: { x: 0, y: 0 } }).state,
          Bubble.create({ id: 'b', title: 'b', w: 200, h: 140, free: { x: 300, y: 120 } }).state,
        ],
        root: { title: '海', view: presetView('free'), focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
        implicitSeq: 0,
      });
      w = withAxis(w, 'root', 'x', { lens: 'fisheye' });
      return both ? withAxis(w, 'root', 'y', { lens: 'fisheye' }) : w;
    };
    // ① 1 歩で置く：片方の軸だけ魚眼なら、その軸は**ぴたり**（像の逆が効いている所）
    {
      const w = make(false);
      const L = resolveWorld(w, VIEWPORT, DEFAULT_RULES);
      const p = L.byId.get('a');
      if (!p) throw new Error('no a');
      for (const dx of [40, 120, -90, 220]) {
        const want = { x: p.x + p.w / 2 + dx, y: p.y + p.h / 2 };
        const next = dragBubble(w, { layout: L, id: 'a', space: 'root', pointer: want, grab: mid(p), m: p.m }, DEFAULT_RULES);
        const q = resolveWorld(next, VIEWPORT, DEFAULT_RULES).byId.get('a');
        if (!q) throw new Error('gone');
        expect(q.x + q.w / 2).toBeCloseTo(want.x, 9);
      }
    }
    /**
     * ② 本物のドラッグ（4px ずつ動かして、そのたびに解き直す）。
     *   箱の (0.8, 0.75) を掴んで、右下へ 160px。
     *
     *   残るのは**軸どうしの絡み**（x を動かすと相手の軸の曲がりも変わる）と、
     *   **箱の大きさが変わるぶん**の 1 フレーム遅れだけ。刻みに比例して小さくなる
     *   （実測・320px 動かしたとき：8px 刻み 3.09px → 4px 刻み 1.57px）。
     *   点の逆で戻していたころは、同じ道で**縦に 134.03px** ずれていた。
     */
    for (const both of [false, true]) {
      let w = make(both);
      let L = resolveWorld(w, VIEWPORT, DEFAULT_RULES);
      let p = L.byId.get('a');
      if (!p) throw new Error('no a');
      let mx = p.x + 0.8 * p.w;
      let my = p.y + 0.75 * p.h;
      for (let i = 0; i < 40; i++) {
        mx += 4;
        my += 2;
        const want = { x: mx - 0.3 * p.w, y: my - 0.25 * p.h };
        w = dragBubble(w, { layout: L, id: 'a', space: 'root', pointer: want, grab: mid(p), m: p.m }, DEFAULT_RULES);
        L = resolveWorld(w, VIEWPORT, DEFAULT_RULES);
        p = L.byId.get('a');
        if (!p) throw new Error('gone');
      }
      // 掴んだ点（0.8, 0.75）は、指の下に残っている
      expect(Math.abs(p.x + 0.8 * p.w - mx)).toBeLessThan(1.2);
      expect(Math.abs(p.y + 0.75 * p.h - my)).toBeLessThan(1.2);
    }
  });

  /**
   * ★ **掴んだ点は、泡の自前の座標で持つ。**
   *
   *   前は「箱に対する割合」で持ち、ui が**描かれた箱**から中心を引いて渡していた。
   *   魚眼では描かれる箱が動くたびに縮むので、「箱の 4% の所」は 1 フレーム前とは
   *   別の点を指す ── 指を 1px 動かすたびに掴んだ点がずれていた（実測 0.469px）。
   *   ずれは**中心からどれだけ離れて掴んだか**にきれいに比例していた（真ん中なら 0）:
   *
   *     掴んだ所 0.5(真ん中) 0.35   0.25   0.1    0.04
   *     揺れ     0.00        0.21   0.32   0.44   0.47  （px）
   *
   *   自前の大きさはドラッグ中 1px も変わらないので、そちらで持てば物差しが伸び縮みしない。
   *   置く所と倍率が互いに決まるぶんは、`dragBubble` が落ち着くまで当て直す。
   */
  it('★ どこを掴んでも、掴んだ点が指の下に残る（箱が縮んでも）', () => {
    const rules = resolveRules({ sizeCombine: 'hypot' });
    const VP = { w: 1440, h: 900 };
    for (const fy of [0.5, 0.25, 0.04] as const) {
      let w = new BubbleWorld({
        bubbles: [Bubble.create({ id: 'a', title: 'a', w: 420, h: 474, free: { x: 0, y: 0 } }).state],
        root: { title: '海', view: presetView('free'), focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
        implicitSeq: 0,
      });
      w = withAxis(withAxis(w, 'root', 'x', { lens: 'fisheye' }), 'root', 'y', { lens: 'fisheye' });
      let L = resolveWorld(w, VP, rules);
      const first = L.byId.get('a');
      if (!first) throw new Error('no a');
      let p = first;
      /** 掴んだ点 ── 箱の上の帯（0.04）から真ん中まで。**自前の座標**なので変わらない */
      const grab = { x: 0.5 * p.box.w, y: fy * p.box.h };
      let mx = p.x + 0.5 * p.w;
      let my = p.y + fy * p.h;
      const step = (cx: number, cy: number) => {
        w = dragBubble(w, { layout: L, id: 'a', space: 'root', pointer: { x: cx, y: cy }, grab, m: p.m }, rules);
        L = resolveWorld(w, VP, rules);
        const q = L.byId.get('a');
        if (!q) throw new Error('gone');
        p = q;
      };
      // 隅へ 400px 引く（箱は 474 → 280 ほどに縮む）
      for (let i = 0; i < 80; i++) { mx += 5; my += 3; step(mx, my); }
      expect(p.scale).toBeLessThan(0.7);                       // 本当に縮んでいる
      expect(Math.abs(p.y + fy * p.h - my)).toBeLessThan(0.2); // 掴んだ点は指の下
      // そこで指を ±1px 揺らしても、掴んだ点は指から離れない（前は 0.47px 跳ねていた）
      for (const d of [1, -1, 1, -1]) {
        step(mx + d, my + d);
        expect(Math.abs(p.x + 0.5 * p.w - (mx + d))).toBeLessThan(0.05);
        expect(Math.abs(p.y + fy * p.h - (my + d))).toBeLessThan(0.05);
      }
    }
  });

  /**
   * ★ **自由に置く空間では曲がらない ── だから震えない。**
   *
   *   曲がり（`bend`）は「隣とぴたり接する」ためのもので、相手の軸で決まる。自由に置く海では
   *   接する相手が居ないのに掛かっていたので、掴んで斜めに動かすと x と y が互いを揺らし、
   *   **指を 1px 動かすと泡の中心が ±12px 跳ねて**いた（実測）。
   *   曲げなければ軸ごとに独立して写るので、**指と 1 : 1**。
   */
  it('★ 隅の近くでも震えない ── 指を 1px 動かしたら、泡も 1px', () => {
    const rules = resolveRules({ sizeCombine: 'hypot' });
    let w = new BubbleWorld({
      bubbles: [Bubble.create({ id: 'a', title: 'a', w: 300, h: 200, free: { x: 0, y: 0 } }).state],
      root: { title: '海', view: presetView('free'), focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
      implicitSeq: 0,
    });
    w = withAxis(withAxis(w, 'root', 'x', { lens: 'fisheye' }), 'root', 'y', { lens: 'fisheye' });
    const VP = { w: 1440, h: 900 };
    let L = resolveWorld(w, VP, rules);
    let p = L.byId.get('a');
    if (!p) throw new Error('no a');
    // 隅へ向けて 360px 引く（4px 刻み）。ずっと指の下に居る
    let mx = p.x + p.w / 2;
    let my = p.y + p.h / 2;
    for (let i = 0; i < 90; i++) {
      mx += 4; my += 2.5;
      w = dragBubble(w, { layout: L, id: 'a', space: 'root', pointer: { x: mx, y: my }, grab: mid(p), m: p.m }, rules);
      L = resolveWorld(w, VP, rules);
      p = L.byId.get('a');
      if (!p) throw new Error('gone');
      expect(p.x + p.w / 2).toBeCloseTo(mx, 6);      // 途中の 1 歩も外さない
      expect(p.y + p.h / 2).toBeCloseTo(my, 6);
    }
    expect(p.scale).toBeGreaterThan(0.3);            // 隅でも潰れきっていない（飛んでいない）
    // ここで指を ±1px 揺らす ── 泡も ±1px（跳ねない）
    let last = p.x + p.w / 2;
    for (const d of [1, -1, 1, -1, 1, -1]) {
      w = dragBubble(w, { layout: L, id: 'a', space: 'root', pointer: { x: mx + d, y: my }, grab: mid(p), m: p.m }, rules);
      L = resolveWorld(w, VP, rules);
      p = L.byId.get('a');
      if (!p) throw new Error('gone');
      const now = p.x + p.w / 2;
      expect(Math.abs(now - (mx + d))).toBeLessThan(1e-6);   // 指の下
      expect(Math.abs(now - last)).toBeLessThanOrEqual(2.000001);  // 跳ねない（前は ±12px）
      last = now;
    }
  });

  /**
   * ★ **曲がるのは「刻みで並ぶ空間」だけ。**
   *   格子（`coverflowGrid` ＝ equal × equal）では隣どうしがぴたり接するために曲がりが要る。
   *   自由に置く海（as-is × as-is）では、接する相手が居ないので曲げない。
   */
  it('★ 曲がるのは刻みで並ぶ空間だけ（自由に置く海は曲がらない）', () => {
    const rules = resolveRules({ sizeCombine: 'hypot' });
    const VP = { w: 1440, h: 900 };
    const bubbles = [
      Bubble.create({ id: 'a', title: 'a', w: 200, h: 120, free: { x: 400, y: 260 }, cell: { col: 1, row: 1 } }).state,
      Bubble.create({ id: 'b', title: 'b', w: 200, h: 120, free: { x: 0, y: 0 }, cell: { col: 0, row: 0 } }).state,
    ];
    const make = (preset: 'free' | 'coverflowGrid') => {
      const w0 = new BubbleWorld({
        bubbles, root: { title: '外', view: presetView(preset), focus: { x: 0, y: 0, z: 0 }, zoom: 1 }, implicitSeq: 0,
      });
      return preset === 'free'
        ? withAxis(withAxis(w0, 'root', 'x', { lens: 'fisheye' }), 'root', 'y', { lens: 'fisheye' })
        : w0;
    };
    const freeA = resolveWorld(make('free'), VP, rules).byId.get('a');
    const gridA = resolveWorld(make('coverflowGrid'), VP, rules).byId.get('a');
    if (!freeA || !gridA) throw new Error('no a');
    expect(freeA.bend).toEqual({ x: 1, y: 1 });          // 自由：曲がらない
    expect(gridA.bend.x).toBeLessThan(1);                // 格子：曲がる
    expect(gridA.bend.y).toBeLessThan(1);
  });

  /**
   * ★ **届かない所へは動かさない。**
   *   魚眼は無限を箱に畳むので、箱の端より外の像はどんな位置にも対応しない。
   *   無理に解くと答えが挟んだ端（±14H）に張り付き、**泡が海の外へ飛んで二度と掴めなくなる**
   *   （実測：両軸魚眼で右下へ動かすと、位置が 723 → 8960 に跳んで消失点へ潰れた）。
   */
  it('★ 届かない所へは動かさない（端で止まる。内へ戻せばまた付いてくる）', () => {
    const rules = DEFAULT_RULES;
    let w = new BubbleWorld({
      bubbles: [Bubble.create({ id: 'a', title: 'a', w: 260, h: 180, free: { x: 0, y: 0 } }).state],
      root: { title: '海', view: presetView('free'), focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
      implicitSeq: 0,
    });
    w = withAxis(withAxis(w, 'root', 'x', { lens: 'fisheye' }), 'root', 'y', { lens: 'fisheye' });
    const L = resolveWorld(w, VIEWPORT, rules);
    const p = L.byId.get('a');
    if (!p) throw new Error('no a');
    // 箱のはるか外（届かない）を狙う
    const far = dragBubble(
      w, { layout: L, id: 'a', space: 'root', pointer: { x: p.x + p.w / 2 + 5000, y: p.y + p.h / 2 }, grab: mid(p), m: p.m }, rules,
    );
    expect(far.bubble('a')?.state.free.x).toBe(0);            // 動かない（飛ばない）
    // 届く所なら、ちゃんと動く
    const near = dragBubble(
      w, { layout: L, id: 'a', space: 'root', pointer: { x: p.x + p.w / 2 + 100, y: p.y + p.h / 2 }, grab: mid(p), m: p.m }, rules,
    );
    expect(near.bubble('a')?.state.free.x).toBeGreaterThan(90);
  });

  it('なしなら何も起きない（議事録 ＝ X・Y とも なし）', () => {
    // ラボ実測：確定 を (+70,+40) ドラッグしても、値も焦点も動かない
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    expect(dragVerbsOf(w, 'giji')).toEqual({ x: 'none', y: 'none' });
    const p = placeOf(layout, 'g3');
    const next = dragBubble(
      w, { layout, id: 'g3', space: 'giji', pointer: { x: 280, y: 610.75 }, grab: mid(p), m: p.m }, DEFAULT_RULES,
    );
    expect(next.bubble('g3')?.state).toEqual(w.bubble('g3')?.state);
    expect(next.bubble('giji')?.state.focus).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('並べ替え・マス移動はドラッグしているあいだ書かない（離したときに確定する）', () => {
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    expect(dragVerbsOf(w, 'row')).toEqual({ x: 'reorder', y: 'none' });
    expect(dragVerbsOf(w, 'cal')).toEqual({ x: 'cell', y: 'cell' });
    const p = placeOf(layout, 'row0');
    const next = dragBubble(w, { layout, id: 'row0', space: 'row', pointer: { x: p.x + 200, y: p.y }, grab: mid(p), m: p.m }, DEFAULT_RULES);
    expect(next.kidsOf('row').map((b) => [b.id, b.state.order])).toEqual([['row0', 0], ['row1', 1], ['row2', 2]]);
  });
});

/**
 * **スクロールとズームは別の操作。**
 *
 * | 手 | 動くもの | 止まるところ |
 * |---|---|---|
 * | 背景をドラッグ | 海の平行移動（X・Y の焦点） | 約束(1)(2) |
 * | ホイール | **海の奥行き**（Z の焦点 ＝ 画面1） | 泡のいる範囲 |
 * | ピンチ（⌘/Ctrl ＋ ホイール） | **画面2の寄り** | **無い** |
 *
 * ★ ラボもホイールは奥行きだけだった（lab.html 1638-1646 行。ズームは無い）。
 *   一度ホイールに「奥行きで動けなかったぶんは寄りへ」を足したが、**奥行きを繰ろうとしただけで
 *   画面ごと寄ってしまう**。混ぜない。
 */
describe('ホイールは海の奥行き（画面1）、ズームは画面2', () => {
  const VP = { w: 1466, h: 974 };
  /** 縦に積んでいった海（外の空間の既定 ＝ 自由に置く。泡は全部 z 0） */
  const sea = (n: number, lens: 'parallel' | 'fisheye' = 'parallel'): BubbleWorld => {
    const bs = [];
    for (let i = 0; i < n; i++)
      bs.push(Bubble.create({ id: 'b' + i, title: 'b' + i, w: 420, h: 520, order: i,
                              free: { x: 0, y: (i - (n - 1) / 2) * 534 } }));
    const v = presetView('free');
    return new BubbleWorld({
      bubbles: bs.map((x) => x.state),
      root: { title: '外', view: { ...v, y: { ...v.y, lens } }, focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
      implicitSeq: 0,
    });
  };
  const scaleOf = (w: BubbleWorld, id = 'b2') => resolveWorld(w, VP).byId.get(id)!.scale;
  /** ホイールを n 刻み（画面1 ＝ 海の奥行き） */
  const wheel = (w0: BubbleWorld, space: string, dir: 1 | -1, n: number): BubbleWorld => {
    let w = w0;
    for (let i = 0; i < n; i++) w = wheelZ(w, resolveWorld(w, VP), space, dir * 100, DEFAULT_RULES);
    return w;
  };
  /**
   * ピンチを n 刻み（画面2 ＝ 寄り）。海は1ミリも触らない。
   * `dir` は**手の向き**：`'open'` が開く（＝ `deltaY` が負）＝ **拡大**
   */
  const pinch = (w0: BubbleWorld, dir: 'open' | 'close', n: number): BubbleWorld => {
    let z = w0.zoom;
    for (let i = 0; i < n; i++) z = zoomedBy(z, (dir === 'open' ? -1 : 1) * 100);
    return w0.withZoom(z);
  };
  const r3 = (ns: number[]) => ns.map((n) => Number(n.toFixed(3)));

  describe('ホイール ── 海の奥行き', () => {
    it('★ 面が1つしかない空間では何も起きない（海の泡はふつう全部 z 0）', () => {
      // ★ 手前の端は**先頭の泡の面**。海の泡は全部 z 0 なので、面は 1 つ ＝ 行き先が無い。
      //   「もっと大きく／小さく見たい」はピンチ（画面2）の仕事で、ここは面を繰る所。
      const w = sea(5);
      expect(r3([1, 2, 3, 4].map((n) => scaleOf(wheel(w, 'root', -1, n))))).toEqual([1, 1, 1, 1]);
      expect(r3([1, 2, 3, 4].map((n) => scaleOf(wheel(w, 'root', +1, n))))).toEqual([1, 1, 1, 1]);
      expect(wheel(w, 'root', -1, 3).focusOf('root').z).toBe(0);
      expect(wheel(w, 'root', -1, 3).zoom).toBe(1);                 // 画面2 には1ミリも漏れない
    });

    it('★ 手前の端は「先頭の泡の面」── 先頭が1番目の位置で止まる', () => {
      // ★ ラボは 1 段向こう（min(ps) − 1）まで退いていた。だと先頭を出そうとしたときに
      //   **先頭が 2 番目の位置に来て**しまう。端は 1 つにして、越えようとしたことは
      //   跳ね返り（焦点を一瞬だけ端の向こうへ出して戻す。ui の onOverscroll）で知らせる
      const st = withPreset(sea(5), 'stackDepth', 'root');
      const z = (w: BubbleWorld) => w.focusOf('root').z;
      const deep = wheel(st, 'root', +1, 3);
      expect(z(deep)).toBe(3);
      expect(z(wheel(deep, 'root', -1, 9))).toBe(0);                // 先頭の面で止まる
      expect(z(wheel(st, 'root', -1, 5))).toBe(0);                  // そこから回し続けても動かない
    });

    it('★ Z が「なし」の並べ方では何も起きない（ラボと同じ）', () => {
      const col = withPreset(sea(5), 'column', 'root');
      expect(col.state.root.view.z.dim).toBe('none');
      const after = wheel(col, 'root', -1, 5);
      expect(after).toBe(col);                                       // 世界ごと同じ（書いていない）
    });

    it('★ 奥行きのある空間では、面を1枚ずつ繰る（重ねて置く）', () => {
      const st = withPreset(sea(5), 'stackZ', 'root');
      const seen = [0, 1, 2, 3].map((n) => wheel(st, 'root', +1, n).focusOf('root').z);
      expect(r3(seen)).toEqual([0, 0.15, 0.3, 0.45]);                // 刻みは View が持つ（0.15）
    });
  });

  describe('ズーム ── 画面2', () => {
    it('★ **開く動作が拡大**（どこでもそうなっているので、ここだけ逆にしない）', () => {
      const w = sea(5);
      expect(scaleOf(pinch(w, 'open', 1))).toBeGreaterThan(1);
      expect(scaleOf(pinch(w, 'close', 1))).toBeLessThan(1);
    });

    it('★ 上限が無い ── 何回でも寄れるし、何回でも引ける', () => {
      // ★ 画面の縁が何かの面に当たる、というのは模型の都合であって、見る側の話ではない
      const w = sea(5);
      expect(r3([1, 2, 3, 4, 5, 6, 7, 8].map((n) => scaleOf(pinch(w, 'open', n)))))
        .toEqual([1.26, 1.588, 2.0, 2.52, 3.176, 4.002, 5.042, 6.353]);
      expect(r3([1, 2, 3, 4, 5, 6, 7, 8].map((n) => scaleOf(pinch(w, 'close', n)))))
        .toEqual([0.794, 0.63, 0.5, 0.397, 0.315, 0.25, 0.198, 0.157]);
    });

    it('★ 1刻みはいつも同じ比（1 + K_PERSP ＝ 1.26）', () => {
      const out = [1, 2, 3, 4].map((n) => scaleOf(pinch(sea(5), 'close', n)));
      for (let i = 1; i < out.length; i++) expect(out[i - 1] / out[i]).toBeCloseTo(1.26, 6);
      expect(1 / out[0]).toBeCloseTo(1.26, 6);
    });

    it('★ 行って戻ったら、ぴったり元に戻る', () => {
      const w = pinch(pinch(sea(5), 'open', 5), 'close', 5);
      expect(w.zoom).toBeCloseTo(1, 12);
      expect(scaleOf(w)).toBeCloseTo(1, 12);
    });

    it('★ 海は1ミリも動かない ── 焦点も泡の値も書かない', () => {
      const w = sea(3);
      const z = pinch(w, 'open', 4);
      expect(z.bubbles.map((b) => b.state)).toEqual(w.bubbles.map((b) => b.state));
      expect(z.focusOf('root')).toEqual(w.focusOf('root'));
    });

    it('★ 魚眼が掛かっていても、寄り方は同じ ── 画面1（レンズの効き方）は1ミリも動かない', () => {
      const w = sea(5, 'fisheye');
      const before = resolveWorld(w, VP);
      expect(new Set(r3(['b0', 'b1', 'b2', 'b3', 'b4'].map((id) => before.byId.get(id)!.scale))).size)
        .toBeGreaterThan(1);                                         // 魚眼なので倍率はばらばら
      const after = resolveWorld(pinch(w, 'open', 3), VP);
      // 泡どうしの比は変わらない ＝ 魚眼の形はそのまま、画面2が丸ごと大きくなっただけ
      for (const id of ['b0', 'b1', 'b3', 'b4'])
        expect(after.byId.get(id)!.scale / after.byId.get('b2')!.scale)
          .toBeCloseTo(before.byId.get(id)!.scale / before.byId.get('b2')!.scale, 9);
    });

    it('★ 窓の中身は窓から溢れない ── 寄るのは画面2（窓ごと大きくなる）', () => {
      const bs = [
        Bubble.create({ id: 'win', title: '窓', w: 400, h: 300, order: 0, free: { x: 0, y: 0 },
                        view: presetView('column') }),
        ...[0, 1, 2].map((i) => Bubble.create({ id: 'k' + i, title: 'k' + i, w: 120, h: 60, parent: 'win', order: i })),
      ];
      const w0 = new BubbleWorld({
        bubbles: bs.map((x) => x.state),
        root: { title: '外', view: presetView('free'), focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
        implicitSeq: 0,
      });
      const before = resolveWorld(w0, VP);
      const w = pinch(w0, 'open', 4);
      const after = resolveWorld(w, VP);
      expect(w.zoom).toBeCloseTo(Math.pow(1.26, 4), 9);
      // 窓も中身も**同じ倍率**で大きくなる ＝ 中身は窓の中に居たまま
      const grew = after.byId.get('win')!.scale / before.byId.get('win')!.scale;
      expect(grew).toBeCloseTo(w.zoom, 9);
      for (const id of ['k0', 'k1', 'k2'])
        expect(after.byId.get(id)!.scale / before.byId.get(id)!.scale).toBeCloseTo(grew, 9);
      const inside = (l: typeof before) => {
        const p = l.byId.get('win')!;
        return ['k0', 'k1', 'k2'].every((id) => {
          const q = l.byId.get(id)!;
          return q.x >= p.x - 0.5 && q.x + q.w <= p.x + p.w + 0.5;
        });
      };
      expect(inside(before)).toBe(true);
      expect(inside(after)).toBe(true);
    });
  });
});

/**
 * **魚眼は二本指で繰る。**
 *
 * 魚眼はレンズが tanh でぜんぶ箱に収めてしまうので、「収まらないから送る」は起きない。
 * それでも二本指を受けるのは、動かしているのが**どの札が真ん中に来るか**だから。
 * 送る量は px ではなく **1 刻み ＝ 札 1 枚**（奥行きを繰るのと同じ換算）。
 */
describe('魚眼をホイール（二本指）で繰る', () => {
  const VP = { w: 1466, h: 974 };
  /** 順序を刺した泡を n 枚。並べ方は preset に任せる */
  const list = (n: number, preset: 'coverflow' | 'coverflowY'): BubbleWorld => {
    const bs = [];
    for (let i = 0; i < n; i++)
      bs.push(Bubble.create({ id: 'b' + i, title: 'b' + i, w: 300, h: 84, order: i }));
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
  const send = (w: BubbleWorld, d: { x: number; y: number }): BubbleWorld =>
    wheelScroll(w, resolveWorld(w, VP), 'root', d, DEFAULT_RULES) ?? w;

  it('縦の魚眼は、二本指の縦の量で繰る ── 1 刻み ＝ 札 1 枚', () => {
    const w = list(8, 'coverflowY');
    const step = viewOfSpace(w, 'root').y.step;
    expect(send(w, { x: 0, y: 100 }).focusOf('root').y).toBeCloseTo(step);
    // 半分だけ撫でたら半分だけ繰れる（トラックパッドは細かい量で何度も来る）
    expect(send(w, { x: 0, y: 50 }).focusOf('root').y).toBeCloseTo(step / 2);
    // 逆向きにも同じだけ繰れる（焦点 0 は真ん中の札。先頭はその手前にいる）
    expect(send(w, { x: 0, y: -100 }).focusOf('root').y).toBeCloseTo(-step);
    /**
     * ★ どこまでも繰れはしない ── 約束(1)「見ている所には泡がある」で、
     *   端は**先頭の札の場所**（8 枚・真ん中が 0 なら −3.5 枚ぶん）。
     */
    let back = w;
    for (let i = 0; i < 20; i++) back = send(back, { x: 0, y: -100 });
    expect(back.focusOf('root').y).toBeCloseTo(-3.5 * step);
  });

  it('横の魚眼は横の量で繰る。横の量が無ければ縦の量で代用する（ふつうのマウスのため）', () => {
    const w = list(8, 'coverflow');
    const step = viewOfSpace(w, 'root').x.step;
    expect(send(w, { x: 100, y: 0 }).focusOf('root').x).toBeCloseTo(step);
    expect(send(w, { x: 0, y: 100 }).focusOf('root').x).toBeCloseTo(step);
    expect(send(w, { x: 0, y: 100 }).focusOf('root').y).toBe(0);     // 縦は なし なので動かない
  });

  it('魚眼でない並び（透視）は、ここでは受けない ── ホイールは奥行きを繰る', () => {
    const w = withPreset(list(8, 'coverflowY'), 'stackDepth', 'root');
    expect(wheelScroll(w, resolveWorld(w, VP), 'root', { x: 0, y: 100 }, DEFAULT_RULES)).toBeNull();
  });
});

/**
 * **見切れている向きへ送る。**
 *
 * 次元が刺さっていない軸（縦の一覧の横、横の一覧の縦）は、これまで焦点が 0 に釘付けだった。
 * 「置き所が無い」は「見えなくていい」ではない ── 札のほうが箱より大きいときは、
 * はみ出したぶんだけは見に行ける。その向きには並びの操作がもともと無いので、喧嘩もしない。
 */
describe('並べていない向きでも、見切れていれば送れる', () => {
  const VP = { w: 1466, h: 974 };
  const list = (n: number, card: { w: number; h: number }, preset: PresetId): BubbleWorld => {
    const bs = [];
    for (let i = 0; i < n; i++)
      bs.push(Bubble.create({ id: 'b' + i, title: 'b' + i, w: card.w, h: card.h, order: i }));
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
  const send = (w: BubbleWorld, d: { x: number; y: number }): BubbleWorld =>
    wheelScroll(w, resolveWorld(w, VP), 'root', d, DEFAULT_RULES) ?? w;

  it('縦の一覧で札が横にはみ出していたら、横へ送れる', () => {
    const w = list(3, { w: 2000, h: 84 }, 'column');   // 箱（1466）より広い札
    expect(send(w, { x: 120, y: 0 }).focusOf('root').x).toBeCloseTo(120);
    expect(send(w, { x: -120, y: 0 }).focusOf('root').x).toBeCloseTo(-120);
  });

  it('入っているなら 0 のまま ── もとの約束どおり動かない', () => {
    const w = list(3, { w: 300, h: 84 }, 'column');
    expect(send(w, { x: 120, y: 0 }).focusOf('root').x).toBe(0);
  });

  it('横の一覧で札が縦にはみ出していたら、縦へ送れる', () => {
    const w = list(3, { w: 300, h: 1200 }, 'row');     // 箱（974）より高い札
    expect(send(w, { x: 0, y: 120 }).focusOf('root').y).toBeCloseTo(120);
  });

  it('縦の魚眼で横に見切れていたら、横へ送れる（魚眼は縦のまま）', () => {
    const w = list(6, { w: 2000, h: 84 }, 'coverflowY');
    const next = send(w, { x: 120, y: 0 });
    expect(next.focusOf('root').x).toBeCloseTo(120);
    expect(next.focusOf('root').y).toBe(0);            // 魚眼は動かない
  });

  it('透視（そのまま置く）は動かない ── 置き所が無い軸は送らない', () => {
    const w = list(3, { w: 2000, h: 84 }, 'stackDepth');
    expect(wheelScroll(w, resolveWorld(w, VP), 'root', { x: 120, y: 0 }, DEFAULT_RULES)).toBeNull();
  });

  it('横の魚眼で縦に見切れていたら、縦の量は**縦へ**行く（魚眼を繰るのに横取りしない）', () => {
    const w = list(6, { w: 300, h: 1200 }, 'coverflow');
    const next = send(w, { x: 0, y: 120 });
    expect(next.focusOf('root').y).toBeCloseTo(120);
    expect(next.focusOf('root').x).toBe(0);            // 魚眼は動かない
    // 横の量なら、これまでどおり魚眼を繰る
    expect(send(w, { x: 100, y: 0 }).focusOf('root').x).not.toBe(0);
  });

describe('★ 透視 ── 並びぜんぶを空間の中央にそろえる', () => {
  const VP2 = { w: 1000, h: 800 };
  /** 同じ大きさの泡を n 枚、奥行きに重ねた海 */
  const stack = (n: number): BubbleWorld => {
    const bs = [];
    for (let i = 0; i < n; i++)
      bs.push(Bubble.create({ id: 'b' + i, title: 'b' + i, w: 300, h: 100, order: i }));
    return withPreset(
      new BubbleWorld({
        bubbles: bs.map((x) => x.state),
        root: { title: '外', view: presetView('free'), focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
        implicitSeq: 0,
      }),
      'stackDepth',
      'root',
    );
  };
  /** 並びが占めている上端・下端（いちばん奥の遠い縁 〜 手前の近い縁） */
  const span = (n: number) => {
    const l = resolveWorld(stack(n), VP2);
    const ps = [...l.byId.values()];
    return { top: Math.min(...ps.map((p) => p.y)), bottom: Math.max(...ps.map((p) => p.y + p.h)) };
  };

  it('1 枚なら動かない ── 逃げていないのだから寄せる理由が無い', () => {
    const s = span(1);
    expect(Math.round((s.top + s.bottom) / 2)).toBe(VP2.h / 2);
    // 丈は泡そのもの（中身 100 ＋ 帯 24）── 奥へ逃げたぶんは無い
    expect(Math.round(s.bottom - s.top)).toBe(100 + METRICS.HEADER);
  });

  it('重なっていれば、手前の泡の下の余りが上の余りと同じになる', () => {
    const s = span(8);
    // 並びの真ん中が空間の中心（＝ 上の余りと下の余りが同じ）
    expect(Math.abs((s.top + s.bottom) / 2 - VP2.h / 2)).toBeLessThan(1);
    // 手前の泡は中心より下にいる（＝ 下の余りを削った）
    const front = [...resolveWorld(stack(8), VP2).byId.values()].sort((a, b) => b.scale - a.scale)[0];
    expect(front.y + front.h / 2).toBeGreaterThan(VP2.h / 2);
  });
});

});