/**
 * ConstraintRecipe — 制約レシピ（#229）
 *
 * レシピ = { (きつさの単位, 絶対か任意か, 優先度 0〜1), ... } の**集合**。並び順に意味はない。
 *
 * ルール:
 *   - **違う単位の量は比べない。** 比べるのは優先度の順番だけ（辞書順）。連勤1日と責任者1人のあいだに
 *     交換レートは無い。案どうしは「絶対 → 任意、それぞれ優先度の高い順」に単位を並べ、
 *     先頭の単位から量を比べて、最初に差が出たところで決める
 *   - **優先度が同じところで案を分ける。** 同じ（絶対か任意か, 優先度）の単位どうしは比べられないので、
 *     並べ方を変えたものを別の案にする（orderings）。まずは出せるだけ全部出して、見てから絞り方を決める
 *   - 優先度は「同じ」を意図して作れるよう 0.1 刻みに吸い付ける（辞書順なので効くのは順番と「同じか」だけ）
 *
 * レシピに載っていない単位は既定の重みで扱う。既定は「今の動きと同じ」：
 *   - 違反の単位   … 絶対・同じ優先度（今の自動シフトは、どの違反も新しく作らない）
 *   - 違反でない単位（上限ちょうど など）… 任意・低い優先度（ほかが全部同じときだけ効く）
 * 単位は勤務表の責任者ルール・勤務帯で増減するので、レシピは単位の key で持ち、無い単位は既定に落とす。
 */
import type { TightnessAmount, TightnessUnit } from "./Tightness.js";

/** 単位1つの重み */
export type RecipeWeight = {
  /** 絶対（破らない）か任意（できれば守る）か */
  hard: boolean;
  /** 優先度 0〜1（0.1 刻み）。大きいほど先に見る */
  priority: number;
};

/** 違反の単位の既定の重み（今の動きと同じ：どの違反も同じく絶対） */
export const DEFAULT_VIOLATING_WEIGHT: RecipeWeight = { hard: true, priority: 0.5 };
/** 違反でない単位（上限ちょうど など）の既定の重み */
export const DEFAULT_TIGHT_WEIGHT: RecipeWeight = { hard: false, priority: 0.1 };

/** 優先度を 0〜1・0.1 刻みに吸い付ける */
export const snapPriority = (priority: number): number =>
  Math.min(1, Math.max(0, Math.round(priority * 10) / 10));

export type RecipeEntryState = RecipeWeight & {
  /** きつさの単位の key（TightnessUnit.key） */
  unitKey: string;
};

/** レシピの1行 */
export class RecipeEntry {
  constructor(readonly state: RecipeEntryState) {}

  get unitKey(): string {
    return this.state.unitKey;
  }

  get weight(): RecipeWeight {
    return { hard: this.state.hard, priority: this.state.priority };
  }
}

export type ConstraintRecipePlain = { entries: RecipeEntryState[] };

/** 同じ重みの単位の組（この中は比べられない＝案の出しどころ） */
export type RecipeTier = { weight: RecipeWeight; units: TightnessUnit[] };

export class ConstraintRecipe {
  constructor(readonly state: { entries: RecipeEntry[] }) {}

  static empty(): ConstraintRecipe {
    return new ConstraintRecipe({ entries: [] });
  }

  get entries(): RecipeEntry[] {
    return this.state.entries;
  }

  /** その単位の重み。レシピに無ければ既定（違反か・違反でないかで決まる） */
  weightOf(unit: TightnessUnit): RecipeWeight {
    const entry = this.state.entries.find((e) => e.unitKey === unit.key);
    if (entry) return entry.weight;
    return unit.isViolating ? DEFAULT_VIOLATING_WEIGHT : DEFAULT_TIGHT_WEIGHT;
  }

  /** その単位の重みを決めた新しいレシピ（優先度は 0.1 刻みに吸い付ける） */
  with(unitKey: string, weight: RecipeWeight): ConstraintRecipe {
    const entry = new RecipeEntry({
      unitKey,
      hard: weight.hard,
      priority: snapPriority(weight.priority),
    });
    return new ConstraintRecipe({
      entries: [...this.state.entries.filter((e) => e.unitKey !== unitKey), entry],
    });
  }

  /** その単位をレシピから外し、既定の重みに戻した新しいレシピ */
  without(unitKey: string): ConstraintRecipe {
    return new ConstraintRecipe({
      entries: this.state.entries.filter((e) => e.unitKey !== unitKey),
    });
  }

  /**
   * 単位を重みで組に分け、見る順（絶対 → 任意、それぞれ優先度の高い順）に並べる。
   * 組の中の単位は、渡された順のまま（比べられないので、順は orderings で決める）。
   */
  tiers(units: readonly TightnessUnit[]): RecipeTier[] {
    const tiers: RecipeTier[] = [];
    for (const unit of units) {
      const weight = this.weightOf(unit);
      const tier = tiers.find(
        (t) => t.weight.hard === weight.hard && t.weight.priority === weight.priority
      );
      if (tier) tier.units.push(unit);
      else tiers.push({ weight, units: [unit] });
    }
    return tiers.sort(
      (a, b) =>
        Number(b.weight.hard) - Number(a.weight.hard) || b.weight.priority - a.weight.priority
    );
  }

  /**
   * 案ごとの単位の並べ方。同じ組の中の並べ方をすべて組み合わせる（出せるだけ全部）。
   * 組の大きさが k なら k! 通りになるので、limit で打ち切れる。
   */
  orderings(units: readonly TightnessUnit[], limit = Infinity): TightnessUnit[][] {
    let orders: TightnessUnit[][] = [[]];
    for (const tier of this.tiers(units)) {
      const next: TightnessUnit[][] = [];
      for (const prefix of orders) {
        for (const perm of permutations(tier.units)) {
          next.push([...prefix, ...perm]);
          if (next.length >= limit) break;
        }
        if (next.length >= limit) break;
      }
      orders = next;
    }
    return orders;
  }

  toPlain(): ConstraintRecipePlain {
    return { entries: this.state.entries.map((e) => e.state) };
  }

  static fromPlain(plain: ConstraintRecipePlain): ConstraintRecipe {
    return new ConstraintRecipe({ entries: plain.entries.map((e) => new RecipeEntry(e)) });
  }
}

/** 並べ方の全部（並べる数が少ないうちだけ使う） */
function* permutations<T>(items: readonly T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield [...items];
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) yield [items[i], ...perm];
  }
}

/**
 * 並べた単位の順に、きつさの量を並べる（辞書順で比べるための列）。
 * 量の無い単位は 0（その単位を持つ制約が無い＝きつさが無い）。
 */
export const costOf = (
  ordering: readonly TightnessUnit[],
  amounts: readonly TightnessAmount[]
): number[] => {
  const byKey = new Map(amounts.map((a) => [a.unit.key, a.amount]));
  return ordering.map((unit) => byKey.get(unit.key) ?? 0);
};

/**
 * 2つの案のきつさを辞書順で比べる（負なら a のほうが良い）。先頭の単位から比べ、
 * 最初に差が出たところで決める。違う単位の量を足し引きすることは無い。
 */
export const compareCost = (a: readonly number[], b: readonly number[]): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};
