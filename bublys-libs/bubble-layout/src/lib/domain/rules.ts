/**
 * 規則がまだ決めていない所の、既定。
 *
 * RULES.md の末尾「まだ決めていない」2つは、ここでは決めない。
 * 外から差せる口だけ作って、既定には **いまのラボ（v5-dom/lab.html）と同じ答え**を焼く。
 * 既定のまま呼べば lab.html と同じ動きになり、決めたくなったら呼ぶ側が差し替えられる。
 *
 * ★ 何も渡さない ＝ ラボと同じ。検証（_check/all.mjs の 14 本）が見ているのはこの既定の側。
 */

/**
 * 1. 等間隔（equal）の「塊」を、どこの端から端で測るか（RULES.md まだ決めていない 2）
 *   - 'bubble' … 泡の端から端。lab.html 590-596 行がこれ（値×間隔 ± 泡の半分 の最小・最大）
 *   - 'band'   … 帯の端から端
 *  泡で測ると端の泡を広げたとき兄弟が一緒にずれる。帯で測るとずれは 0 だが箱が片寄る。
 */
export type EqualExtent = 'bubble' | 'band';

/**
 * 2. Z の焦点を、焦点の面で止めるか（RULES.md まだ決めていない 1）
 *   - 'behind'      … 手前へは 1 退ける。lab.html 848 行の clamp(v, min(0,…)-1, max(0,…)) がこれ
 *   - 'focus-plane' … 焦点の面で止める（手前へ退けない）
 *  止めると「ホイール1回で同じ面の兄弟がまとめて消える」が無くなる。代わりに奥の面へ行けなくなる。
 */
export type ZFocusStop = 'behind' | 'focus-plane';

/**
 * 3. **自由に置く空間**で両軸に魚眼が掛かったとき、大きさの倍率をどう1つにまとめるか
 *    （`lens.ts` の `sizeFit`）
 *   - 'product' … 両軸の像の積（**既定** ＝ 何も渡さなければ今までと同じ答え）
 *   - 'hypot'   … 軸の遠さを斜辺で1つにする。隅は上下左右より小さく、減衰は斜辺1本ぶん
 *   - 'min'     … ラボと `RULES.md` の元の答え。隅と上下左右が同じ大きさになる
 *
 *  ★ **既定は変えない。** 「隅の減衰が早すぎる」と言われたのは**大元の海**ひとつなので、
 *    斜辺を選ぶのはその海だけ（`BubblesUINext` が `BubbleSea` に渡す）。渡さなかった空間
 *    ── 一覧・窓の中の海・ラボ由来のビュー ── は 1px も変わらない。
 *  ★ **効くのは両軸が `as-is`（自由に置く）の空間だけ。** 刻みで並ぶ軸（`equal` / `pack`）が
 *    あれば積で決まり、ここは見られない ── 刻みが箱と同じ格子で隣どうしがぴたり接するのは
 *    `大きさ ∝ kx·ky` のときだけなので、そこは選べることではない（`resolve.ts` の `combine`）。
 *  ★ **片方の軸が平行なら 3 つは同じ答え**（平行の倍率は 1 ＝ 遠さ 0）なので、ラボと
 *    突き合わせた検証（`_check/all.mjs`）はどれを渡しても通る。数は `lens.spec.ts` に全部ある。
 */
export type SizeCombine = 'hypot' | 'product' | 'min';

export interface LayoutRules {
  readonly equalExtent: EqualExtent;
  readonly zFocusStop: ZFocusStop;
  readonly sizeCombine: SizeCombine;
}

/** ラボと同じ既定（`sizeCombine` は renewal-demo までと同じ答えになる側） */
export const DEFAULT_RULES: LayoutRules = {
  equalExtent: 'bubble',
  zFocusStop: 'behind',
  sizeCombine: 'product',
};

/**
 * 部分指定を既定で埋める。
 * 解決も操作も LayoutRules を丸ごと持ち回るので、入口（resolveWorld・ActContext）で1回だけ通す。
 */
export function resolveRules(rules?: Partial<LayoutRules>): LayoutRules {
  if (!rules) return DEFAULT_RULES;
  return { ...DEFAULT_RULES, ...rules };
}
