/**
 * membershipChange — 「誰がこの勤務表で働くか」が変わったとき、同じノードに載せる一式を組む。
 *
 * 顔ぶれの変更は勤務スタッフ群だけでは閉じない。連れて動くものが3つある:
 *   - 可能勤務帯 … 新しく入った人に席が無いと、その人のセルには何も入れられない
 *   - 勤務表     … 外した人の割当が残ると、表に居ない人をフッターの集計が数え続ける
 *   - 制約       … 外した人が責任者候補に残ると、どう埋めても満たせない日ができる
 *
 * **1ノードに載せる**のが要点。別々に記録すると、その間のノードへ時間移動したときに
 * 「行は消えたのに割当だけ残っている」中途半端な世界が現れる（#110 と同じ事故）。
 *
 * ★ hook ではなく純粋関数にしてあるのは、ここをテストで固定するため。
 *   静かにズレる経路の番人なので、React も store も通さずに数えられる形にしておく。
 */
import type {
  WorkingStaffGroup,
  MonthlyStaffSchedule,
  WorkShiftSet,
  ScheduleAvailability,
  ScheduleConstraints,
} from "@bublys-org/hotel-shift-puzzle-model";
import type { BundleItem } from "../objects/commit.js";
import {
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  WORKING_STAFF_GROUP_TYPE,
} from "../objects/hotelObjects.js";

export type MembershipChange = {
  /** 変更後の勤務スタッフ群（必ず記録する） */
  group: WorkingStaffGroup;
  /** この勤務表で働き始める人 */
  joining?: string;
  /** この勤務表で働かなくなる人 */
  leaving?: string;
  /** 連れて動く集約。読めていないものは省略してよい（そのぶんは記録しない） */
  schedule?: MonthlyStaffSchedule;
  workShiftSet?: WorkShiftSet;
  availability?: ScheduleAvailability;
  constraints?: ScheduleConstraints;
};

/**
 * 同じノードに載せる一式を返す。**変わったものだけ**入る
 * （変わっていないものを入れると、中身が同じノードが世界線に増える）。
 */
export function buildMembershipChange(change: MembershipChange): BundleItem[] {
  const items: BundleItem[] = [
    { type: WORKING_STAFF_GROUP_TYPE, obj: change.group },
  ];

  if (change.joining && change.availability && change.workShiftSet) {
    const next = change.availability.allowAllIfUnset(
      change.joining,
      change.workShiftSet.shiftIds()
    );
    if (next !== change.availability) {
      items.push({ type: SCHEDULE_AVAILABILITY_TYPE, obj: next });
    }
  }

  if (change.leaving) {
    if (change.schedule) {
      const next = change.schedule.clearStaff(change.leaving);
      if (next !== change.schedule) {
        items.push({ type: SCHEDULE_TYPE, obj: next });
      }
    }
    if (change.constraints) {
      const next = change.constraints.removeStaff(change.leaving);
      if (next !== change.constraints) {
        items.push({ type: SCHEDULE_CONSTRAINTS_TYPE, obj: next });
      }
    }
  }

  return items;
}
