/**
 * refineBySearch — 解決案生成を探索エンジンで作る（#229 の試し口）
 *
 * 責任者の解決案＝「責任者を確保するために、責任者の対象者が**いつ責任者ポジに入り、いつ休むか**だけを決める」。
 *   動かす人   : 責任者ルールの対象者だけ（操作対象に居る人）
 *   置くもの   : その人の担当勤務帯（複数のルールの対象なら、その全部）か休み。ほかの勤務帯は置かない
 *   それ以外   : 触らない（未定のまま）
 * レシピ:
 *   絶対 … 責任者の不足・月の休み（◯日を置く）・連勤の上限・遅番明け・可能勤務帯
 *   任意 … 希望（優先度 高）＞ 1日の休み上限 ＞ 上限ちょうど など ＞ 置いたセルの数（一番下）
 * 月の休みは「今のまま」で数える＝休みを◯日実際に置く（人手でそう決めているため）。
 * 置いたセルの数が一番下にあるので、何にも効かないセルは置かない。
 *
 * 案ごとの探索で、いちばん良い水準の盤面を数えた「見込み」も返す（ぼやっと見えている候補）。
 * まだ速くないので、案ごとに時間で打ち切る。Worker には載せていない（画面が止まる）。
 */
import {
  AllowedShiftConstraint,
  unitsOf,
  ConstraintRecipe,
  DAY_OFF_OVER,
  MaxConsecutiveWorkdaysConstraint,
  MaxDayOffPerDayConstraint,
  MinMonthlyDayOffConstraint,
  PlacementCount,
  RecipeObjective,
  ShiftIntervalConstraint,
  ShiftLeaderConstraint,
  cellValuesOf,
  freeCellsOf,
  mergeOutlooks,
  searchSchedule,
  seededRng,
  type CellOutlook,
  type MonthlyStaffSchedule,
  type ScheduleConstraint,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { SHIFT_WISH_MISMATCH, ShiftWishConstraint } from "./ShiftWishConstraint.js";

/** 解決案生成の既定のレシピ（載せていない単位は既定＝違反は絶対・優先度 中） */
export const LEADER_PLAN_RECIPE = ConstraintRecipe.empty()
  .with(SHIFT_WISH_MISMATCH, { hard: false, priority: 0.9 })
  .with(DAY_OFF_OVER.key, { hard: false, priority: 0.5 });

export type RefineBySearchParams = {
  /** 元の勤務表（ここで未定のセルだけを動かす） */
  original: MonthlyStaffSchedule;
  /** 違反表示と同じ制約リスト（ここからレシピに入れる制約を選ぶ） */
  constraints: ScheduleConstraint[];
  /** 操作対象（この中の責任者の対象者だけを動かす） */
  targetStaffIds: readonly string[];
  minDayOff: number;
  recipe?: ConstraintRecipe;
  /** 何案つくるか（案ごとに乱数の種を変える） */
  planCount: number;
  /** 1案あたりの時間の上限（ミリ秒） */
  timeLimitMsPerPlan: number;
};

export type RefinedPlan = {
  schedule: MonthlyStaffSchedule;
  iterations: number;
  accepted: number;
};

export type RefineBySearchResult = {
  plans: RefinedPlan[];
  /** 全案の見込みの平均（動かしたセルごと） */
  outlook: CellOutlook[];
  /** 動かした人（責任者の対象者） */
  leaderStaffIds: string[];
};

/** 責任者ルールの対象者ごとに、置ける勤務帯（担当勤務帯の全部） */
const leaderShiftIdsByStaff = (
  constraints: readonly ScheduleConstraint[],
  targetStaffIds: readonly string[]
): Map<string, Set<string>> => {
  const target = new Set(targetStaffIds);
  const byStaff = new Map<string, Set<string>>();
  for (const c of constraints) {
    if (!(c instanceof ShiftLeaderConstraint)) continue;
    for (const staffId of c.rule.leaderStaffIds) {
      if (!target.has(staffId)) continue;
      const set = byStaff.get(staffId) ?? new Set<string>();
      c.shiftIds.forEach((id) => set.add(id));
      byStaff.set(staffId, set);
    }
  }
  return byStaff;
};

/**
 * 解決案生成のレシピに入れる制約。月の休みと置いた数は、動かす人（責任者の対象者）だけを測る。
 */
export const leaderPlanConstraintsOf = (
  constraints: readonly ScheduleConstraint[],
  leaderStaffIds: readonly string[],
  minDayOff: number
): ScheduleConstraint[] => [
  ...constraints.filter(
    (c) =>
      c instanceof ShiftLeaderConstraint ||
      c instanceof MaxConsecutiveWorkdaysConstraint ||
      c instanceof ShiftIntervalConstraint ||
      c instanceof AllowedShiftConstraint ||
      c instanceof ShiftWishConstraint ||
      c instanceof MaxDayOffPerDayConstraint
  ),
  new MinMonthlyDayOffConstraint(minDayOff, leaderStaffIds),
  new PlacementCount(leaderStaffIds),
];

/** レシピの1行（見せる用）：単位とその重み */
export type RecipeRow = { key: string; label: string; hard: boolean; priority: number };

/**
 * 解決案生成が実際に比べる単位と、その重み（レシピに無い単位は既定の重み）。
 * 制約の宣言順。レシピのバブルはこれを描く。
 */
export const leaderPlanRecipeRowsOf = (
  constraints: readonly ScheduleConstraint[],
  targetStaffIds: readonly string[],
  minDayOff: number,
  recipe: ConstraintRecipe = LEADER_PLAN_RECIPE
): RecipeRow[] => {
  const leaderStaffIds = [...leaderShiftIdsByStaff(constraints, targetStaffIds).keys()];
  return unitsOf(leaderPlanConstraintsOf(constraints, leaderStaffIds, minDayOff)).map((unit) => ({
    key: unit.key,
    label: unit.label,
    ...recipe.weightOf(unit),
  }));
};

export function refineBySearch(params: RefineBySearchParams): RefineBySearchResult {
  const {
    original,
    targetStaffIds,
    minDayOff,
    recipe = LEADER_PLAN_RECIPE,
    planCount,
    timeLimitMsPerPlan,
  } = params;
  const shiftsByStaff = leaderShiftIdsByStaff(params.constraints, targetStaffIds);
  const leaderStaffIds = [...shiftsByStaff.keys()];
  const constraints = leaderPlanConstraintsOf(params.constraints, leaderStaffIds, minDayOff);
  const objective = RecipeObjective.of(recipe, constraints);
  const valuesByStaff = new Map<string, readonly ShiftCell[]>(
    [...shiftsByStaff].map(([staffId, ids]) => [staffId, cellValuesOf([...ids])])
  );
  const freeCells = freeCellsOf(original, leaderStaffIds).map((c) => ({
    ...c,
    values: valuesByStaff.get(c.staffId),
  }));
  const results = Array.from({ length: planCount }, (_, i) =>
    searchSchedule({
      initial: original,
      freeCells,
      values: cellValuesOf([]),
      objective,
      rng: seededRng(i + 1),
      maxIterations: Number.MAX_SAFE_INTEGER,
      timeLimitMs: timeLimitMsPerPlan,
      collectOutlook: true,
    })
  );
  return {
    plans: results.map((r) => ({ schedule: r.best, iterations: r.iterations, accepted: r.accepted })),
    outlook: mergeOutlooks(results.map((r) => r.outlook)),
    leaderStaffIds,
  };
}
