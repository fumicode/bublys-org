'use client';

import { FC, useState, type KeyboardEvent } from "react";
import styled from "styled-components";
import { Button, IconButton, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DoneIcon from "@mui/icons-material/Done";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { WorkShift } from "../domain/index.js";

/** 編集中フォームのドラフト。id が null なら新規追加、そうでなければ既存勤務帯の編集。 */
type ShiftDraft = { id: string | null; name: string; hour: number };

type WorkShiftListViewProps = {
  workShifts: WorkShift[];
  /**
   * 勤務帯の追加／編集を確定する。id が null なら追加、そうでなければ既存の更新。
   * フォームでの入力中は保存せず、✅ 押下でこのコールバックが1回だけ呼ばれる。
   */
  onCommitShift: (id: string | null, draft: { name: string; hour: number }) => void;
  onRemove: (id: string) => void;
};

const clampHour = (hour: number): number => Math.max(0, Math.min(23, hour));

/**
 * 勤務帯のリスト。開始時刻昇順で表示する（ソートは呼び出し側の集約が担保）。
 * 追加は ＋ で空フォームを開き、名前・開始時刻を入力して ✅ で確定する。
 * 各行はホバーで ✏️ が出て、名前・開始時刻を編集し ✅ で確定する。
 * 入力はフォーム内にバッファされ、✅ を押すまで保存しない。
 */
export const WorkShiftListView: FC<WorkShiftListViewProps> = ({
  workShifts,
  onCommitShift,
  onRemove,
}) => {
  const [draft, setDraft] = useState<ShiftDraft | null>(null);

  const commit = () => {
    if (draft) onCommitShift(draft.id, { name: draft.name, hour: draft.hour });
    setDraft(null);
  };

  // Enter で確定（日本語入力の変換確定 Enter＝isComposing は除外）
  const handleFormKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit();
    }
  };

  const renderForm = (d: ShiftDraft) => (
    <li className="e-item is-editing" onKeyDown={handleFormKeyDown}>
      <TextField
        className="e-name"
        variant="standard"
        size="small"
        autoFocus
        value={d.name}
        placeholder="勤務帯名"
        onChange={(e) => setDraft({ ...d, name: e.target.value })}
      />
      <TextField
        className="e-hour"
        variant="standard"
        size="small"
        type="number"
        label="時"
        value={d.hour}
        inputProps={{ min: 0, max: 23 }}
        onChange={(e) => {
          const hour = parseInt(e.target.value, 10);
          if (!Number.isNaN(hour)) setDraft({ ...d, hour: clampHour(hour) });
        }}
      />
      <div className="e-actions">
        {d.id !== null && (
          <IconButton
            className="e-remove"
            size="small"
            aria-label="削除"
            onClick={() => {
              onRemove(d.id as string);
              setDraft(null);
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton size="small" aria-label="キャンセル" onClick={() => setDraft(null)}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="確定" onClick={commit}>
          <DoneIcon fontSize="small" />
        </IconButton>
      </div>
    </li>
  );

  return (
    <StyledContainer>
      <ul className="e-list">
        {workShifts.length === 0 && draft?.id !== null ? (
          <li className="e-empty">勤務帯がありません</li>
        ) : (
          workShifts.map((shift) =>
            draft && draft.id === shift.id ? (
              renderForm(draft)
            ) : (
              <li key={shift.id} className="e-item">
                <span className="e-name-text">{shift.name}</span>
                <span className="e-time-text">{shift.startTimeLabel}</span>
                <div className="e-actions">
                  <IconButton
                    className="e-edit-btn"
                    size="small"
                    aria-label="この勤務帯を編集"
                    onClick={() =>
                      setDraft({ id: shift.id, name: shift.name, hour: shift.startHour })
                    }
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    className="e-remove"
                    size="small"
                    aria-label="削除"
                    onClick={() => onRemove(shift.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </div>
              </li>
            )
          )
        )}
        {/* 追加フォーム（＋で開く。id=null） */}
        {draft?.id === null && renderForm(draft)}
      </ul>

      {/* 追加ボタンは、編集・追加フォームを開いていないときだけ出す */}
      {draft === null && (
        <Button
          className="e-add"
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDraft({ id: null, name: "", hour: 9 })}
        >
          勤務帯を追加
        </Button>
      )}
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

    .e-name-text {
      flex: 1;
      min-width: 0;
      font-weight: 600;
    }

    .e-time-text {
      color: #666;
      flex-shrink: 0;
    }

    .e-name {
      flex: 1;
      min-width: 0;
    }

    .e-hour {
      width: 56px;
      flex-shrink: 0;
    }

    .e-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    /* ✏️ は既定で薄く、行ホバーで見せる */
    .e-edit-btn {
      opacity: 0;
      transition: opacity 0.1s;
      color: #90a4ae;
    }
    &:hover .e-edit-btn {
      opacity: 1;
    }

    .e-remove {
      color: #b0b0b0;

      &:hover {
        color: #d32f2f;
      }
    }
  }

  .e-add {
    text-transform: none;
  }
`;
