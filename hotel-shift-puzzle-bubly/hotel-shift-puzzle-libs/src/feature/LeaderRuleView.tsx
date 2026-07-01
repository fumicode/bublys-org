'use client';

import { FC, useMemo } from "react";
import { Staff, WorkShift } from "@bublys-org/hotel-shift-puzzle-model";
import { LeaderRuleDiagram } from "../ui/LeaderRuleDiagram.js";
import { useObjects } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { HOTEL_SHIFT_LEADER_ROLES, resolveShiftLeaderRoles } from "./shiftLeaderRoles.js";
import { STAFF_TYPE, WORKSHIFT_TYPE } from "../objects/hotelObjects.js";

type LeaderRuleViewProps = {
  /** 表示する責任者ロールのキー（例: "early" / "reservation" / "night"） */
  ruleKey: string;
};

/**
 * 責任者ルール1件をビジュアル化するバブルの中身。
 * ロールキーから、全スタッフ＋会社設定（HOTEL_SHIFT_LEADER_ROLES）で宣言的ルールを解決し、
 * {@link LeaderRuleDiagram} に渡して「OR（このうち誰か1人）」の図を描く。
 */
export const LeaderRuleView: FC<LeaderRuleViewProps> = ({ ruleKey }) => {
  useSeedHotelData();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);

  const rule = useMemo(
    () =>
      resolveShiftLeaderRoles(HOTEL_SHIFT_LEADER_ROLES, staffList).find(
        (r) => r.key === ruleKey
      ),
    [staffList, ruleKey]
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

  if (!rule) {
    return (
      <div style={{ padding: 16, color: "#888", fontSize: "0.85em" }}>
        ルール「{ruleKey}」が見つかりません。
      </div>
    );
  }

  return <LeaderRuleDiagram rule={rule} nameOf={nameOf} shiftId={shiftId} />;
};
