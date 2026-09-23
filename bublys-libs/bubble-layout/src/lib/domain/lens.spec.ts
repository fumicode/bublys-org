/**
 * ① レンズ ── 位置 → 画面。軸ごとに1つ。
 *   ・平行／魚眼／透視の式
 *   ・泡の像（端をレンズに通した間）
 *   ・大きさの倍率は数値1つ ＝ min(X の像の倍率, Y の像の倍率)（端での下限は持たない）
 *   ・X/Y のレンズは1次元の単調な関数なので、逆関数が必ず書ける（往復して戻る）
 *
 * 待っている数はラボ（v5-dom/lab.html）からの実測。手で作った数は無い（lab-scene.ts の断り）。
 */
import { LENS_XY, LENS_Z, imageOf } from './lens.js';
import { METRICS } from './types.js';
import { resolveWorld } from './resolve.js';
import { withAxis } from './view.js';
import { labScene, placeOf, VIEWPORT } from './lab-scene.js';

const world = labScene();
const layout = resolveWorld(world, VIEWPORT);

/**
 * ラボ実測：X魚眼ビュー（版10個）の倍率を、X だけ魚眼／Y だけ魚眼／両方魚眼 の3通りで測ったもの。
 * `__lab.setAxis("fish", …, { lens })` を当てて `__lab.placements()` から取った値。
 * ★ 2026-09-19：端での下限 0.32 を取り消したので、3通りとも下限を入れる前の数に戻った
 *   （0.7201… → 0.5884… ＝ 像の倍率そのもの）。3つ目が前2つの min という性質は前から変わらない。
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

  it('★ 大きさの倍率は数値1つ ＝ min(X の像の倍率, Y の像の倍率)', () => {
    // 同じ場面を、X だけ魚眼／Y だけ魚眼／両方魚眼 で解いて、3つ目が前2つの min になっているか
    const onlyX = resolveWorld(world, VIEWPORT);
    const onlyY = resolveWorld(
      withAxis(withAxis(world, 'fish', 'x', { lens: 'parallel' }), 'fish', 'y', { lens: 'fisheye' }),
      VIEWPORT,
    );
    const both = resolveWorld(withAxis(world, 'fish', 'y', { lens: 'fisheye' }), VIEWPORT);
    for (const [id, [kx, ky, kmin]] of Object.entries(LAB_FISH_SCALE)) {
      expect(placeOf(onlyX, id).scale).toBe(kx);      // Y が平行なら倍率 1 なので min から落ちる
      expect(placeOf(onlyY, id).scale).toBe(ky);      // X が平行なら同じく
      expect(placeOf(both, id).scale).toBe(kmin);
      expect(kmin).toBe(Math.min(kx, ky));
    }
    // 拾う軸は泡ごとに違う（v0 は X、v1 は Y）── どちらが曲がっているかを書かなくてよい
    expect(LAB_FISH_SCALE['v0'][2]).toBe(LAB_FISH_SCALE['v0'][0]);
    expect(LAB_FISH_SCALE['v1'][2]).toBe(LAB_FISH_SCALE['v1'][1]);
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
