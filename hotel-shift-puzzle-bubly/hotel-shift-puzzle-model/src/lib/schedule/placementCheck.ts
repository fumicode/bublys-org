/**
 * placementCheck — そのセルにその値を置くと、勤務表の制約に新しい違反が出るか
 *
 * 自動シフトの各ステップが「置いてよいか」を判定する唯一の入口。
 * 考え方は候補集合（cellCandidates.ts の evaluateCellCandidates）と同じで、置く前と後の違反を
 * 同一性キー（violationIdentityKey）で比べ、後にだけあるものが1つでもあれば「新しい違反」。
 * だから**自動シフトが置けるのは、候補集合に載る値だけ**になる。
 *
 * 制約の中身は見ない（check() と scope しか使わない）。遅番明けのような制約も、
 * これから足す制約も、制約リストに入っていればそれだけで守られる。
 *
 * ## 重さ対策：制約の scope で勤務表を絞る
 *
 * 自動シフトは1手ごとに何人・何帯も試すので、毎回盤面全体をチェックすると遅すぎる。
 * 制約が宣言している影響範囲（ScheduleConstraint.scope。affectedCells と同じ前提）を使い、
 *   - staff / cell … そのスタッフの割当だけを残した勤務表
 *   - day          … その日の割当だけを残した勤務表
 *   - global       … 盤面全体
 * の上で前後を比べる。絞った勤務表では他のスタッフ／他の日の違反も変わるが、
 * 前後どちらにも同じだけ現れるので、差分（新しい違反）には影響しない。
 * 置く前の結果は勤務表インスタンスごとにキャッシュする（勤務表は不変なので古くならない）。
 *
 * 既知の限界（候補集合と同じ）: すでにある違反と同じキーのまま**悪化**する手は、
 * 新しい違反とは見なさない（例：すでに休み上限を超えている日にさらに休みを置く）。
 */
import { MonthlyStaffSchedule, type ShiftCell } from "./MonthlyStaffSchedule.js";
import { violationIdentityKey } from "./ConstraintDelta.js";
import type { ScheduleConstraint } from "./ScheduleConstraint.js";
import type { WorkingDay } from "./WorkingDay.js";

/** どの範囲に絞った勤務表で判定するか */
type Projection = "staff" | "day" | "board";

const projectionOf = (constraint: ScheduleConstraint): Projection => {
  const scope = constraint.scope ?? "global";
  if (scope === "staff" || scope === "cell") return "staff";
  if (scope === "day") return "day";
  return "board";
};

/** 制約リスト → 絞り方ごとの制約。同じリストで何度も呼ばれるので覚えておく */
const groupsCache = new WeakMap<
  ScheduleConstraint[],
  Map<Projection, ScheduleConstraint[]>
>();

const groupsOf = (constraints: ScheduleConstraint[]) => {
  let groups = groupsCache.get(constraints);
  if (!groups) {
    groups = new Map();
    for (const constraint of constraints) {
      const projection = projectionOf(constraint);
      groups.set(projection, [...(groups.get(projection) ?? []), constraint]);
    }
    groupsCache.set(constraints, groups);
  }
  return groups;
};

const project = (
  schedule: MonthlyStaffSchedule,
  projection: Projection,
  staffId: string,
  day: WorkingDay
): MonthlyStaffSchedule => {
  if (projection === "board") return schedule;
  const assignments =
    projection === "staff"
      ? schedule.assignmentsForStaff(staffId)
      : schedule.assignmentsOn(day);
  return new MonthlyStaffSchedule({ ...schedule.state, assignments });
};

/** 勤務表の違反を同一性キーの集合にする（候補集合の差分と同じキー） */
export const violationKeys = (
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[]
): Set<string> =>
  new Set(schedule.checkConstraints(constraints).map(violationIdentityKey));

/** 置く前の違反キー。制約リスト × 勤務表インスタンス × 絞り方 で覚えておく */
const beforeCache = new WeakMap<
  ScheduleConstraint[],
  WeakMap<MonthlyStaffSchedule, Map<string, Set<string>>>
>();

const beforeKeysOf = (
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  group: ScheduleConstraint[],
  projected: MonthlyStaffSchedule,
  cacheKey: string
): Set<string> => {
  let bySchedule = beforeCache.get(constraints);
  if (!bySchedule) {
    bySchedule = new WeakMap();
    beforeCache.set(constraints, bySchedule);
  }
  let byKey = bySchedule.get(schedule);
  if (!byKey) {
    byKey = new Map();
    bySchedule.set(schedule, byKey);
  }
  let keys = byKey.get(cacheKey);
  if (!keys) {
    keys = violationKeys(projected, group);
    byKey.set(cacheKey, keys);
  }
  return keys;
};

/** そのセル（staffId × day）に cell を置くと、制約リストに新しい違反が出るか */
export function introducesViolation(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  staffId: string,
  day: WorkingDay,
  cell: ShiftCell
): boolean {
  for (const [projection, group] of groupsOf(constraints)) {
    const cacheKey =
      projection === "staff"
        ? `staff:${staffId}`
        : projection === "day"
          ? `day:${day.key}`
          : "board";
    const projected = project(schedule, projection, staffId, day);
    const before = beforeKeysOf(schedule, constraints, group, projected, cacheKey);
    const after = violationKeys(projected.setCell(staffId, day, cell), group);
    for (const key of after) {
      if (!before.has(key)) return true;
    }
  }
  return false;
}
