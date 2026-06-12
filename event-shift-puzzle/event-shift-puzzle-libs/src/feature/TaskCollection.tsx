'use client';

import { FC, useEffect, useMemo, useContext } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import {
  setTaskList,
  setSelectedTaskId,
} from "../slice/index.js";
import { TaskListView, type GroupedTask, DRAG_TYPE_TASK_LIST } from "../ui/TaskListView.js";
import { createDefaultShifts, createDefaultTasks, DAY_TYPE_ORDER } from "../data/sampleData.js";
import styled from "styled-components";
import { Button } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { BubblesContext } from "@bublys-org/bubbles-ui";

// ========== フィルター型 ==========

/**
 * タスクリストのフィルター条件。
 * - departments / dayTypes は OR 条件。未指定（空配列 or undefined）で全件表示。
 * - timeRange: シフトの時間帯がこの範囲とオーバーラップするタスクを抽出。
 * - 日付を持たないタスク（将来対応）は dayTypes フィルターを常に通過させる。
 */
export type TaskFilterCriteria = {
  departments?: string[];
  dayTypes?: string[];
  timeRange?: {
    startTime: string; // 'HH:MM'
    endTime: string;   // 'HH:MM'
  };
};

/** URLクエリからフィルターをパース（旧 dayType/department 単一値も後方互換） */
export function parseTaskFilter(query: string): TaskFilterCriteria {
  const filter: TaskFilterCriteria = {};
  if (!query) return filter;
  const params = new URLSearchParams(query);

  const departments = params.get('departments');
  if (departments) {
    filter.departments = departments.split(',').filter(Boolean);
  } else {
    const department = params.get('department'); // legacy
    if (department) filter.departments = [department];
  }

  const dayTypes = params.get('dayTypes');
  if (dayTypes) {
    filter.dayTypes = dayTypes.split(',').filter(Boolean);
  } else {
    const dayType = params.get('dayType'); // legacy
    if (dayType) filter.dayTypes = [dayType];
  }

  const startTime = params.get('startTime');
  const endTime = params.get('endTime');
  if (startTime && endTime) filter.timeRange = { startTime, endTime };

  return filter;
}

/** フィルターをURLクエリ文字列に変換 */
export function stringifyTaskFilter(filter: TaskFilterCriteria): string {
  const params = new URLSearchParams();
  if (filter.departments && filter.departments.length > 0) {
    params.set('departments', filter.departments.join(','));
  }
  if (filter.dayTypes && filter.dayTypes.length > 0) {
    params.set('dayTypes', filter.dayTypes.join(','));
  }
  if (filter.timeRange) {
    params.set('startTime', filter.timeRange.startTime);
    params.set('endTime', filter.timeRange.endTime);
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

// ========== フィルター判定 ==========

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

/** タスクがフィルター条件にマッチするか判定 */
export function matchesTaskFilter(task: GroupedTask, filter: TaskFilterCriteria): boolean {
  // 所属局フィルター
  if (filter.departments && filter.departments.length > 0) {
    if (!task.department || !filter.departments.includes(task.department)) return false;
  }

  // 日程フィルター（dayType を持たないタスクは将来対応・常に通過）
  if (filter.dayTypes && filter.dayTypes.length > 0) {
    const taskDayTypes = task.shifts.map((s) => s.dayType).filter(Boolean);
    if (taskDayTypes.length > 0) {
      const hasMatch = task.shifts.some((s) => filter.dayTypes!.includes(s.dayType));
      if (!hasMatch) return false;
    }
  }

  // 時間帯フィルター（シフトの時間がフィルター範囲とオーバーラップするか）
  if (filter.timeRange) {
    const filterStart = timeToMinutes(filter.timeRange.startTime);
    const filterEnd = timeToMinutes(filter.timeRange.endTime);
    if (filterStart < filterEnd) {
      const hasOverlap = task.shifts.some(
        (s) => s.startMinute < filterEnd && s.endMinute > filterStart,
      );
      if (!hasOverlap) return false;
    }
  }

  return true;
}

/** フィルター条件の説明文を生成 */
function describeTaskFilter(filter: TaskFilterCriteria): string {
  const parts: string[] = [];
  if (filter.departments && filter.departments.length > 0) {
    parts.push(`${filter.departments.join('・')}所属`);
  }
  if (filter.dayTypes && filter.dayTypes.length > 0) {
    parts.push(filter.dayTypes.join('・'));
  }
  if (filter.timeRange) {
    parts.push(`${filter.timeRange.startTime}〜${filter.timeRange.endTime}`);
  }
  return parts.join('、');
}

// ========== コンポーネント ==========

type TaskCollectionProps = {
  filter?: TaskFilterCriteria;
  /** shift-status リンクを生成するための shift plan ID */
  shiftPlanId?: string;
};

export const TaskCollection: FC<TaskCollectionProps> = ({ filter = {}, shiftPlanId }) => {
  const buildDetailUrl = (taskId: string) =>
    shiftPlanId
      ? `shift-puzzle/tasks/${taskId}?shiftPlanId=${shiftPlanId}`
      : `shift-puzzle/tasks/${taskId}`;
  const dispatch = useAppDispatch();
  const { openBubble } = useContext(BubblesContext);

  const shifts = useMemo(() => createDefaultShifts(), []);

  useEffect(() => {
    const tasks = createDefaultTasks();
    dispatch(setTaskList(tasks.map((t) => t.state)));
  }, [dispatch]);

  // 全シフトから taskId でグループ化（フィルター前）
  const allGroupedTasks = useMemo((): GroupedTask[] => {
    const taskMap = new Map<string, GroupedTask>();
    for (const shift of shifts) {
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
  }, [shifts]);

  // フィルター適用
  const groupedTasks = useMemo(() => {
    const hasFilter = Object.keys(filter).some(
      (k) => (filter as Record<string, unknown>)[k] !== undefined,
    );
    if (!hasFilter) return allGroupedTasks;
    return allGroupedTasks.filter((task) => matchesTaskFilter(task, filter));
  }, [allGroupedTasks, filter]);

  const hasFilter = Object.values(filter).some(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true),
  );
  const filterDescription = hasFilter ? describeTaskFilter(filter) : null;

  const handleOpenFilter = () => {
    const query = stringifyTaskFilter(filter);
    openBubble(`shift-puzzle/tasks/filter${query}`, 'root');
  };

  // 絞り込み後の dayType（単一の場合のみ TaskListView の activeDayType に渡す）
  const activeDayType = filter.dayTypes?.length === 1 ? filter.dayTypes[0] : undefined;

  return (
    <StyledContainer>
      <div className="e-header">
        {hasFilter && filterDescription ? (
          <>
            <div className="e-filter-description">
              <p>「{filterDescription}」に関連する</p>
            </div>
            <h3>
              タスク一覧
              <span className="e-filter-badge">
                ({groupedTasks.length}/{allGroupedTasks.length}件)
              </span>
            </h3>
          </>
        ) : (
          <h3>タスク一覧 ({allGroupedTasks.length}件)</h3>
        )}
      </div>

      <div className="e-filter-section">
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterListIcon />}
          onClick={handleOpenFilter}
          className="e-filter-button"
        >
          絞り込み検索
        </Button>
      </div>

      {groupedTasks.length > 0 && (
        <div
          className="e-drag-handle"
          draggable
          onDragStart={(e) => {
            draggingTaskGroups = groupedTasks;
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData(DRAG_TYPE_TASK_LIST, '');
          }}
          onDragEnd={() => { draggingTaskGroups = null; }}
        >
          <DragIndicatorIcon fontSize="small" />
          {groupedTasks.length}件のタスクをガントへドラッグ（AIシフト配置）
        </div>
      )}

      <TaskListView
        tasks={groupedTasks}
        buildDetailUrl={buildDetailUrl}
        onTaskDragStart={(taskId) => dispatch(setSelectedTaskId(taskId))}
        activeDayType={activeDayType}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-header {
    padding: 8px 12px 4px;
    flex-shrink: 0;

    h3 {
      margin: 0;
      font-size: 1em;
    }

    .e-filter-description {
      margin: 0 0 2px 0;
      font-size: 0.85em;
      color: #1976d2;

      p { margin: 0; }
    }

    .e-filter-badge {
      font-weight: normal;
      color: #e65100;
      margin-left: 4px;
    }
  }

  .e-filter-section {
    padding: 0 12px 8px;
    flex-shrink: 0;

    .e-filter-button {
      font-size: 0.85em;
      text-transform: none;
    }
  }

  .e-drag-handle {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    margin: 0 12px 8px;
    background: #fff8e1;
    border: 1px dashed #ffa000;
    border-radius: 4px;
    cursor: grab;
    font-size: 0.82em;
    color: #e65100;
    user-select: none;
    flex-shrink: 0;

    &:hover {
      background: #fff3cd;
      border-color: #e65100;
    }

    &:active {
      cursor: grabbing;
    }
  }
`;

// DAY_TYPE_ORDER を re-export（TaskFilter で使用）
export { DAY_TYPE_ORDER };

// ========== AIシフト配置用ドラッグ転送変数 ==========

export let draggingTaskGroups: GroupedTask[] | null = null;
