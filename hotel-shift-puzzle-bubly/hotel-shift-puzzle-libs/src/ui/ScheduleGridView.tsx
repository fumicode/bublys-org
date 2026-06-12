'use client';

import { FC, Fragment } from "react";
import styled from "styled-components";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";
import {
  Staff,
  MonthlyStaffSchedule,
  WorkingDay,
} from "../domain/index.js";

type ScheduleGridViewProps = {
  schedule: MonthlyStaffSchedule;
  staffList: Staff[];
  buildStaffUrl: (staffId: string) => string;
};

// 勤務帯ごとの色（背景・文字）
const SHIFT_BG: Record<string, string> = {
  early: "#e3f2fd",
  middle: "#fff8e1",
  late: "#f3e5f5",
};
const SHIFT_FG: Record<string, string> = {
  early: "#1565c0",
  middle: "#ef6c00",
  late: "#6a1b9a",
};

const STAFF_COL_WIDTH = 132;
const DAY_COL_WIDTH = 60;

export const ScheduleGridView: FC<ScheduleGridViewProps> = ({
  schedule,
  staffList,
  buildStaffUrl,
}) => {
  const days = schedule.workingDays();

  const gridTemplateColumns = `${STAFF_COL_WIDTH}px repeat(${days.length}, ${DAY_COL_WIDTH}px)`;

  const renderCell = (staff: Staff, day: WorkingDay) => {
    const cell = schedule.statusOf(staff.id, day);
    if (cell.kind === "work") {
      const id = cell.shift.id;
      return (
        <div
          className="e-cell e-work"
          style={{ background: SHIFT_BG[id] ?? "#eee", color: SHIFT_FG[id] ?? "#333" }}
        >
          <span className="e-shift-name">{cell.shift.name}</span>
          <span className="e-shift-time">{cell.shift.startTimeLabel}</span>
        </div>
      );
    }
    if (cell.kind === "day-off") {
      return <div className="e-cell e-off">休</div>;
    }
    return <div className="e-cell e-undecided">·</div>;
  };

  return (
    <StyledWrap>
      <div className="e-grid" style={{ gridTemplateColumns }}>
        {/* 左上の角 */}
        <div className="e-corner">
          {schedule.year}年{schedule.month}月
        </div>

        {/* 日付ヘッダ（列） */}
        {days.map((day) => {
          const wd = day.weekday; // 0=日 6=土
          return (
            <div
              key={day.key}
              className={`e-day-head${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}`}
            >
              <span className="e-day-num">{day.day}</span>
              <span className="e-day-wd">{["日", "月", "火", "水", "木", "金", "土"][wd]}</span>
            </div>
          );
        })}

        {/* スタッフ行 */}
        {staffList.map((staff) => (
          <Fragment key={staff.id}>
            {/* スタッフ名（行ヘッダ）: ObjectView でダブルクリック展開 / ドラッグ */}
            <div className="e-staff-cell">
              <ObjectView
                type="Staff"
                url={buildStaffUrl(staff.id)}
                label={staff.name}
                draggable={true}
                fullWidth={true}
              >
                <div className="e-staff">
                  <PersonIcon fontSize="small" className="e-staff-icon" />
                  <span className="e-staff-name">{staff.name}</span>
                </div>
              </ObjectView>
            </div>

            {/* 各稼働日のセル */}
            {days.map((day) => (
              <Fragment key={`${staff.id}:${day.key}`}>{renderCell(staff, day)}</Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  .e-grid {
    display: grid;
    max-height: 70vh;
    max-width: 100%;
    overflow: auto;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    font-size: 0.8em;
  }

  /* 共通セル */
  .e-corner,
  .e-day-head,
  .e-staff-cell,
  .e-cell {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
  }

  /* 左上の角（縦横どちらにも固定） */
  .e-corner {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 3;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #555;
    padding: 4px;
  }

  /* 日付ヘッダ（上に固定） */
  .e-day-head {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 0;

    .e-day-num {
      font-weight: bold;
    }
    .e-day-wd {
      font-size: 0.8em;
      color: #888;
    }

    &.is-sun .e-day-num,
    &.is-sun .e-day-wd {
      color: #d32f2f;
    }
    &.is-sat .e-day-num,
    &.is-sat .e-day-wd {
      color: #1976d2;
    }
  }

  /* スタッフ名（左に固定） */
  .e-staff-cell {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #fff;

    .e-staff {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      width: 100%;
      box-sizing: border-box;
    }
    .e-staff-icon {
      color: #888;
      flex-shrink: 0;
    }
    .e-staff-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: bold;
    }
  }

  /* データセル */
  .e-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px;
    min-height: 36px;
  }
  .e-work {
    .e-shift-name {
      font-weight: bold;
    }
    .e-shift-time {
      font-size: 0.78em;
      opacity: 0.8;
    }
  }
  .e-off {
    background: #f5f5f5;
    color: #9e9e9e;
    font-weight: bold;
  }
  .e-undecided {
    color: #d0d0d0;
  }
`;
