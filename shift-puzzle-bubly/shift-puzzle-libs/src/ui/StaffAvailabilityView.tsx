'use client';

import { FC } from "react";
import styled from "styled-components";
import { Staff_スタッフ, TimeSlot_時間帯 } from "../domain/index.js";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { ObjectView } from "@bublys-org/bubbles-ui";

type StaffAvailabilityViewProps = {
  staff: Staff_スタッフ;
  timeSlots: TimeSlot_時間帯[];
};

export const StaffAvailabilityView: FC<StaffAvailabilityViewProps> = ({
  staff,
  timeSlots,
}) => {
  // 日付ごとにグループ化
  const slotsByDate = timeSlots.reduce((acc, slot) => {
    const date = slot.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot_時間帯[]>);

  const dates = Object.keys(slotsByDate).sort();

  return (
    <StyledContainer>
      <ObjectView
        type="Staff"
        url={`gakkai-shift/staffs/${staff.id}`}
        label={staff.name}
        draggable={true}
      >
        <h3>{staff.name}</h3>
      </ObjectView>
      <p className="e-subtitle">{staff.state.school} / {staff.state.grade}</p>

      <div className="e-summary">
        参加可能: <strong>{staff.availableTimeSlots.length}</strong> / {timeSlots.length} 枠
      </div>

      <table className="e-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>時間帯</th>
            <th>時間</th>
            <th>参加可否</th>
          </tr>
        </thead>
        <tbody>
          {dates.map((date) =>
            slotsByDate[date].map((slot, idx) => (
              <tr key={slot.id} className={staff.isAvailableAt(slot.id) ? "is-available" : "is-unavailable"}>
                {idx === 0 && (
                  <td rowSpan={slotsByDate[date].length} className="e-date">
                    {formatDate(date)}
                  </td>
                )}
                <td className="e-period">
                  {slot.label.split(' ')[1]}
                  {slot.isOrientation && <span className="e-orientation">オリエン</span>}
                </td>
                <td className="e-time">
                  {slot.state.startTime} - {slot.state.endTime}
                </td>
                <td className="e-status">
                  {staff.isAvailableAt(slot.id) ? (
                    <span className="e-ok"><CheckIcon fontSize="small" /> 可能</span>
                  ) : (
                    <span className="e-ng"><CloseIcon fontSize="small" /> 不可</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </StyledContainer>
  );
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
};

const StyledContainer = styled.div`
  h3 {
    margin: 0 0 4px 0;
  }

  .e-subtitle {
    margin: 0 0 12px 0;
    color: #666;
    font-size: 0.9em;
  }

  .e-summary {
    margin-bottom: 16px;
    padding: 8px 12px;
    background-color: #f5f5f5;
    border-radius: 4px;
    font-size: 0.9em;
  }

  .e-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;

    th, td {
      padding: 8px;
      border: 1px solid #ddd;
      text-align: left;
    }

    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }

    .e-date {
      font-weight: bold;
      background-color: #fafafa;
      vertical-align: top;
    }

    .e-period {
      white-space: nowrap;
    }

    .e-orientation {
      margin-left: 4px;
      padding: 2px 4px;
      background-color: #fff3e0;
      color: #e65100;
      font-size: 0.75em;
      border-radius: 2px;
    }

    .e-time {
      color: #666;
      white-space: nowrap;
    }

    .e-status {
      text-align: center;
    }

    .e-ok {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: #2e7d32;
    }

    .e-ng {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: #c62828;
    }

    tr.is-available {
      background-color: #e8f5e9;
    }

    tr.is-unavailable {
      background-color: #ffebee;
    }
  }
`;
