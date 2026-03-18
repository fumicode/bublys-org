'use client';

import { FC, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectTaskList,
  selectSelectedTaskId,
  setTaskList,
  setSelectedTaskId,
} from "../slice/index.js";
import { TaskListView } from "../ui/TaskListView.js";
import { createDefaultTasks, createDefaultTimeSlots, DAY_TYPE_ORDER } from "../data/sampleData.js";
import styled from "styled-components";
import { Chip, Stack } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

type TaskCollectionProps = {
  /** 日程でフィルターする（指定するとその日に必要なタスクのみ表示） */
  filterDayType?: string;
  onTaskSelect?: (taskId: string) => void;
};

const buildDetailUrl = (taskId: string) => `shift-puzzle/tasks/${taskId}`;

export const TaskCollection: FC<TaskCollectionProps> = ({
  filterDayType,
  onTaskSelect,
}) => {
  const dispatch = useAppDispatch();
  const taskList = useAppSelector(selectTaskList);
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  // 初期データのロード
  useEffect(() => {
    if (taskList.length === 0) {
      const defaultTasks = createDefaultTasks();
      dispatch(setTaskList(defaultTasks.map((t) => t.state)));
    }
  }, [dispatch, taskList.length]);

  // 日程フィルター適用
  const filteredTaskList = useMemo(() => {
    if (!filterDayType) return taskList;

    const timeSlots = createDefaultTimeSlots();
    // その日程のタイムスロットに必要なタスクIDを収集
    const requiredTaskIds = new Set<string>();
    timeSlots
      .filter((slot) => slot.dayType === filterDayType)
      .forEach((slot) => {
        slot.state.taskRequirements.forEach((req) => {
          requiredTaskIds.add(req.taskId);
        });
      });

    return taskList.filter((task) => requiredTaskIds.has(task.id));
  }, [taskList, filterDayType]);

  const handleTaskClick = (taskId: string) => {
    dispatch(setSelectedTaskId(taskId));
    onTaskSelect?.(taskId);
  };

  return (
    <StyledContainer>
      <div className="e-header">
        {filterDayType ? (
          <>
            <div className="e-filter-description">
              <p>「{filterDayType}」の</p>
            </div>
            <h3>
              タスク一覧
              <span className="e-filter-badge">
                ({filteredTaskList.length}/{taskList.length}件)
              </span>
            </h3>
          </>
        ) : (
          <h3>タスク一覧 ({taskList.length}件)</h3>
        )}
      </div>

      {/* 日程フィルターチップ */}
      <div className="e-day-filter">
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <CalendarTodayIcon fontSize="small" className="e-calendar-icon" />
          {DAY_TYPE_ORDER.map((day) => (
            <Chip
              key={day}
              label={day}
              size="small"
              variant={filterDayType === day ? "filled" : "outlined"}
              color={filterDayType === day ? "warning" : "default"}
              className="e-day-chip"
            />
          ))}
        </Stack>
      </div>

      <TaskListView
        taskList={filteredTaskList}
        selectedTaskId={selectedTaskId}
        buildDetailUrl={buildDetailUrl}
        onTaskClick={handleTaskClick}
        activeDayType={filterDayType}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    margin-bottom: 8px;

    h3 {
      margin: 0;
    }

    .e-filter-description {
      margin: 0 0 4px 0;
      font-size: 0.85em;
      color: #e65100;

      p {
        margin: 0;
      }
    }

    .e-filter-badge {
      font-weight: normal;
      color: #e65100;
    }
  }

  .e-day-filter {
    margin-bottom: 12px;

    .e-calendar-icon {
      color: #999;
      margin-top: 2px;
    }

    .e-day-chip {
      font-size: 0.75em;
      cursor: default;
    }
  }
`;
