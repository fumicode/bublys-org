/**
 * buildScheduleReport — シフト表確定時にレポートのデータを一括計算する
 *
 * 世界線ビューの「確定してレポート作成」から一度だけ呼ばれる純粋関数。
 * ScheduleReport（model層の不変集約）へそのまま渡せる draft を返す。
 *
 *   - #87 譲歩: 連勤・休日・希望など、勤務表に適用する制約一式（グリッドと同じ組み立て。
 *     `constraints` として渡す）を schedule.checkConstraints() にかけ、スタッフに紐づく
 *     違反（ConstraintViolation.staffId が付くもの）をすべて譲歩として数える。
 *     責任者不足・休み上限超過など日単位（誰のせいでもない）の違反は個人の譲歩に含めない。
 *   - #88 繁忙日: 稼働日ごとの必要人数合計が平均を上回る日を自動的に繁忙日とする。
 *   - #89 貢献度スコア: 譲歩回数・繁忙日出勤回数の加重合計（シンプルな加重合計）。重みは
 *     model層の DEFAULT_COMPROMISE_WEIGHT/DEFAULT_BUSY_DAY_WEIGHT を確定時点の初期値として
 *     使う（確定後は ScheduleReport.reweight() でシフト管理者が調整できる）。
 */
import {
  MonthlyStaffSchedule,
  DEFAULT_COMPROMISE_WEIGHT,
  DEFAULT_BUSY_DAY_WEIGHT,
  type ScheduleConstraint,
  type CompromiseEntry,
  type BusyDayEntry,
  type ContributionScoreEntry,
} from "@bublys-org/hotel-shift-puzzle-model";

export type BuildScheduleReportArgs = {
  schedule: MonthlyStaffSchedule;
  /** スコアに含める全スタッフID（譲歩・繁忙日出勤が0件でもスコア0として載せる） */
  staffIds: string[];
  /** 勤務表に適用する制約一式（連勤・休日・希望など。グリッドと同じ組み立てを渡す） */
  constraints: ScheduleConstraint[];
};

export type ScheduleReportDraft = {
  compromises: CompromiseEntry[];
  busyDayContributions: BusyDayEntry[];
  contributionScores: ContributionScoreEntry[];
};

/**
 * #87: ルール違反のうちスタッフに紐づくものを譲歩として数える。
 * 責任者不足・休み上限超過など日単位（staffId なし）の違反は、誰のせいでもないので除外する。
 */
function computeCompromises(
  schedule: MonthlyStaffSchedule,
  constraints: ScheduleConstraint[]
): CompromiseEntry[] {
  const labelByType = new Map(constraints.map((c) => [c.type, c.label]));
  return schedule
    .checkConstraints(constraints)
    .filter((v) => v.staffId !== undefined)
    .map((v) => ({
      staffId: v.staffId as string,
      label: labelByType.get(v.constraintType) ?? v.constraintType,
      dayKeys: v.days.map((d) => d.key),
      message: v.message,
    }));
}

/** #88: 必要人数合計が平均を上回る稼働日を繁忙日とし、その出勤者を集める */
function computeBusyDayContributions(schedule: MonthlyStaffSchedule): BusyDayEntry[] {
  const requiredByDay = schedule.workingDays().map((day) => ({
    day,
    required: Object.values(schedule.requiredStaffing.requiredOn(day)).reduce(
      (sum, n) => sum + n,
      0
    ),
  }));
  const withRequirement = requiredByDay.filter((d) => d.required > 0);
  if (withRequirement.length === 0) return [];

  const average =
    withRequirement.reduce((sum, d) => sum + d.required, 0) / withRequirement.length;

  return withRequirement
    .filter((d) => d.required > average)
    .map(({ day, required }) => ({
      dayKey: day.key,
      requiredCount: required,
      workedStaffIds: schedule
        .assignmentsOn(day)
        .filter((a) => a.isWorking)
        .map((a) => a.staffId),
    }));
}

/** #89: スタッフごとに譲歩回数・繁忙日出勤回数を集計し、加重合計でスコアを出す（降順） */
function computeContributionScores(
  staffIds: string[],
  compromises: CompromiseEntry[],
  busyDayContributions: BusyDayEntry[]
): ContributionScoreEntry[] {
  const compromiseCounts = new Map<string, number>();
  for (const c of compromises) {
    compromiseCounts.set(c.staffId, (compromiseCounts.get(c.staffId) ?? 0) + 1);
  }

  const busyDayCounts = new Map<string, number>();
  for (const entry of busyDayContributions) {
    for (const staffId of entry.workedStaffIds) {
      busyDayCounts.set(staffId, (busyDayCounts.get(staffId) ?? 0) + 1);
    }
  }

  return staffIds
    .map((staffId) => {
      const compromiseCount = compromiseCounts.get(staffId) ?? 0;
      const busyDayCount = busyDayCounts.get(staffId) ?? 0;
      return {
        staffId,
        compromiseCount,
        busyDayCount,
        score: compromiseCount * DEFAULT_COMPROMISE_WEIGHT + busyDayCount * DEFAULT_BUSY_DAY_WEIGHT,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** 確定時に呼ぶ: 譲歩・繁忙日対応・貢献度スコアをまとめて計算する */
export function buildScheduleReport(args: BuildScheduleReportArgs): ScheduleReportDraft {
  const compromises = computeCompromises(args.schedule, args.constraints);
  const busyDayContributions = computeBusyDayContributions(args.schedule);
  const contributionScores = computeContributionScores(
    args.staffIds,
    compromises,
    busyDayContributions
  );
  return { compromises, busyDayContributions, contributionScores };
}
