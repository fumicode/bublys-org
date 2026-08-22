import {
  ScheduleConstraints,
  type ShiftLeaderRuleState,
} from "@bublys-org/hotel-shift-puzzle-model";

/**
 * サンプルの制約（勤務表ごとの ScheduleConstraints）。
 *
 * 以前は「責任者ロールの定義（config）」＋「どのスタッフが責任者か（Staff.leaderRoleKeys）」に
 * 分かれていたが、制約は勤務表側の要件なので ScheduleConstraints に一本化した。ここはその
 * サンプル（会社ごとに差し替える想定の入口）。
 *   - 早責: 早番に最低1人。会計の女性2人＋高橋。
 *   - 予責: 早番に最低1人（予約責任者）。山本（兼務）＋田中。
 *   - 夜責: 遅番に最低1人。土屋＋中村。
 */

/** 責任者ロールの定義（会社ごとの雛形）。 */
const LEADER_ROLE_DEFS: Omit<ShiftLeaderRuleState, "leaderStaffIds">[] = [
  { key: "early", label: "早責", shiftName: "早番" },
  { key: "reservation", label: "予責", shiftName: "早番" },
  { key: "night", label: "夜責", shiftName: "遅番" },
];

/** ロール → 候補者（責任者）スタッフID。旧 Staff.leaderRoleKeys 相当。 */
const SAMPLE_LEADERS_BY_ROLE: Record<string, string[]> = {
  early: ["staff-7", "staff-8", "staff-3"], // 山本・小林・高橋
  reservation: ["staff-7", "staff-4"], // 山本（兼務）・田中
  night: ["staff-tsuchiya", "staff-6"], // 土屋・中村
};

/**
 * 指定した勤務表IDの制約（責任者ルール＋連勤上限＋希望チェック）を作る。
 *
 * `maxDayOffPerDay` は勤務表ごとに変えられる。終盤シナリオ（9月）は「その日に休める枠が
 * もう残っていない」状況を作りたいので、需要から決まる休み人数ちょうどまで絞る。
 */
export function createSampleConstraintsFor(
  scheduleId: string,
  options: { maxDayOffPerDay?: number } = {}
): ScheduleConstraints {
  const leaderRules: ShiftLeaderRuleState[] = LEADER_ROLE_DEFS.map((def) => ({
    ...def,
    leaderStaffIds: [...(SAMPLE_LEADERS_BY_ROLE[def.key] ?? [])],
  }));
  return new ScheduleConstraints({
    scheduleId,
    leaderRules,
    maxConsecutiveWorkdays: 5,
    checkShiftWish: true,
    minMonthlyDayOff: 8,
    maxDayOffPerDay: options.maxDayOffPerDay ?? 8,
  });
}

/** 責任者ロール → 候補者。シナリオ生成が責任者を満たすために参照する。 */
export const SAMPLE_LEADER_STAFF_IDS = SAMPLE_LEADERS_BY_ROLE;
