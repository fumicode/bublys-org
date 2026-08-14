'use client';

import { FC } from "react";
import styled from "styled-components";
import { StaffMonthlyShiftWish, WorkingDay } from "../domain/index.js";

type WishOption = { key: string; label: string };

type ShiftWishGridViewProps = {
  wish: StaffMonthlyShiftWish;
  /** 列に並べるオプション（休み・各勤務帯名） */
  options: WishOption[];
  /** セルをクリックしたとき（neutral→○→×→neutral を一巡） */
  onCycle: (day: WorkingDay, optionKey: string) => void;
};

const MARK: Record<string, string> = { want: "○", avoid: "×" };

/**
 * 稼働日（行）× オプション（列）の希望表。各セルはクリックで
 * neutral（空欄＝どうでもいい）→ ○（したい）→ ×（避けたい）を一巡する。
 */
export const ShiftWishGridView: FC<ShiftWishGridViewProps> = ({
  wish,
  options,
  onCycle,
}) => {
  const days = wish.workingDays();
  const weekdayLabel = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-corner">日付 \ 希望</th>
          {options.map((o) => (
            <th key={o.key} className="e-opt">
              {o.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {days.map((day) => {
          const wd = day.weekday;
          return (
            <tr key={day.key}>
              <td
                className={`e-day${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}`}
              >
                {day.day}
                <span className="e-wd">（{weekdayLabel[wd]}）</span>
              </td>
              {options.map((o) => {
                const pref = wish.preferenceFor(day, o.key);
                return (
                  <td
                    key={o.key}
                    role="button"
                    className={`e-cell${pref ? ` is-${pref}` : ""}`}
                    title={`${day.label} ${o.label}: ${
                      pref === "want" ? "○ したい" : pref === "avoid" ? "× 避けたい" : "どうでもいい"
                    }（クリックで切替）`}
                    onClick={() => onCycle(day, o.key)}
                  >
                    {pref ? MARK[pref] : ""}
                  </td>
                );
              })}
            </tr>
          );
        })}
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
    padding: 3px 8px;
    text-align: center;
  }

  thead th {
    position: sticky;
    top: 0;
    background: #fafafa;
    z-index: 1;
  }

  .e-corner {
    font-weight: normal;
    color: #777;
    font-size: 0.85em;
  }

  .e-day {
    text-align: right;
    font-weight: bold;
    white-space: nowrap;
    background: #fafafa;
    .e-wd {
      font-weight: normal;
      font-size: 0.8em;
      color: #999;
    }
    &.is-sun {
      color: #d32f2f;
    }
    &.is-sat {
      color: #1976d2;
    }
  }

  .e-cell {
    min-width: 44px;
    cursor: pointer;
    font-weight: bold;
    color: #bbb;
    user-select: none;

    &:hover {
      background: #f0f4f8;
    }
    &.is-want {
      background: #e8f5e9;
      color: #2e7d32;
    }
    &.is-avoid {
      background: #ffebee;
      color: #c62828;
    }
  }
`;
