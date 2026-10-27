import type { MonthlyStaffSchedule, WorkingDay } from "../../domain/index.js";

/**
 * runMarkPlacement — スタッフ行の連勤・連休の線を「どのセルに、何列ぶん、何色で」置くかを決める
 *
 * ルール: **出勤の塊（連勤）と休みの塊（連休）を1本の細い線で描く。** 未定は塊を区切る
 * （MaxConsecutiveWorkdaysConstraint の連勤の数え方と同じ）。置き場所は違反の印と同じく
 * 塊の末尾のセルにして、そこから左へ span 列ぶん伸ばす（理由は violationMarkPlacement.ts）。
 *
 * 連勤は**何日目か**で色が決まる（上限 N。色の塗り方は RunMarks.tsx）:
 *   ok = N-2 日目まで / near = N-1 日目 / limit = N 日目
 *   N+1 連勤以上の塊は違反の赤帯が受け持つので、ここでは返さない。
 * 連休: off-2 = 2連休 / off-long = 3連休以上。1日だけの休みは線にしない。
 *
 * 塊の長さは表示中の日（列）で数える。月全体を表示していれば制約の判定と同じになる。
 */
export type WorkDayTone = "ok" | "near" | "limit";
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

const workDayTone = (nth: number, maxConsecutive: number): WorkDayTone =>
  nth >= maxConsecutive ? "limit" : nth === maxConsecutive - 1 ? "near" : "ok";

const offTone = (length: number): OffTone | undefined =>
  length >= 3 ? "off-long" : length === 2 ? "off-2" : undefined;

/** そのスタッフの連勤・連休の線の置き場所を返す。 */
export function runMarksOf(
  schedule: MonthlyStaffSchedule,
  staffId: string,
  days: readonly WorkingDay[],
  maxConsecutive: number
): RunMark[] {
  const marks: RunMark[] = [];
  let kind: RunMark["kind"] | undefined;
  let length = 0;
  const flush = (lastIndex: number) => {
    const anchorDay = days[lastIndex];
    if (kind === "work" && length <= maxConsecutive) {
      const dayTones = Array.from({ length }, (_, i) => workDayTone(i + 1, maxConsecutive));
      marks.push({ kind, dayTones, anchorDay, span: length });
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
        : undefined;
    if (here !== kind) flush(i - 1);
    kind = here;
    if (here) length++;
  });
  flush(days.length - 1);
  return marks;
}
