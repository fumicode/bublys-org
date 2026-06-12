'use client';

import { FC } from "react";
import styled from "styled-components";
import { Button, IconButton, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { WorkShift } from "../domain/index.js";

type WorkShiftListViewProps = {
  workShifts: WorkShift[];
  onRename: (id: string, name: string) => void;
  onChangeStartMinute: (id: string, startMinute: number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

/** startMinute → "HH:MM"（input[type=time] 用） */
const toTimeValue = (startMinute: number): string => {
  const h = Math.floor(startMinute / 60);
  const m = startMinute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** "HH:MM" → startMinute */
const fromTimeValue = (value: string): number | null => {
  const [h, m] = value.split(":").map((s) => parseInt(s, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const WorkShiftListView: FC<WorkShiftListViewProps> = ({
  workShifts,
  onRename,
  onChangeStartMinute,
  onAdd,
  onRemove,
}) => {
  return (
    <StyledContainer>
      <ul className="e-list">
        {workShifts.length === 0 ? (
          <li className="e-empty">勤務帯がありません</li>
        ) : (
          workShifts.map((shift) => (
            <li key={shift.id} className="e-item">
              <TextField
                className="e-name"
                variant="standard"
                size="small"
                value={shift.name}
                placeholder="勤務帯名"
                onChange={(e) => onRename(shift.id, e.target.value)}
              />
              <TextField
                className="e-time"
                variant="standard"
                size="small"
                type="time"
                value={toTimeValue(shift.startMinute)}
                onChange={(e) => {
                  const min = fromTimeValue(e.target.value);
                  if (min !== null) onChangeStartMinute(shift.id, min);
                }}
              />
              <IconButton
                className="e-remove"
                size="small"
                aria-label="削除"
                onClick={() => onRemove(shift.id)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </li>
          ))
        )}
      </ul>

      <Button
        className="e-add"
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={onAdd}
      >
        勤務帯を追加
      </Button>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;

  .e-list {
    list-style: none;
    padding: 0;
    margin: 0 0 8px 0;
  }

  .e-empty {
    padding: 12px;
    text-align: center;
    color: #999;
  }

  .e-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 4px;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }

    .e-name {
      flex: 1;
      min-width: 0;
    }

    .e-time {
      width: 96px;
      flex-shrink: 0;
    }

    .e-remove {
      color: #b0b0b0;
      flex-shrink: 0;

      &:hover {
        color: #d32f2f;
      }
    }
  }

  .e-add {
    text-transform: none;
  }
`;
