/**
 * 解決（値 → 画面の配置）が、ラボと同じ数を出すか。
 *
 * 場面は `lab-scene.ts`（lab.html 446-482 行の7つ ＋ 起動時のくっつけ）。
 * 待っている数は、ぜんぶ **ラボを headless Chromium で開いて `__lab.placements()` から実測した値**。
 * 画面は 1440 × 809.5（lab.html を 1440×900 で開いたときの #stage の大きさ）。
 *
 * ★ ここに書いた数は1つも手で作っていない。切り出しの検算は、この 58 個ぜんぶを px で突き合わせて
 *   「差 0」になることで済ませた（21 場面ぶん：焦点をドラッグする・魚眼・プリセット・外から継ぐ・見えない親）。
 *   このファイルはそのうち、規則ごとに1つずつ代表を置いたもの。規則ごとの網は隣の *.spec.ts にある。
 */
import { Bubble } from './bubble.js';
import { BubbleWorld, emptyWorld } from './world.js';
import { presetView, viewOfSpace, withAxis } from './view.js';
import { resolveWorld } from './resolve.js';
import type { Layout } from './resolve.js';
import { measureAll } from './measure.js';
import { labScene, VIEWPORT } from './lab-scene.js';

const world = labScene();
const layout = resolveWorld(world, VIEWPORT);
/** 解いた配置を id で（無ければ落とす。取り違えを黙って通さないため） */
const from = (l: Layout, id: string) => {
  const p = l.byId.get(id);
  if (!p) throw new Error('配置が無い: ' + id);
  return p;
};
const at = (id: string) => from(layout, id);

describe('泡のならべかた ── 解決（ラボと同じ数が出るか）', () => {
  describe('④ 並べる＝帯の式', () => {
    it('詰める：帯の幅はその値を持つ泡の最大・隙間 14 で続く（横に並べる）', () => {
      expect(at('row0').x).toBe(335);
      expect(at('row1').x).toBe(429);
      expect(at('row2').x).toBe(547);
      // 帯と帯の隙間は 14（それぞれの帯の幅は 80 / 104 / 128）
      expect(at('row1').x - (at('row0').x + at('row0').w)).toBe(14);
      expect(at('row2').x - (at('row1').x + at('row1').w)).toBe(14);
      // 塊の中央が空間の中心（箱は自前の 368×130 のまま）
      expect(at('row').w).toBe(368);
      expect(at('row').h).toBe(130);
    });

    it('等間隔・詰めるの軸では、箱は中身が収まるまで伸びる（勤務表 482 → 498）', () => {
      const boxes = measureAll(world, { equalExtent: 'bubble', zFocusStop: 'behind' });
      expect(boxes.get('kinmu')).toEqual({ w: 498, h: 340 });   // 自前は 482×340
      expect(boxes.get('cal')).toEqual({ w: 336, h: 114 });
      expect(boxes.get('staff')).toEqual({ w: 120, h: 218 });
    });
  });

  describe('① 泡の見え方は親の View で決まる', () => {
    it('泡の像（coverflow の端と中央）', () => {
      // ★ 2026-09-19：端での下限 0.32 を取り消したので、魚眼の空間はぜんぶ入れる前の数に戻った
      //   （DECISIONS.md「端での下限 ── 入れたが、翌日に取り消した」）。
      //   倍率 ＝ 像の倍率そのもの。端 cf0 は 0.5661 → 0.3126、中央 cf3 は 0.9868 → 0.9773。
      //   像の中点は動かないまま矩形が像の幅へ戻る ＝ x は右へ戻る（699.6 → 717.2）
      expect(at('cf0').x).toBe(717.2443371838624);
      expect(at('cf0').w).toBe(28.136711799349456);
      expect(at('cf0').scale).toBe(0.3126301311038828);
      expect(at('cf3').x).toBe(826.0223923076812);
      expect(at('cf3').w).toBe(87.95521538463754);
      expect(at('cf3').scale).toBe(0.9772801709404171);
      expect(at('cf6').x).toBe(994.6189510167881);   // 端は左右で同じ大きさ
      expect(at('cf6').w).toBe(at('cf0').w);
    });

    it('★ 魚眼の空間でも箱は伸びない（coverflow は自前の 340 のまま）', () => {
      // 旧「★ 下限のぶん、魚眼の空間の箱は伸びる（coverflow 自前 340 → 368.70…）」の後身。
      // ④ 箱は中身が収まるまで伸びる。その「中身」を像の幅で測るので（＝ レンズが縮めたぶんだけ
      // 中身も縮む）、魚眼にしても中身は自前の幅に収まったまま ── 340 に戻った。
      const boxes = measureAll(world, { equalExtent: 'bubble', zFocusStop: 'behind' });
      expect(boxes.get('cover')).toEqual({ w: 340, h: 124 });
      // 平行の空間も、前から伸びない（像の倍率が 1）
      expect(boxes.get('kinmu')).toEqual({ w: 498, h: 340 });
      expect(boxes.get('row')).toEqual({ w: 368, h: 130 });
      expect(boxes.get('fish')).toEqual({ w: 420, h: 180 });   // 自前が十分大きいので伸びない
    });

    it('★ 合成は1回だけ。深さ3でも scale は数値1つ（勤務表 → カレンダー → 日）', () => {
      // 勤務表は z 0.4（透視）、中は平行なので、深さが増えても倍率は掛け算1つ
      expect(at('kinmu').scale).toBe(0.9057971014492753);
      expect(at('cal').scale).toBe(0.9057971014492753);
      expect(at('d0').scale).toBe(0.9057971014492753);
      expect(at('d0').depth).toBe(3);
      expect(at('d0').x).toBe(618.9855072463769);
      expect(at('d0').y).toBe(383.77173913043475);
      expect(at('p0').depth).toBe(3);
      expect(at('p0').x).toBe(504.85507246376807);
    });

    it('描く順：Z が同じなら、大きく写るものが手前（coverflow の中央が上）', () => {
      const ids = layout.order.filter((p) => p.space === 'cover').map((p) => p.id);
      expect(ids).toEqual(['cf0', 'cf6', 'cf1', 'cf5', 'cf2', 'cf4', 'cf3']);
    });

    it('継承：View を持たない空間は並べ方を外から継ぎ、焦点は継がない', () => {
      const cal = world.bubble('cal');
      if (!cal) throw new Error('カレンダーが無い');
      const inherited = world.withBubble(cal.withView(null).withFocus({ x: 7 }));
      const v = viewOfSpace(inherited, 'cal');
      expect(v.own).toBe(false);
      expect(v.x.dim).toBe('col');            // 勤務表（格子）の並べ方を継ぐ
      expect(v.y.dim).toBe('row');
      expect(v.focus.x).toBe(7);              // 焦点は自分のもの（継がない）
      expect(viewOfSpace(inherited, 'kinmu').focus.x).toBe(0);
    });
  });

  describe('③ 見えない親は、体を持たない', () => {
    it('箱はヘッダ 0・余白 0 で中身ぴったり（付箋A 120 ＋ 付箋B 130 ＝ 250）', () => {
      expect(at('snap1').w).toBe(250);
      expect(at('snap1').h).toBe(96);
      expect(at('snap1').x).toBe(at('fA').x);          // 左の縁は中身の左の縁
      expect(at('fB').x).toBe(at('fA').x + at('fA').w); // 隙間 0 ＝ 縁が接する
      expect(at('snap1').x + at('snap1').w).toBe(at('fB').x + at('fB').w);
    });

    it('Z は軸まるごと外の窓のもの（並びの中でも外と同じ大きさ）', () => {
      const v = viewOfSpace(world, 'snap1');
      expect(v.z).toEqual(presetView('free').z);        // 窓（外の空間）の Z がそのまま来る
      expect(at('fA').scale).toBe(1);
      expect(at('fB').scale).toBe(1);
    });
  });

  describe('規則が決めていない所（rules）', () => {
    it('等間隔の塊の測り方：この7つの場面では、泡で測っても帯で測っても答えが変わらない', () => {
      // 等間隔の軸に並ぶ泡が、どの場面でも同じ大きさだから（coverflow の写真は全部 90×64、
      // X魚眼ビューの版は全部 58×34）。端の大きさが違って初めて差が出る ── 次のテスト
      const band = resolveWorld(world, VIEWPORT, { equalExtent: 'band' });
      let worst = 0;
      for (const p of layout.order) {
        const q = from(band, p.id);
        worst = Math.max(worst, Math.abs(p.x - q.x), Math.abs(p.y - q.y));
      }
      expect(worst).toBe(0);
    });

    it('端の大きさが違うと差が出る：塊まるごと 30px ずれる（80 と 200 の半分の差）', () => {
      const w0 = new BubbleWorld({
        bubbles: [
          Bubble.create({ id: 'e', title: '等間隔', w: 400, h: 200, view: presetView('coverflow') }).state,
          Bubble.create({ id: 'e0', title: '小', w: 80, h: 60, parent: 'e', order: 0 }).state,
          Bubble.create({ id: 'e1', title: '大', w: 200, h: 60, parent: 'e', order: 1 }).state,
        ],
        root: { title: '外の空間', view: presetView('free'), focus: { x: 0, y: 0, z: 0 } },
        implicitSeq: 0,
      });
      const w1 = withAxis(w0, 'e', 'x', { lens: 'parallel' });   // 魚眼だと差が曲がるので平行で測る
      const a = resolveWorld(w1, VIEWPORT);
      const b = resolveWorld(w1, VIEWPORT, { equalExtent: 'band' });
      expect(from(b, 'e0').x - from(a, 'e0').x).toBe(30);
      expect(from(b, 'e1').x - from(a, 'e1').x).toBe(30);
    });

    it('Z の焦点を焦点の面で止めても、起動直後の場面は動かない（どちらも 0）', () => {
      const stop = resolveWorld(world, VIEWPORT, { zFocusStop: 'focus-plane' });
      expect(stop.spaces.get('root')?.focus.z).toBe(0);
      expect(from(stop, 'kinmu').x).toBe(at('kinmu').x);
    });
  });
});

describe('魚眼は、箱の2倍を超える泡は諦める', () => {
  /** 420 幅の泡が 2 つ。root は X 魚眼 */
  const twoCards = () => {
    let w = emptyWorld(presetView('fisheyeX'));
    for (const [id, x] of [['a', -300], ['b', 300]] as const)
      w = w.add(Bubble.create({ id, title: id, hue: 0, w: 420, h: 300, parent: null, order: 0, free: { x, y: 0, z: 0 } }));
    return w;
  };
  const lensOf = (vw: number) =>
    resolveWorld(twoCards(), { w: vw, h: 600 }).spaces.get('root')?.view.x.lens;

  it('泡が箱の2倍までなら、魚眼のまま（収めれば読める）', () => {
    expect(lensOf(900)).toBe('fisheye');
    expect(lensOf(420)).toBe('fisheye');   // 1 倍
    expect(lensOf(211)).toBe('fisheye');   // 1.99 倍
    // ★ 詳細を2つ開いて並び（840）になった場面が、箱 815 で巻き込まれないこと
    expect(lensOf(815 / 840 * 420 + 1)).toBe('fisheye');
  });

  it('泡が箱の2倍を超えたら、平行に落とす（収めてもほかが潰れる）', () => {
    // 岸に窓を貼って海が 151 しか残らない、という実測の場面（2.8 倍）。
    // 前はここで倍率 6e-05 になって消えた
    expect(lensOf(151)).toBe('parallel');
    expect(lensOf(209)).toBe('parallel');  // 2.01 倍
  });

  it('諦めるのは軸ごと ── Y は触らない', () => {
    const L = resolveWorld(twoCards(), { w: 151, h: 600 }).spaces.get('root');
    expect(L?.view.x.lens).toBe('parallel');
    expect(L?.view.y.lens).toBe('parallel');   // fisheyeX は元から Y が平行
  });
});
