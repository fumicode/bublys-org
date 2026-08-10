/**
 * 動作確認用のシナリオ勤務表
 *
 * 空の勤務表（sampleSchedule.ts）は、制約がまだ何も効いていないので候補集合がほとんど
 * 絞られない＝確定提案が出ない。実際に人が勤務表を触るのは「途中まで埋まった盤面」なので、
 * そこを再現する。
 *
 *   - 作成途中（mid）  : 月の 2/3 ほどが埋まっていて、続きを人が詰めていく状態。
 *                        次の日には確定提案が数件立つ（責任者ルール・連勤上限の両方）。
 *   - 終盤（endgame）  : ほぼ埋まっていて、1セルが「何を入れても違反する」＝詰み。
 *
 * 埋め方は決定論的なローテーション。可能勤務帯・連勤上限・休み希望を尊重して必要人数を
 * 満たしにいくので、出来上がりは自動シフトを何回か回した後の盤面に近い。
 * そのうえで「確認したい状況」だけを明示的に置く（planted）。ここが曖昧だと、
 * データを変えたときに確認したかった場面が黙って消えるため。
 */
import {
  MonthlyStaffSchedule,
  RequiredStaffing,
  StaffMonthlyShiftWish,
  WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { DAY_OFF_WISH } from "../ui/shiftWishOptions.js";

/** シナリオ勤務表のID（seed が「まだ無ければ入れる」判定に使う） */
export const MID_MONTH_SCHEDULE_ID = "sched-2026-08-mid";
export const ENDGAME_SCHEDULE_ID = "sched-2026-09-endgame";

/** 早番/中番/遅番の勤務帯ID（既定の勤務帯セットと対応） */
const EARLY = "early";
const MIDDLE = "middle";
const LATE = "late";

const work = (shiftId: string): ShiftCell => ({ kind: "work", shiftId });
const off: ShiftCell = { kind: "day-off" };

/**
 * 16人規模のホテルの需要。1日 10〜12 人が出勤し、4〜6 人が休む。
 * 休みの人数が「1日の休み上限」に近くなるので、上限制約が実際に効く。
 */
function demandFor(weekday: number): Array<{ name: string; shiftId: string; count: number }> {
  if (weekday === 0 || weekday === 6) {
    return [
      { name: "早番", shiftId: EARLY, count: 5 },
      { name: "中番", shiftId: MIDDLE, count: 4 },
      { name: "遅番", shiftId: LATE, count: 3 },
    ];
  }
  if (weekday === 5) {
    return [
      { name: "早番", shiftId: EARLY, count: 4 },
      { name: "中番", shiftId: MIDDLE, count: 4 },
      { name: "遅番", shiftId: LATE, count: 3 },
    ];
  }
  return [
    { name: "早番", shiftId: EARLY, count: 4 },
    { name: "中番", shiftId: MIDDLE, count: 3 },
    { name: "遅番", shiftId: LATE, count: 3 },
  ];
}

function requiredStaffingFor(year: number, month: number): RequiredStaffing {
  const lastDay = new Date(year, month, 0).getDate();
  let required = RequiredStaffing.empty();
  for (let d = 1; d <= lastDay; d++) {
    const day = WorkingDay.of(year, month, d);
    for (const demand of demandFor(day.weekday)) {
      required = required.setRequired(day, demand.name, demand.count);
    }
  }
  return required;
}

type FillContext = {
  year: number;
  month: number;
  staffIds: string[];
  /** スタッフID → 入れる勤務帯ID */
  allowedShiftIds: Record<string, string[]>;
  /** その日に休み希望を出しているか（休ませる＝希望違反を無駄に増やさない） */
  wantsDayOff: (staffId: string, day: WorkingDay) => boolean;
  maxConsecutive: number;
};

/**
 * 1日目から throughDay まで、必要人数を満たすようにローテーションで埋める。
 * 連勤が上限に達した人と、その日に休み希望を出している人は休みにする。
 * 割当が付かなかった人も休み（＝その日の勤務表は全員ぶん確定する）。
 */
function fillThrough(
  schedule: MonthlyStaffSchedule,
  ctx: FillContext,
  throughDay: number
): MonthlyStaffSchedule {
  let result = schedule;
  const streak = new Map<string, number>(ctx.staffIds.map((id) => [id, 0]));

  for (let d = 1; d <= throughDay; d++) {
    const day = WorkingDay.of(ctx.year, ctx.month, d);
    const assignedToday = new Set<string>();

    for (const [index, demand] of demandFor(day.weekday).entries()) {
      const pool = ctx.staffIds.filter(
        (staffId) =>
          !assignedToday.has(staffId) &&
          (streak.get(staffId) ?? 0) < ctx.maxConsecutive &&
          !ctx.wantsDayOff(staffId, day) &&
          (ctx.allowedShiftIds[staffId] ?? []).includes(demand.shiftId)
      );
      // 日と勤務帯で開始位置をずらし、同じ人にばかり同じ帯が回らないようにする
      const offset = (d * 3 + index) % Math.max(pool.length, 1);
      for (let i = 0; i < demand.count && i < pool.length; i++) {
        const staffId = pool[(offset + i) % pool.length];
        result = result.setCell(staffId, day, work(demand.shiftId));
        assignedToday.add(staffId);
      }
    }

    for (const staffId of ctx.staffIds) {
      if (assignedToday.has(staffId)) {
        streak.set(staffId, (streak.get(staffId) ?? 0) + 1);
      } else {
        result = result.setCell(staffId, day, off);
        streak.set(staffId, 0);
      }
    }
  }
  return result;
}

/** 休み希望の判定を、その月の希望データから作る */
function dayOffWishLookup(
  wishes: StaffMonthlyShiftWish[],
  year: number,
  month: number
): (staffId: string, day: WorkingDay) => boolean {
  const byStaff = new Map(
    wishes
      .filter((w) => w.year === year && w.month === month)
      .map((w) => [w.staffId, w])
  );
  return (staffId, day) =>
    byStaff.get(staffId)?.wishesOn(day)[DAY_OFF_WISH] === "want";
}

export type ScenarioParams = {
  staffIds: string[];
  allowedShiftIds: Record<string, string[]>;
  wishes: StaffMonthlyShiftWish[];
  maxConsecutive: number;
};

/** 作成途中の盤面で、確定提案が立つよう明示的に置く状況の日（月の途中） */
export const MID_MONTH_FILLED_THROUGH = 20;
export const MID_MONTH_FOCUS_DAY = 21;

/**
 * 「作成途中」の勤務表（2026年8月）。20日まで埋まっていて、21日から先が未定。
 *
 * 21日には、実際の勤務表づくりでよく起きる3つの状況を置いてある:
 *   - 早責の候補3人のうち2人が休み・中番で確定  → 残る小林は早番しか取れない
 *   - 予責の候補2人のうち山本が休みで確定       → 残る田中は早番しか取れない
 *   - 夜責の候補2人のうち土屋が休みで確定       → 残る中村は遅番しか取れない
 * さらに森を 16〜20日の5連勤にしてあるので、21日の森は休みしか取れない（連勤上限）。
 */
export function createMidMonthSchedule(params: ScenarioParams): MonthlyStaffSchedule {
  const year = 2026;
  const month = 8;
  const base = MonthlyStaffSchedule.create({
    id: MID_MONTH_SCHEDULE_ID,
    storeId: "store-1",
    year,
    month,
    requiredStaffing: requiredStaffingFor(year, month),
  });

  let schedule = fillThrough(
    base,
    {
      year,
      month,
      staffIds: params.staffIds,
      allowedShiftIds: params.allowedShiftIds,
      wantsDayOff: dayOffWishLookup(params.wishes, year, month),
      maxConsecutive: params.maxConsecutive,
    },
    MID_MONTH_FILLED_THROUGH
  );

  // 連勤上限で「休みしか取れない」セルを作る（森を 16〜20日の5連勤にする）
  for (let d = MID_MONTH_FOCUS_DAY - 5; d < MID_MONTH_FOCUS_DAY; d++) {
    schedule = schedule.setCell("staff-9", WorkingDay.of(year, month, d), work(MIDDLE));
  }

  // 21日: 責任者の候補を1人だけ残す（残った人はその勤務帯しか取れなくなる）
  const focus = WorkingDay.of(year, month, MID_MONTH_FOCUS_DAY);
  schedule = schedule
    .setCell("staff-7", focus, off) // 山本（早責・予責）は休み
    .setCell("staff-3", focus, work(MIDDLE)) // 高橋（早責）は中番
    .setCell("staff-tsuchiya", focus, off); // 土屋（夜責）は休み

  return schedule;
}

export const ENDGAME_FILLED_THROUGH = 27;
export const ENDGAME_DEAD_DAY = 28;

/**
 * 「終盤・詰みあり」の勤務表（2026年9月）。27日まで埋まっていて、28日で行き詰まっている。
 *
 * 28日の内田は、5連勤済みなので出勤できず、その日の休みは既に上限（5人）に達しているので
 * 休むこともできない ＝ 候補が0件。この勤務表の制約は 1日の休み上限を 5 にしてある。
 * 「どこかで無理が出ていることに、そこへ到達する前に気付けるか」を試すための盤面。
 */
export function createEndgameSchedule(params: ScenarioParams): MonthlyStaffSchedule {
  const year = 2026;
  const month = 9;
  const base = MonthlyStaffSchedule.create({
    id: ENDGAME_SCHEDULE_ID,
    storeId: "store-1",
    year,
    month,
    requiredStaffing: requiredStaffingFor(year, month),
  });

  let schedule = fillThrough(
    base,
    {
      year,
      month,
      staffIds: params.staffIds,
      allowedShiftIds: params.allowedShiftIds,
      wantsDayOff: dayOffWishLookup(params.wishes, year, month),
      maxConsecutive: params.maxConsecutive,
    },
    ENDGAME_FILLED_THROUGH
  );

  // 内田を 23〜27日の5連勤にする（28日は出勤できない）
  const dead = WorkingDay.of(year, month, ENDGAME_DEAD_DAY);
  for (let d = ENDGAME_DEAD_DAY - 5; d < ENDGAME_DEAD_DAY; d++) {
    schedule = schedule.setCell("staff-11", WorkingDay.of(year, month, d), work(MIDDLE));
  }

  // 28日: 内田以外で休みの枠（上限5人）を使い切る
  const restingOnDeadDay = ["staff-12", "staff-13", "staff-14", "staff-15", "staff-10"];
  for (const staffId of restingOnDeadDay) {
    schedule = schedule.setCell(staffId, dead, off);
  }
  // 残りは出勤で確定させ、内田だけを未定のまま残す（＝候補0のセル）
  for (const staffId of params.staffIds) {
    if (staffId === "staff-11" || restingOnDeadDay.includes(staffId)) continue;
    const shiftId = (params.allowedShiftIds[staffId] ?? [MIDDLE]).includes(MIDDLE)
      ? MIDDLE
      : (params.allowedShiftIds[staffId] ?? [LATE])[0];
    schedule = schedule.setCell(staffId, dead, work(shiftId));
  }

  return schedule;
}
