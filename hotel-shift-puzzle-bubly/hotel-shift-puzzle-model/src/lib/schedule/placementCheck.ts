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
 * 判定は、絞った範囲の割当の中身ごとにキャッシュする（1人置いても、別の人の判定は使い回せる）。
 *
 * 既知の限界（候補集合と同じ）: すでにある違反と同じキーのまま**悪化**する手は、
 * 新しい違反とは見なさない（例：すでに休み上限を超えている日にさらに休みを置く）。
 */
import { MonthlyStaffSchedule, shiftCellKey, type ShiftCell } from "./MonthlyStaffSchedule.js";
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

/**
 * 判定のキャッシュ。
 *
 * キーは「絞った範囲の割当の中身」。自動シフトは1人置くたびに新しい勤務表インスタンスになるが、
 * 別のスタッフ（別の日）の割当は変わっていないので、中身で引けばそのまま使い回せる。
 * 同じセルに同じ値を何度も試す（責任者ステップは候補を数え直すたびに試す）ので、答えも覚える。
 *
 * 違反の出方は制約リスト（中身に希望や責任者ルールを抱えている）と必要人数でも変わるので、
 * どちらも不変のインスタンスごとに分ける。
 */
type Memo = {
  /** 絞った割当の中身 → 置く前の違反キー */
  before: Map<string, Set<string>>;
  /** 絞った割当の中身＋置くセルと値 → 新しい違反が出るか */
  answer: Map<string, boolean>;
};
const memoCache = new WeakMap<ScheduleConstraint[], WeakMap<object, Memo>>();
/** 1つの制約リスト×必要人数あたりに覚えておく数の上限（溢れたら捨てて作り直す） */
const MEMO_LIMIT = 50000;

const memoOf = (constraints: ScheduleConstraint[], schedule: MonthlyStaffSchedule): Memo => {
  let byRequired = memoCache.get(constraints);
  if (!byRequired) {
    byRequired = new WeakMap();
    memoCache.set(constraints, byRequired);
  }
  const required = schedule.state.requiredStaffing;
  let memo = byRequired.get(required);
  if (!memo || memo.before.size + memo.answer.size > MEMO_LIMIT) {
    memo = { before: new Map(), answer: new Map() };
    byRequired.set(required, memo);
  }
  return memo;
};

const signatureOf = (projected: MonthlyStaffSchedule, projectionKey: string): string => {
  const parts = [projectionKey, `${projected.state.year}-${projected.state.month}`];
  for (const a of projected.assignments) {
    parts.push(`${a.staffId}@${a.day.key}=${a.shift}`);
  }
  return parts.join("|");
};

/** そのセル（staffId × day）に cell を置くと、制約リストに新しい違反が出るか */
export function introducesViolation(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[],
  staffId: string,
  day: WorkingDay,
  cell: ShiftCell
): boolean {
  const memo = memoOf(constraints, schedule);
  for (const [projection, group] of groupsOf(constraints)) {
    const projectionKey =
      projection === "staff"
        ? `staff:${staffId}`
        : projection === "day"
          ? `day:${day.key}`
          : "board";
    const projected = project(schedule, projection, staffId, day);
    const signature = signatureOf(projected, projectionKey);
    const answerKey = `${signature}#${staffId}@${day.key}=${shiftCellKey(cell)}`;

    let introduces = memo.answer.get(answerKey);
    if (introduces === undefined) {
      let before = memo.before.get(signature);
      if (!before) {
        before = violationKeys(projected, group);
        memo.before.set(signature, before);
      }
      const after = violationKeys(projected.setCell(staffId, day, cell), group);
      introduces = [...after].some((key) => !before?.has(key));
      memo.answer.set(answerKey, introduces);
    }
    if (introduces) return true;
  }
  return false;
}
