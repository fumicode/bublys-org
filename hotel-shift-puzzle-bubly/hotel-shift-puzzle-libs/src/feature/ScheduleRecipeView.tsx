'use client';

/**
 * ScheduleRecipeView — 制約レシピのバブルの中身（#229）
 *
 * 「探索で解決案生成」がこの勤務表で比べる単位と、その重み（絶対か任意か・優先度）を漏斗の上に描く。
 * 勤務表の制約リストから毎回組み立てる（責任者ルールや勤務帯が変われば単位も変わる）。
 * 今は解決案生成の既定のレシピ（LEADER_PLAN_RECIPE）を見せるだけで、編集はできない。
 */
import { FC, useMemo } from "react";
import {
  WorkShiftSet,
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
  ConstraintSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ConstraintRecipeFunnel } from "../ui/ConstraintRecipeFunnel.js";
import { useObject, useObjects } from "../objects/repository.js";
import {
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
  CONSTRAINT_SET_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";
import { scheduleConstraintsOf } from "./scheduleConstraints.js";
import { autoShiftLimitsOf } from "./autoShift.js";
import { leaderPlanRecipeRowsOf } from "./refineBySearch.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { useWorkingStaff } from "./workingStaff.js";

type Props = { scheduleId: string };

const ScheduleRecipeViewBody: FC<Props> = ({ scheduleId }) => {
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const { staffList, group: staffGroup } = useWorkingStaff(scheduleId);
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);
  const allWishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const constraintSet = useObject<ConstraintSet>(CONSTRAINT_SET_TYPE, scheduleId);

  const rows = useMemo(() => {
    if (!schedule) return [];
    const wishByStaff = new Map<string, StaffMonthlyShiftWish>();
    for (const w of allWishes) {
      if (w.year === schedule.year && w.month === schedule.month) wishByStaff.set(w.staffId, w);
    }
    const constraints = scheduleConstraintsOf({ constraintSet, workShifts, wishByStaff, staffGroup });
    const { minDayOff } = autoShiftLimitsOf(constraintSet);
    return leaderPlanRecipeRowsOf(constraints, staffList.map((s) => s.id), minDayOff);
  }, [schedule, allWishes, constraintSet, workShifts, staffGroup, staffList]);

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }
  return <ConstraintRecipeFunnel title="探索で解決案生成のレシピ" entries={rows} />;
};

export const ScheduleRecipeView: FC<Props> = (props) => (
  <ScheduleWorld scheduleId={props.scheduleId}>
    <ScheduleRecipeViewBody {...props} />
  </ScheduleWorld>
);
