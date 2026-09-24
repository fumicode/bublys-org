/**
 * ① View ── 軸（X・Y・Z）ごとの「次元・並べ方・レンズ」。これが入れ子ごとに繰り返される。
 * ＋ 継承（並べ方は外から継ぐ。焦点は継がない）と、軸セレクタ。
 *
 * 元：lab.html 392-417 行（プリセット・見えない親の View）、520-570 行（viewOf・fitArrange・setAxis・applyPreset）
 */
import { METRICS, ROOT_SPACE } from './types.js';
import type { Axis, PlaneAxis, Focus, SpaceId } from './types.js';
import type { ArrangeId, Align } from './arrange.js';
import { verbOf } from './dimension.js';
import type { DimensionId } from './dimension.js';
import type { LensId } from './lens.js';
import type { BubbleWorld } from './world.js';

/** 1つの軸の View。step は「等間隔」の間隔、gap と align は「詰める」の帯に効く（④ View の軸が持つ） */
export interface AxisView {
  readonly dim: DimensionId;
  readonly arrange: ArrangeId;
  readonly lens: LensId;
  readonly step: number;
  readonly gap?: number;
  readonly align?: Align;
  /**
   * 「詰める」並びの、**始端に空けておく量**（既定 0）。一覧の口（＋新規）の場所などに使う。
   *
   * ★ ④ 詰める並びは**箱の中央**に来る。中央のまま上に場所を空けるには、
   *   上下に同じだけ余らせるしかなく、**欲しい高さの 2 倍**を取られる。
   *   そのうえ札が少ないと、余ったぶんが上にも回って**口と1枚目のあいだが間延びする**。
   *   これを持つ軸では、並びごと動かして「**空けた量のすぐ下から積む**」ようにする
   *   （動かす量は箱と中身から毎フレーム決まる ── `resolve.anchorRun`）。
   */
  readonly reserve?: number;
}

/** X/Y は LensXyId、Z は LensZId しか意味を持たない（実体は同じ AxisView） */
export interface View {
  readonly x: AxisView;
  readonly y: AxisView;
  readonly z: AxisView;
}

/**
 * 継承をたどったあとの View。
 * focus はその空間自身のもの（継がない）。own はその空間が自前の View を持っているか。
 * lab.html 521-528 行 viewOf の戻り。
 */
export interface ResolvedView extends View {
  readonly focus: Focus;
  readonly own: boolean;
}

export type PresetId =
  | 'free' | 'row' | 'column' | 'grid' | 'fisheyeX'
  | 'coverflow' | 'coverflowY' | 'coverflowGrid'
  | 'histZ' | 'stackZ' | 'stackDepth';

export interface Preset extends View {
  readonly label: string;
}

/** lab.html 393 行 AX。View の軸は「次元・並べ方・レンズ・間隔」だけ */
const AX = (dim: DimensionId, arrange: ArrangeId, lens: LensId, step: number): AxisView => ({
  dim,
  arrange,
  lens,
  step,
});

/** lab.html 394-406 行。どれも「軸ごとの 次元・並べ方・レンズ」だけ */
export const PRESETS: Readonly<Record<PresetId, Preset>> = {
  free:      { label: '自由に置く',     x: AX('free.x', 'as-is', 'parallel', 110),      y: AX('free.y', 'as-is', 'parallel', 80),         z: AX('free.z', 'as-is', 'perspective', 1) },
  row:       { label: '横に並べる',     x: AX('order', 'pack', 'parallel', 110),        y: AX('none', 'pack', 'parallel', 80),            z: AX('none', 'as-is', 'flat', 1) },
  column:    { label: '縦に並べる',     x: AX('none', 'pack', 'parallel', 110),         y: AX('order', 'pack', 'parallel', 80),           z: AX('none', 'as-is', 'flat', 1) },
  grid:      { label: '格子',           x: AX('col', 'pack', 'parallel', 110),          y: AX('row', 'pack', 'parallel', 80),             z: AX('none', 'as-is', 'flat', 1) },
  fisheyeX:  { label: 'X魚眼ビュー',    x: AX('history.index', 'equal', 'fisheye', 64), y: AX('history.branch', 'equal', 'parallel', 44), z: AX('none', 'as-is', 'flat', 1) },
  coverflow: { label: 'coverflow',      x: AX('order', 'equal', 'fisheye', 68),         y: AX('none', 'pack', 'parallel', 80),            z: AX('none', 'as-is', 'flat', 1) },
  /**
   * ★ **縦の coverflow** ── coverflow の X と Y を入れ替えただけ。足した仕掛けは 1 つも無い。
   *
   *   順序を**縦に**等間隔で置き、Y に魚眼を掛ける。焦点の札が原寸で、上下へ離れるほど潰れる。
   *   横は「なし・詰める・平行」＝ みんな同じ所（箱の横の中央）。
   *   ラボ（v3 の 06-layout-apart）が「作れる。足すもの無し」と数えていたものが、これ。
   */
  coverflowY:{ label: '縦の coverflow', x: AX('none', 'pack', 'parallel', 110),         y: AX('order', 'equal', 'fisheye', 68),           z: AX('none', 'as-is', 'flat', 1) },
  /**
   * ★ **折り返した coverflow** ── coverflow を**2 行以上**に折った形。
   *
   *   軸に刺すのは順序ではなく**列と行**（`col` / `row`）。どこで折り返すかは
   *   「順序 → 列・行」を書く側が決める ── 箱に何列入るかは箱の話なので、
   *   View（見え方）ではなく、並べる側が持つ（一覧なら `listArrange` の `colsFor`）。
   *   両方の軸を等間隔・魚眼にすると、**焦点の札だけが原寸で、離れるほど縦にも横にも潰れる**。
   *   ラボ（v3 の 06-layout-apart）が「2D魚眼の格子」と呼んでいたのがこれ。
   */
  coverflowGrid:{ label: '折り返す coverflow', x: AX('col', 'equal', 'fisheye', 68),    y: AX('row', 'equal', 'fisheye', 68),             z: AX('none', 'as-is', 'flat', 1) },
  histZ:     { label: '履歴を奥行きに', x: AX('none', 'as-is', 'parallel', 110),        y: AX('none', 'as-is', 'parallel', 80),           z: AX('history.age', 'equal', 'perspective', 1) },
  // ★ 重なりの上下を View の中で決めたいなら、Z に「順序」を刺す。触った泡が最前面（順序 0）へ並べ替わる。
  //   自由座標のままだと、同じ値で重なった兄弟の上下は決まらない（座標は同点を許すので）
  stackZ:    { label: '重ねて置く',     x: AX('free.x', 'as-is', 'parallel', 110),      y: AX('free.y', 'as-is', 'parallel', 80),         z: AX('order', 'equal', 'perspective', 0.15) },
  /**
   * ★ **奥行きに重ねる** ── 一覧が縦に収まらなくなったときの行き先。
   *
   * ★ **ずれは X・Y に刺さない。** 議事録（版）＝ `histZ` と同じで、X・Y は「なし·そのまま」。
   *   奥へ行くほど左上へずれるのは、**消失点**（root は画面中心から −130, −165）に
   *   寄っていくからで、次元で作るものではない。X・Y に順序を刺すと消失点と喧嘩して、
   *   左右にも散る。**違うのは次元だけ** ── 履歴の古さではなく順序。
   *   **刻みは議事録と同じ 1。** ここを細かくすると（0.15 / 0.3 で試した）1 段あたり
   *   4〜8px しか退かず、手前の札が後ろを丸ごと隠す ── 実測で 2 度踏んだ。
   *   1 段 1 なら透視が 0.79 → 0.66 → 0.56 … と効いて、後ろが順に覗く。
   *   **何枚まで出すかは決めない** ── 奥へ行くほど小さくなり、描く下限を切ったところで
   *   自然に消える（`markTiny`）。数で切るのではなく、読めなくなったら消える。
   * 奥のものは読めなくてよい ── **在ることは諦めない**。
   */
  stackDepth:{ label: '奥行きに重ねる', x: AX('none', 'as-is', 'parallel', 110),        y: AX('none', 'as-is', 'parallel', 80),           z: AX('order', 'equal', 'perspective', 1) },
};

/** プリセット → View の写し。lab.html 407 行 viewFromPreset */
export function presetView(id: PresetId): View {
  const p = PRESETS[id];
  return { x: { ...p.x }, y: { ...p.y }, z: { ...p.z } };
}

/**
 * ③ 見えない親の View。lab.html 409-417 行 snapView。
 * 縁の軸は 順序·詰める·平行（隙間 0 ＝ 縁が接する）、もう一方は なし·詰める（始端ぞろえ）。
 * Z は書かない ── 軸まるごと外の窓のもの（viewOfSpace が差し替える）。
 */
export function snapView(axis: PlaneAxis): Pick<View, 'x' | 'y'> {
  const along: AxisView = { dim: 'order', arrange: 'pack', lens: 'parallel', step: 110, gap: METRICS.SNAP_GAP };
  const cross: AxisView = { dim: 'none', arrange: 'pack', lens: 'parallel', step: 80, gap: METRICS.SNAP_GAP };
  return { x: axis === 'x' ? along : cross, y: axis === 'y' ? along : cross };
}

/**
 * 継承。lab.html 521-528 行 viewOf。
 * - 自前の view を持つ空間はそれを使う
 * - 持たない空間は並べ方を外から継ぐ。**焦点は継がない**（継ぐと窓が自分の視点を失う）
 * - ③ 見えない親の Z は軸まるごと窓のもの（焦点だけ通すと、同じ泡が並びの中と外で別の大きさになる）
 */
export function viewOfSpace(world: BubbleWorld, spaceId: SpaceId): ResolvedView {
  const own = world.ownViewOf(spaceId);
  const up = world.parentOf(spaceId);
  const src: View = own ?? (up === null ? world.state.root.view : viewOfSpace(world, up));
  const bubble = spaceId === ROOT_SPACE ? null : world.bubble(spaceId);
  const implicit = !!bubble && bubble.state.implicit;
  const z = implicit ? viewOfSpace(world, world.windowOf(spaceId)).z : src.z;
  return {
    x: { ...src.x },
    y: { ...src.y },
    z: { ...z },
    focus: world.focusOf(spaceId),
    own: !!own,
  };
}

/** 次元に合う並べ方。lab.html 531-538 行 fitArrange。'as-is' は px を持つ次元（自由）だけに意味がある */
export function fitArrange(dim: DimensionId, arrange: ArrangeId): ArrangeId {
  const verb = verbOf(dim);
  if (verb === 'coord') return 'as-is';
  if (verb === 'none') return arrange;
  if (arrange !== 'as-is') return arrange;
  return dim.startsWith('history.') ? 'equal' : 'pack';
}

/** 軸を1つ差し替えた View（残りはそのまま） */
const putAxis = (view: View, axis: Axis, A: AxisView): View => ({
  x: axis === 'x' ? A : view.x,
  y: axis === 'y' ? A : view.y,
  z: axis === 'z' ? A : view.z,
});

/**
 * 軸セレクタ。lab.html 541-549 行 setAxis。
 * その空間に自前の View を持たせてから変える（継いでいたなら、いまの見え方を写し取る）。
 * ③ 見えない親は View を選べないので、書き先は windowOf(spaceId) へ回る。
 */
export function withAxis(
  world: BubbleWorld,
  spaceId: SpaceId,
  axis: Axis,
  patch: Partial<AxisView>,
): BubbleWorld {
  const target = world.windowOf(spaceId);
  const own = world.ownViewOf(target);
  let base: View;
  if (own) base = own;
  else {
    const v = viewOfSpace(world, target);        // 継いでいたなら、いまの見え方を写し取る
    base = { x: v.x, y: v.y, z: v.z };
  }
  let A: AxisView = { ...base[axis], ...patch };
  // 次元だけ変えたときは、その次元に合う並べ方へ寄せる
  if (patch.dim && !patch.arrange) A = { ...A, arrange: fitArrange(A.dim, A.arrange) };
  return world.withView(target, putAxis(base, axis, A));
}

/** プリセットを当てる。lab.html 550-557 行 applyPreset。焦点は 0 に戻す。書き先は窓 */
export function withPreset(world: BubbleWorld, preset: PresetId, spaceId: SpaceId): BubbleWorld {
  if (!PRESETS[preset]) throw new Error('プリセットが無い: ' + preset);
  const target = world.windowOf(spaceId);
  return world.withView(target, presetView(preset)).withFocus(target, { x: 0, y: 0, z: 0 });
}

/** 外から継ぐ（自前の View を捨てる）。lab.html 558 行 inheritView。root は捨てられない */
export function withInheritedView(world: BubbleWorld, spaceId: SpaceId): BubbleWorld {
  const target = world.windowOf(spaceId);
  if (target === ROOT_SPACE) return world;
  return world.withView(target, null);
}
