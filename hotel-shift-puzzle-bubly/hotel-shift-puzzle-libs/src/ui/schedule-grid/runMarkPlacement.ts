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
 */
export type WorkDayTone = "ok" | "near" | "limit" | "over";
export type OffTone = "off-2" | "off-long";

type Placement = {
  /** 線を置くセルの日（塊の最後の日）。 */
  anchorDay: WorkingDay;
  /** 線が覆う列の数（置くセル自身を含む）＝塊の日数。 */
  span: number;
};

export type RunMark =
  | (Placement & {
      kind: "work";
      /** 塊の各日（左から）が何日目かで決まる色。 */
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

/**
 * そのスタッフの連勤・連休の線の置き場所を返す。
 * dayOffTarget を渡すと、その日数の休みが入っている人の未定を出勤とみなす。
 */
export function runMarksOf(
  schedule: MonthlyStaffSchedule,
  staffId: string,
  days: readonly WorkingDay[],
  maxConsecutive: number,
  dayOffTarget?: number
): RunMark[] {
  const undecidedIsWork = isDayOffSecured(schedule, staffId, dayOffTarget);
  const marks: RunMark[] = [];
  let kind: RunMark["kind"] | undefined;
  let length = 0;
  const flush = (lastIndex: number) => {
    const anchorDay = days[lastIndex];
    if (kind === "work") {
      marks.push({ kind, dayTones: workDayTones(length, maxConsecutive), anchorDay, span: length });
    }
    const tone = kind === "off" ? offTone(length) : undefined;
    if (tone) marks.push({ kind: "off", tone, anchorDay, span: length });
    kind = undefined;
    length = 0;
  };
  days.forEach((day, i) => {
    const here = schedule.isWorking(staffId, day)
      ? "work"
      : schedule.isDayOff(staffId, day)
        ? "off"
        : undecidedIsWork
          ? "work"
          : undefined;
    if (here !== kind) flush(i - 1);
    kind = here;
    if (here) length++;
  });
  flush(days.length - 1);
  return marks;
}
