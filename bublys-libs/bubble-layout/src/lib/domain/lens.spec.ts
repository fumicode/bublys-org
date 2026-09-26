/**
 * ① レンズ ── 位置 → 画面。軸ごとに1つ。
 *   ・平行／魚眼／透視の式
 *   ・泡の像（端をレンズに通した間）
 *   ・大きさの倍率は数値1つ ＝ 両軸の像をまとめた1つ（`sizeK`。端での下限は持たない）
 *   ・X/Y のレンズは1次元の単調な関数なので、逆関数が必ず書ける（往復して戻る）
 *
 * 待っている数はラボ（v5-dom/lab.html）からの実測。手で作った数は無い（lab-scene.ts の断り）。
 */
import { LENS_XY, LENS_Z, imageOf, sizeFit } from './lens.js';
import { METRICS } from './types.js';
import { resolveWorld } from './resolve.js';
import { Bubble } from './bubble.js';
import { BubbleWorld } from './world.js';
import { DEFAULT_RULES } from './rules.js';
import type { LayoutRules, SizeCombine } from './rules.js';
import { presetView, withAxis } from './view.js';
import { labScene, placeOf, VIEWPORT } from './lab-scene.js';

const world = labScene();
const layout = resolveWorld(world, VIEWPORT);

/**
 * ラボ実測：X魚眼ビュー（版10個）の倍率を、X だけ魚眼／Y だけ魚眼／両方魚眼 の3通りで測ったもの。
 * `__lab.setAxis("fish", …, { lens })` を当てて `__lab.placements()` から取った値。
 * ★ 2026-09-19：端での下限 0.32 を取り消したので、3通りとも下限を入れる前の数に戻った
 *   （0.7201… → 0.5884… ＝ 像の倍率そのもの）。3つ目が前2つの min という性質は前から変わらない。
 * ★ 3つ目は**ラボのまとめ方（`min`）の数**。いまの既定は斜辺（`hypot`）なので両軸が魚眼のときだけ
 *   ここより小さくなる ── どれだけ小さくなるかは下の「まとめ方は3つ」で測る。
 */
const LAB_FISH_SCALE: Readonly<Record<string, readonly [number, number, number]>> = {
  v0: [0.5884453468854983, 0.7362335972462608, 0.5884453468854983],
  v1: [0.8146802272259919, 0.7362335972462608, 0.7362335972462608],
  v2: [0.9713886611980417, 0.7362335972462608, 0.7362335972462608],
  v3: [0.9713886611980417, 0.7362335972462608, 0.7362335972462608],
  v4: [0.8146802272259919, 0.7362335972462608, 0.7362335972462608],
  v5: [0.5884453468854983, 0.7362335972462608, 0.5884453468854983],
  v6: [0.9713886611980417, 0.9844612976979787, 0.9713886611980417],
  v7: [0.8146802272259919, 0.9844612976979787, 0.8146802272259919],
  v8: [0.5884453468854983, 0.9844612976979787, 0.5884453468854983],
  v9: [0.5884453468854983, 0.7362335972462608, 0.5884453468854983],
};

describe('① レンズ（位置 → 画面）', () => {
  it('平行は「画面 ＝ u」で、倍率はいつも 1（だから min から落ちる）', () => {
    for (const u of [-420, -1, 0, 37.5, 900]) {
      expect(LENS_XY.parallel.project(u, 210).s).toBe(u);
      expect(LENS_XY.parallel.project(u, 210).k).toBe(1);
    }
  });

  it('魚眼は「画面 ＝ H·tanh(u/H)」・倍率は 1/cosh²(u/H)', () => {
    const H = 210;
    for (const u of [-500, -64, 0, 64, 500]) {
      const p = LENS_XY.fisheye.project(u, H);
      expect(p.s).toBeCloseTo(H * Math.tanh(u / H), 12);
      expect(p.k).toBeCloseTo(1 / Math.cosh(u / H) ** 2, 12);
    }
    // 焦点の所は曲がらない（倍率 1）。外へ行くほど縮む（単調）
    expect(LENS_XY.fisheye.project(0, H).k).toBe(1);
    expect(LENS_XY.fisheye.project(300, H).k).toBeLessThan(LENS_XY.fisheye.project(100, H).k);
  });

  it('★ 逆関数が必ず書ける：画面 → 位置 → 画面 で戻る（魚眼も平行も）', () => {
    const H = 210;
    // 焦点のまわりは、倍精度の粒まで戻る
    for (const lens of [LENS_XY.parallel, LENS_XY.fisheye])
      for (const u of [-6 * H, -700, -0.5, 0, 0.5, 700, 6 * H])
        expect(lens.unproject(lens.project(u, H).s, H)).toBeCloseTo(u, 9);
    // 端（tanh が 1 に張り付く手前で止めている所）でも、画面の 1/1000 px までは戻る
    for (const u of [-14 * H, 14 * H])
      expect(Math.abs(LENS_XY.fisheye.unproject(LENS_XY.fisheye.project(u, H).s, H) - u)).toBeLessThan(0.01);
    // ★ それより先は戻らない（だから止めている）── 止めていなければ Infinity になる所
    expect(Math.abs(LENS_XY.fisheye.unproject(LENS_XY.fisheye.project(20 * H, H).s, H) - 20 * H)).toBeGreaterThan(1000);
    expect(Number.isFinite(LENS_XY.fisheye.unproject(H, H))).toBe(true);   // s ＝ H ちょうどでも数が返る
  });

  it('透視は m ＝ 1/(1 + 0.26·dz)。焦点より手前は消す（刻みの 0.35 ぶんは同じ面のうち）', () => {
    expect(METRICS.K_PERSP).toBe(0.26);
    expect(LENS_Z.perspective.mag(0)).toBe(1);
    expect(LENS_Z.perspective.mag(0.4)).toBe(1 / 1.104);
    // ラボ実測：勤務表は 自由Z 0.4 で 0.9057971014492753（＝ 1/1.104）
    expect(placeOf(layout, 'kinmu').scale).toBe(LENS_Z.perspective.mag(0.4));
    expect(LENS_Z.perspective.alpha(0)).toBe(1);
    /**
     * ★ ここは**ラボから変えた所**。ラボは `dz < 0` で即 0 ＝ 面を 1mm 越えたら消えるので、
     *   手前へ繰ってきた泡が**原寸ちょうどでパッと消える**（「まだ普通の大きさなのに消えた」）。
     *   刻みの 0.35 ぶんだけ行き過ぎても同じ面のうち、とした（METRICS.Z_FRONT_KEEP）。
     */
    expect(METRICS.Z_FRONT_KEEP).toBe(0.35);
    expect(LENS_Z.perspective.alpha(-0.001)).toBe(1);   // 面をかすめただけ：まだ居る
    expect(LENS_Z.perspective.alpha(-0.35)).toBe(1);    // ちょうど端：まだ居る
    expect(LENS_Z.perspective.alpha(-0.36)).toBe(0);    // 越えた：消える
    // 消える直前の大きさは 1.10 倍（1/(1 − 0.26×0.35)）── かすめてから消える
    expect(Number(LENS_Z.perspective.mag(-0.35).toFixed(2))).toBe(1.1);
    /**
     * ★ 手前の余地は**刻みに対する割合**。生の dz で決めると、刻みの細かい並べ方
     *   （重ねて置く ＝ 0.15）で何枚も手前に居残り、触った泡を覆ってしまう。
     */
    expect(LENS_Z.perspective.alpha(-0.05, 0.15)).toBe(1);   // 0.15 × 0.35 ＝ 0.0525 の内側
    expect(LENS_Z.perspective.alpha(-0.1, 0.15)).toBe(0);    // その外
    expect(LENS_Z.flat.mag(9)).toBe(1);        // 平行は Z を見た目に使わない
  });

  it('★ 泡の像は、泡の端をレンズに通した間（中心1点の倍率で一様に縮めるのではない）', () => {
    // coverflow の左端 cf0。★ 下限を取り消したので、描く大きさは像そのものに戻った
    //   （像の倍率 0.3619 → 0.3126、幅 50.9482… → 28.1367…）。箱も伸びなくなったので H も元どおり
    const L = layout.spaces.get('cover');
    if (!L) throw new Error('coverflow の空間が無い');
    const pos = L.arr.x.pos.get('cf0');
    if (pos === undefined) throw new Error('cf0 の位置が無い');
    const img = imageOf(pos, 90, LENS_XY.fisheye, L.ctx.H.x, L.ctx.focus.x);
    expect(img.k).toBe(0.3126301311038828);
    expect(placeOf(layout, 'cf0').scale).toBe(Math.min(img.k, 1));  // Y は平行なので min から落ちる
    expect(placeOf(layout, 'cf0').scale).toBe(0.3126301311038828);
    expect(placeOf(layout, 'cf0').w).toBe(28.136711799349456);      // 90 × 0.3126…（＝ 像の幅そのもの）
    // 中心1点の倍率とは別物（そちらで縮めると帯の像と噛み合わない）
    expect(LENS_XY.fisheye.project(pos - L.ctx.focus.x, L.ctx.H.x).k).not.toBe(img.k);
  });

  it('★ 端での下限は持たない ── 倍率 ＝ Z の m × min(X の像, Y の像)', () => {
    // 旧「★ 端での下限 0.32 ── 倍率 ＝ 下限 + (1 − 下限) × min」の後身。
    // 下限は 2026-09-19 に取り消した（「奥に行った泡は読めなくてよい」DECISIONS.md）ので、
    // 定数と式の3行は消し、**下限が無いこと**を測る側に書き直した。
    // 守っていた性質（下限は X/Y の像だけで、Z の透視 m にはかけない）はそのまま残す。
    expect('SIZE_FLOOR' in METRICS).toBe(false);
    // 勤務表は 自由Z 0.4 で 平行×平行（像の倍率 1）なので、m がそのまま出てくる
    expect(placeOf(layout, 'kinmu').local).toBe(LENS_Z.perspective.mag(0.4));
    // 場面ぜんぶ：ローカル倍率 ÷ m ＝ X/Y の像の min そのもの。coverflow の端が一番小さい
    const xy = layout.order.map((p) => p.local / p.m);
    expect(Math.min(...xy)).toBe(0.3126301311038828);                // ＝ cf0 の像の倍率（下限を通していない）
    expect(Math.min(...xy)).toBeLessThan(0.32);                      // ★ 0.32 では止まっていない
  });

  it('平行のレンズの空間は、像の倍率がいつも 1（だから min から落ちる）', () => {
    // X も Y も平行な空間では像の倍率がいつも 1 なので、ローカル倍率は Z の m そのもの。
    // ★ 下限があったときも、取り消したあとも、この 41 個は px で差 0（下限は min の外にかかっていた）
    let flat = 0;
    for (const p of layout.order) {
      const L = layout.spaces.get(p.space);
      if (!L || L.view.x.lens !== 'parallel' || L.view.y.lens !== 'parallel') continue;
      flat++;
      expect(p.local).toBe(p.m);                                     // min(1, 1) ＝ 1
    }
    // 外の空間・勤務表・スタッフ・カレンダー・横に並べる・議事録・並び の 7 空間 41 個
    expect(flat).toBe(41);
    // 魚眼がいる空間（coverflow 7 ＋ X魚眼ビュー 10）だけが 1 から外れる
    expect(layout.order.length - flat).toBe(17);
  });

  it('★ 描く矩形は像そのもの（＝「詰めるは重ならない」が戻った）', () => {
    // 旧「★ 下限をかけると、描く矩形は像より広い（＝「詰めるは重ならない」が崩れる。わざと）」の後身。
    // 下限を取り消したので、崩れていた性質が戻った ── 期待値を逆にした。
    // 横に並べる（詰める・隙間 14）の X を魚眼にすると、隙間は 11.4949 / 13.4996 に縮むだけで、
    // 矩形は像そのもの（左端も右端もレンズの答えの上）。どちらの隙間も正 ＝ 重ならない。
    const curved = resolveWorld(withAxis(world, 'row', 'x', { lens: 'fisheye' }), VIEWPORT);
    const gap = (a: string, b: string) => placeOf(curved, b).x - (placeOf(curved, a).x + placeOf(curved, a).w);
    expect(gap('row0', 'row1')).toBeCloseTo(11.494883468790874, 9);
    expect(gap('row1', 'row2')).toBeCloseTo(13.499593821419012, 9);
    expect(gap('row0', 'row1')).toBeGreaterThan(0);
    expect(gap('row1', 'row2')).toBeGreaterThan(0);
    expect(placeOf(curved, 'row0').w).toBeCloseTo(50.455986884752875, 9);   // 下限があったときは 59.9100…
    const L = curved.spaces.get('row');
    if (!L) throw new Error('横に並べる の空間が無い');
    for (const id of ['row0', 'row1', 'row2']) {
      const p = placeOf(curved, id);
      const pos = L.arr.x.pos.get(id);
      if (pos === undefined) throw new Error('位置が無い: ' + id);
      const edge = (d: number) => {
        const s = LENS_XY.fisheye.project(pos + d - L.ctx.focus.x, L.ctx.H.x).s;
        return L.host.cx + (L.ctx.vp.x + (s - L.ctx.vp.x)) * L.host.scale;
      };
      const img = { l: edge(-p.box.w / 2), r: edge(p.box.w / 2) };
      // ★ 左端も右端も、レンズの答えの上（中点も幅も像そのもの）
      expect((img.l + img.r) / 2).toBeCloseTo(p.x + p.w / 2, 9);
      expect(p.w).toBeCloseTo(img.r - img.l, 9);
      expect(p.x).toBeCloseTo(img.l, 9);
    }
    // 像そのものは変わっていない（imageOf は中心1点の倍率とは別物のまま）
    const mid = (id: string) => {
      const pos = L.arr.x.pos.get(id) as number;
      const q = LENS_XY.fisheye.project(pos - L.ctx.focus.x, L.ctx.H.x);
      return { k: q.k, img: imageOf(pos, placeOf(curved, id).box.w, LENS_XY.fisheye, L.ctx.H.x, L.ctx.focus.x).k };
    };
    for (const id of ['row0', 'row1', 'row2']) expect(mid(id).k).not.toBe(mid(id).img);
  });

  it('像の中点は端どうしの中点（左右の端は同じ大きさに写る）', () => {
    expect(placeOf(layout, 'cf6').w).toBe(placeOf(layout, 'cf0').w);
    expect(placeOf(layout, 'cf5').w).toBe(placeOf(layout, 'cf1').w);
  });

  /**
   * ★ **ここはラボから意図して外した**（2026-09-25 に `product`、2026-09-26 に `hypot`）。
   *   ラボは両軸が魚眼のとき `min` を採る。
   *
   *   `min` だと **4 隅が上下左右と同じ大きさ**になる（`min(k,k)` ＝ `min(k,1)`）ので、
   *   縦にも横にも遠い隅が「さらに小さい」と言えない。格子を魚眼で見たときに
   *   歪んで見えず、列の中心は揃うのに辺が揃わないまま余白だけが残る（実測で踏んだ）。
   *   `product`（積）は遠さが縦横で**2 回**掛かるので、隅が早く消えすぎた（`1/cosh⁴t`）。
   *   いまは**斜辺**（`hypot`）── 遠さを足さず、直角三角形の斜辺として1つにまとめる。
   *
   * ★ **片方の軸が平行なら、3 つのまとめ方はどれも同じ数**（平行の倍率は 1 ＝ 遠さ 0）。
   *   だから縦・横の coverflow も、ラボの X魚眼ビューそのものも 1px も変わらない
   *   ── 下の onlyX・onlyY がラボの実測値ちょうどであることで、3 通りとも押さえている。
   */
  it('★ 大きさの倍率は数値1つ。片方が平行ならどれも同じ数（ラボの実測値ちょうど）', () => {
    for (const how of ['hypot', 'product', 'min'] as const) {
      const rules: Partial<LayoutRules> = { sizeCombine: how };
      const onlyX = resolveWorld(world, VIEWPORT, rules);
      const onlyY = resolveWorld(
        withAxis(withAxis(world, 'fish', 'x', { lens: 'parallel' }), 'fish', 'y', { lens: 'fisheye' }),
        VIEWPORT,
        rules,
      );
      for (const [id, [kx, ky, kmin]] of Object.entries(LAB_FISH_SCALE)) {
        // 片方が平行 ── どのまとめ方でも**ラボの実測値ちょうど**（丸めも入らない）
        expect(placeOf(onlyX, id).scale).toBe(kx);
        expect(placeOf(onlyY, id).scale).toBe(ky);
        expect(kmin).toBe(Math.min(kx, ky));          // ラボが採っていた数（記録として残す）
      }
    }
  });

  /**
   * ★ **まとめ方はその空間の View から出る**（規則①）── 海と一覧は別の空間なので、
   *   どちらかを選ぶ話ではない。
   *
   * > **接する相手がいるなら、接することを守る。自由に置いた泡には隣が無い。**
   *
   *   刻みで並ぶ軸（`equal` / `pack`）があるなら**積**。X魚眼ビューは `equal` × `equal` なので、
   *   両軸を魚眼にしても口に何を渡しても積のまま ── 折り返す魚眼の「ぴたり接する」を守るため。
   *   両軸が `as-is`（自由に置く ＝ 海）なら口に従う（既定は積 ＝ 渡さなければ今までと同じ）。
   */
  it('★ まとめ方は並べ方で決まる ── 刻みで並ぶ空間は積、自由に置く空間は口に従う', () => {
    const fishBoth = withAxis(world, 'fish', 'y', { lens: 'fisheye' });
    // X魚眼ビュー（equal × equal）── 口に何を渡しても積
    for (const how of ['hypot', 'product', 'min'] as const) {
      const L = resolveWorld(fishBoth, VIEWPORT, { sizeCombine: how });
      for (const [id, [kx, ky]] of Object.entries(LAB_FISH_SCALE))
        expect(placeOf(L, id).scale).toBeCloseTo(kx * ky, 12);
    }
    // 外の空間（自由に置く ＝ as-is × as-is）の泡を、両軸魚眼にして測る
    const sea = withAxis(withAxis(world, 'root', 'x', { lens: 'fisheye' }), 'root', 'y', { lens: 'fisheye' });
    const kOf = (L: ReturnType<typeof resolveWorld>, id: string) => {
      const p = placeOf(L, id);
      const S = L.spaces.get(p.space);
      if (!S) throw new Error('空間が無い');
      return {
        kx: imageOf(p.pos.x, p.box.w, LENS_XY.fisheye, S.ctx.H.x, S.ctx.focus.x).k,
        ky: imageOf(p.pos.y, p.box.h, LENS_XY.fisheye, S.ctx.H.y, S.ctx.focus.y).k,
        local: p.local / p.m,
      };
    };
    // 外の空間に居て、両軸とも曲がっている泡（＝ 隅の側に居るもの）だけを見る
    const outer = resolveWorld(sea, VIEWPORT)
      .order.filter((p) => p.space === 'root' && !p.b.state.implicit)
      .map((p) => p.id);
    let bent = 0;
    for (const id of outer) {
      const hyp = kOf(resolveWorld(sea, VIEWPORT), id);
      if (!(hyp.kx < 1 && hyp.ky < 1)) continue;
      bent++;
      // 既定は積（何も渡さなければ今までと同じ答え）
      expect(hyp.local).toBeCloseTo(hyp.kx * hyp.ky, 12);
      // 斜辺を渡した空間だけが変わる
      const hyp2 = kOf(resolveWorld(sea, VIEWPORT, { sizeCombine: 'hypot' }), id);
      expect(hyp2.local).toBeCloseTo(Math.exp(-Math.hypot(Math.log(hyp.kx), Math.log(hyp.ky))), 12);
      expect(kOf(resolveWorld(sea, VIEWPORT, { sizeCombine: 'min' }), id).local)
        .toBeCloseTo(Math.min(hyp.kx, hyp.ky), 12);
      // 斜辺は積より大きく、min より小さい（＝ 隅は上下左右より小さいまま、減衰は斜辺1本ぶん）
      expect(hyp2.local).toBeGreaterThan(hyp.kx * hyp.ky);
      expect(hyp2.local).toBeLessThan(Math.min(hyp.kx, hyp.ky));
    }
    expect(bent).toBeGreaterThan(0);                    // 見る相手が居たことを押さえる
    expect(DEFAULT_RULES.sizeCombine).toBe('product');  // 既定は変えていない
  });

  /**
   * ★ **3 つの並び ── 積 ≤ 斜辺 ≤ min。** どれも min 以下なので、泡は横の像にも縦の像にも収まる。
   *   斜辺が min より**厳しく小さい**ことで「隅は上下左右より小さい」が言え、
   *   積より**厳しく大きい**ことで「隅が 2 回ぶん減衰しない」が言える。
   *
   *   u ＝ H（上下左右が 0.4200）の隅で: 積 0.1764 ＜ 斜辺 0.2932 ＜ min 0.4200。
   *   X魚眼ビューの v0（kx 0.5884・ky 0.7362）では: 積 0.4332 ＜ 斜辺 0.5421 ＜ min 0.5884。
   */
  it('★ まとめ方の並びは 積 ≤ 斜辺 ≤ min（両軸が曲がっていれば、どちらも厳しい不等号）', () => {
    const k = 1 / Math.cosh(1) ** 2;                       // u ＝ H での像の倍率（片軸）
    expect(k).toBeCloseTo(0.42, 4);
    expect(sizeFit(k, k, 'min').k).toBeCloseTo(0.42, 4);
    expect(sizeFit(k, k, 'hypot').k).toBeCloseTo(0.2932, 4);
    expect(sizeFit(k, k, 'product').k).toBeCloseTo(0.1764, 4);
    // 隅（両軸が曲がっている）では 3 つがはっきり分かれる
    expect(sizeFit(k, k, 'product').k).toBeLessThan(sizeFit(k, k, 'hypot').k);
    expect(sizeFit(k, k, 'hypot').k).toBeLessThan(sizeFit(k, k, 'min').k);
    // 上下左右（片方が平行）では 3 つとも同じ数 ── しかも**ビット単位で**その軸の像そのもの
    for (const how of ['hypot', 'product', 'min'] as const) {
      expect(sizeFit(k, 1, how).k).toBe(k);
      expect(sizeFit(1, k, how).k).toBe(k);
      expect(sizeFit(1, 1, how).k).toBe(1);
    }
    // 隅は上下左右より小さい（＝ 遠近が言える）。ここが `min` では等しくなっていた
    expect(sizeFit(k, k, 'hypot').k).toBeLessThan(sizeFit(k, 1, 'hypot').k);
    expect(sizeFit(k, k, 'min').k).toBe(sizeFit(k, 1, 'min').k);
    // v0（X魚眼ビューの端）の実際の数
    const [kx, ky] = LAB_FISH_SCALE['v0'];
    expect(sizeFit(kx, ky, 'product').k).toBeCloseTo(0.4332, 4);
    expect(sizeFit(kx, ky, 'hypot').k).toBeCloseTo(0.5421, 4);
    expect(sizeFit(kx, ky, 'min').k).toBeCloseTo(0.5884, 4);
    /**
     * ★ **潰れきった端（像が 0 に落ちた）でも、数で返る。**
     *   `−ln 0` は ∞ なので、止めないと斜辺が `exp(∞ − ∞)` ＝ NaN になり、
     *   置き場所も薄さも NaN のまま画面へ出る（実測：両軸魚眼の海で一覧を開いた瞬間に
     *   「`NaN` is an invalid value for the `opacity` css style property」）。
     */
    for (const how of ['hypot', 'product', 'min'] as const)
      for (const [a, b] of [[0, 0.5], [0.5, 0], [0, 0], [1e-320, 0.5]] as const) {
        const fit = sizeFit(a, b, how);
        expect(Number.isFinite(fit.k)).toBe(true);
        expect(Number.isFinite(fit.bx)).toBe(true);
        expect(Number.isFinite(fit.by)).toBe(true);
        expect(fit.k).toBeLessThanOrEqual(Math.min(a, b) + 1e-300);   // 収まる（min 以下）
        expect(fit.bx).toBeGreaterThanOrEqual(0);
        expect(fit.by).toBeGreaterThanOrEqual(0);
      }
    // 大きさは 0 と同じ（1e-304 以下）／潰れきっていない側の曲がりは、極限どおり 1 に寄る
    expect(sizeFit(0, 0.5, 'hypot').k).toBeLessThan(1e-300);
    expect(sizeFit(0, 0.5, 'hypot').bx).toBeCloseTo(1, 3);
    expect(sizeFit(0, 0.5, 'hypot').by).toBeLessThan(1e-300);
    // 止める手前（1e-320）と、止めたあと（0）で答えが跳ばない
    expect(Math.abs(sizeFit(0, 0.5, 'hypot').bx - sizeFit(1e-320, 0.5, 'hypot').bx)).toBeLessThan(1e-3);
  });

  /**
   * ★ **遠くへ行った泡が居ても、答えに NaN を出さない。**
   *
   *   魚眼の像は `|u| ≳ 19H` で**ぴたり 0 に潰れる**（tanh が 1 に張り付く）。
   *   そこで遠さ（`−ln k`）が ∞ になり、斜辺が `exp(∞ − ∞)` ＝ NaN になっていた
   *   ── 置き場所も薄さも NaN のまま画面へ出て、React が
   *   「`NaN` is an invalid value for the `opacity` css style property」で止まる（実測）。
   */
  it('★ ずっと遠くの泡が居ても、配置に NaN は出ない（3 つのまとめ方とも）', () => {
    for (const how of ['hypot', 'product', 'min'] as const) {
      const far = new BubbleWorld({
        bubbles: [
          Bubble.create({ id: 'near', title: '近い', w: 200, h: 120, free: { x: 0, y: 0 } }).state,
          // 箱の半幅の 20 倍より外 ＝ 像が 0 に潰れる所（前に泡が飛ばされた先と同じくらい）
          Bubble.create({ id: 'far', title: '遠い', w: 200, h: 120, free: { x: 20000, y: 9000 } }).state,
        ],
        root: { title: '海', view: presetView('free'), focus: { x: 0, y: 0, z: 0 }, zoom: 1 },
        implicitSeq: 0,
      });
      const both = withAxis(withAxis(far, 'root', 'x', { lens: 'fisheye' }), 'root', 'y', { lens: 'fisheye' });
      const L = resolveWorld(both, VIEWPORT, { sizeCombine: how });
      for (const p of L.order)
        for (const v of [p.x, p.y, p.w, p.h, p.scale, p.local, p.alpha, p.vis, p.bend.x, p.bend.y])
          expect(Number.isFinite(v)).toBe(true);
      // 遠い泡は潰れている（描く側が消す）／近い泡は原寸のまま
      const q = L.byId.get('far');
      const n = L.byId.get('near');
      if (!q || !n) throw new Error('居ない');
      expect(q.scale).toBeLessThan(1e-6);
      expect(n.scale).toBeGreaterThan(0.9);
    }
  });

  it('★ 合成は1回だけ。深さ3でも scale は数値1つ（勤務表 → カレンダー → 日）', () => {
    // 勤務表は 自由Z 0.4（透視）、中は平行なので、深さが増えても掛け算1つのまま
    for (const id of ['kinmu', 'cal', 'd0', 'p0'])
      expect(placeOf(layout, id).scale).toBe(0.9057971014492753);
    expect(placeOf(layout, 'd0').depth).toBe(3);
    expect(placeOf(layout, 'd0').x).toBe(618.9855072463769);       // ラボ実測
    expect(placeOf(layout, 'd0').y).toBe(383.77173913043475);
  });
});
