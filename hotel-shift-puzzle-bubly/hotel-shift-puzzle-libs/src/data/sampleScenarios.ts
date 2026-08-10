/**
 * 動作確認用のシナリオ勤務表（2026年8月・作成途中）
 *
 * 空の勤務表（sampleSchedule.ts）は制約がまだ何も効いていないので、候補集合がほとんど
 * 絞られない＝確定提案が出ない。実際に人が触るのは「途中まで埋まった盤面」なので、
 * そこを再現する。作り方も実際の手順に合わせている:
 *
 *   1. 全員から希望（休み・時間帯）を集める           … sampleShiftWishes.ts の8月分
 *   2. その希望に沿って前半を組む                     … 1〜15日をローテーションで自動生成
 *   3. 責任者ルールを見ながら終盤を手で詰めていく     … 16〜22日を明示的に配置
 *   4. 残り（23日以降）は、制約から決まるものが順に提案されていく
 *
 * 16〜22日を手で書いているのは、確認したい状況を確実に起こすため。ここが自動生成だと、
 * データを少し変えただけで見たかった場面が黙って消える。
 *
 * 21日（金）は山本と土屋が揃って休みを希望している日で、責任者が2人抜ける。
 * そこから次の一手が連鎖して決まっていく:
 *
 *   - 21日 小林 → 早番   （早責が早番に居ない。入れるのは小林だけ）
 *   - 21日 中村 → 遅番   （夜責が遅番に居ない。土屋が休みなので中村だけ）
 *   - ↑を承認すると中村が5連勤に達し → 22日 中村 → 休み
 *   - 22日 小林 → 早番   （早責の高橋・山本が中番なので、早番に入れるのは小林だけ）
 *   - 22日で田中が5連勤に達しているので → 23日 田中 → 休み
 *   - すると予責を早番で担えるのが山本だけになり → 23日 山本 → 早番
 */
import {
  MonthlyStaffSchedule,
  RequiredStaffing,
  StaffMonthlyShiftWish,
  WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { DAY_OFF_WISH } from "../ui/shiftWishOptions.js";
import { sampleDemandFor } from "./sampleSchedule.js";

/** シナリオ勤務表のID（seed が「まだ無ければ入れる」判定に使う） */
export const MID_MONTH_SCHEDULE_ID = "sched-2026-08-mid";

const YEAR = 2026;
const MONTH = 8;

const EARLY = "early";
const MIDDLE = "middle";
const LATE = "late";

const work = (shiftId: string): ShiftCell => ({ kind: "work", shiftId });
const off: ShiftCell = { kind: "day-off" };

/** 希望に沿って自動で組む範囲（ここまでは前半の流し込み） */
const AUTO_FILLED_THROUGH = 15;
/** 手で詰めた範囲の最終日。ここから先（23日以降）が未定として残る */
export const HAND_FILLED_THROUGH = 22;
/** 確定提案が最初に立つ日 */
export const CHAIN_START_DAY = 21;

function requiredStaffing(): RequiredStaffing {
  const lastDay = new Date(YEAR, MONTH, 0).getDate();
  let required = RequiredStaffing.empty();
  for (let d = 1; d <= lastDay; d++) {
    const day = WorkingDay.of(YEAR, MONTH, d);
    for (const [name, count] of Object.entries(sampleDemandFor(day.weekday))) {
      required = required.setRequired(day, name, count);
    }
  }
  return required;
}

/**
 * 16〜22日の配置。実際に人が「責任者ルールを見ながら詰めた」体の手作業ぶん。
 * 各日、予責（山本 or 田中）が早番に、早責（山本/小林/高橋）が早番に、
 * 夜責（土屋 or 中村）が遅番に入るよう置いてある。undecided に挙げた人だけが未定で残る。
 */
const HAND_FILLED_DAYS: Array<{
  day: number;
  early: string[];
  middle: string[];
  late: string[];
  off: string[];
  undecided: string[];
}> = [
  {
    day: 16, // 日: 早3 中2 遅2
    early: ["staff-4", "staff-3", "staff-8"],
    middle: ["staff-7", "staff-5"],
    late: ["staff-tsuchiya", "staff-1"], // 土屋は「16日は遅番がいい」
    off: ["staff-2", "staff-6"],
    undecided: [],
  },
  {
    day: 17, // 月: 早2 中2 遅1
    early: ["staff-7", "staff-8"],
    middle: ["staff-3", "staff-5"],
    late: ["staff-6"],
    off: ["staff-tsuchiya", "staff-1", "staff-2", "staff-4"],
    undecided: [],
  },
  {
    day: 18, // 火
    early: ["staff-4", "staff-3"],
    middle: ["staff-1", "staff-tsuchiya"],
    late: ["staff-6"],
    off: ["staff-7", "staff-2", "staff-5", "staff-8"], // 伊藤は18日に休み希望
    undecided: [],
  },
  {
    day: 19, // 水
    early: ["staff-7", "staff-8"],
    middle: ["staff-2", "staff-4"],
    late: ["staff-6"],
    off: ["staff-tsuchiya", "staff-1", "staff-3", "staff-5"], // 伊藤は19日の早番を避けたい
    undecided: [],
  },
  {
    day: 20, // 木
    early: ["staff-4", "staff-3"],
    middle: ["staff-1", "staff-tsuchiya"],
    late: ["staff-6"],
    off: ["staff-7", "staff-2", "staff-5", "staff-8"],
    undecided: [],
  },
  {
    day: 21, // 金: 早3 中2 遅2。山本と土屋が休み希望を出している日
    early: ["staff-1", "staff-4"], // 田中は「21日は早番がいい」＝予責は満たせている
    middle: ["staff-5", "staff-3"],
    late: ["staff-2"],
    off: ["staff-7", "staff-tsuchiya"],
    undecided: ["staff-8", "staff-6"], // 小林→早番 / 中村→遅番 に絞られる
  },
  {
    day: 22, // 土: 早3 中2 遅2
    early: ["staff-1", "staff-4"],
    middle: ["staff-3", "staff-7"], // 高橋・山本とも中番希望 → 早番に早責が居ない
    late: ["staff-tsuchiya"],
    off: ["staff-5"],
    undecided: ["staff-8", "staff-2", "staff-6"],
  },
];

type FillParams = {
  staffIds: string[];
  /** スタッフID → 入れる勤務帯ID */
  allowedShiftIds: Record<string, string[]>;
  wishes: StaffMonthlyShiftWish[];
  maxConsecutive: number;
};

export type ScenarioParams = FillParams;

/** その日に休み希望を出しているか */
function dayOffWishLookup(
  wishes: StaffMonthlyShiftWish[]
): (staffId: string, day: WorkingDay) => boolean {
  const byStaff = new Map(
    wishes
      .filter((w) => w.year === YEAR && w.month === MONTH)
      .map((w) => [w.staffId, w])
  );
  return (staffId, day) =>
    byStaff.get(staffId)?.wishesOn(day)[DAY_OFF_WISH] === "want";
}

/**
 * 1日目から throughDay まで、希望と可能勤務帯を尊重して必要人数を満たす。
 * 連勤が上限に達した人・その日に休み希望を出している人は休みにする。
 */
function fillFollowingWishes(
  schedule: MonthlyStaffSchedule,
  params: FillParams,
  throughDay: number
): MonthlyStaffSchedule {
  let result = schedule;
  const wantsDayOff = dayOffWishLookup(params.wishes);
  const streak = new Map<string, number>(params.staffIds.map((id) => [id, 0]));
  const shiftIdOf: Record<string, string> = { 早番: EARLY, 中番: MIDDLE, 遅番: LATE };

  for (let d = 1; d <= throughDay; d++) {
    const day = WorkingDay.of(YEAR, MONTH, d);
    const assignedToday = new Set<string>();

    for (const [index, [name, count]] of Object.entries(
      sampleDemandFor(day.weekday)
    ).entries()) {
      const shiftId = shiftIdOf[name];
      const pool = params.staffIds.filter(
        (staffId) =>
          !assignedToday.has(staffId) &&
          (streak.get(staffId) ?? 0) < params.maxConsecutive &&
          !wantsDayOff(staffId, day) &&
          (params.allowedShiftIds[staffId] ?? []).includes(shiftId)
      );
      // 日と勤務帯で開始位置をずらし、同じ人にばかり同じ帯が回らないようにする
      const offset = (d * 3 + index) % Math.max(pool.length, 1);
      for (let i = 0; i < count && i < pool.length; i++) {
        const staffId = pool[(offset + i) % pool.length];
        result = result.setCell(staffId, day, work(shiftId));
        assignedToday.add(staffId);
      }
    }

    for (const staffId of params.staffIds) {
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

/**
 * 「作成途中」の勤務表（2026年8月）。
 * 22日まで埋まっていて、21〜22日に残した数セルから確定提案が連鎖する。23日以降は未定。
 */
export function createMidMonthSchedule(params: ScenarioParams): MonthlyStaffSchedule {
  const base = MonthlyStaffSchedule.create({
    id: MID_MONTH_SCHEDULE_ID,
    storeId: "store-1",
    year: YEAR,
    month: MONTH,
    requiredStaffing: requiredStaffing(),
  });

  let schedule = fillFollowingWishes(base, params, AUTO_FILLED_THROUGH);

  for (const plan of HAND_FILLED_DAYS) {
    const day = WorkingDay.of(YEAR, MONTH, plan.day);
    for (const staffId of plan.early) schedule = schedule.setCell(staffId, day, work(EARLY));
    for (const staffId of plan.middle) schedule = schedule.setCell(staffId, day, work(MIDDLE));
    for (const staffId of plan.late) schedule = schedule.setCell(staffId, day, work(LATE));
    for (const staffId of plan.off) schedule = schedule.setCell(staffId, day, off);
    for (const staffId of plan.undecided) {
      schedule = schedule.setCell(staffId, day, { kind: "undecided" });
    }
  }

  return schedule;
}
