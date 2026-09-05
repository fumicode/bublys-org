'use client';

import { FC, useState } from "react";
import { Staff, ScheduleEditLog } from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleEditLogView } from "../ui/ScheduleEditLogView.js";
import { useObject, useObjects } from "../objects/repository.js";
import { STAFF_TYPE, SCHEDULE_EDIT_LOG_TYPE } from "../objects/hotelObjects.js";

type ScheduleEditLogPanelProps = {
  scheduleId: string;
};

/**
 * 勤務表の操作履歴（ノウハウ）パネル。
 * ScheduleEditLog を世界線から読み、譲歩フィルタ付きで表示する。
 */
export const ScheduleEditLogPanel: FC<ScheduleEditLogPanelProps> = ({
  scheduleId,
}) => {
  const log = useObject<ScheduleEditLog>(SCHEDULE_EDIT_LOG_TYPE, scheduleId);
  const staffList = useObjects<Staff>(STAFF_TYPE);
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
