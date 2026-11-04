import { MonthlyStaffSchedule } from '../MonthlyStaffSchedule.js';
import { RequiredStaffing } from '../RequiredStaffing.js';
import { WorkingDay } from '../WorkingDay.js';
import { ConstraintRecipe } from '../ConstraintRecipe.js';
import { MaxConsecutiveWorkdaysConstraint } from '../MaxConsecutiveWorkdaysConstraint.js';
import { MinMonthlyDayOffConstraint } from '../MinMonthlyDayOffConstraint.js';
import { RequiredStaffingConstraint } from '../RequiredStaffingConstraint.js';
import type { ScheduleConstraint } from '../ScheduleConstraint.js';
import { RecipeObjective } from './RecipeObjective.js';
import { hillClimbing, lateAcceptance } from './acceptance.js';
import {
  cellValuesOf,
  freeCellsOf,
  searchRecipePlans,
  searchSchedule,
  seededRng,
} from './searchSchedule.js';

describe('searchSchedule（制約レシピに沿って勤務表を直し続ける）', () => {
  const day = (d: number) => WorkingDay.of(2026, 6, d);
  const staffIds = ['a', 'b', 'c'];
  const shiftIdsOf = (name: string) => (name === '早番' ? ['early'] : []);
  const days = Array.from({ length: 30 }, (_, i) => day(i + 1));

  /** 毎日早番1人が要る勤務表。a の 6/1 だけは人間が休みと入力済み */
  const original = MonthlyStaffSchedule.create({
    id: 'sched-1',
    storeId: 'store-1',
    year: 2026,
    month: 6,
    requiredStaffing: RequiredStaffing.uniform(days, { 早番: 1 }),
  }).assignDayOff('a', day(1));

  const constraints: ScheduleConstraint[] = [
    new MaxConsecutiveWorkdaysConstraint(5),
    // 空の勤務表から埋めるので、測る人（勤務スタッフ）を渡す
    new MinMonthlyDayOffConstraint(8, staffIds),
    new RequiredStaffingConstraint(shiftIdsOf),
  ];
  const freeCells = freeCellsOf(original, staffIds);
  const values = cellValuesOf(['early']);
  const objective = RecipeObjective.of(ConstraintRecipe.empty(), constraints);

  const search = (seed: number, maxIterations = 3000) =>
    searchSchedule({ initial: original, freeCells, values, objective, rng: seededRng(seed), maxIterations });

  /** きつさを { 単位: 量 } で読む */
  const tightness = (s: MonthlyStaffSchedule) =>
    Object.fromEntries(
      constraints.flatMap((c) => c.tightness?.(s) ?? []).map((a) => [a.unit.key, a.amount])
    );

  test('同じ種・同じ回数なら同じ結果（決定的）', () => {
    expect(search(1).best.toPlain()).toEqual(search(1).best.toPlain());
  });

  test('★ 人間が入力したセルは動かさない', () => {
    expect(search(1).best.statusOf('a', day(1))).toEqual({ kind: 'day-off' });
  });

  test('★ 空の勤務表から、必要人数の不足と月の休みの不足を減らす（連勤の上限は超えない）', () => {
    const before = tightness(original);
    const after = tightness(search(1).best);
    expect(after['required-staffing-short']).toBeLessThan(before['required-staffing-short']);
    expect(after['monthly-day-off-short']).toBeLessThan(before['monthly-day-off-short']);
    expect(after['run-over']).toBe(0);
  });

  test('★ 測る人を渡さないと、最初の1セルで不足が「現れて」悪化に見え、何も置けない（渡す理由）', () => {
    const blind = [new MaxConsecutiveWorkdaysConstraint(5), new MinMonthlyDayOffConstraint(8)];
    const result = searchSchedule({
      initial: original,
      freeCells,
      values,
      objective: RecipeObjective.of(ConstraintRecipe.empty(), blind),
      rng: seededRng(1),
      maxIterations: 300,
    });
    // a は人間の入力（6/1 の休み）で見えているが、b・c は見えないので置けない
    expect(result.best.assignmentsForStaff('b')).toHaveLength(0);
  });

  test('★ 絶対の単位の量は、たたき台より増やさない', () => {
    const result = search(2);
    for (let i = 0; i < objective.state.hardCount; i++) {
      expect(result.bestCost[i]).toBeLessThanOrEqual(result.initialCost[i]);
    }
  });

  test('いちばん良かった勤務表は、たたき台より悪くならない', () => {
    const result = search(3, 500);
    expect(objective.compare(result.bestCost, result.initialCost)).toBeLessThanOrEqual(0);
  });

  test('受け入れ方は差し替えられる（山登りでも同じ口で回る）', () => {
    const result = searchSchedule({
      initial: original,
      freeCells,
      values,
      objective,
      acceptance: hillClimbing,
      rng: seededRng(4),
      maxIterations: 500,
    });
    expect(objective.compare(result.bestCost, result.initialCost)).toBeLessThanOrEqual(0);
  });

  test('時間の上限で止まる', () => {
    let t = 0;
    const result = searchSchedule({
      initial: original,
      freeCells,
      values,
      objective,
      rng: seededRng(5),
      maxIterations: 10_000,
      timeLimitMs: 10,
      now: () => (t += 1),
    });
    expect(result.iterations).toBeLessThan(20);
  });

  test('★ 優先度が同じ単位どうしの並べ方ごとに、案を作る', () => {
    // 連勤超え・休みの不足を同じ優先度にすると、並べ方が2通り＝案が2つ
    const recipe = ConstraintRecipe.empty()
      .with('run-over', { hard: true, priority: 0.9 })
      .with('monthly-day-off-short', { hard: true, priority: 0.9 });
    const plans = searchRecipePlans({
      initial: original,
      freeCells,
      values,
      recipe,
      constraints,
      seed: 1,
      maxIterations: 200,
    });
    expect(plans.map((p) => p.ordering.slice(0, 2).map((u) => u.key))).toEqual([
      ['run-over', 'monthly-day-off-short'],
      ['monthly-day-off-short', 'run-over'],
    ]);
  });
});

describe('lateAcceptance（少し前より悪くなっていなければ採る）', () => {
  const compare = (a: readonly number[], b: readonly number[]) => a[0] - b[0];

  test('直前より悪くても、少し前（length 手前）より悪くなければ採る', () => {
    const run = lateAcceptance(3).start([10], compare);
    // 履歴は [10, 10, 10]。今が 5 でも、10 以下なら採る
    expect(run.accepts([8], [5], 0)).toBe(true);
    expect(run.accepts([11], [5], 0)).toBe(false);
  });

  test('山登りは直前より悪い手を採らない', () => {
    const run = hillClimbing.start([10], compare);
    expect(run.accepts([8], [5], 0)).toBe(false);
    expect(run.accepts([5], [5], 0)).toBe(true);
  });
});
