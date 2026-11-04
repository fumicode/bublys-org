import {
  ConstraintRecipe,
  DEFAULT_TIGHT_WEIGHT,
  DEFAULT_VIOLATING_WEIGHT,
  compareCost,
  costOf,
} from './ConstraintRecipe.js';
import { TightnessAmount, TightnessUnit } from './Tightness.js';

describe('ConstraintRecipe（制約レシピ）', () => {
  const unit = (key: string, violating = true) => new TightnessUnit({ key, label: key, violating });
  const RUN = unit('run-over');
  const LEADER = unit('leader-short');
  const WISH = unit('wish');
  const AT_LIMIT = unit('run-at-limit', false);
  const keys = (units: TightnessUnit[]) => units.map((u) => u.key);

  test('レシピに無い単位は既定の重み（違反は絶対・同じ優先度、違反でないものは任意・低い）', () => {
    const recipe = ConstraintRecipe.empty();
    expect(recipe.weightOf(RUN)).toEqual(DEFAULT_VIOLATING_WEIGHT);
    expect(recipe.weightOf(AT_LIMIT)).toEqual(DEFAULT_TIGHT_WEIGHT);
  });

  test('優先度は 0〜1・0.1 刻みに吸い付ける', () => {
    expect(ConstraintRecipe.empty().with('run-over', { hard: true, priority: 0.86 }).weightOf(RUN))
      .toEqual({ hard: true, priority: 0.9 });
    expect(ConstraintRecipe.empty().with('run-over', { hard: true, priority: 3 }).weightOf(RUN).priority)
      .toBe(1);
  });

  test('見る順は 絶対 → 任意、それぞれ優先度の高い順', () => {
    const recipe = ConstraintRecipe.empty()
      .with('wish', { hard: false, priority: 0.9 })
      .with('leader-short', { hard: true, priority: 0.3 })
      .with('run-over', { hard: true, priority: 0.8 });
    expect(recipe.tiers([WISH, LEADER, RUN, AT_LIMIT]).map((t) => keys(t.units))).toEqual([
      ['run-over'],
      ['leader-short'],
      ['wish'],
      ['run-at-limit'],
    ]);
  });

  test('★ 優先度が同じ単位どうしは、並べ方を全部出す（案の出しどころ）', () => {
    const recipe = ConstraintRecipe.empty()
      .with('run-over', { hard: true, priority: 0.9 })
      .with('leader-short', { hard: true, priority: 0.9 })
      .with('wish', { hard: false, priority: 0.5 });
    expect(recipe.orderings([RUN, LEADER, WISH]).map(keys)).toEqual([
      ['run-over', 'leader-short', 'wish'],
      ['leader-short', 'run-over', 'wish'],
    ]);
  });

  test('並べ方は組ごとの並べ方の組み合わせ（2! × 3! = 12）。limit で打ち切れる', () => {
    const recipe = ConstraintRecipe.empty()
      .with('a', { hard: true, priority: 0.9 })
      .with('b', { hard: true, priority: 0.9 })
      .with('c', { hard: false, priority: 0.5 })
      .with('d', { hard: false, priority: 0.5 })
      .with('e', { hard: false, priority: 0.5 });
    const units = ['a', 'b', 'c', 'd', 'e'].map((k) => unit(k));
    expect(recipe.orderings(units)).toHaveLength(12);
    expect(recipe.orderings(units, 5)).toHaveLength(5);
  });

  test('★ きつさは並べた単位の順の辞書順で比べる（違う単位の量は足し引きしない）', () => {
    const amount = (u: TightnessUnit, n: number) => new TightnessAmount({ amount: n, unit: u });
    const order = [RUN, WISH];
    // 案A: 連勤超え 0日・希望の食い違い 5件 / 案B: 連勤超え 1日・希望の食い違い 0件
    const a = costOf(order, [amount(RUN, 0), amount(WISH, 5)]);
    const b = costOf(order, [amount(RUN, 1), amount(WISH, 0)]);
    expect(compareCost(a, b)).toBeLessThan(0); // 連勤を先に見るので A が良い
    expect(compareCost(costOf([WISH, RUN], [amount(RUN, 0), amount(WISH, 5)]), costOf([WISH, RUN], [amount(RUN, 1), amount(WISH, 0)])))
      .toBeGreaterThan(0); // 希望を先に見るなら B が良い
  });

  test('量の無い単位は 0 として並べる', () => {
    expect(costOf([RUN, WISH], [])).toEqual([0, 0]);
  });

  test('toPlain / fromPlain で往復する', () => {
    const recipe = ConstraintRecipe.empty().with('run-over', { hard: false, priority: 0.7 });
    expect(ConstraintRecipe.fromPlain(recipe.toPlain()).weightOf(RUN)).toEqual({
      hard: false,
      priority: 0.7,
    });
  });
});
