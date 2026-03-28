'use client';

import { FC, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectSelectedTaskId,
  setTaskList,
  setSelectedTaskId,
} from "../slice/index.js";
import { TaskListView, type GroupedTask } from "../ui/TaskListView.js";
import { createDefaultShifts, createDefaultTasks, DAY_TYPE_ORDER } from "../data/sampleData.js";
import styled from "styled-components";
import { Chip, Stack } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BusinessIcon from "@mui/icons-material/Business";

// ========== フィルターユーティリティ ==========

/** フィルター条件の型 */
export type TaskFilterCriteria = {
  department?: string;
  dayType?: string;
};

/** URLクエリからフィルターをパース */
export function parseTaskFilter(query: string): TaskFilterCriteria {
  const filter: TaskFilterCriteria = {};
  if (!query) return filter;

  const params = new URLSearchParams(query);

  const department = params.get('department');
  if (department) filter.department = department;

  const dayType = params.get('dayType');
  if (dayType) filter.dayType = dayType;

  return filter;
}

/** フィルターをURL文字列に変換 */
export function stringifyTaskFilter(filter: TaskFilterCriteria): string {
  const params = new URLSearchParams();

  if (filter.department) params.set('department', filter.department);
  if (filter.dayType) params.set('dayType', filter.dayType);

  const str = params.toString();
  return str ? `?${str}` : '';
}

// ========== コンポーネント ==========

type TaskCollectionProps = {
  /** 初期フィルター（URLクエリから） */
  filter?: TaskFilterCriteria;
  onTaskSelect?: (taskId: string) => void;
};

const buildDetailUrl = (taskId: string) => `shift-puzzle/tasks/${taskId}`;

export const TaskCollection: FC<TaskCollectionProps> = ({
  filter = {},
  onTaskSelect,
}) => {
  const dispatch = useAppDispatch();
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  const [activeDayType, setActiveDayType] = useState<string | undefined>(filter.dayType);
  const [activeDepartment, setActiveDepartment] = useState<string | undefined>(filter.department);

  // シフトマスターデータ（表示の主データソース）
  const shifts = useMemo(() => createDefaultShifts(), []);

  // TaskDetail が使う Redux タスクストアを初期ロード
  useEffect(() => {
    const tasks = createDefaultTasks();
    dispatch(setTaskList(tasks.map((t) => t.state)));
  }, [dispatch]);

  // 全シフトから局一覧を導出（フィルター前）
  const departments = useMemo(() => {
    const depts = new Set<string>();
    shifts.forEach((s) => {
      if (s.responsibleDepartment) depts.add(s.responsibleDepartment);
    });
    return Array.from(depts).sort();
  }, [shifts]);

  // フィルター適用 → タスクIDでグループ化
  const groupedTasks = useMemo((): GroupedTask[] => {
    let filtered = shifts;

    if (activeDayType) {
      filtered = filtered.filter((s) => s.dayType === activeDayType);
    }
    if (activeDepartment) {
      filtered = filtered.filter((s) => s.responsibleDepartment === activeDepartment);
    }

    const taskMap = new Map<string, GroupedTask>();
    for (const shift of filtered) {
      if (!taskMap.has(shift.taskId)) {
        taskMap.set(shift.taskId, {
          taskId: shift.taskId,
          taskName: shift.taskName,
          department: shift.responsibleDepartment,
          shifts: [],
        });
      }
      taskMap.get(shift.taskId)!.shifts.push(shift);
    }

    return Array.from(taskMap.values());
  }, [shifts, activeDayType, activeDepartment]);

  // 全タスク数（フィルター前）
  const totalTaskCount = useMemo(
    () => new Set(shifts.map((s) => s.taskId)).size,
    [shifts],
  );

  const handleTaskClick = (taskId: string) => {
    dispatch(setSelectedTaskId(taskId));
    onTaskSelect?.(taskId);
  };

  const handleDayTypeClick = (day: string) => {
    setActiveDayType(activeDayType === day ? undefined : day);
  };

  const handleDepartmentClick = (dept: string) => {
    setActiveDepartment(activeDepartment === dept ? undefined : dept);
  };

  const isFiltered = activeDayType || activeDepartment;

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          タスク一覧
          {isFiltered ? (
            <span className="e-filter-badge">
              ({groupedTasks.length}/{totalTaskCount}件)
            </span>
          ) : (
            <span className="e-count">({groupedTasks.length}件)</span>
          )}
        </h3>
      </div>

      {/* 日程フィルターチップ */}
      <div className="e-filter-row">
        <CalendarTodayIcon fontSize="small" className="e-filter-icon" />
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {DAY_TYPE_ORDER.map((day) => (
            <Chip
              key={day}
              label={day}
              size="small"
              variant={activeDayType === day ? "filled" : "outlined"}
              color={activeDayType === day ? "warning" : "default"}
              onClick={() => handleDayTypeClick(day)}
              className="e-filter-chip"
            />
          ))}
        </Stack>
      </div>

      {/* 局フィルターチップ */}
      <div className="e-filter-row">
        <BusinessIcon fontSize="small" className="e-filter-icon" />
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {departments.map((dept) => (
            <Chip
              key={dept}
              label={dept}
              size="small"
              variant={activeDepartment === dept ? "filled" : "outlined"}
              color={activeDepartment === dept ? "primary" : "default"}
              onClick={() => handleDepartmentClick(dept)}
              className="e-filter-chip"
            />
          ))}
        </Stack>
      </div>

      <TaskListView
        tasks={groupedTasks}
        selectedTaskId={selectedTaskId}
        buildDetailUrl={buildDetailUrl}
        onTaskClick={handleTaskClick}
        activeDayType={activeDayType}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    padding: 8px 12px 4px;

    h3 {
      margin: 0;
      font-size: 1em;
    }

    .e-count {
      font-weight: normal;
      color: #666;
      margin-left: 4px;
    }

    .e-filter-badge {
      font-weight: normal;
      color: #e65100;
      margin-left: 4px;
    }
  }

  .e-filter-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 4px 12px;

    .e-filter-icon {
      color: #999;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .e-filter-chip {
      font-size: 0.75em;
      cursor: pointer;
    }
  }
`;
