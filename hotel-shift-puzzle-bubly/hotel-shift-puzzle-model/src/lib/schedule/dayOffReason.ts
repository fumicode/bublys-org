/**
 * dayOffReason — その休みが、いまの勤務表で何の役目を果たしているかを読み解く
 *
 * ルールは「休みのセルに触れたら、その休みの役目を**いまの表から**読み解いて見せる」。
 * 置いたときの経緯は保存しない（世界線に載せるには細かすぎるし、手で動かした休みには
 * 経緯が無い）。いまの表から読むので、枝を切り替えても手で直しても、そのまま正しい。
 *
 * 読み解きは上から順に、最初に当てはまったもの:
 *   1. 休みの希望がある                         → 希望の休み
 *   2. 外すと全体の連勤上限を超える              → 上限を守っている
 *   3. 連休型で、外すとその人の目標を超える      → 目標を守っている
 *   4. 連休型で、隣も休み                        → 連休
 *   5. それ以外                                  → 前後の出勤の塊の間
 *
 * **連休型の人の単発の休みには、連休にできなかった理由を添える**（{@link UnpairedReason}）。
 * これも今の表から読む：隣の日が塞がっている（出勤・出勤の希望・1日の休み上限・3連休になる・
 * 前月の確定分）か、隣は空いているのに月の休みを区切りに使い切ったか。
 * 月全体にまとめて知らせず、その休みに触れたときだけ出す。
 *
 * 前月の確定版の末尾（schedule.precedingTail）とはひと続きで読む。月初の休みの手前には
 * 前月末からの出勤が続いているし、前月末日の休みは1日目の休みの相方になる。
 *
 * 出勤の塊は「休みでない日」（出勤 or 未定）で数える。休みを置く段（minDayOffStep）と同じ
 * 数え方にしておかないと、置いた理由と読み解いた理由が食い違う。
 *
 * 純粋。
 */
import type { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import type { WorkingDay } from "./WorkingDay.js";
import type { DecodedWish } from "./autoShiftStep.js";
import { DayOffStyle } from "../staff/DayOffStyle.js";

/** 連休の相方にできなかった隣の日の事情 */
export type NeighborBlock =
  /** 出勤が入っている */
  | "work"
  /** 出勤の希望がある */
  | "work-wish"
  /** その日の休みが1日の上限に達している */
  | "day-cap"
  /** 休むと3連休になる（その先も休み） */
  | "triple"
  /** 前月の確定分（今月の勤務表からは動かせない） */
  | "prev-month"
  /** 空いているが、ほかの制約で休みを置けない */
  | "constraint";

/** 連休型の人の単発の休みが、連休にならなかった理由 */
export type UnpairedReason =
  /** 隣は空いているが、月の休みをすべて連勤の区切りに使った */
  | { kind: "out-of-days"; minDayOff: number }
  /** 隣の日がどちらも塞がっている */
  | { kind: "neighbors"; neighbors: Array<{ day: WorkingDay; why: NeighborBlock }> };

export type DayOffReason = (
  | { kind: "wish" }
  /** 外すと runIfRemoved 連勤になり、limit を超える。personal はその人の目標か */
  | { kind: "keeps-run-limit"; runIfRemoved: number; limit: number; personal: boolean }
  /** 連休の片方。acrossMonth は前月末日の休みと続いているか */
  | { kind: "pair"; acrossMonth: boolean }
  /** 前後の出勤の塊（日数）の間 */
  | { kind: "between"; before: number; after: number }
) & {
  /** 連休型の人の単発の休みのとき、連休にできなかった理由 */
  unpaired?: UnpairedReason;
};

export type DayOffReasonInput = {
  schedule: MonthlyStaffSchedule;
  staffId: string;
  day: WorkingDay;
  /** その人のその日の希望（デコード済み）。隣の日の希望も見るので日ごとに引く */
  wishOf: (day: WorkingDay) => DecodedWish;
  /** その人がこの勤務表で使う休みの形 */
  style: DayOffStyle;
  /** 全体の連勤上限 */
  maxConsecutiveWorkdays: number;
  /** 月の最低休日数（連休にできなかった理由に使う） */
  minDayOff?: number;
  /** 1日に休んでよい人数の上限（連休にできなかった理由に使う） */
  maxDayOffPerDay?: number;
};

/** その日のその人の休みの役目。休みでなければ undefined */
export function dayOffReasonOf(input: DayOffReasonInput): DayOffReason | undefined {
  const { schedule, staffId, day, wishOf, style, maxConsecutiveWorkdays } = input;
  if (!schedule.isDayOff(staffId, day)) return undefined;

  const days = schedule.workingDays();
  const idx = days.findIndex((d) => d.equals(day));
  if (idx < 0) return undefined;
  const tail = schedule.precedingTail;
  const prevMonthLastOff =
    tail?.lastDay !== undefined &&
    tail.cellOf(staffId, tail.lastDay)?.value.kind === "day-off";
  const offAt = (j: number): boolean =>
    j < 0 ? j === -1 && prevMonthLastOff : j < days.length && schedule.isDayOff(staffId, days[j]);

  const prevOff = offAt(idx - 1);
  const nextOff = offAt(idx + 1);
  // 連休型なのに単発の休みなら、連休にできなかった理由を添える
  const withUnpaired = (reason: DayOffReason): DayOffReason =>
    style.isClustered && !prevOff && !nextOff
      ? { ...reason, unpaired: unpairedReasonOf(input, days, idx, offAt) }
      : reason;

  if (wishOf(day).kind === "day-off") return withUnpaired({ kind: "wish" });

  // 手前の出勤の塊。月初まで休みが無ければ、前月末からの出勤を足す
  let before = 0;
  for (let j = idx - 1; j >= 0 && !schedule.isDayOff(staffId, days[j]); j--) before++;
  if (before === idx) before += tail?.trailingWorkdays(staffId) ?? 0;
  let after = 0;
  for (let j = idx + 1; j < days.length && !schedule.isDayOff(staffId, days[j]); j++) after++;

  const runIfRemoved = before + 1 + after;
  if (runIfRemoved > maxConsecutiveWorkdays) {
    return withUnpaired({
      kind: "keeps-run-limit",
      runIfRemoved,
      limit: maxConsecutiveWorkdays,
      personal: false,
    });
  }
  if (style.isClustered) {
    const limit = style.runLimitWithin(maxConsecutiveWorkdays);
    if (runIfRemoved > limit) {
      return withUnpaired({ kind: "keeps-run-limit", runIfRemoved, limit, personal: true });
    }
    if (prevOff || nextOff) {
      return { kind: "pair", acrossMonth: idx === 0 && prevOff && !nextOff };
    }
  }
  return withUnpaired({ kind: "between", before, after });
}

/** 単発の休みが連休にならなかった理由を、隣の日の事情から読む */
function unpairedReasonOf(
  input: DayOffReasonInput,
  days: WorkingDay[],
  idx: number,
  offAt: (j: number) => boolean
): UnpairedReason {
  const { schedule, staffId, wishOf, minDayOff, maxDayOffPerDay } = input;
  const blocks: Array<{ day: WorkingDay; why: NeighborBlock }> = [];
  let hasFreeNeighbor = false;

  // 前日（月初なら前月末日）と翌日（月末なら翌月なので見ない）
  for (const j of [idx - 1, idx + 1]) {
    if (j >= days.length) continue;
    if (j < 0) {
      const lastDay = schedule.precedingTail?.lastDay;
      if (lastDay) blocks.push({ day: lastDay, why: "prev-month" });
      continue;
    }
    const d = days[j];
    const beyond = j < idx ? j - 1 : j + 1;
    const why: NeighborBlock | undefined = schedule.isWorking(staffId, d)
      ? wishOf(d).kind === "work"
        ? "work-wish"
        : "work"
      : wishOf(d).kind === "work"
        ? "work-wish"
        : maxDayOffPerDay !== undefined && schedule.countDayOffOn(d) >= maxDayOffPerDay
          ? "day-cap"
          : offAt(beyond)
            ? "triple"
            : undefined;
    if (why) blocks.push({ day: d, why });
    else hasFreeNeighbor = true;
  }

  if (hasFreeNeighbor) {
    const used = schedule.countDayOffForStaff(staffId);
    if (minDayOff === undefined || used >= minDayOff) {
      return { kind: "out-of-days", minDayOff: minDayOff ?? used };
    }
    // 休みは足りていないのに隣に置けていない：ほかの制約で置けない
    for (const j of [idx - 1, idx + 1]) {
      const d = days[j];
      if (d && !blocks.some((b) => b.day.equals(d))) blocks.push({ day: d, why: "constraint" });
    }
  }
  return { kind: "neighbors", neighbors: blocks };
}

const NEIGHBOR_TEXT: Record<NeighborBlock, string> = {
  work: "出勤が入っている",
  "work-wish": "出勤の希望",
  "day-cap": "休みが1日の上限",
  triple: "休むと3連休になる",
  "prev-month": "前月の確定分",
  constraint: "制約で休みを置けない",
};

/** 連休にできなかった理由を1行にする */
export function unpairedReasonText(
  reason: UnpairedReason,
  opts: { maxDayOffPerDay?: number } = {}
): string {
  if (reason.kind === "out-of-days") {
    return `連休にできなかった：月の休み（${reason.minDayOff}日）を連勤の区切りに使い切った`;
  }
  const parts = reason.neighbors.map(({ day, why }) => {
    const text =
      why === "day-cap" && opts.maxDayOffPerDay !== undefined
        ? `休みが1日の上限（${opts.maxDayOffPerDay}人）`
        : NEIGHBOR_TEXT[why];
    return `${day.month}/${day.day}は${text}`;
  });
  return `連休にできなかった：${parts.join("・")}`;
}

/** 役目を説明にする（休みの形の名前を添える。連休にできなかった理由は2行目） */
export function dayOffReasonText(
  reason: DayOffReason,
  style: DayOffStyle,
  opts: { maxDayOffPerDay?: number } = {}
): string {
  const body = (() => {
    switch (reason.kind) {
      case "wish":
        return "希望の休み";
      case "keeps-run-limit":
        return reason.personal
          ? `外すと${reason.runIfRemoved}連勤になります（この人は${reason.limit}連まで）`
          : `外すと${reason.runIfRemoved}連勤になります（上限${reason.limit}連勤）`;
      case "pair":
        return reason.acrossMonth ? "前月末から続く連休" : "連休";
      case "between":
        if (reason.before === 0 || reason.after === 0) return "休みの続き";
        return `${reason.before}日と${reason.after}日の出勤の間の休み`;
    }
  })();
  const head = `休み：${body}（${style.label}）`;
  return reason.unpaired ? `${head}\n${unpairedReasonText(reason.unpaired, opts)}` : head;
}
