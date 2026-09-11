'use client';

import { FC, useMemo } from "react";
import { ScheduleConstraints, WorkShiftSet } from "@bublys-org/hotel-shift-puzzle-model";
import { ShiftIntervalRuleDiagram } from "../ui/ShiftIntervalRuleDiagram.js";
import { useObject } from "../objects/repository.js";
import { WORKSHIFT_SET_TYPE, SCHEDULE_CONSTRAINTS_TYPE } from "../objects/hotelObjects.js";

type ShiftIntervalRuleViewProps = {
  /** どの勤務表の制約か */
  scheduleId?: string;
  /** 表示する勤務間インターバルのルールキー（例: "late"） */
  ruleKey: string;
};

/**
 * 勤務間インターバルのルール1件をビジュアル化するバブルの中身。
 * 勤務表ごとの制約オブジェクト（ScheduleConstraints）から該当ルールを取り出し、
 * その勤務表の勤務帯セットと一緒に {@link ShiftIntervalRuleDiagram} へ渡す。
 *
 * 翌日の選択肢は「この勤務表が持っている勤務帯」なので勤務帯セットが要る。ルールだけだと
 * 禁止されている勤務帯しか分からず、「では何なら入れるのか」が描けない。
 *
 * 責任者ルールのバブル（LeaderRuleView）と違い、いまは読み取り専用。
 */
export const ShiftIntervalRuleView: FC<ShiftIntervalRuleViewProps> = ({
  scheduleId,
  ruleKey,
}) => {
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);
  const constraints = useObject<ScheduleConstraints>(
    SCHEDULE_CONSTRAINTS_TYPE,
    scheduleId
  );

  const rule = useMemo(
    () => constraints?.shiftIntervalRule(ruleKey),
    [constraints, ruleKey]
  );

  if (!rule) {
    return (
      <div style={{ padding: 16, color: "#888", fontSize: "0.85em" }}>
        勤務間インターバルのルール「{ruleKey}」が見つかりません。
      </div>
    );
  }

  return <ShiftIntervalRuleDiagram rule={rule} workShifts={workShifts} />;
};
