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
import { chromeOf, halfOf, lensContext, measureAll, measureBox, padOf } from './measure.js';
import type { Chrome } from './chrome.js';
import type { BoxSizes, ChromeMap, LensContext } from './measure.js';
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
  /**
   * **どれだけ寄って見ているか**（1 が等倍）。**いちばん外側の土台だけが 1 以外を持つ。**
   *
   * ★ **レンズの外側に掛かる。** レンズ（①）は「位置 → 箱の中の像」で、箱の半幅 `H` は
   *   ここでは動かない ── だから寄っても魚眼の効き方は変わらず、**像ごと大きくなる**だけ。
   *
   * ★ 窓（空間を持つ泡）の中には掛けない（`contentOf` は 1 を渡す）。窓の中は画面1 で、
   *   箱の大きさはその窓のもの。そこに寄りを足すと中身が窓の外へ溢れる。
   *   外側が寄れば窓ごと大きくなるので、中身も一緒に大きく写る ── それで足りる。
   */
  readonly zoom: number;
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
  /** このフレームだけ、どの泡がどの装いを着ているか（模型の値ではない。measure.ts の ChromeMap） */
  chrome?: ChromeMap,
  /**
   * このフレームだけ Z の焦点に足す量（空間ごと）。**約束（`fitFocus`）の外**に出る。
   *
   * ★ 端で跳ね返る（オーバースクロール）ためのもの。端は模型の決まりなので動かせないが、
   *   「これ以上いけない」は見せないと伝わらない ── 行き過ぎて戻る山を、ここで一瞬だけ足す。
   *   **世界には1ミリも書かない**（`withFittedFocus` を呼ばなければ焼き付かない）。
   */
  nudge?: ReadonlyMap<SpaceId, number>,
  /**
   * **並べたあとに、その泡の外へ足す装い。**
   *
   * ★ 並べ方はこれを**見ない** ── 一覧の札を選んで装いが出ても、帯も刻みも中央ぞろえも
   *   1px も変わらない。変わるのは「その泡の外側に装いが足された」ことだけで、
   *   **出た泡の中身は動かない**。重なってしまう周りだけが、装いの取ったぶん逃げる
   *   （`pushedAround`）。
   * ★ 逃げるのは**平行に詰めている軸**だけ。魚眼・透視・「そのまま置く」では誰も動かない
   *   ── そちらは並べ直す話ではなく、ただ装いが出るだけ。
   */
  dressed?: ReadonlyMap<BubbleId, Chrome>,
): Layout {
  const R = resolveRules(rules);
  const boxes = measureAll(world, R, chrome);
  const spaces = new Map<SpaceId, SpaceLayout>();
  const sink: Mutable<Placement>[] = [];
  resolveSpace(
    world,
    ROOT_SPACE,
    { cx: viewport.w / 2, cy: viewport.h / 2, w: viewport.w, h: viewport.h, scale: 1, zoom: world.zoom, alpha: 1, vis: 1, depth: 0 },
    boxes,
    R,
    spaces,
    sink,
    nudge,
    chrome,
    dressed,
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
/**
 * ③ **見えない親は体を持たない ＝ 自分の奥行きも持たない。中身と同じ面にいる。**
 *
 * ラボは並びを奥行き 0 に置きっぱなしにしていた（lab.html の `b.implicit ? 0 : …`）。
 * だと中の泡だけがホイールで奥へ退き、**点線の枠だけが原寸のまま**残って、
 * 中身のまわりに大きな空箱ができる（実測：窓の中でホイールを回すと、枠が縮まない）。
 *
 * 並びは中身の**まとまり**でしかないので、中身と同じ面に置く。
 * 中身のいちばん手前の面を採る ── 中で奥行きが割れていても、並びは手前の面に立つ。
 * @returns その並びが立つ面（窓の Z の値。空なら 0）
 */
function rowPlane(
  world: BubbleWorld,
  rowId: SpaceId,
  sizeOf: (b: Bubble) => Size,
  rules: LayoutRules,
): number {
  const kids = world.kidsOf(rowId);
  if (!kids.length) return 0;
  const A = viewOfSpace(world, rowId).z;       // ③ ＝ 窓の Z（viewOfSpace が差し替えている）
  const ar = arrangeAxis({ axisView: A, axis: 'z', spaceId: rowId, kids, sizeOf, world, rules });
  return Math.min(...kids.map((k) => ar.pos.get(k.id) ?? 0));
}

function resolveSpace(
  world: BubbleWorld,
  spaceId: SpaceId,
  host: Host,
  boxes: BoxSizes,
  rules: LayoutRules,
  spaces: Map<SpaceId, SpaceLayout>,
  sink: Mutable<Placement>[],
  /** そのフレームだけ Z の焦点に足す量（約束の外。resolveWorld の註） */
  nudge?: ReadonlyMap<SpaceId, number>,
  /** このフレームだけの装い（箱＝中身＋装い） */
  chrome?: ChromeMap,
  /** 並べたあとに外へ足す装い（`resolveWorld` の註） */
  dressed?: ReadonlyMap<BubbleId, Chrome>,
): void {
  const view = viewOfSpace(world, spaceId);
  const kids = world.kidsOf(spaceId);
  const sizeOf = (b: Bubble) => measureBox(world, b.id, boxes, rules, chrome);
  const arr: { x: Arranged; y: Arranged; z: Arranged } = {
    x: arrangeAxis({ axisView: view.x, axis: 'x', spaceId, kids, sizeOf, world, rules }),
    y: arrangeAxis({ axisView: view.y, axis: 'y', spaceId, kids, sizeOf, world, rules }),
    z: arrangeAxis({ axisView: view.z, axis: 'z', spaceId, kids, sizeOf, world, rules }),
  };
  // 約束(2)の箱は補間を通さない答え（measure）で測る。補間中の箱で測ると、焦点が補間の進み方しだいで変わる
  let own: { w: number; h: number };
  if (spaceId === ROOT_SPACE) own = { w: host.w, h: host.h };
  else {
    /**
     * ★ 空間の中身は、箱から**装いのぶんを引いた**所。
     *   前は縦だけ（ヘッダ 24）引いていて、横は箱いっぱいのつもりだった ──
     *   CSS は左右も 7px 内側に置いているので、模型と絵が 14px ずれていた。
     */
    const m = measureBox(world, spaceId, boxes, rules, chrome);
    const c = chromeOf(world, spaceId, chrome);
    own = { w: m.w - (c.left + c.right), h: m.h - (c.top + c.bottom) };
  }
  /**
   * ④ 詰める並びは**箱の中央**に来る。その軸が「始端に空けておく量」（`reserve`）を持つなら、
   * 並びごと動かして**空けた量のすぐ下から積む**。
   *
   * ★ 動かす量は**箱と中身から毎フレーム決める** ── 固定の数で持つと、札が増えたり
   *   選んで背が伸びたりしたときに狂う（中央ぞろえの余りは中身の高さで変わるので）。
   * ★ 箱は動かさない。
   * ★ **中身が箱に入らないときこそ動かす。** 前は「入らないなら触らない」としていたので、
   *   入りきらない並びが中央ぞろえのまま上へはみ出し、**空けたはずの所（＋新規の口）に
   *   札が被って**いた（実測）。空けるのは「そこに口がある」という話で、
   *   中身が収まるかどうかとは関係がない。
   */
  for (const axis of ['x', 'y'] as const) {
    const reserve = view[axis].reserve ?? 0;
    if (!arr[axis].bands.length) continue;
    const pad = padOf(world, spaceId);
    const half = (axis === 'x' ? own.w : own.h) / 2;
    const lo = Math.min(...arr[axis].bands.map((b) => b.start));
    const hi = Math.max(...arr[axis].bands.map((b) => b.end));
    /**
     * ★ **収まらない並びは始端ぞろえ。** 中央ぞろえは「収まるからこそ」意味がある
     *   ── 収まらないものを中央に置くと、**始めと終わりが同じだけ箱の外へ出る**。
     *   一覧はふつう頭から読むものなので、見えているのが真ん中からでは
     *   「頭に戻る」から始めなければならない（実測：格子に切り替えると
     *   いちばん上の行が箱の上へ出て、送らないと 1 行目が見えなかった）。
     *   終わりのほうは送れば見に行ける（`fitFocus`）。
     * ★ 見るのは**平行な軸だけ**。魚眼・透視はレンズが箱に収めてしまうので、
     *   「はみ出す」という事がそもそも起きない（模型の値で測ると必ずはみ出して見える）。
     * ★ **並べている向きだけ。** その軸に次元が刺さっていなければ、はみ出しているのは
     *   「札 1 枚が箱より大きい」だけで、順序が無い ── 頭も終わりも無いのだから
     *   真ん中のままでよく、見たい所へは送って行く（`fitFocus`）。
     */
    const over =
      view[axis].lens === 'parallel' &&
      view[axis].dim !== 'none' &&
      hi - lo > half * 2 - pad * 2 - reserve;
    if (reserve <= 0 && !over) continue;
    arr[axis] = shifted(arr[axis], -half + pad + reserve - lo);
  }

  /**
   * ★ **出た装いのぶんは、周りが逃げる。** 並べ方はここまで一切見ていない
   *   （`arrangeAxis` に渡す `sizeOf` は装いを足していない箱）ので、
   *   選んで装いが出ても**帯も刻みも中央ぞろえも変わらない**。変わるのは、
   *   装いが出た泡の周りが押しのけられることだけ ── その泡自身は 1px も動かない。
   * ★ **中央ぞろえ・始端ぞろえより後に置く。** 先に押しのけると、広がった並びを見て
   *   もう一度そろえ直してしまい、押しのけたぶんが**打ち消される**
   *   ── 実測：頭の札が戻ってきて、代わりに選んだ札が 27px 下がった。
   */
  if (dressed?.size) {
    for (const b of kids) {
      const d = dressed.get(b.id);
      if (!d) continue;
      for (const axis of ['x', 'y'] as const) {
        // 逃げるのは平行に詰めている軸だけ（魚眼・透視・そのまま置く、では誰も動かない）
        if (view[axis].lens !== 'parallel' || view[axis].arrange === 'as-is') continue;
        const at = arr[axis].pos.get(b.id);
        if (at === undefined) continue;
        arr[axis] = pushedAround(arr[axis], at, axis === 'x' ? d.left : d.top, axis === 'x' ? d.right : d.bottom);
      }
    }
  }


  /**
   * ★ **魚眼は、箱の 2 倍を超える泡は諦める。**
   *
   * 魚眼は「中身を箱に収める」ためのものだが、箱よりずっと大きい泡を収めにいくと、
   * その 1 つが箱を埋めきって**ほかがぜんぶ潰れる**。収めた結果が読めないなら、
   * 収めない方がまし ── 諦めた軸は平行になる。はみ出したぶんは器が切るが、
   * 掴んで寄せれば見に行ける。
   *
   * 見るのは**いちばん大きい泡 1 つ**と箱の対比だけで、枚数は見ない
   * ── coverflow のように何枚あっても、箱が泡なみに広ければ焦点のまわりは読める。
   *
   * 実測:
   *   箱 151 に泡 420（2.8 倍）… 窓を岸に貼って海が 151 しか残らなかったとき。
   *                              倍率 6e-05 ＝ 描く下限を切って消えた → 諦める
   *   箱 815 に並び 840（1.03 倍）… 詳細を 2 つ開いて並びになったとき。
   *                              魚眼なら収まって読める → 諦めない
   *   ★ はじめ「泡が原寸で入らなければ諦める」（1 倍）にしたら後者を巻き込み、
   *     並びが平行のまま岸の下へ散った。境目は 1 倍ではなく 2 倍。
   */
  const LENS_GIVE_UP = 2;
  for (const axis of ['x', 'y'] as const) {
    if (view[axis].lens !== 'fisheye') continue;
    let biggest = 0;
    for (const k of kids) {
      const sz = sizeOf(k);
      biggest = Math.max(biggest, axis === 'x' ? sz.w : sz.h);
    }
    const box = axis === 'x' ? own.w : own.h;
    if (biggest > 0 && box * LENS_GIVE_UP < biggest) {
      (view as Mutable<ResolvedView>)[axis] = { ...view[axis], lens: 'parallel' };
    }
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
  const focus: Mutable<Focus> = {
    x: fitFocus(L, 'x', at.x, at.x, rules),
    y: fitFocus(L, 'y', at.y, at.y, rules),
    /**
     * ③ 見えない親の Z は窓のもの（約束も外が守る）。
     * ★ ただし焦点として置くのは**その並びが立つ面**。並びの置き場所で窓の奥行きを
     *   もう掛けてあるので（上の dz）、中の泡はその面からの差だけを見る
     *   ── こうしないと同じ奥行きが二重に掛かる。
     *   面がそろった並び（ふつうはこれ）では、中の泡の差は 0 ＝ 枠と中身が同じ倍率で縮む。
     */
    z: passZ ? rowPlane(world, spaceId, sizeOf, rules) : fitFocus(L, 'z', at.z, at.z, rules),
  };
  // ★ 跳ね返りは**約束のあと**に足す。前に足すと約束が刈り取って、行き過ぎが出ない
  const over = nudge?.get(spaceId);
  if (over) focus.z += over;
  L.focus = focus;
  const ctx0 = lensContext(world, spaceId, host, focus);   // このフレームの焦点（目を足す前）
  /**
   * ★ **透視では、並びぜんぶを空間の中央にそろえる。**
   *
   *   奥へ逃げるぶんの余地は**消失点の側にしか要らない**。それなのに手前の面を空間の
   *   真ん中に置いていたので、反対側に同じだけの余白が空いたまま残っていた
   *   ── 一覧の透視では、いちばん手前の札の下に 28px（奥行きの取り分のちょうど半分）が
   *   死んでいた。root の海では消失点が中心から 165px しか離れていないので、
   *   **手前の泡より下の半分が丸ごと使われない**。
   *
   *   寄せるのは**像の側**（位置 − 焦点）であって、消失点ではない ── 消失点をずらすと
   *   並びごと動いてしまって何も変わらない。手前の面だけを動かせば、
   *   「消失点から手前の泡の遠い縁まで」がちょうど空間の中央に来る。
   */
  const lead = frontLead(view, ctx0, kids, arr, sizeOf);
  const ctx = lead
    ? { ...ctx0, focus: { ...ctx0.focus, x: ctx0.focus.x - lead.x, y: ctx0.focus.y - lead.y } }
    : ctx0;
  L.ctx = ctx;
  spaces.set(spaceId, L);

  const lx = LENS_XY[view.x.lens as LensXyId];
  const ly = LENS_XY[view.y.lens as LensXyId];
  const lz = LENS_Z[view.z.lens as LensZId];

  const items = kids.map((b, i) => {
    const dress = dressed?.get(b.id);
    /**
     * ★ **装いは外へ足す。中身は動かない。**
     *   並べて決まった箱はそのまま中身の居場所。装いはその外側に付くので、
     *   箱は `左+右` ぶん広がり、中心は**左右の差の半分**だけ動く
     *   （上 27・下 7 なら、中心は 10 下がって、中身は 1px も動かない）。
     */
    const grown = sizeOf(b);
    const box = dress
      ? { w: grown.w + dress.left + dress.right, h: grown.h + dress.top + dress.bottom }
      : grown;
    const pos: Vec3 = {
      x: (arr.x.pos.get(b.id) ?? 0) + (dress ? (dress.right - dress.left) / 2 : 0),
      y: (arr.y.pos.get(b.id) ?? 0) + (dress ? (dress.bottom - dress.top) / 2 : 0),
      z: arr.z.pos.get(b.id) ?? 0,
    };
    const px = imageOf(pos.x, box.w, lx, ctx.H.x, ctx.focus.x);   // ① 位置 − 焦点 → レンズ（軸ごと。泡の像）
    const py = imageOf(pos.y, box.h, ly, ctx.H.y, ctx.focus.y);
    // ③ 見えない親は**中身と同じ面**にいる（体が無いので自分の奥行きは持たない）。
    //    奥行きはここで 1 回だけ掛かる ── 中の泡は、この面からの差だけを見る（下の focus.z）
    const dz = (b.state.implicit ? rowPlane(world, b.id, sizeOf, rules) : pos.z) - ctx.focus.z;
    const m = lz.mag(dz);                                          // そのあと Z で消失点へ寄せる
    /**
     * ① 大きさの倍率は数値1つ。**両軸の倍率の積** ＝ Z の倍率 × X の像の倍率 × Y の像の倍率。
     *
     * ★ **比は変えない。** 歪むのは**並べ方の軸**であって、泡そのものではない
     *   （泡を軸ごとに歪ませると中身まで伸び縮みする ── 一度やって捨てた）。
     *   積にすると、遠さが縦横で重なる 4 隅がいちばん小さくなる
     *   ── `min` では 4 隅と上下左右が**同じ大きさ**になってしまって、遠近が言えない。
     * ★ 片方の軸が平行なら、その倍率は 1 なので積は今までの `min` と同じ値になる
     *   ── 縦・横の coverflow も、ラボの X魚眼も、1px も変わらない。
     */
    const kx = px.k;
    const ky = py.k;
    /**
     * ★ **位置は「相手の軸の倍率ぶん」内へ寄る** ＝ 並べ方の軸が曲がる。
     *
     *   魚眼の写真で格子の線が曲がるのと同じ ── 上の行は縦に遠いので、**横にも縮む**。
     *   軸ごとに別々に写すと線は真っ直ぐのままで、「格子を歪ませた」ようには見えない
     *   （実測で踏んだ：列の中心は揃うのに辺が揃わず、余白だけが残った）。
     *   隣どうしの間は「並べ方が持つ隙間」がレンズで縮んだぶん ── 端へ行くほど詰まる。
     */
    const target = {
      x: ctx.vp.x + (px.s * ky - ctx.vp.x) * m,
      y: ctx.vp.y + (py.s * kx - ctx.vp.y) * m,
      scale: m * kx * ky,
      alpha: lz.alpha(dz, view.z.step),
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
    if (world.isHost(it.b.id))
      resolveSpace(world, it.b.id, contentOf(world, place, chrome), boxes, rules, spaces, sink, nudge, chrome, dressed);
  }
}

/** 並び（位置と帯）をまとめてずらす。④ の「始端に空けておく量」を当てるのに使う */
/**
 * **出た装いのぶん、周りだけを押しのける。**
 *
 * 装いが出た泡は 1px も動かない（`at` はその泡の位置）。手前にいるものは `start` ぶん戻り、
 * 向こうにいるものは `end` ぶん進む ── 重なりが解けるだけで、並べ方は何も変わらない。
 * 帯も同じように動かす（送りの端がここから決まるので、置いてきぼりにすると
 * 「はみ出したぶん」が数え違う）。
 */
function pushedAround(a: Arranged, at: number, start: number, end: number): Arranged {
  if (!start && !end) return a;
  const move = (v: number) => (v < at ? v - start : v > at ? v + end : v);
  return {
    pos: new Map([...a.pos].map(([id, v]) => [id, move(v)])),
    bands: a.bands.map((b) => {
      const c = (b.start + b.end) / 2;
      // 装いが出た泡そのものの帯は、外へ広がる（動かない）
      if (c === at) return { ...b, start: b.start - start, end: b.end + end };
      return c < at ? { ...b, start: b.start - start, end: b.end - start }
                    : { ...b, start: b.start + end, end: b.end + end };
    }),
    mid: a.mid,
    gap: a.gap,
  };
}

function shifted(a: Arranged, by: number): Arranged {
  if (!by) return a;
  return {
    pos: new Map([...a.pos].map(([id, v]) => [id, v + by])),
    bands: a.bands.map((b) => ({ ...b, start: b.start + by, end: b.end + by })),
    mid: a.mid - by,
    gap: a.gap,
  };
}

const ZERO_FOCUS: Focus = { x: 0, y: 0, z: 0 };
/**
 * **透視の並びで、手前の面をどれだけ消失点の反対側へ寄せるか。**
 *
 * 並びが占めるのは「いちばん奥の泡の遠い縁」から「手前の泡の近い縁」まで。
 * その真ん中が空間の中心に来るように寄せる。
 *
 * ★ **消失点までではなく、実際に逃げたぶんで測る。** 消失点は「無限に奥へ行ったら
 *   そこへ集まる」点であって、並びの端ではない ── 泡が 1 つしか無いときに消失点まで
 *   空けると、逃げてもいないのに手前の泡だけが下へずれる（実測で踏んだ）。
 *   いちばん奥の倍率 `mf` が 0 に近づけば消失点までの距離に、1 に近づけば 0 に、
 *   自然に繋がる（下の式）。
 *
 *   手前の中心を o、いちばん奥の倍率を mf、手前と奥の泡の丈を H0・Hf とすると、
 *   奥の縁 ＝ `vp + (o − vp)·mf − Hf·mf/2`、手前の縁 ＝ `o + H0/2`。
 *   この 2 つの真ん中を 0 に置くと
 *
 *   ```
 *   o = ( −vp·(1 − mf) + Hf·mf/2 − H0/2 ) / (1 + mf)
 *   ```
 *
 * 掛かるのは**平面に置き所が無い並び**だけ（奥行きに重ねる・履歴を奥行きに）。
 * 自由に置く・重ねて置くは、人が置いた所に在るべきなので触らない。
 */
function frontLead(
  view: SpaceLayout['view'],
  ctx: LensContext,
  kids: readonly Bubble[],
  arr: SpaceLayout['arr'],
  sizeOf: (b: Bubble) => Size,
): { readonly x: number; readonly y: number } | null {
  if (view.z.lens !== 'perspective') return null;
  if (view.x.dim !== 'none' || view.y.dim !== 'none') return null;
  let front: Bubble | null = null;
  let back: Bubble | null = null;
  let near = Infinity;
  let far = -Infinity;
  for (const b of kids) {
    const dz = (arr.z.pos.get(b.id) ?? 0) - ctx.focus.z;
    if (dz < near) { near = dz; front = b; }
    if (dz > far) { far = dz; back = b; }
  }
  if (!front || !back) return null;
  const mf = LENS_Z[view.z.lens as LensZId].mag(far - near);
  const f = sizeOf(front);
  const bk = sizeOf(back);
  const lead = (vp: number, h0: number, hf: number) =>
    Math.max(0, (-vp * (1 - mf) + (hf * mf) / 2 - h0 / 2) / (1 + mf));
  const x = lead(ctx.vp.x, f.w, bk.w);
  const y = lead(ctx.vp.y, f.h, bk.h);
  return x === 0 && y === 0 ? null : { x, y };
}

const ZERO_CTX: LensContext = { focus: ZERO_FOCUS, H: { x: 1, y: 1 }, vp: { x: 0, y: 0 } };

/** ★ 合成。lab.html 741-744 行 compose。深さ n でも scale は数値1つ */
export function compose(
  host: Host,
  local: { readonly x: number; readonly y: number; readonly scale: number; readonly alpha: number; readonly w: number; readonly h: number },
): Rect & { readonly scale: number; readonly alpha: number } {
  const hs = hostScale(host);                 // ★ 寄り（zoom）はレンズの外側 ＝ 合成のところで掛かる
  const scale = hs * local.scale;
  const w = local.w * scale;
  const h = local.h * scale;
  return {
    x: host.cx + local.x * hs - w / 2,
    y: host.cy + local.y * hs - h / 2,
    w,
    h,
    scale,
    alpha: host.alpha * local.alpha,
  };
}

/** 画面へ写すときに効く倍率 ＝ 合成された倍率 × その空間の寄り */
export function hostScale(host: Host): number {
  return host.scale * host.zoom;
}

/**
 * 空間を持つ泡の配置 → その中身の箱（子の空間の host）。lab.html 745-752 行
 *
 * ★ 引くのは**装いのぶん全部**（上下左右）。前は上（ヘッダ）だけ引いていたので、
 *   CSS が左右にも 7px 取っている泡では、模型の中身が絵より 14px 広かった。
 */
export function contentOf(world: BubbleWorld, p: Placement, chrome?: ChromeMap): Host {
  const c = chromeOf(world, p.id, chrome);
  const w = p.box.w - (c.left + c.right);
  const h = p.box.h - (c.top + c.bottom);
  return {
    cx: p.x + (c.left + w / 2) * p.scale,
    cy: p.y + (c.top + h / 2) * p.scale,
    w,
    h,
    scale: p.scale,
    zoom: 1,                      // ★ 寄りは画面2（いちばん外側）だけのもの
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
