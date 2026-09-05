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
import { SAMPLE_LEADER_STAFF_IDS } from "./sampleConstraints.js";

/** シナリオ勤務表のID（seed が「まだ無ければ入れる」判定に使う） */
export const MID_MONTH_SCHEDULE_ID = "sched-2026-08-mid";

const YEAR = 2026;
const AUGUST = 8;
const SEPTEMBER = 9;

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

function requiredStaffing(month: number): RequiredStaffing {
  const lastDay = new Date(YEAR, month, 0).getDate();
  let required = RequiredStaffing.empty();
  for (let d = 1; d <= lastDay; d++) {
    const day = WorkingDay.of(YEAR, month, d);
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
  wishes: StaffMonthlyShiftWish[],
  month: number
): (staffId: string, day: WorkingDay) => boolean {
  const byStaff = new Map(
    wishes
      .filter((w) => w.year === YEAR && w.month === month)
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
  month: number,
  throughDay: number
): MonthlyStaffSchedule {
  let result = schedule;
  const wantsDayOff = dayOffWishLookup(params.wishes, month);
  const streak = new Map<string, number>(params.staffIds.map((id) => [id, 0]));
  const shiftIdOf: Record<string, string> = { 早番: EARLY, 中番: MIDDLE, 遅番: LATE };

  for (let d = 1; d <= throughDay; d++) {
    const day = WorkingDay.of(YEAR, month, d);
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
    month: AUGUST,
    requiredStaffing: requiredStaffing(AUGUST),
  });

  let schedule = fillFollowingWishes(base, params, AUGUST, AUTO_FILLED_THROUGH);

  for (const plan of HAND_FILLED_DAYS) {
    const day = WorkingDay.of(YEAR, AUGUST, plan.day);
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


// ============================================================
// 終盤・詰みあり（2026年9月）
// ============================================================

/**
 * 終盤シナリオ勤務表のID。
 *
 * 8月（作成途中）と違い、こちらは**もう埋める場所が残っていない**盤面。
 * 28日の佐藤ひとりだけが未定で、しかもどの値も入れられない（＝詰み）。
 *
 *   - 佐藤は 23〜27日の5連勤で連勤上限に達しているので **出勤できない**
 *   - 28日は休みが既に4人（この勤務表の休み上限）居るので **休ませられない**
 *
 * どちらの縛りも勤務表と勤務表自身の制約だけで決まる（希望データに依存しない）ので、
 * シフト希望が入っていない環境でも同じ盤面になる。
 *
 * 直し方は手前にある。連勤の途中（25日）を休みに書き換えると連勤が切れて出勤できるようになり、
 * 詰みが解けて逆に「中番」の確定提案に変わる（28日は中番が1人足りず、埋められるのが佐藤だけ
 * になるため）。確定セルの書き換えに候補集合が追従することを手で確かめられる盤面。
 */
export const ENDGAME_SCHEDULE_ID = "sched-2026-09-endgame";

/** 詰みが起きている日（28日・月曜） */
export const ENDGAME_DEAD_DAY = 28;
/** 詰んでいるセルのスタッフ（佐藤 花子） */
export const ENDGAME_DEAD_STAFF_ID = "staff-1";
/** 佐藤の連勤が始まる日 */
export const ENDGAME_STREAK_START_DAY = 23;
/** ここを休みに書き換えると連勤が切れて詰みが解ける日（連勤のまん中） */
export const ENDGAME_FIX_DAY = 25;
/**
 * この勤務表の「1日に休める人数」の上限。
 * 平日は需要が5人なので休みはちょうど4人。つまり平日は毎日この上限ぎりぎりで、
 * 28日にもう1人休ませる余地が無い。
 */
export const ENDGAME_MAX_DAY_OFF_PER_DAY = 4;

/**
 * 28日の配置。佐藤（＝詰んでいる人）以外は全員決まっている。
 * 月曜の需要は 早2・中2・遅1 だが、**中番をわざと1人だけ**にしてある。
 * 「中番が1人足りず、埋められるのは佐藤だけ」という形にしておくと、連勤さえ切れれば
 * 中番の確定提案に変わる＝詰みが解けたことが一目で分かる。
 */
const ENDGAME_DEAD_DAY_PLAN = {
  early: ["staff-7", "staff-8"], // 山本（早責＋予責を兼務）・小林
  middle: ["staff-2"], // 鈴木（需要は2人なので1人不足）
  late: ["staff-tsuchiya"], // 土屋（夜責）
  off: ["staff-3", "staff-4", "staff-5", "staff-6"], // 4人＝休み上限ちょうど
};

/**
 * 生成前から決めておく割当（ピン）。ここだけは自動生成に任せず必ずこうなる。
 * 「確認したい状況を確実に起こす」ためのもので、8月シナリオの HAND_FILLED_DAYS と同じ役割。
 */
function endgamePins(): Map<string, ShiftCell> {
  const pins = new Map<string, ShiftCell>();
  const pin = (staffId: string, day: number, cell: ShiftCell) =>
    pins.set(`${staffId}:${WorkingDay.of(YEAR, SEPTEMBER, day).key}`, cell);

  // 佐藤: 22日に休んでから 23〜27日を5連勤（28日は出勤できなくなる）
  pin(ENDGAME_DEAD_STAFF_ID, 22, off);
  for (let d = ENDGAME_STREAK_START_DAY; d < ENDGAME_DEAD_DAY; d++) {
    pin(ENDGAME_DEAD_STAFF_ID, d, work(MIDDLE));
  }

  // 28日に出る4人は、その手前で必ず一度休ませる（28日に働かせても連勤上限を超えないように）
  pin("staff-7", 23, off);
  pin("staff-8", 23, off);
  pin("staff-2", 24, off);
  pin("staff-tsuchiya", 24, off);

  // 28日は全員ぶんを固定し、佐藤だけを未定で残す
  for (const staffId of ENDGAME_DEAD_DAY_PLAN.early) {
    pin(staffId, ENDGAME_DEAD_DAY, work(EARLY));
  }
  for (const staffId of ENDGAME_DEAD_DAY_PLAN.middle) {
    pin(staffId, ENDGAME_DEAD_DAY, work(MIDDLE));
  }
  for (const staffId of ENDGAME_DEAD_DAY_PLAN.late) {
    pin(staffId, ENDGAME_DEAD_DAY, work(LATE));
  }
  for (const staffId of ENDGAME_DEAD_DAY_PLAN.off) {
    pin(staffId, ENDGAME_DEAD_DAY, off);
  }
  pin(ENDGAME_DEAD_STAFF_ID, ENDGAME_DEAD_DAY, { kind: "undecided" });

  return pins;
}

/** 責任者ロールごとの候補者（勤務帯名つき） */
const LEADER_SLOTS: Array<{ role: string; shiftId: string }> = [
  { role: "night", shiftId: LATE },
  { role: "early", shiftId: EARLY },
  { role: "reservation", shiftId: EARLY },
];

/**
 * 責任者ルールを満たしながら1か月ぶんを組む。
 *
 * fillFollowingWishes は需要と希望しか見ないので、責任者の居ない日が量産される。
 * 終盤の盤面は「詰み以外は成立している」状態でないと詰みが埋もれてしまうので、こちらでは
 * 各日まず責任者（夜責→早責→予責）を置いてから残りを埋める。
 *
 * 誰を働かせるかは「連勤が短い人から」。9人で平日5人・週末7人なので、これだけで連勤も
 * 月内の休み日数も自然にならされる。同点はスタッフの並び順で決めるので生成は決定的。
 */
function fillRespectingLeaders(
  schedule: MonthlyStaffSchedule,
  params: FillParams,
  leadersByRole: Record<string, string[]>,
  pins: Map<string, ShiftCell>
): MonthlyStaffSchedule {
  let result = schedule;
  const wantsDayOff = dayOffWishLookup(params.wishes, SEPTEMBER);
  const streak = new Map<string, number>(params.staffIds.map((id) => [id, 0]));
  const rank = new Map(params.staffIds.map((id, i) => [id, i]));
  const shiftIdOf: Record<string, string> = { 早番: EARLY, 中番: MIDDLE, 遅番: LATE };
  const lastDay = new Date(YEAR, SEPTEMBER, 0).getDate();

  const canTake = (staffId: string, shiftId: string) =>
    (params.allowedShiftIds[staffId] ?? []).includes(shiftId);

  for (let d = 1; d <= lastDay; d++) {
    const day = WorkingDay.of(YEAR, SEPTEMBER, d);
    const need: Record<string, number> = {};
    for (const [name, count] of Object.entries(sampleDemandFor(day.weekday))) {
      need[shiftIdOf[name]] = count;
    }

    /** この日まだ何も決まっていない人 */
    const free = new Set(params.staffIds);
    /** この日出勤する人 → 勤務帯 */
    const working = new Map<string, string>();

    // 1. ピンを先に適用する（需要の消化にも数える）
    for (const staffId of params.staffIds) {
      const pinned = pins.get(`${staffId}:${day.key}`);
      if (!pinned) continue;
      free.delete(staffId);
      result = result.setCell(staffId, day, pinned);
      if (pinned.kind === "work") {
        working.set(staffId, pinned.shiftId);
        need[pinned.shiftId] = (need[pinned.shiftId] ?? 0) - 1;
      }
    }

    /** 出勤させられる人を、連勤が短い順（同点はスタッフ順）に並べる */
    const pickable = (shiftId: string) =>
      [...free]
        .filter(
          (staffId) =>
            (streak.get(staffId) ?? 0) < params.maxConsecutive &&
            canTake(staffId, shiftId)
        )
        .sort(
          (a, b) =>
            (streak.get(a) ?? 0) - (streak.get(b) ?? 0) ||
            (rank.get(a) ?? 0) - (rank.get(b) ?? 0)
        );

    const assign = (staffId: string, shiftId: string) => {
      free.delete(staffId);
      working.set(staffId, shiftId);
      need[shiftId] = (need[shiftId] ?? 0) - 1;
      result = result.setCell(staffId, day, work(shiftId));
    };

    // 2. 責任者を先に置く（枠が埋まってから責任者を探すと入れる場所が無くなる）
    for (const slot of LEADER_SLOTS) {
      if ((need[slot.shiftId] ?? 0) <= 0) continue;
      const candidates = leadersByRole[slot.role] ?? [];
      const already = candidates.some((id) => working.get(id) === slot.shiftId);
      if (already) continue;
      // 休み希望を出している責任者は最後の手段にする（ほかで満たせるなら休ませる）
      const pool = pickable(slot.shiftId).filter((id) => candidates.includes(id));
      const next =
        pool.find((id) => !wantsDayOff(id, day)) ?? pool[0];
      if (next) assign(next, slot.shiftId);
    }

    // 3. 残りの枠を埋める。休み希望の人は最後に回す
    for (const shiftId of [EARLY, MIDDLE, LATE]) {
      while ((need[shiftId] ?? 0) > 0) {
        const pool = pickable(shiftId);
        const next = pool.find((id) => !wantsDayOff(id, day)) ?? pool[0];
        if (!next) break; // 入れる人が居ない（＝必要人数不足の日になる）
        assign(next, shiftId);
      }
    }

    // 4. 残りは休み
    for (const staffId of free) {
      result = result.setCell(staffId, day, off);
    }

    for (const staffId of params.staffIds) {
      const pinned = pins.get(`${staffId}:${day.key}`);
      if (pinned?.kind === "undecided") {
        streak.set(staffId, 0); // 未定は出勤ではないので連勤は切れる
      } else if (working.has(staffId)) {
        streak.set(staffId, (streak.get(staffId) ?? 0) + 1);
      } else {
        streak.set(staffId, 0);
      }
    }
  }
  return result;
}

/**
 * 「終盤・詰みあり」の勤務表（2026年9月）。
 * 月末まで全部埋まっていて、28日の佐藤だけが未定＝どの値も入れられない。
 * 詳しくは {@link ENDGAME_SCHEDULE_ID} の説明を参照。
 */
export function createEndgameSchedule(params: ScenarioParams): MonthlyStaffSchedule {
  const base = MonthlyStaffSchedule.create({
    id: ENDGAME_SCHEDULE_ID,
    storeId: "store-1",
    year: YEAR,
    month: SEPTEMBER,
    requiredStaffing: requiredStaffing(SEPTEMBER),
  });

  return fillRespectingLeaders(
    base,
    params,
    SAMPLE_LEADER_STAFF_IDS,
    endgamePins()
  );
}
