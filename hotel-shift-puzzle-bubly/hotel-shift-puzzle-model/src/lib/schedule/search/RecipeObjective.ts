/**
 * RecipeObjective — 制約レシピの並べ方で、勤務表の「きつさの列」を出す（探索の目的）
 *
 * 探索は勤務表どうしをこれで比べるだけで、制約の中身は知らない。制約には tightness() で量を聞く。
 * 比べ方は辞書順（ConstraintRecipe の compareCost）。違う単位の量は足し引きしない（#229）。
 *
 * 並べ方（ordering）は案ごとに違う：優先度が同じ単位どうしの並べ方を変えたものが別の案になる。
 */
import type { MonthlyStaffSchedule } from "../MonthlyStaffSchedule.js";
import type { ScheduleConstraint } from "../ScheduleConstraint.js";
import type { TightnessUnit } from "../Tightness.js";
import { ConstraintRecipe, compareCost, costOf } from "../ConstraintRecipe.js";

/** 制約が宣言している単位を、重複なく宣言の順に集める */
export const unitsOf = (constraints: readonly ScheduleConstraint[]): TightnessUnit[] => {
  const seen = new Map<string, TightnessUnit>();
  for (const c of constraints) {
    for (const u of c.tightnessUnits ?? []) if (!seen.has(u.key)) seen.set(u.key, u);
  }
  return [...seen.values()];
};

export class RecipeObjective {
  constructor(
    readonly state: {
      /** 比べる順に並べた単位 */
      ordering: TightnessUnit[];
      /** 量を聞く制約（tightness() を持つものだけが効く） */
      constraints: ScheduleConstraint[];
      /** 先頭から何個が絶対の単位か（絶対の量を増やす手は採らない） */
      hardCount: number;
    }
  ) {}

  /**
   * レシピの並べ方の1つで目的を作る。ordering を省くと、レシピの最初の並べ方を使う。
   */
  static of(
    recipe: ConstraintRecipe,
    constraints: ScheduleConstraint[],
    ordering?: TightnessUnit[]
  ): RecipeObjective {
    const units = unitsOf(constraints);
    const order = ordering ?? recipe.orderings(units, 1)[0] ?? [];
    const hardCount = order.filter((u) => recipe.weightOf(u).hard).length;
    return new RecipeObjective({ ordering: order, constraints, hardCount });
  }

  get ordering(): TightnessUnit[] {
    return this.state.ordering;
  }

  /** 勤務表のきつさの列（ordering の順） */
  evaluate(schedule: MonthlyStaffSchedule): number[] {
    const amounts = this.state.constraints.flatMap((c) => c.tightness?.(schedule) ?? []);
    return costOf(this.state.ordering, amounts);
  }

  /** 負なら a のほうが良い */
  compare(a: readonly number[], b: readonly number[]): number {
    return compareCost(a, b);
  }

  /** candidate が、絶対の単位のどれかの量を current より増やしているか */
  worsensHard(candidate: readonly number[], current: readonly number[]): boolean {
    for (let i = 0; i < this.state.hardCount; i++) {
      if ((candidate[i] ?? 0) > (current[i] ?? 0)) return true;
    }
    return false;
  }
}
