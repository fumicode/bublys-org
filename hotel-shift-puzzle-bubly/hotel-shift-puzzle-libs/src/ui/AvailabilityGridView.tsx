'use client';

import { FC } from "react";
import styled from "styled-components";
import { Checkbox } from "@mui/material";
import {
  Staff,
  WorkShift,
  ScheduleAvailability,
} from "../domain/index.js";

type AvailabilityGridViewProps = {
  staffList: Staff[];
  workShifts: WorkShift[];
  availability: ScheduleAvailability;
  onToggle: (staffId: string, shiftId: string) => void;
};

/** スタッフ×勤務帯 のチェックボックス表。各スタッフが入れる勤務帯を編集する。 */
export const AvailabilityGridView: FC<AvailabilityGridViewProps> = ({
  staffList,
  workShifts,
  availability,
  onToggle,
}) => {
  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-corner">スタッフ \ 勤務帯</th>
          {workShifts.map((w) => (
            <th key={w.id} className="e-shift">
              {w.name}
              <span className="e-time">{w.startTimeLabel}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {staffList.map((staff) => (
          <tr key={staff.id}>
            <td className="e-staff">{staff.name}</td>
            {workShifts.map((w) => (
              <td key={w.id} className="e-cell">
                <Checkbox
                  size="small"
                  checked={availability.isAllowed(staff.id, w.id)}
                  onChange={() => onToggle(staff.id, w.id)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </StyledTable>
  );
};

const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: 0.85em;

  th,
  td {
    border: 1px solid #eee;
    padding: 4px 8px;
    text-align: center;
  }

  .e-corner {
    background: #fafafa;
    font-weight: normal;
    color: #777;
    font-size: 0.85em;
  }

  .e-shift {
    background: #fafafa;
    .e-time {
      display: block;
      font-size: 0.8em;
      color: #888;
      font-weight: normal;
    }
  }

  .e-staff {
    text-align: left;
    font-weight: bold;
    white-space: nowrap;
  }

  .e-cell {
    padding: 0;
  }
`;
