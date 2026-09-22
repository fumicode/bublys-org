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
 * | 焦点を送れる軸 | その泡が**その軸の焦点**になる（魚眼なら中央で原寸、ほかは端で縮む） |
 * | 送れない軸（次元が なし ／ 箱にぴったり） | 何も起きない |
 *
 * ★ **掴んでドラッグするのは今までどおり値を書く**（`drag.ts`）。変えたのは「触った（ドラッグしていない）」ときだけ。
 */
import type { BubbleId } from './types.js';
import type { BubbleWorld } from './world.js';
import type { Layout } from './resolve.js';
import { resolveRules } from './rules.js';
import type { LayoutRules } from './rules.js';
import { withFocusAxis } from './project.js';

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
    // 「その泡の、その軸での位置」を焦点にする。約束（fitFocus）は withFocusAxis がそのまま通す
    //   ── 次元が なし の軸は約束(0)が 0 を返すので、ここで分けなくても「何も起きない」になる
    w = withFocusAxis(w, L, axis, p.pos[axis], R);
  }
  return w;
}
