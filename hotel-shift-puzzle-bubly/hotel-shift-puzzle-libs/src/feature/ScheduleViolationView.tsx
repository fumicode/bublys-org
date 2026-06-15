'use client';

/**
 * ScheduleViolationView — 制約違反バブルの中身
 *
 * グリッドの赤線から渡された違反 key を元に、勤務表を制約で再チェックして該当する
 * 違反を引き当てて表示する。違反は永続化しないので、常に最新の勤務表から計算する。
 * （勤務表が変わって違反が解消されていれば、その旨を表示する）
 */
import { FC, useMemo } from "react";
import { Staff, MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import { ConstraintViolationView } from "../ui/ConstraintViolationView.js";
import { useObject, useObjects } from "../objects/repository.js";
import { STAFF_TYPE, SCHEDULE_TYPE } from "../objects/hotelObjects.js";
import { defaultScheduleConstraints } from "./scheduleConstraints.js";

type Props = {
  scheduleId: string;
  /** グリッドの赤線から渡される ConstraintViolation.key */
  violationKey: string;
};

export const ScheduleViolationView: FC<Props> = ({ scheduleId, violationKey }) => {
  const schedule = useObject<MonthlyStaffSchedule>(SCHEDULE_TYPE, scheduleId);
  const staffList = useObjects<Staff>(STAFF_TYPE);

  const violation = useMemo(
    () =>
      schedule
        ?.checkConstraints(defaultScheduleConstraints())
        .find((v) => v.key === violationKey),
    [schedule, violationKey]
  );

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  if (!violation) {
    return (
      <div style={{ padding: 16, color: "#2e7d32" }}>
        この違反は解消されました。
      </div>
    );
  }

  const staffName = staffList.find((s) => s.id === violation.staffId)?.name;

  return <ConstraintViolationView violation={violation} staffName={staffName} />;
};
