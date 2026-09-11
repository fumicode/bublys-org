'use client';

import { FC, useState } from "react";
import { ScheduleEditLog } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleEditLogView } from "../ui/ScheduleEditLogView.js";
import { useObject } from "../objects/repository.js";
import { SCHEDULE_EDIT_LOG_TYPE } from "../objects/hotelObjects.js";
import { ScheduleWorld } from "./ScheduleWorld.js";
import { useWorkingStaff } from "./workingStaff.js";

type ScheduleEditLogPanelProps = {
  scheduleId: string;
};

/**
 * 勤務表の操作履歴（ノウハウ）パネル。
 * ScheduleEditLog を世界線から読み、譲歩フィルタ付きで表示する。
 */
const ScheduleEditLogPanelBody: FC<ScheduleEditLogPanelProps> = ({
  scheduleId,
}) => {
  const log = useObject<ScheduleEditLog>(SCHEDULE_EDIT_LOG_TYPE, scheduleId);
  const { staffList } = useWorkingStaff(scheduleId);
  const [concessionsOnly, setConcessionsOnly] = useState(false);

  const staffNameOf = (staffId: string): string =>
    staffList.find((s) => s.id === staffId)?.name ?? staffId;

  const entries = concessionsOnly
    ? (log?.entriesWithConcessions() ?? [])
    : (log?.entries ?? []);

  return (
    <ScheduleEditLogView
      entries={entries}
      concessionsOnly={concessionsOnly}
      onToggleConcessionsOnly={setConcessionsOnly}
      staffNameOf={staffNameOf}
    />
  );
};

/**
 * この勤務表の世界に入ってから中身を描く。
 * 中の useObjects / useObject は、型の membership に従ってこの世界かグローバルかを選ぶ。
 */
export const ScheduleEditLogPanel: FC<ScheduleEditLogPanelProps> = (props) => (
  <ScheduleWorld scheduleId={props.scheduleId}>
    <ScheduleEditLogPanelBody {...props} />
  </ScheduleWorld>
);
