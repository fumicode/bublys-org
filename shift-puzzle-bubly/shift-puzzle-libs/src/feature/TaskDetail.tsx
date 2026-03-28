'use client';

import { FC, useMemo } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectSelectedTask,
  selectTaskById,
} from "../slice/index.js";
import { TaskDetailView, type TaskScheduleEntry } from "../ui/TaskDetailView.js";
import { createDefaultShifts } from "../data/sampleData.js";

type TaskDetailProps = {
  taskId?: string;
};

// シフトはマスターデータとして静的に保持
const defaultShifts = createDefaultShifts();

export const TaskDetail: FC<TaskDetailProps> = ({ taskId }) => {
  const selectedTask = useAppSelector(selectSelectedTask);
  const specificTask = useAppSelector(
    taskId ? selectTaskById(taskId) : () => undefined
  );

  const task = taskId ? specificTask : selectedTask;

  // このタスクが関係するシフトエントリーを計算
  const scheduleEntries = useMemo((): TaskScheduleEntry[] => {
    if (!task) return [];

    return defaultShifts
      .filter((shift) => shift.taskId === task.id)
      .map((shift) => ({
        shiftId: shift.id,
        dayType: shift.dayType,
        slotLabel: `${shift.startTime}–${shift.endTime}`,
        requiredCount: shift.requiredCount,
        minCount: shift.minCount,
        maxCount: shift.maxCount,
      }));
  }, [task]);

  if (!task) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        タスクを選択してください
      </div>
    );
  }

  return <TaskDetailView task={task} scheduleEntries={scheduleEntries} />;
};
