import type { MonthlyStaffSchedule, WorkingDay } from "../../domain/index.js";

/**
 * runMarkPlacement — スタッフ行の連勤・連休の線を「どのセルに、何列ぶん、何色で」置くかを決める
 *
 * ルール: **出勤の塊（連勤）と休みの塊（連休）を1本の細い線で描く。** 未定は塊を区切る
 * （MaxConsecutiveWorkdaysConstraint の連勤の数え方と同じ）。置き場所は違反の印と同じく
 * 塊の末尾のセルにして、そこから左へ span 列ぶん伸ばす（理由は violationMarkPlacement.ts）。
 *
 * ただし**月の最低休日数ぶんの休みがもう入っている人は、未定を出勤とみなす**（試行中）。
 * 休みはもう要らないので、残りの未定は勤務帯が決まっていないだけの出勤、という読み。
 * 連勤制約はまだこれを知らないので、みなし出勤を含む塊には赤帯が出ない（線の赤だけが知らせる）。
 *
 * 連勤は**何日目か**で色が決まる（上限 N。色の塗り方は RunMarks.tsx）:
 *   ok = N-2 日目まで / near = N-1 日目 / limit = N 日目 / over = N+1 日目から
 *   本当の違反なら、その上に違反の赤帯が重なる。
 * 連休: off-2 = 2連休 / off-long = 3連休以上。1日だけの休みは線にしない。
 *
 * 塊の長さは表示中の日（列）で数える。月全体を表示していれば制約の判定と同じになる。
 *
 * **月でリセットしない。** 前月の末尾（precedingTail）を持つ勤務表では、前月末から続く塊を
 * ひと続きに数える（連勤制約と同じ。前月末の3連勤に今月1日の出勤が続けば、1日は4日目）。
 * 前月の列にも線を引き、月をまたぐ塊は前月側と今月側の2本に分けて、それぞれの列の末尾に置く
 * （前月の列は幅が違うので、1本で伸ばすと長さが合わない）。2本は同じ色の並びを分け合うので、
 * グラデーションは境目でつながる。前月の列は確定済みの参考なので、セルごと薄く描かれる。
 */
export type WorkDayTone = "ok" | "near" | "limit" | "over";
export type OffTone = "off-2" | "off-long";

type Placement = {
  /** 線を置くセルの日（塊の最後の日）。 */
  anchorDay: WorkingDay;
  /** 線が覆う列の数（置くセル自身を含む）。月をまたぐ塊では、その月の側の日数。 */
  span: number;
  /** 塊全体の日数（月をまたぐ塊なら前月の側も含む）。ツールチップの「N連勤」に使う。 */
  length: number;
};

export type RunMark =
  | (Placement & {
      kind: "work";
      /** このセルが覆う各日（左から）が、塊の何日目かで決まる色。 */
      dayTones: WorkDayTone[];
    })
  | (Placement & { kind: "off"; tone: OffTone });

/** 連勤の nth 日目（1始まり）の色。制約バーの連勤アイコンも同じ決め方で塗る。 */
export const workDayTone = (nth: number, maxConsecutive: number): WorkDayTone =>
  nth > maxConsecutive
    ? "over"
    : nth === maxConsecutive
      ? "limit"
      : nth === maxConsecutive - 1
        ? "near"
        : "ok";

const workDayTones = (length: number, maxConsecutive: number): WorkDayTone[] =>
  Array.from({ length }, (_, i) => workDayTone(i + 1, maxConsecutive));

/**
 * 休みの目標日数がもう入っているか。入っていれば、その人の残りの未定は出勤とみなす
 * （連勤の線と、右端の休み合計の緑が同じこの判定を使う）。
 */
export const isDayOffSecured = (
  schedule: MonthlyStaffSchedule,
  staffId: string,
  dayOffTarget: number | undefined
): boolean =>
  dayOffTarget !== undefined && schedule.countDayOffForStaff(staffId) >= dayOffTarget;

const offTone = (length: number): OffTone | undefined =>
  length >= 3 ? "off-long" : length === 2 ? "off-2" : undefined;

/** 1列ぶん：その日と、出勤／休み／どちらでもない（塊を区切る） */
type Slot = { day: WorkingDay; kind: RunMark["kind"] | undefined; inTail: boolean };

/**
 * そのスタッフの連勤・連休の線の置き場所を返す（前月の列に置く線も含む。anchorDay で見分ける）。
 * dayOffTarget を渡すと、その日数の休みが入っている人の未定を出勤とみなす（今月の側だけ）。
 */
export function runMarksOf(
  schedule: MonthlyStaffSchedule,
  staffId: string,
  days: readonly WorkingDay[],
  maxConsecutive: number,
  dayOffTarget?: number
): RunMark[] {
  const undecidedIsWork = isDayOffSecured(schedule, staffId, dayOffTarget);
  // 前月の末尾は、表示が今月1日から始まっているときだけつなぐ（間が空くとひと続きではない）
  const tail = schedule.precedingTail;
  const startsMonth = days.length > 0 && days[0].equals(schedule.workingDays()[0]);
  const tailSlots: Slot[] =
    tail && startsMonth
      ? tail.days.map((day) => ({
          day,
          // 前月の末尾が持つのは出勤と休みだけ（未定は持たない）
          kind: tail.isWorking(staffId, day) ? "work" : tail.cellOf(staffId, day) ? "off" : undefined,
          inTail: true,
        }))
      : [];
  const monthSlots: Slot[] = days.map((day) => ({
    day,
    kind: schedule.isWorking(staffId, day)
      ? "work"
      : schedule.isDayOff(staffId, day)
        ? "off"
        : undecidedIsWork
          ? "work"
          : undefined,
    inTail: false,
  }));

  const marks: RunMark[] = [];
  /** 1つの塊を、前月の側と今月の側に分けて置く */
  const place = (run: Slot[]) => {
    const kind = run[0].kind;
    const length = run.length;
    const dayTones = kind === "work" ? workDayTones(length, maxConsecutive) : [];
    const tone = kind === "off" ? offTone(length) : undefined;
    if (kind === undefined || (kind === "off" && !tone)) return;
    const splitAt = run.findIndex((slot) => !slot.inTail);
    const parts = splitAt <= 0 ? [[0, length]] : [[0, splitAt], [splitAt, length]];
    for (const [from, to] of parts) {
      const anchorDay = run[to - 1].day;
      const span = to - from;
      if (kind === "work") {
        marks.push({ kind, dayTones: dayTones.slice(from, to), anchorDay, span, length });
      } else if (tone) {
        marks.push({ kind, tone, anchorDay, span, length });
      }
    }
  };
  let run: Slot[] = [];
  for (const slot of [...tailSlots, ...monthSlots]) {
    if (run.length > 0 && slot.kind !== run[0].kind) {
      place(run);
      run = [];
    }
    run.push(slot);
  }
  if (run.length > 0) place(run);
  return marks;
}
