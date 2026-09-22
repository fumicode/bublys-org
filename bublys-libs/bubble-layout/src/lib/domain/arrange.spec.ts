/**
 * ④ 並べる ＝ 帯の式。
 *
 * > 値ごとに帯を作り、帯の中に揃えて置き、塊の中央を空間の中心に置く。
 * > 等間隔と詰めるの違いは、帯の幅の決め方だけ。
 *
 * ★ 同じ中身（横に並べる の 小・中・大／coverflow の写真7枚）を、並べ方だけ差し替えて
 *   ラボで実測し、その数を焼いてある。違いが「帯の幅」だけに出ることが、そのまま規則の検算になる。
 */
import { arrangeAxis } from './arrange.js';
import { resolveWorld } from './resolve.js';
import { measureAll } from './measure.js';
import { viewOfSpace, withAxis } from './view.js';
import { DEFAULT_RULES } from './rules.js';
import { labScene, placeOf, VIEWPORT } from './lab-scene.js';

const world = labScene();
const layout = resolveWorld(world, VIEWPORT);
const centerX = (l: ReturnType<typeof resolveWorld>, id: string) => placeOf(l, id).x + placeOf(l, id).w / 2;

describe('④ 並べる ＝ 帯の式', () => {
  it('そのまま：帯を作らない。値がそのまま px（メモは 自由座標 −625 のまま）', () => {
    const L = layout.spaces.get('root');
    if (!L) throw new Error('外の空間が無い');
    expect(L.arr.x.pos.get('memo1')).toBe(-625);
    expect(L.arr.y.pos.get('memo1')).toBe(-338);
    expect(L.arr.x.bands).toEqual([]);                       // 帯を作らない
    // 画面 1440 の中心 720 から −625、箱の半分 65 をドラッグして 30（ラボ実測）
    expect(placeOf(layout, 'memo1').x).toBe(30);
    expect(placeOf(layout, 'memo1').y).toBe(26.75);
  });

  it('詰める：帯の幅は「その値を持つ泡の中で一番大きいもの」・隙間 14 で続く（ラボ実測 335/429/547）', () => {
    expect(placeOf(layout, 'row0').x).toBe(335);
    expect(placeOf(layout, 'row1').x).toBe(429);
    expect(placeOf(layout, 'row2').x).toBe(547);
    // 帯の幅 ＝ 泡の幅（80 / 104 / 128）。帯と帯は 14 あく
    expect(placeOf(layout, 'row1').x - (placeOf(layout, 'row0').x + placeOf(layout, 'row0').w)).toBe(14);
    expect(placeOf(layout, 'row2').x - (placeOf(layout, 'row1').x + placeOf(layout, 'row1').w)).toBe(14);
    const L = layout.spaces.get('row');
    if (!L) throw new Error('横に並べる の空間が無い');
    expect(L.arr.x.bands.map((b) => b.end - b.start)).toEqual([80, 104, 128]);
    expect(L.arr.x.gap).toBe(14);
  });

  it('等間隔：帯の幅は「間隔」だけ。中身の大きさを見ない（同じ3つが 110 刻みに並ぶ）', () => {
    // ラボで 横に並べる の X を 等間隔 に差し替えて実測：343 / 441 / 539（幅は 80/104/128 のまま）
    const eq = resolveWorld(withAxis(world, 'row', 'x', { arrange: 'equal' }), VIEWPORT);
    expect(placeOf(eq, 'row0').x).toBe(343);
    expect(placeOf(eq, 'row1').x).toBe(441);
    expect(placeOf(eq, 'row2').x).toBe(539);
    // ★ 違いは帯の幅の決め方だけ ── 等間隔では中心どうしが step（110）ちょうど
    expect(centerX(eq, 'row1') - centerX(eq, 'row0')).toBe(110);
    expect(centerX(eq, 'row2') - centerX(eq, 'row1')).toBe(110);
    const L = eq.spaces.get('row');
    if (!L) throw new Error('横に並べる の空間が無い');
    expect(L.arr.x.bands.map((b) => b.end - b.start)).toEqual([110, 110, 110]);
    // 詰めるでは中心どうしが「隣の幅の半分ずつ ＋ 隙間」＝ 中身しだい
    expect(centerX(layout, 'row1') - centerX(layout, 'row0')).toBe((80 + 104) / 2 + 14);
    expect(centerX(layout, 'row2') - centerX(layout, 'row1')).toBe((104 + 128) / 2 + 14);
  });

  it('同じ中身（写真7枚・どれも 90px）でも、帯の幅が 68（間隔）と 104（幅＋隙間）で分かれる', () => {
    // ラボで coverflow の X を平行レンズにして実測（レンズを外すと、位置がそのまま画面に出る）
    const eq = resolveWorld(withAxis(world, 'cover', 'x', { lens: 'parallel' }), VIEWPORT);
    const pk = resolveWorld(
      withAxis(withAxis(world, 'cover', 'x', { lens: 'parallel' }), 'cover', 'x', { arrange: 'pack' }),
      VIEWPORT,
    );
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => placeOf(eq, 'cf' + i).x)).toEqual([621, 689, 757, 825, 893, 961, 1029]);
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => placeOf(pk, 'cf' + i).x)).toEqual([513, 617, 721, 825, 929, 1033, 1137]);
    expect(placeOf(eq, 'cf1').x - placeOf(eq, 'cf0').x).toBe(68);          // 等間隔 ＝ step
    expect(placeOf(pk, 'cf1').x - placeOf(pk, 'cf0').x).toBe(90 + 14);     // 詰める ＝ 一番大きい泡 ＋ 隙間
    // 真ん中（塊の中央）は動かない ── 塊の中央を空間の中心に置くから
    expect(placeOf(eq, 'cf3').x).toBe(placeOf(pk, 'cf3').x);
  });

  it('★ 等間隔・詰めるの軸では、箱は中身が収まるまで伸びる（そのままの軸は自前）', () => {
    const boxes = measureAll(world, DEFAULT_RULES);
    expect(boxes.get('kinmu')).toEqual({ w: 498, h: 340 });     // 自前は 482×340 → 横だけ伸びる
    expect(boxes.get('cal')).toEqual({ w: 336, h: 114 });
    expect(boxes.get('staff')).toEqual({ w: 120, h: 218 });     // 自前 120×120 → 縦が伸びる
    // ラボ実測：coverflow の箱は 等間隔 526 → 詰める 742（中身は同じ7枚）
    const eq = resolveWorld(withAxis(world, 'cover', 'x', { lens: 'parallel' }), VIEWPORT);
    const pk = resolveWorld(
      withAxis(withAxis(world, 'cover', 'x', { lens: 'parallel' }), 'cover', 'x', { arrange: 'pack' }),
      VIEWPORT,
    );
    expect(placeOf(eq, 'cover').w).toBe(526);
    expect(placeOf(pk, 'cover').w).toBe(742);
    // そのままの軸（横に並べる の Y は なし・詰める なので Y も帯。X は詰めるだが自前 368 の方が広い）
    expect(placeOf(layout, 'row').w).toBe(368);
  });

  it('★ 重ならないことを保証するのは詰めるだけ（帯が接し、隣との隙間は 14 ぴったり）', () => {
    const gaps: number[] = [];
    const ids = ['row0', 'row1', 'row2'];
    for (let i = 1; i < ids.length; i++)
      gaps.push(placeOf(layout, ids[i]).x - (placeOf(layout, ids[i - 1]).x + placeOf(layout, ids[i - 1]).w));
    expect(gaps).toEqual([14, 14]);
    // 等間隔 × 魚眼 は重なりうる（間隔より広い泡が帯からはみ出す）── RULES.md「穴ではない性質」
    // coverflow は 間隔 68 に 90px の写真なので、平行で見ると帯からはみ出している
    const eq = resolveWorld(withAxis(world, 'cover', 'x', { lens: 'parallel' }), VIEWPORT);
    expect(placeOf(eq, 'cf1').x - (placeOf(eq, 'cf0').x + placeOf(eq, 'cf0').w)).toBe(68 - 90);
  });

  it('帯の式そのもの：塊の中央が空間の中心（帯の start/end の真ん中が 0）', () => {
    const V = viewOfSpace(world, 'row');
    const ar = arrangeAxis({
      axisView: V.x, axis: 'x', spaceId: 'row',
      kids: world.kidsOf('row'), sizeOf: (b) => measureAll(world, DEFAULT_RULES).get(b.id) ?? { w: 0, h: 0 },
      world, rules: DEFAULT_RULES,
    });
    const first = ar.bands[0];
    const last = ar.bands[ar.bands.length - 1];
    expect((first.start + last.end) / 2).toBe(0);
    expect(last.end - first.start).toBe(80 + 14 + 104 + 14 + 128);
  });
});
