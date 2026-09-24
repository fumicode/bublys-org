/**
 * ② 触った泡へ、視点が寄る。
 *
 * > **触るのは「見る」ことであって、「動かす」ことではない。**
 * > **だから触っても値は1つも書かない。その泡へ焦点が寄るだけ。**
 *
 * 正：v4/RULES.md「② 触った泡へ、視点が寄る」／経緯：DECISIONS.md 2026-09-19。
 *
 * ★ これは `raise.ts`（触ったとき Z に書く動詞）の置き換え。raise は消した。
 *   ②はもともと「掴んでいないなら視点」と言っている。**触るのも掴んでいない**ので同じ枝に乗る。
 *   新しい仕組みは足していない ── 焦点の約束（`fitFocus`）をそのまま通すだけ。
 *
 * | その空間の軸 | 触ったとき |
 * |---|---|
 * | 魚眼の軸 | その泡が**その軸の焦点**になる（中央で原寸に戻る） |
 * | 透視の Z | その泡の面が焦点になる（奥の札が手前に来る） |
 * | **平行の軸** | **何も起きない**（後述） |
 * | 送れない軸（次元が なし ／ 箱にぴったり） | 何も起きない |
 *
 * ★ **平行の軸では寄らない。触れたということは、もう見えている。**
 *   平行は倍率が一定なので、寄っても見え方は 1mm も変わらない ── 動くのは中身だけで、
 *   得るものが無い。一覧（平行に詰めた並び）で札を選ぶと、選んだ札が箱の中央へ来るぶん
 *   **並びがまるごとずれて**いた（実測：上に何も無いのに先頭の札が箱の中央まで下がり、
 *   ＋新規の口が次の札に隠れた。最後の札を選ぶと逆に並びが上へ寄って下が空いた）。
 *   ②の値打ちは「端で潰れている泡が中央で原寸に戻る」ことなので、そこは魚眼と透視に残す。
 *
 * ★ **掴んでドラッグするのは今までどおり値を書く**（`drag.ts`）。変えたのは「触った（ドラッグしていない）」ときだけ。
 */
import type { BubbleId, SpaceId } from './types.js';
import type { BubbleWorld } from './world.js';
import type { Layout, Viewport } from './resolve.js';
import { resolveWorld } from './resolve.js';
import { resolveRules } from './rules.js';
import type { LayoutRules } from './rules.js';
import { screenToAxis, withFocusAxis } from './project.js';

/**
 * 触った泡を、その空間の焦点にする。値は1つも書かない。
 *
 * ③ 見えない親は体を持たないので、**Z の焦点だけは外の窓へ回す**（`wheelZ` と同じ枝）。
 *   X・Y は見えない親自身が持つ ── そこは箱が中身ぴったりなので、約束が焦点を 0 へ戻す
 *   ＝「送れない軸では何も起きない」がひとりでに出る。
 *
 * @param layout 触る直前に解いた配置（泡の位置 `pos` と、空間ごとの焦点をここから読む）
 */
export function focusOn(
  world: BubbleWorld,
  layout: Layout,
  id: BubbleId,
  rules?: Partial<LayoutRules>,
): BubbleWorld {
  const R = resolveRules(rules);
  const p = layout.byId.get(id);
  if (!p) return world;
  let w = world;
  for (const axis of ['x', 'y', 'z'] as const) {
    // ③ Z は軸まるごと外の窓のもの（焦点も窓が持つ）。X・Y はその泡がいる空間のもの
    const space = axis === 'z' ? world.windowOf(p.space) : p.space;
    const L = layout.spaces.get(space);
    if (!L) continue;
    // ★ 平行の軸では寄らない ── 触れた＝もう見えている（頭の表を見よ）
    if (axis !== 'z' && L.view[axis].lens === 'parallel') continue;
    // 「その泡の、その軸での位置」を焦点にする。約束（fitFocus）は withFocusAxis がそのまま通す
    //   ── 次元が なし の軸は約束(0)が 0 を返すので、ここで分けなくても「何も起きない」になる
    w = withFocusAxis(w, L, axis, p.pos[axis], R);
  }
  return w;
}

/**
 * **開いた泡が見える所まで、窓を動かす。** ── ② の「触ったら視点が寄る」とは別の用事。
 *
 * ② は「その泡がいる空間の焦点」を動かす。③ 見えない親（並び）の中の泡では、
 * 並びの箱が中身ぴったりなので約束が焦点を 0 へ戻す ＝ **外の海は 1mm も動かない**。
 * 触ったときはそれでよい（触るのは見ることなので、並びの中で何か動くほうがおかしい）。
 *
 * けれど**開いたとき**は話が別で、見る側に約束しているのは
 * 「すでにあるものが左へずれ、あいた中央に新しい泡が出る」。
 * 並びに加わった泡でもそれが出るように、**外の窓の焦点**を動かす。
 * （実測：3つ目から並びに加わるので、2つ目までしか海が動いていなかった）
 *
 * ★ 真ん中へ持ってくるのは、窓から見て**いちばん外側の入れ物**
 *   ── 並びに入ったなら「並びごと」。並びは1つの体なので（中は平行）、
 *   中の1枚だけを画面の真ん中へ寄せようとすると、並びの端が焦点の向こうへ行って
 *   **並びぜんぶが潰れる**（実測：倍率 0.42 → 0.26、一覧は画面から消えた）。
 *   並びを真ん中に置けば、その並びがいちばん大きく写る所に落ち着く。
 * ★ 値は1つも書かない ── 動くのは焦点だけ。そこは ② と同じ。
 * ★ 魚眼は一次では解けないので、`pin` と同じく**当てて解き直すを数回**。
 *   泡が窓の直接の子なら、② が済ませた時点で真ん中に居るので 1 周で抜ける。
 *
 * ★ 「真ん中」は**渡された窓の真ん中**。岸が食い込んでいるときは、器（`ShoreSpace`）が
 *   **口そのものを窓として渡す**ので、ここは何も知らなくてよい ── 一度ここに
 *   「真ん中と見なす点」を足したが、箱が口になれば同じことなので外した。
 */
export function bringToCenter(
  world: BubbleWorld,
  viewport: Viewport,
  id: BubbleId,
  rules?: Partial<LayoutRules>,
): BubbleWorld {
  const R = resolveRules(rules);
  let w = world;
  for (let n = 0; n < 6; n++) {
    const layout = resolveWorld(w, viewport, R);
    const p = layout.byId.get(id);
    if (!p) return w;
    const space = w.windowOf(p.space);
    const L = layout.spaces.get(space);
    if (!L) return w;
    // 窓の直接の子にあたる先祖（逆写しに要る Z の倍率は、その泡のもの。pin と同じ）
    let anc: BubbleId = id;
    for (let cur: SpaceId = id; cur !== space; ) {
      const b = w.bubble(cur);
      if (!b) break;
      anc = cur;
      if (b.space === space) break;
      cur = b.space;
    }
    const pa = layout.byId.get(anc) ?? p;
    let moved = false;
    for (const axis of ['x', 'y'] as const) {
      const want = (axis === 'x' ? viewport.w : viewport.h) / 2;
      const now = axis === 'x' ? pa.x + pa.w / 2 : pa.y + pa.h / 2;
      if (Math.abs(now - want) < 0.5) continue;
      const before = w.focusOf(space)[axis];
      w = withFocusAxis(w, L, axis, screenToAxis(L, axis, now, pa.m), R);
      if (Math.abs(w.focusOf(space)[axis] - before) > 1e-6) moved = true;
    }
    if (!moved) return w;
  }
  return w;
}
