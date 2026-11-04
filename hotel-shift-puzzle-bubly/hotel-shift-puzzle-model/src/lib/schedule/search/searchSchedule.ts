/**
 * searchSchedule — 制約レシピに沿って、勤務表を直し続ける（局所探索。#229）
 *
 * 流れ:
 *   ① たたき台（initial）から始める。たたき台は呼び出し側が作る（今の自動シフトのステップなど）
 *   ② 近傍（Neighborhood）から手を1つもらい、打ったあとのきつさを目的（RecipeObjective）で測る
 *   ③ 受け入れ方（Acceptance）が採ると言えば採る。ただし**絶対の単位の量を増やす手は採らない**
 *   ④ 決めた回数（と時間）まで ②③ を繰り返し、いちばん良かった勤務表を返す
 *
 * 部品（目的・近傍・受け入れ方・乱数）は全部引数で受け取る。探索はそれを回すだけで、
 * どの制約も名指ししない。方式を変えたくなったら、部品を差し替える。
 *
 * 純粋（乱数は種つきで渡す）。同じ種・同じ回数なら同じ結果になる。
 */
import type { MonthlyStaffSchedule, ShiftCell } from "../MonthlyStaffSchedule.js";
import { ConstraintRecipe } from "../ConstraintRecipe.js";
import type { ScheduleConstraint } from "../ScheduleConstraint.js";
import type { TightnessUnit } from "../Tightness.js";
import { RecipeObjective, unitsOf } from "./RecipeObjective.js";
import {
  DEFAULT_NEIGHBORHOODS,
  moveContextOf,
  type FreeCell,
  type Neighborhood,
  type Rng,
} from "./moves.js";
import { lateAcceptance, type Acceptance } from "./acceptance.js";

/** 種つきの乱数（mulberry32） */
export const seededRng = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 元の勤務表で未定だったセル（探索が動かしてよいセル） */
export const freeCellsOf = (
  original: MonthlyStaffSchedule,
  staffIds: readonly string[]
): FreeCell[] =>
  original
    .workingDays()
    .flatMap((day) =>
      staffIds.filter((s) => original.isUndecided(s, day)).map((staffId) => ({ staffId, day }))
    );

/** セルに置ける値（休み・未定・各勤務帯） */
export const cellValuesOf = (shiftIds: readonly string[]): ShiftCell[] => [
  { kind: "day-off" },
  { kind: "undecided" },
  ...shiftIds.map((shiftId) => ({ kind: "work", shiftId }) as const),
];

export type SearchParams = {
  /** たたき台 */
  initial: MonthlyStaffSchedule;
  /** 動かしてよいセル（元の勤務表で未定だったセル） */
  freeCells: readonly FreeCell[];
  /** セルに置ける値 */
  values: readonly ShiftCell[];
  objective: RecipeObjective;
  neighborhoods?: readonly Neighborhood[];
  acceptance?: Acceptance;
  rng: Rng;
  /** 試す手の数の上限 */
  maxIterations: number;
  /** 時間の上限（ミリ秒）。省略すると回数だけで止める */
  timeLimitMs?: number;
  /** 時計（テストで差し替える）。既定は Date.now */
  now?: () => number;
};

export type SearchResult = {
  /** いちばん良かった勤務表 */
  best: MonthlyStaffSchedule;
  bestCost: number[];
  initialCost: number[];
  /** 試した手の数 */
  iterations: number;
  /** 採った手の数 */
  accepted: number;
};

export function searchSchedule(params: SearchParams): SearchResult {
  const {
    initial,
    freeCells,
    values,
    objective,
    neighborhoods = DEFAULT_NEIGHBORHOODS,
    acceptance = lateAcceptance(),
    rng,
    maxIterations,
    timeLimitMs,
    now = Date.now,
  } = params;
  const compare = (a: readonly number[], b: readonly number[]) => objective.compare(a, b);
  const startedAt = now();

  let current = initial;
  let currentCost = objective.evaluate(current);
  let best = current;
  let bestCost = currentCost;
  const initialCost = currentCost;
  const run = acceptance.start(currentCost, compare);
  // 動かしてよいセルの引き方は変わらないので1回だけ作り、勤務表だけ差し替える
  const baseContext = moveContextOf(initial, freeCells, values);
  let accepted = 0;
  let iterations = 0;

  for (; iterations < maxIterations; iterations++) {
    if (timeLimitMs !== undefined && now() - startedAt >= timeLimitMs) break;
    const neighborhood = neighborhoods[Math.floor(rng() * neighborhoods.length)];
    const move = neighborhood?.propose({ ...baseContext, schedule: current }, rng);
    if (move) {
      const candidate = move.apply(current);
      const candidateCost = objective.evaluate(candidate);
      if (
        !objective.worsensHard(candidateCost, currentCost) &&
        run.accepts(candidateCost, currentCost, iterations)
      ) {
        current = candidate;
        currentCost = candidateCost;
        accepted++;
        if (compare(currentCost, bestCost) < 0) {
          best = current;
          bestCost = currentCost;
        }
      }
    }
    run.record(currentCost, iterations);
  }

  return { best, bestCost, initialCost, iterations, accepted };
}

/** 1つの案（並べ方1つぶんの探索の結果） */
export type RecipePlan = SearchResult & {
  /** この案で比べた単位の順（何を優先した案か） */
  ordering: TightnessUnit[];
};

/**
 * レシピの並べ方ごとに探索して、案を作る（優先度が同じところが案の出しどころ）。
 * 並べ方は出せるだけ全部（maxPlans で打ち切れる）。乱数の種は案ごとに seed + 案の番号。
 */
export function searchRecipePlans(params: {
  initial: MonthlyStaffSchedule;
  freeCells: readonly FreeCell[];
  values: readonly ShiftCell[];
  recipe: ConstraintRecipe;
  constraints: ScheduleConstraint[];
  seed: number;
  maxIterations: number;
  timeLimitMs?: number;
  maxPlans?: number;
  neighborhoods?: readonly Neighborhood[];
  acceptance?: Acceptance;
  now?: () => number;
}): RecipePlan[] {
  const { recipe, constraints, seed, maxPlans = Infinity, ...rest } = params;
  return recipe.orderings(unitsOf(constraints), maxPlans).map((ordering, i) => ({
    ordering,
    ...searchSchedule({
      ...rest,
      objective: RecipeObjective.of(recipe, constraints, ordering),
      rng: seededRng(seed + i),
    }),
  }));
}
