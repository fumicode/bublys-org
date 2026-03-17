'use client';

import { FC } from "react";
import styled from "styled-components";
import { Member, TimeSlot, type DayType } from "../domain/index.js";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { DAY_TYPE_ORDER } from "../data/sampleData.js";

type MemberAvailabilityViewProps = {
  member: Member;
  timeSlots: TimeSlot[];
};

export const MemberAvailabilityView: FC<MemberAvailabilityViewProps> = ({
  member,
  timeSlots,
}) => {
  // dayTypeごとにグループ化
  const slotsByDayType = timeSlots.reduce((acc, slot) => {
    const dayType = slot.dayType;
    if (!acc[dayType]) {
      acc[dayType] = [];
    }
    acc[dayType].push(slot);
    return acc;
  }, {} as Record<DayType, TimeSlot[]>);

  const dayTypes = DAY_TYPE_ORDER.filter((dt) => slotsByDayType[dt]);

  return (
    <StyledContainer>
      <ObjectView
        type="Member"
        url={`shift-puzzle/members/${member.id}`}
        label={member.name}
        draggable={true}
      >
        <h3>{member.name}</h3>
      </ObjectView>
      <p className="e-subtitle">{member.department}{member.isNewMember && " (新入生)"}</p>

      <div className="e-summary">
        参加可能: <strong>{member.availableTimeSlots.length}</strong> / {timeSlots.length} 枠
      </div>

      <table className="e-table">
        <thead>
          <tr>
            <th>日程</th>
            <th>時間帯</th>
            <th>時間</th>
            <th>参加可否</th>
          </tr>
        </thead>
        <tbody>
          {dayTypes.map((dayType) =>
            slotsByDayType[dayType].map((slot, idx) => (
              <tr key={slot.id} className={member.isAvailableAt(slot.id) ? "is-available" : "is-unavailable"}>
                {idx === 0 && (
                  <td rowSpan={slotsByDayType[dayType].length} className="e-day-type">
                    {dayType}
                  </td>
                )}
                <td className="e-period">
                  {slot.label.split(' ').slice(1).join(' ')}
                </td>
                <td className="e-time">
                  {slot.state.startTime} - {slot.state.endTime}
                </td>
                <td className="e-status">
                  {member.isAvailableAt(slot.id) ? (
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

    .e-day-type {
      font-weight: bold;
      background-color: #fafafa;
      vertical-align: top;
    }

    .e-period {
      white-space: nowrap;
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
