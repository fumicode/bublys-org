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
import { dragBubble, dragVerbsOf, wheelZ, zoomedBy } from './drag.js';
import { resolveWorld } from './resolve.js';
import { presetView, withAxis, withPreset } from './view.js';
import { DEFAULT_RULES } from './rules.js';
import { Bubble } from './bubble.js';
import { BubbleWorld } from './world.js';
import { labScene, placeOf, VIEWPORT } from './lab-scene.js';

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
    const next = dragBubble(w, { layout, id: 'fC', space: 'root', want: { x: 1035, y: 732.75 }, m: p.m }, DEFAULT_RULES);
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
      w, { layout, id: 'v4', space: 'fish', want: { x: 388.4412856837971, y: 271.75 }, m: p.m }, DEFAULT_RULES,
    );
    expect(next.bubble('fish')?.state.focus.x).toBe(-110.48881297487148);
    expect(next.bubble('fish')?.state.focus.y).toBe(0);
    // 泡そのものの値は1つも変わらない
    expect(next.bubble('v4')?.state).toEqual(before);
  });

  it('なしなら何も起きない（議事録 ＝ X・Y とも なし）', () => {
    // ラボ実測：確定 を (+70,+40) ドラッグしても、値も焦点も動かない
    const w = labScene();
    const layout = resolveWorld(w, VIEWPORT);
    expect(dragVerbsOf(w, 'giji')).toEqual({ x: 'none', y: 'none' });
    const p = placeOf(layout, 'g3');
    const next = dragBubble(
      w, { layout, id: 'g3', space: 'giji', want: { x: 280, y: 610.75 }, m: p.m }, DEFAULT_RULES,
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
    const next = dragBubble(w, { layout, id: 'row0', space: 'row', want: { x: p.x + 200, y: p.y }, m: p.m }, DEFAULT_RULES);
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
