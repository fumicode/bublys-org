'use client';

import { FC, useCallback, useMemo } from "react";
import { getDragType, extractIdFromUrl } from "@bublys-org/bubbles-ui";
import { Staff, WorkShift, ScheduleConstraints } from "@bublys-org/hotel-shift-puzzle-model";
import { LeaderRuleDiagram } from "../ui/LeaderRuleDiagram.js";
import { useObjects, useObject, useObjectRepo } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import {
  STAFF_TYPE,
  WORKSHIFT_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
} from "../objects/hotelObjects.js";

type LeaderRuleViewProps = {
  /** どの勤務表の制約か */
  scheduleId?: string;
  /** 表示する責任者ロールのキー（例: "early" / "reservation" / "night"） */
  ruleKey: string;
};

/**
 * 責任者ルール1件をビジュアル化するバブルの中身。
 * 勤務表ごとの制約オブジェクト（ScheduleConstraints）から該当ロールのルールを取り出し、
 * {@link LeaderRuleDiagram} に渡して「OR（このうち誰か一人はいなければならない）」の図を描く。
 * 人をドロップすると、その人を制約の候補に加えて保存する（＝勤務表の世界線にノードが増える）。
 */
export const LeaderRuleView: FC<LeaderRuleViewProps> = ({ scheduleId, ruleKey }) => {
  useSeedHotelData();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const constraints = useObject<ScheduleConstraints>(
    SCHEDULE_CONSTRAINTS_TYPE,
    scheduleId
  );
  const constraintsRepo = useObjectRepo<ScheduleConstraints>(SCHEDULE_CONSTRAINTS_TYPE);

  const rule = useMemo(
    () => constraints?.leaderRule(ruleKey),
    [constraints, ruleKey]
  );

  // 担当勤務帯の id（名前→id）。図の「流れ」を勤務帯の色で塗るために渡す。
  const shiftId = useMemo(
    () => (rule ? workShifts.find((w) => w.name === rule.shiftName)?.id : undefined),
    [workShifts, rule]
  );

  const nameOf = useMemo(() => {
    const byId = new Map(staffList.map((s) => [s.id, s.name]));
    return (id: string) => byId.get(id) ?? id;
  }, [staffList]);

  // 人（Staff）をドロップしたら、その人をこのルールの候補に加える
  // （＝ 制約オブジェクトの該当ルールに staffId を足して保存 → 勤務表の世界線に載る）。
  const handleDropStaffUrl = useCallback(
    (url: string) => {
      const staffId = extractIdFromUrl(url);
      if (!staffId || !constraints || !rule) return;
      if (rule.leaderStaffIds.includes(staffId)) return; // 既に候補なら何もしない
      constraintsRepo.save(constraints.addLeader(ruleKey, staffId));
    },
    [constraints, rule, ruleKey, constraintsRepo]
  );

  if (!rule) {
    return (
      <div style={{ padding: 16, color: "#888", fontSize: "0.85em" }}>
        ルール「{ruleKey}」が見つかりません。
      </div>
    );
  }

  return (
    <LeaderRuleDiagram
      rule={rule}
      nameOf={nameOf}
      shiftId={shiftId}
      onDropUrl={handleDropStaffUrl}
      dropAcceptTypes={[getDragType(STAFF_TYPE)]}
    />
  );
};
