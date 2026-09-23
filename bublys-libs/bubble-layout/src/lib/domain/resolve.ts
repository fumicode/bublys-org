/**
 * 解く順番 ── 値 → 位置（並べ方） → 画面（レンズ）。★ 合成はここ1回だけ。
 *
 * 元：lab.html 708-800 行（resolveSpace・resolveAll・compose・contentOf）
 *
 *   resolveSpace(空間, その空間を持つ泡の画面上の配置 host):
 *     各軸について   値 → 位置（並べ方） → 画面（レンズ）
 *     ★ 合成はここ1回だけ
 *         画面x = host.left + ローカルx × host.scale
 *         scale = host.scale × ローカルscale
 *     中に空間を持つ泡なら、その配置で再帰
 *
 * 深さ n でも scale は数値1つ。切り抜きはしない。
 *
 * ── ここは純関数 ──────────────────────────────────────────────
 * ★ 状態はクラス（Bubble・BubbleWorld）、解決はこの純関数、と分けた。
 *   理由：解決は毎フレーム走り、泡の数だけ配置を作る。配置は「値から出てくる導出物」で、
 *   同一性も不変性の保証も要らない。毎フレームクラスを作り直すのは代金だけ払って何も買わない。
 *   逆に状態（値）の側は書き換えが数えるほどしか起きないので、不変のクラスで持つ。
 *
 * ★ lab.html との違いを1つだけ持っている（実装する人へ）
 *   lab の resolveSpace は 725-729 行で「焦点を約束の中へ戻す」を **状態に書き込んで** いる
 *   （sp.focus[axis] = fitFocus(...)）。ここは読むだけの関数なので書き込まない。
 *   代わりに、約束へ戻したあとの焦点を SpaceLayout.focus に入れて返す。
 *   ★ 画面・逆写し・操作は必ず SpaceLayout.focus を読むこと（世界の state.focus を直に読まない）。
 *   状態の側へ書き戻したいときだけ withFittedFocus() を呼ぶ（feature 層の仕事）。
 *
 * ★ 補間（ease/anim）と、並べ替え中の「持ち上げ」（カーソルについてくる）は ui の仕事。
 *   ここが返すのは「いまの値から出てくる目標の配置」だけ（lab の mode="snap" に当たる）。
 */
import { ROOT_SPACE } from './types.js';
import type { BubbleId, Rect, Size, SpaceId, Vec3, Focus } from './types.js';
import type { Bubble } from './bubble.js';
import type { BubbleWorld } from './world.js';
import { resolveRules } from './rules.js';
import type { LayoutRules } from './rules.js';
import { viewOfSpace } from './view.js';
import type { ResolvedView } from './view.js';
import { arrangeAxis } from './arrange.js';
import type { Arranged } from './arrange.js';
import { imageOf, LENS_XY, LENS_Z } from './lens.js';
import type { LensXyId, LensZId } from './lens.js';
import { halfOf, headOf, lensContext, measureAll, measureBox } from './measure.js';
import type { BoxSizes, LensContext } from './measure.js';
import { fitFocus } from './project.js';

/** 空間を持つ泡の「中身の箱」＝ その中の空間の土台。lab.html 745-752 行 contentOf */
export interface Host {
  /** 中身の箱の中心（画面） */
  readonly cx: number;
  readonly cy: number;
  /** 中身の箱の素の大きさ（scale をかける前） */
  readonly w: number;
  readonly h: number;
  /** 合成された倍率（深さ n でも数値1つ） */
  readonly scale: number;
  /** 補間を通した透明度 */
  readonly alpha: number;
  /** 補間を通さないレンズの答え（見えるか）。0 なら掴めない */
  readonly vis: number;
  /** 入れ子の深さ（root が 0） */
  readonly depth: number;
}

/** 泡ひとつの、画面の上での置き場所 */
export interface Placement extends Rect {
  readonly id: BubbleId;
  readonly b: Bubble;
  /** この泡がいる空間 */
  readonly space: SpaceId;
  readonly depth: number;
  /** 合成された倍率（host.scale × ローカル） */
  readonly scale: number;
  /** ローカルの倍率だけ（合成する前） */
  readonly local: number;
  /** この泡の Z の倍率（逆写しに要る。lab.html 774 行 m） */
  readonly m: number;
  readonly alpha: number;
  readonly vis: number;
  /** 空間の中での位置（軸ごと。並べ方の答え） */
  readonly pos: Vec3;
  /** 箱の素の大きさ（scale をかける前） */
  readonly box: Size;
}

/** 1つの空間ぶんの解。ドラッグの逆写しがこれを読む（lab.html 721 行 LAYOUT の値） */
export interface SpaceLayout {
  readonly id: SpaceId;
  readonly host: Host;
  readonly view: ResolvedView;
  readonly arr: { readonly x: Arranged; readonly y: Arranged; readonly z: Arranged };
  readonly kids: readonly Bubble[];
  /** 自分の中身の箱の半幅（host ではなく measure の答えで測る。lab.html 720 行） */
  readonly H: { readonly x: number; readonly y: number };
  readonly ctx: LensContext;
  /** ★ 約束の中へ戻したあとの焦点。読む側はこれを使う（上の「lab との違い」） */
  readonly focus: Focus;
  readonly sizeOf: (b: Bubble) => Size;
}

/** 1フレームの解 */
export interface Layout {
  /** 描く順（奥 → 手前）。z-index にこの添字をそのまま入れる */
  readonly order: readonly Placement[];
  readonly byId: ReadonlyMap<BubbleId, Placement>;
  readonly spaces: ReadonlyMap<SpaceId, SpaceLayout>;
  readonly boxes: BoxSizes;
}

export interface Viewport {
  readonly w: number;
  readonly h: number;
}

/**
 * 1フレーム解く。lab.html 786-800 行 resolveAll。
 *
 * 描く順は `q.dz − p.dz || q.dist − p.dist || 並び順`（Z が同じなら、**焦点に近いものが手前**）。
 * View の外の状態は持たない。3つとも同じなら上下は View から決まらない（＝ Z に「順序」を刺す）。
 * ③ 見えない親は、見えている子がいるときだけ見える（lab.html 795-799 行）。
 */
export function resolveWorld(
  world: BubbleWorld,
  viewport: Viewport,
  rules?: Partial<LayoutRules>,
): Layout {
  const R = resolveRules(rules);
  const boxes = measureAll(world, R);
  const spaces = new Map<SpaceId, SpaceLayout>();
  const sink: Mutable<Placement>[] = [];
  resolveSpace(
    world,
    ROOT_SPACE,
    { cx: viewport.w / 2, cy: viewport.h / 2, w: viewport.w, h: viewport.h, scale: 1, alpha: 1, vis: 1, depth: 0 },
    boxes,
    R,
    spaces,
    sink,
  );
  const byId = new Map<BubbleId, Placement>(sink.map((p) => [p.id, p]));
  // ③ 見えない親は体を持たないので、見えている子がいるときだけ見える（枠も縁も）。
  //   子は親より後ろに並ぶので、後ろから（lab.html 795-799 行）
  for (let i = sink.length - 1; i >= 0; i--) {
    const p = sink[i];
    if (p.b.state.implicit)
      p.vis = world.kidsOf(p.id).some((k) => (byId.get(k.id)?.vis ?? 0) > 0) ? p.vis : 0;
  }
  return { order: sink, byId, spaces, boxes };
}

/** 書きながら組み立てる用（返すときは readonly の Placement / SpaceLayout として渡す） */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * 1つの空間を解く。lab.html 719-785 行 resolveSpace（補間・持ち上げ・掴んでいる泡の抜き出しは ui なので無い）。
 */
function resolveSpace(
  world: BubbleWorld,
  spaceId: SpaceId,
  host: Host,
  boxes: BoxSizes,
  rules: LayoutRules,
  spaces: Map<SpaceId, SpaceLayout>,
  sink: Mutable<Placement>[],
): void {
  const view = viewOfSpace(world, spaceId);
  const kids = world.kidsOf(spaceId);
  const sizeOf = (b: Bubble) => measureBox(world, b.id, boxes, rules);
  const arr = {
    x: arrangeAxis({ axisView: view.x, axis: 'x', spaceId, kids, sizeOf, world, rules }),
    y: arrangeAxis({ axisView: view.y, axis: 'y', spaceId, kids, sizeOf, world, rules }),
    z: arrangeAxis({ axisView: view.z, axis: 'z', spaceId, kids, sizeOf, world, rules }),
  };
  // 約束(2)の箱は補間を通さない答え（measure）で測る。補間中の箱で測ると、焦点が補間の進み方しだいで変わる
  let own: { w: number; h: number };
  if (spaceId === ROOT_SPACE) own = { w: host.w, h: host.h };
  else {
    const m = measureBox(world, spaceId, boxes, rules);
    own = { w: m.w, h: m.h - headOf(world, spaceId) };
  }
  const L: Mutable<SpaceLayout> = {
    id: spaceId,
    host,
    view,
    arr,
    kids,
    sizeOf,
    H: halfOf(own),
    ctx: ZERO_CTX,
    focus: ZERO_FOCUS,
  };
  // ★ 焦点はいつも約束の中にいる（fitFocus）。約束は 焦点・View・中身 の三つで決まるので、焦点を書いたときだけ当てると
  //   軸セレクタや「外から継ぐ」で View が変わったとき古い焦点が残る。写す前に、いまの View と中身で約束の中へ戻す。
  //   ★ lab は状態に書き戻していた（sp.focus[axis] = …）。ここは読むだけなので L.focus に持つ（resolve.withFittedFocus）
  const passZ = world.windowOf(spaceId) !== spaceId;   // ③ 見えない親の Z は外の窓のもの（約束も外が守る）
  const at = world.focusOf(spaceId);
  const focus: Focus = {
    x: fitFocus(L, 'x', at.x, at.x, rules),
    y: fitFocus(L, 'y', at.y, at.y, rules),
    // ③ 見えない親の Z は窓のもの。窓は先に解かれているので、そこで約束に入れた値を使う
    z: passZ
      ? spaces.get(world.windowOf(spaceId))?.focus.z ?? at.z
      : fitFocus(L, 'z', at.z, at.z, rules),
  };
  L.focus = focus;
  const ctx = lensContext(world, spaceId, host, focus);   // このフレームの焦点（目を足す前）
  L.ctx = ctx;
  spaces.set(spaceId, L);

  const lx = LENS_XY[view.x.lens as LensXyId];
  const ly = LENS_XY[view.y.lens as LensXyId];
  const lz = LENS_Z[view.z.lens as LensZId];

  const items = kids.map((b, i) => {
    const pos: Vec3 = {
      x: arr.x.pos.get(b.id) ?? 0,
      y: arr.y.pos.get(b.id) ?? 0,
      z: arr.z.pos.get(b.id) ?? 0,
    };
    const box = sizeOf(b);
    const px = imageOf(pos.x, box.w, lx, ctx.H.x, ctx.focus.x);   // ① 位置 − 焦点 → レンズ（軸ごと。泡の像）
    const py = imageOf(pos.y, box.h, ly, ctx.H.y, ctx.focus.y);
    // ③ 見えない親は奥行きに置かれない（体が無い）。中の泡の奥行きは、窓の焦点から測る
    const dz = b.state.implicit ? 0 : pos.z - ctx.focus.z;
    const m = lz.mag(dz);                                          // そのあと Z で消失点へ寄せる
    const target = {
      x: ctx.vp.x + (px.s - ctx.vp.x) * m,
      y: ctx.vp.y + (py.s - ctx.vp.y) * m,
      // ① 大きさの倍率は数値1つ ＝ Z の倍率 × min(X の像の倍率, Y の像の倍率)。端での下限は持たない
      scale: m * Math.min(px.k, py.k),
      alpha: lz.alpha(dz),
      w: box.w,
      h: box.h,
    };
    // 焦点からの隔たり（写ったあとの、泡の**中心**で測る）。前後を決める second key
    const dist = Math.hypot(px.s, py.s);
    return { b, i, dz, m, pos, target, dist };
  });
  /**
   * ★ 空間ごとに Z で1回だけ（奥 → 手前）。Z が同じなら **焦点に近いものが手前**
   *   （coverflow の中央が上に来る）。それも同じ（左右対称に置いた など）なら、決まらない
   *   ──「置いた順」という View の外の状態は持たない。
   *
   * ★ 前は「**大きく写るもの**が手前」だった。これだと**幅の広い泡が損をする** ──
   *   倍率は「像の幅 ÷ 実際の幅」なので、魚眼は幅に罰を与える（v7 の実測 0.755 ＜ 0.773）。
   *   中央に来た広い泡が、端にいる細い泡より小さく写って**奥へ回ってしまう**。
   *   見る側の言葉は「**真ん中に来たものが手前**」なので、隔たりで決める。
   */
  items.sort((p, q) => q.dz - p.dz || q.dist - p.dist || p.i - q.i);

  for (const it of items) {
    const a = it.target;                      // domain は補間しない（lab の mode="snap" と同じ）
    const r = compose(host, a);
    const place: Mutable<Placement> = {
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      scale: r.scale,
      alpha: r.alpha,
      vis: host.vis * a.alpha,
      id: it.b.id,
      b: it.b,
      space: spaceId,
      depth: host.depth + 1,
      local: a.scale,
      m: it.m,
      pos: it.pos,
      box: { w: a.w, h: a.h },
    };
    sink.push(place);
    if (world.isHost(it.b.id)) resolveSpace(world, it.b.id, contentOf(world, place), boxes, rules, spaces, sink);
  }
}

const ZERO_FOCUS: Focus = { x: 0, y: 0, z: 0 };
const ZERO_CTX: LensContext = { focus: ZERO_FOCUS, H: { x: 1, y: 1 }, vp: { x: 0, y: 0 } };

/** ★ 合成。lab.html 741-744 行 compose。深さ n でも scale は数値1つ */
export function compose(
  host: Host,
  local: { readonly x: number; readonly y: number; readonly scale: number; readonly alpha: number; readonly w: number; readonly h: number },
): Rect & { readonly scale: number; readonly alpha: number } {
  const scale = host.scale * local.scale;
  const w = local.w * scale;
  const h = local.h * scale;
  return {
    x: host.cx + local.x * host.scale - w / 2,
    y: host.cy + local.y * host.scale - h / 2,
    w,
    h,
    scale,
    alpha: host.alpha * local.alpha,
  };
}

/** 空間を持つ泡の配置 → その中身の箱（子の空間の host）。lab.html 745-752 行 */
export function contentOf(world: BubbleWorld, p: Placement): Host {
  const hd = headOf(world, p.id);
  return {
    cx: p.x + p.w / 2,
    cy: p.y + (hd + (p.box.h - hd) / 2) * p.scale,
    w: p.box.w,
    h: p.box.h - hd,
    scale: p.scale,
    alpha: p.alpha,
    vis: p.vis,
    depth: p.depth,
  };
}

/** 中身の箱の画面での矩形。lab.html 751-752 行 contentRect（「外へ大きく引き出したか」を測るのに使う） */
export function contentRect(host: Host): Rect {
  return {
    x: host.cx - (host.w / 2) * host.scale,
    y: host.cy - (host.h / 2) * host.scale,
    w: host.w * host.scale,
    h: host.h * host.scale,
  };
}

/**
 * 解いたときに約束の中へ戻した焦点を、状態へ書き戻す。
 * lab は毎フレーム状態に書いていた（resolveSpace 725-729 行）。ここでは呼ぶ側が決める。
 * 呼ばなくても画面は変わらない（読む側は SpaceLayout.focus を使うので）。
 */
export function withFittedFocus(world: BubbleWorld, layout: Layout): BubbleWorld {
  let next = world;
  for (const L of layout.spaces.values()) {
    // ③ 見えない親の Z は外の窓のものなので、書き戻すのは X・Y だけ（lab.html 726 行の passZ）
    const passZ = world.windowOf(L.id) !== L.id;
    next = next.withFocus(L.id, passZ ? { x: L.focus.x, y: L.focus.y } : L.focus);
  }
  return next;
}
