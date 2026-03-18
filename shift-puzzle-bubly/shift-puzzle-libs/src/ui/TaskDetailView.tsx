'use client';

import { FC } from "react";
import styled from "styled-components";
import { Task } from "../domain/index.js";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { ObjectView } from "@bublys-org/bubbles-ui";

/** タスクが必要な時間帯の情報 */
export type TaskScheduleEntry = {
  timeSlotId: string;
  dayType: string;
  slotLabel: string;
  requiredCount: number;
  minCount: number;
  maxCount: number;
};

type TaskDetailViewProps = {
  task: Task;
  scheduleEntries: TaskScheduleEntry[];
};

/** dayTypeの表示順 */
const DAY_TYPE_ORDER = ["準準備日", "準備日", "1日目", "2日目", "片付け日"] as const;

export const TaskDetailView: FC<TaskDetailViewProps> = ({ task, scheduleEntries }) => {
  // dayTypeごとにグループ化
  const groupedByDay = DAY_TYPE_ORDER.reduce<Record<string, TaskScheduleEntry[]>>(
    (acc, day) => {
      acc[day] = scheduleEntries.filter((e) => e.dayType === day);
      return acc;
    },
    {}
  );

  const activeDays = DAY_TYPE_ORDER.filter(
    (day) => (groupedByDay[day]?.length ?? 0) > 0
  );

  return (
    <StyledTaskDetail>
      <div className="e-header">
        <AssignmentIcon className="e-icon" />
        <div className="e-title">
          <ObjectView
            type="Task"
            url={`shift-puzzle/tasks/${task.id}`}
            label={task.name}
            draggable={true}
          >
            <h3 className="e-name">{task.name}</h3>
          </ObjectView>
        </div>
        <span className="e-dept-badge">{task.responsibleDepartment}</span>
      </div>

      <section className="e-section">
        <h4>タスク内容</h4>
        <p className="e-task-content">{task.task}</p>
      </section>

      {task.description && (
        <section className="e-section">
          <h4>詳細</h4>
          <p className="e-description">{task.description}</p>
        </section>
      )}

      <section className="e-section">
        <h4>日程別スケジュール</h4>
        {activeDays.length === 0 ? (
          <p className="e-empty">このタスクが必要な日程はありません</p>
        ) : (
          <div className="e-schedule">
            {activeDays.map((day) => (
              <div key={day} className="e-day-group">
                <div className="e-day-label">{day}</div>
                <div className="e-slots">
                  {groupedByDay[day].map((entry) => (
                    <div key={entry.timeSlotId} className="e-slot-row">
                      <span className="e-slot-label">{entry.slotLabel}</span>
                      <span className="e-count">
                        必要人数: <strong>{entry.requiredCount}名</strong>
                        <span className="e-count-range">
                          ({entry.minCount}〜{entry.maxCount}名)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </StyledTaskDetail>
  );
};

const StyledTaskDetail = styled.div`
  padding: 16px;

  .e-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
  }

  .e-icon {
    font-size: 48px;
    color: #e65100;
  }

  .e-title {
    flex: 1;
  }

  .e-name {
    margin: 0;
    font-size: 1.25em;
  }

  .e-dept-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.85em;
    font-weight: bold;
    background-color: #fff3e0;
    color: #e65100;
    white-space: nowrap;
  }

  .e-section {
    margin-bottom: 16px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #666;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
  }

  .e-task-content {
    margin: 0;
    font-weight: bold;
    color: #333;
  }

  .e-description {
    margin: 0;
    color: #555;
    white-space: pre-wrap;
  }

  .e-empty {
    margin: 0;
    color: #999;
    font-size: 0.9em;
  }

  .e-schedule {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-day-group {
    border: 1px solid #eee;
    border-radius: 6px;
    overflow: hidden;
  }

  .e-day-label {
    background-color: #fff3e0;
    color: #e65100;
    font-weight: bold;
    font-size: 0.85em;
    padding: 4px 10px;
    border-bottom: 1px solid #eee;
  }

  .e-slots {
    padding: 4px 0;
  }

  .e-slot-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 10px;
    font-size: 0.9em;

    &:not(:last-child) {
      border-bottom: 1px solid #f5f5f5;
    }
  }

  .e-slot-label {
    color: #333;
  }

  .e-count {
    color: #444;
    white-space: nowrap;

    strong {
      color: #e65100;
    }
  }

  .e-count-range {
    color: #999;
    font-size: 0.85em;
    margin-left: 4px;
  }
`;
