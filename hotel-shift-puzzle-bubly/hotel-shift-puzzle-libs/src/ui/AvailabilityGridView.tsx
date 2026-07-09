'use client';

import { FC, useState, type KeyboardEvent } from "react";
import styled from "styled-components";
import { Checkbox, IconButton, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DoneIcon from "@mui/icons-material/Done";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Staff,
  WorkShift,
  ScheduleAvailability,
} from "../domain/index.js";

/** 編集中フォームのドラフト。id が null なら新規追加、そうでなければ既存勤務帯の編集。 */
type ShiftDraft = { id: string | null; name: string; hour: number };

type AvailabilityGridViewProps = {
  staffList: Staff[];
  /** 勤務帯（開始時刻昇順）。列＝各勤務帯 */
  workShifts: WorkShift[];
  /** 連続する同名をまとめたグループ（ヘッダ上段の colspan 用） */
  shiftGroups: { name: string; shifts: WorkShift[] }[];
  availability: ScheduleAvailability;
  onToggle: (staffId: string, shiftId: string) => void;
  /** 編集可否。true なら勤務帯の追加・改名・時刻変更・削除ができる */
  editable?: boolean;
  /**
   * 勤務帯の追加／編集を確定する。id が null なら追加、そうでなければ既存の更新。
   * フォームでの入力中は保存せず、✅ 押下でこのコールバックが1回だけ呼ばれる（世界線への記録も1回）。
   */
  onCommitShift?: (id: string | null, draft: { name: string; hour: number }) => void;
  onRemoveShift?: (id: string) => void;
};

const clampHour = (hour: number): number => Math.max(0, Math.min(23, hour));

/**
 * スタッフ×勤務帯 のチェックボックス表。各スタッフが入れる勤務帯を編集する。
 * ヘッダ上段は勤務帯名（連続する同名を colspan でまとめる）、下段は各勤務帯の開始時刻。
 * editable のとき:
 *   - 右端の ＋ で空フォームを開き、名前・開始時刻を入力して ✅ で「追加」する。
 *   - 列（時刻セル）ホバーで ✏️ が出て、名前・開始時刻を編集し ✅ で確定する。
 * 入力はフォーム内にバッファされ、✅ を押すまで保存しない（＝世界線に記録しすぎない）。
 * 開始時刻が変われば列は自動で並び替わる。
 */
export const AvailabilityGridView: FC<AvailabilityGridViewProps> = ({
  staffList,
  workShifts,
  shiftGroups,
  availability,
  onToggle,
  editable = false,
  onCommitShift,
  onRemoveShift,
}) => {
  // 編集中フォームのドラフト（1つだけ）。null なら非編集。
  const [draft, setDraft] = useState<ShiftDraft | null>(null);

  const commit = () => {
    if (draft) onCommitShift?.(draft.id, { name: draft.name, hour: draft.hour });
    setDraft(null);
  };

  // Enter で確定（日本語入力の変換確定 Enter＝isComposing は除外）
  const handleFormKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit();
    }
  };

  const renderEditForm = (d: ShiftDraft) => (
    <div className="e-edit" onKeyDown={handleFormKeyDown}>
      <TextField
        className="e-edit-name"
        variant="standard"
        size="small"
        autoFocus
        value={d.name}
        placeholder="勤務帯名"
        onChange={(e) => setDraft({ ...d, name: e.target.value })}
      />
      <TextField
        className="e-edit-hour"
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
      <div className="e-edit-actions">
        {d.id !== null && (
          <IconButton
            size="small"
            aria-label="削除"
            className="e-edit-remove"
            onClick={() => {
              onRemoveShift?.(d.id as string);
              setDraft(null);
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton
          size="small"
          aria-label="キャンセル"
          onClick={() => setDraft(null)}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="確定" onClick={commit}>
          <DoneIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );

  return (
    <StyledTable>
      <thead>
        {/* 上段：勤務帯名（同名は colspan でまとめる） */}
        <tr>
          <th className="e-corner" rowSpan={2}>
            スタッフ \ 勤務帯
          </th>
          {shiftGroups.map((g, i) => (
            <th key={`g-${i}-${g.name}`} className="e-group" colSpan={g.shifts.length}>
              {g.name}
            </th>
          ))}
          {editable && (
            <th className="e-add-col" rowSpan={2}>
              {draft && draft.id === null ? (
                renderEditForm(draft)
              ) : (
                <IconButton
                  size="small"
                  aria-label="勤務帯を追加"
                  onClick={() => setDraft({ id: null, name: "", hour: 9 })}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              )}
            </th>
          )}
        </tr>
        {/* 下段：各勤務帯の開始時刻（＋ 編集アフォーダンス） */}
        <tr>
          {workShifts.map((w) => (
            <th key={w.id} className="e-shift">
              {editable && draft && draft.id === w.id ? (
                renderEditForm(draft)
              ) : (
                <div className="e-shift-head">
                  <span className="e-time">{w.startTimeLabel}</span>
                  {editable && (
                    <IconButton
                      size="small"
                      className="e-edit-btn"
                      aria-label="この勤務帯を編集"
                      onClick={() =>
                        setDraft({ id: w.id, name: w.name, hour: w.startHour })
                      }
                    >
                      <EditIcon fontSize="inherit" />
                    </IconButton>
                  )}
                </div>
              )}
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
            {editable && <td className="e-add-col" />}
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

  .e-group {
    background: #f2f4f6;
    font-weight: bold;
  }

  .e-shift {
    background: #fafafa;
    font-weight: normal;

    .e-shift-head {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .e-time {
      color: #555;
    }
    /* ✏️ は既定で薄く、セルのホバーで見せる */
    .e-edit-btn {
      opacity: 0;
      transition: opacity 0.1s;
      font-size: 0.9em;
      color: #90a4ae;
      padding: 2px;
    }
    &:hover .e-edit-btn {
      opacity: 1;
    }
  }

  /* 追加・編集フォーム（＋列 / 各時刻セル 共通） */
  .e-edit {
    display: flex;
    align-items: flex-end;
    gap: 4px;
  }
  .e-edit-name {
    width: 84px;
  }
  .e-edit-hour {
    width: 48px;
  }
  .e-edit-actions {
    display: flex;
    align-items: center;
  }
  .e-edit-remove:hover {
    color: #d32f2f;
  }

  .e-add-col {
    background: #fafafa;
    padding: 0 2px;
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
