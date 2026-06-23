'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import { Button, IconButton, TextField } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { MonthlyStaffSchedule } from "../domain/index.js";

type ScheduleListViewProps = {
  schedules: MonthlyStaffSchedule[];
  onCreate: (params: { storeId: string; year: number; month: number }) => void;
  onRemove: (id: string) => void;
};

export const ScheduleListView: FC<ScheduleListViewProps> = ({
  schedules,
  onCreate,
  onRemove,
}) => {
  const [storeId, setStoreId] = useState("store-1");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(7);

  const handleCreate = () => {
    onCreate({ storeId, year, month });
  };

  return (
    <StyledContainer>
      <ul className="e-list">
        {schedules.length === 0 ? (
          <li className="e-empty">勤務表がありません</li>
        ) : (
          schedules.map((schedule) => (
            <li key={schedule.id} className="e-item">
              {/* ObjectView: ダブルクリックで勤務表グリッドを開く / ドラッグでポケットへ */}
              <ObjectView
                object={schedule}
                label={`${schedule.year}年${schedule.month}月`}
                draggable={true}
                openingPosition="bubble-side"
                fullWidth={true}
              >
                <div className="e-content">
                  <CalendarMonthIcon fontSize="small" className="e-icon" />
                  <div className="e-text">
                    <div className="e-title">
                      {schedule.year}年{schedule.month}月
                    </div>
                    <div className="e-meta">
                      {schedule.storeId} ・ {schedule.assignments.length}件の割当
                    </div>
                  </div>
                </div>
              </ObjectView>
              <IconButton
                className="e-remove"
                size="small"
                aria-label="削除"
                onClick={() => onRemove(schedule.id)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </li>
          ))
        )}
      </ul>

      <div className="e-create">
        <h4>新しい勤務表を作成</h4>
        <div className="e-fields">
          <TextField
            className="e-store"
            variant="standard"
            size="small"
            label="店舗"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          />
          <TextField
            className="e-year"
            variant="standard"
            size="small"
            type="number"
            label="年"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
          />
          <TextField
            className="e-month"
            variant="standard"
            size="small"
            type="number"
            label="月"
            inputProps={{ min: 1, max: 12 }}
            value={month}
            onChange={(e) => {
              const m = parseInt(e.target.value, 10);
              if (!Number.isNaN(m)) setMonth(Math.min(12, Math.max(1, m)));
            }}
          />
        </div>
        <Button
          className="e-add"
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!storeId.trim()}
        >
          作成
        </Button>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;
  min-width: 280px;

  .e-list {
    list-style: none;
    padding: 0;
    margin: 0 0 12px 0;
  }

  .e-empty {
    padding: 12px;
    text-align: center;
    color: #999;
  }

  .e-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }

    .e-content {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .e-icon {
      color: #666;
      flex-shrink: 0;
    }
    .e-title {
      font-weight: bold;
    }
    .e-meta {
      font-size: 0.82em;
      color: #777;
    }
    .e-remove {
      color: #b0b0b0;
      flex-shrink: 0;

      &:hover {
        color: #d32f2f;
      }
    }
  }

  .e-create {
    border-top: 1px solid #eee;
    padding-top: 8px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #555;
    }

    .e-fields {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;

      .e-store {
        flex: 1;
      }
      .e-year {
        width: 72px;
      }
      .e-month {
        width: 56px;
      }
    }

    .e-add {
      text-transform: none;
    }
  }
`;
