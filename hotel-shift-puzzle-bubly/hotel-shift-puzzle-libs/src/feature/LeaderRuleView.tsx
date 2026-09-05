'use client';

import { FC, useCallback, useMemo } from "react";
import { getDragType, extractIdFromUrl } from "@bublys-org/bubbles-ui";
import {
  Staff,
  WorkShiftSet,
  ScheduleConstraints,
  MonthlyStaffSchedule,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import { LeaderRuleDiagram } from "../ui/LeaderRuleDiagram.js";
import { useObjects, useObject } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { buildScheduleConstraints } from "./scheduleConstraints.js";
import { recordConstraintEdit } from "./recordScheduleEdit.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
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
  const store = useAppStore();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const constraints = useObject<ScheduleConstraints>(
    SCHEDULE_CONSTRAINTS_TYPE,
    scheduleId
  );

  const rule = useMemo(
    () => constraints?.leaderRule(ruleKey),
    [constraints, ruleKey]
  );

  // 担当勤務帯の id（名前→id）。図の「流れ」を勤務帯の色で塗るために渡す。
  const shiftId = useMemo(
    () => (rule ? workShifts.find((w) => w.name === rule.shiftName)?.id : undefined),
    [workShifts, rule]
  );

  // 「入るべき時間帯」セレクトの選択肢＝重複を除いた勤務帯名の一覧。
  const shiftNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const w of workShifts) {
      if (!seen.has(w.name)) {
        seen.add(w.name);
        names.push(w.name);
      }
    }
    return names;
  }, [workShifts]);

  const shiftIdsOf = useCallback(
    (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id),
    [workShifts]
  );

  // 編集は EditLog 付きで Constraints を同一世界線ノードに記録する。
  const editRule = useCallback(
    (next: ScheduleConstraints | undefined, summary: string) => {
      if (!next) return;
      recordConstraintEdit(store, {
        schedule,
        beforeConstraints: buildScheduleConstraints({
          modelConstraints: constraints?.modelConstraints(shiftIdsOf),
        }),
        afterConstraints: buildScheduleConstraints({
          modelConstraints: next.modelConstraints(shiftIdsOf),
        }),
        nextConstraints: next,
        summary,
      });
    },
    [store, schedule, constraints, shiftIdsOf]
  );

  const nameOf = useMemo(() => {
    const byId = new Map(staffList.map((s) => [s.id, s.name]));
    return (id: string) => byId.get(id) ?? id;
  }, [staffList]);

  const handleChangeShift = useCallback(
    (shiftName: string) =>
      editRule(constraints?.setRuleShift(ruleKey, shiftName), `担当勤務帯を変更: ${shiftName}`),
    [constraints, ruleKey, editRule]
  );
  const handleChangeLabel = useCallback(
    (label: string) =>
      editRule(constraints?.setRuleLabel(ruleKey, label), `ラベルを変更: ${label}`),
    [constraints, ruleKey, editRule]
  );
  const handleChangeMinCount = useCallback(
    (minCount: number) =>
      editRule(
        constraints?.setRuleMinCount(ruleKey, minCount),
        `最小人数を変更: ${minCount}`
      ),
    [constraints, ruleKey, editRule]
  );
  const handleRemoveStaff = useCallback(
    (staffId: string) =>
      editRule(
        constraints?.removeLeader(ruleKey, staffId),
        `責任者候補を削除: ${nameOf(staffId)}`
      ),
    [constraints, ruleKey, editRule, nameOf]
  );
  const handleDeleteRule = useCallback(
    () => editRule(constraints?.removeRule(ruleKey), "ルール削除"),
    [constraints, ruleKey, editRule]
  );

  // 人（Staff）をドロップしたら、その人をこのルールの候補に加える
  // （＝ 制約オブジェクトの該当ルールに staffId を足して保存 → 勤務表の世界線に載る）。
  const handleDropStaffUrl = useCallback(
    (url: string) => {
      const staffId = extractIdFromUrl(url);
      if (!staffId || !constraints || !rule) return;
      if (rule.leaderStaffIds.includes(staffId)) return; // 既に候補なら何もしない
      editRule(
        constraints.addLeader(ruleKey, staffId),
        `責任者候補を追加: ${nameOf(staffId)}`
      );
    },
    [constraints, rule, ruleKey, editRule, nameOf]
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
      shiftNames={shiftNames}
      onChangeShift={handleChangeShift}
      onChangeLabel={handleChangeLabel}
      onChangeMinCount={handleChangeMinCount}
      onRemoveStaff={handleRemoveStaff}
      onDeleteRule={handleDeleteRule}
    />
  );
};
