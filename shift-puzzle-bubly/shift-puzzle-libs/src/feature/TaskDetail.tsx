'use client';

import { FC, useMemo } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import {
  selectSelectedTask,
  selectTaskById,
} from "../slice/index.js";
import { TaskDetailView, type TaskScheduleEntry } from "../ui/TaskDetailView.js";
import { createDefaultTimeSlots } from "../data/sampleData.js";

type TaskDetailProps = {
  taskId?: string;
};

// タイムスロットはマスターデータとして静的に保持
const defaultTimeSlots = createDefaultTimeSlots();

export const TaskDetail: FC<TaskDetailProps> = ({ taskId }) => {
  const selectedTask = useAppSelector(selectSelectedTask);
  const specificTask = useAppSelector(
    taskId ? selectTaskById(taskId) : () => undefined
  );

  const task = taskId ? specificTask : selectedTask;

  // このタスクが必要な時間帯エントリーを計算
  const scheduleEntries = useMemo((): TaskScheduleEntry[] => {
    if (!task) return [];

    return defaultTimeSlots
      .flatMap((slot) => {
        const req = slot.state.taskRequirements.find(
          (r) => r.taskId === task.id
        );
        if (!req) return [];
        return [
          {
            timeSlotId: slot.id,
            dayType: slot.dayType,
            slotLabel: slot.label,
            requiredCount: req.requiredCount,
            minCount: req.minCount,
            maxCount: req.maxCount,
          },
        ];
      });
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
