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

export interface LayoutRules {
  readonly equalExtent: EqualExtent;
  readonly zFocusStop: ZFocusStop;
}

/** ラボと同じ既定 */
export const DEFAULT_RULES: LayoutRules = {
  equalExtent: 'bubble',
  zFocusStop: 'behind',
};

/**
 * 部分指定を既定で埋める。
 * 解決も操作も LayoutRules を丸ごと持ち回るので、入口（resolveWorld・ActContext）で1回だけ通す。
 */
export function resolveRules(rules?: Partial<LayoutRules>): LayoutRules {
  if (!rules) return DEFAULT_RULES;
  return { ...DEFAULT_RULES, ...rules };
}
