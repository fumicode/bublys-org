"use client";

/**
 * 制約パネル（独立バブル）
 *
 * これまで勤務表バブルの中（e-rules-strip）に埋まっていた「適用中の制約」を、
 * それ自体で立つ1つの泡として取り出したもの。必要なデータはすべてリポジトリから
 * 引けるので、勤務表グリッドに寄生する必要はなかった。
 *
 * bubble-space では、これを勤務表の隣（あるいは中）に置いて組み立てる。
 */
import { useMemo, type FC } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShiftSet,
  ScheduleConstraints,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useObject, useObjects } from "../objects/repository.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
} from "../objects/hotelObjects.js";
import { ScheduleConstraintsBar, shiftColorById } from "../ui/ScheduleConstraintsBar.js";

export type ScheduleConstraintsPanelProps = {
  scheduleId: string;
  /** 責任者ルールの図バブル URL（開き方は使う側の関心事） */
  ruleBubbleUrl?: (ruleKey: string) => string;
  /** 責任者アイコンのクリックで関係者を選ぶ（選択の持ち主は使う側） */
  onSelectRule?: (staffIds: string[]) => void;
  selectedStaffIds?: Set<string>;
};

export const ScheduleConstraintsPanel: FC<ScheduleConstraintsPanelProps> = ({
  scheduleId,
  ruleBubbleUrl,
  onSelectRule,
  selectedStaffIds,
}) => {
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const constraints = useObject<ScheduleConstraints>(SCHEDULE_CONSTRAINTS_TYPE, scheduleId);

  const leaderRules = useMemo(() => constraints?.leaderRules ?? [], [constraints]);
  const nameOf = useMemo(() => {
    const map = new Map(staffList.map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) ?? id;
  }, [staffList]);
  const shiftColorOf = useMemo(() => {
    const idByName = new Map<string, string>();
    for (const w of workShiftSet?.shifts ?? []) {
      if (!idByName.has(w.name)) idByName.set(w.name, w.id);
    }
    return (shiftName: string) => shiftColorById(idByName.get(shiftName));
  }, [workShiftSet]);

  return (
    <StyledPanel>
      <ScheduleConstraintsBar
        leaderRules={leaderRules}
        nameOf={nameOf}
        shiftColorOf={shiftColorOf}
        onSelectRule={onSelectRule}
        selectedStaffIds={selectedStaffIds}
        ruleBubbleUrl={ruleBubbleUrl}
        maxConsecutive={constraints?.maxConsecutiveWorkdays ?? 5}
        minDayOff={constraints?.minMonthlyDayOff ?? 8}
        maxPerDay={constraints?.maxDayOffPerDay ?? 8}
        checkShiftWish={constraints?.checkShiftWish ?? true}
      />
    </StyledPanel>
  );
};

const StyledPanel = styled.div`
  padding: 6px 8px;
`;
