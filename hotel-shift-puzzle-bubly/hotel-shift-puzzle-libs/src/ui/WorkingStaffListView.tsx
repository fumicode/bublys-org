'use client';

import { FC, useMemo, useState, type KeyboardEvent } from "react";
import styled from "styled-components";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import DoneIcon from "@mui/icons-material/Done";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { Button, IconButton, TextField } from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { Staff, WorkShift } from "../domain/index.js";

/** 勤務帯の編集フォームのドラフト。id が null なら新規追加、そうでなければ既存の編集。 */
type ShiftDraft = { id: string | null; name: string; hour: number };

const clampHour = (hour: number): number => Math.max(0, Math.min(23, hour));

type WorkingStaffListViewProps = {
  /** この勤務表で働く人たち（並び順のまま＝勤務表の行順） */
  members: Staff[];
  /** その人がこの勤務表の中だけで足した臨時の人か */
  isTemporary: (staffId: string) => boolean;
  /** この世界に焼き付いた名簿。働いていない人もここには居る */
  roster: Staff[];
  /** 可能勤務帯の列（この勤務表の勤務帯セット） */
  workShifts: WorkShift[];
  /** その人がその勤務帯に入れるか */
  isAllowed: (staffId: string, shiftId: string) => boolean;
  /** 状態が揃うまでは編集させない（読めないだけのものを作り直さないため） */
  editable?: boolean;
  /** この勤務表の中だけの臨時スタッフを足す */
  onAddTemporary: (name: string, department: string) => void;
  /** 名簿の人をこの勤務表に加える */
  onAddFromRoster: (staffId: string) => void;
  /** この勤務表から外す */
  onRemove: (staffId: string) => void;
  /** 行の並びを変える */
  onMove: (staffId: string, toIndex: number) => void;
  /** 臨時の人の名前・部署を直す（名前と部署はまとめて1回で確定する） */
  onEditTemporary: (
    staffId: string,
    edit: { name: string; department: string }
  ) => void;
  /** その人のその勤務帯の可否を反転する */
  onToggleShift: (staffId: string, shiftId: string) => void;
  /**
   * 勤務帯（列）そのものの追加／編集を確定する。id が null なら追加、そうでなければ更新。
   * 入力中は保存せず、✅ 押下で1回だけ呼ばれる（＝世界線に記録しすぎない）。
   */
  onCommitShift?: (id: string | null, draft: { name: string; hour: number }) => void;
  /** 勤務帯（列）を取り除く */
  onRemoveShift?: (shiftId: string) => void;
};

/**
 * 勤務スタッフ群（この勤務表で働く人たち）を、これ1枚で扱えるようにしたビュー。
 *
 * 左は**この世界に焼き付いた名簿**。右が**この勤務表のメンバー**で、並び順がそのまま
 * 勤務表の行順になる。可能勤務帯（誰がどの勤務帯に入れるか）もメンバーが持つので、
 * ここでチェックできる（可能勤務帯バブルと同じ1つの真実を見ている）。
 *
 * 名簿の人と臨時の人を**見た目で区別する**。名簿の人は実体が名簿側にあるのでここからは
 * 名前を直せない（ダブルクリックでスタッフ詳細が開く）。臨時の人は実体がこの群の中にしか
 * 無いので、ここで直す。
 */
export const WorkingStaffListView: FC<WorkingStaffListViewProps> = ({
  members,
  isTemporary,
  roster,
  workShifts,
  isAllowed,
  editable = true,
  onAddTemporary,
  onAddFromRoster,
  onRemove,
  onMove,
  onEditTemporary,
  onToggleShift,
  onCommitShift,
  onRemoveShift,
}) => {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  /** ドラッグ中のメンバー（並び替え） */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  /** ドロップ先として光らせている行 */
  const [overIndex, setOverIndex] = useState<number | null>(null);
  /** 勤務帯（列）の編集フォーム。1つだけ開く */
  const [shiftDraft, setShiftDraft] = useState<ShiftDraft | null>(null);

  const shiftColumnsEditable = editable && !!onCommitShift;

  const commitShift = () => {
    if (shiftDraft) {
      onCommitShift?.(shiftDraft.id, {
        name: shiftDraft.name,
        hour: shiftDraft.hour,
      });
    }
    setShiftDraft(null);
  };

  // Enter で確定（日本語入力の変換確定 Enter＝isComposing は除外）
  const handleShiftFormKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commitShift();
    }
  };

  const renderShiftForm = (d: ShiftDraft) => (
    <div className="e-shift-edit" onKeyDown={handleShiftFormKeyDown}>
      <TextField
        variant="standard"
        size="small"
        autoFocus
        value={d.name}
        placeholder="勤務帯名"
        onChange={(e) => setShiftDraft({ ...d, name: e.target.value })}
      />
      <TextField
        className="e-shift-hour"
        variant="standard"
        size="small"
        type="number"
        label="時"
        value={d.hour}
        inputProps={{ min: 0, max: 23 }}
        onChange={(e) => {
          const hour = parseInt(e.target.value, 10);
          if (!Number.isNaN(hour)) setShiftDraft({ ...d, hour: clampHour(hour) });
        }}
      />
      <div className="e-shift-edit-actions">
        {d.id !== null && onRemoveShift && (
          <IconButton
            size="small"
            title="この勤務帯を削除"
            onClick={() => {
              onRemoveShift(d.id as string);
              setShiftDraft(null);
            }}
          >
            <DeleteOutlineIcon fontSize="inherit" />
          </IconButton>
        )}
        <IconButton size="small" title="やめる" onClick={() => setShiftDraft(null)}>
          <CloseIcon fontSize="inherit" />
        </IconButton>
        <IconButton size="small" title="確定" onClick={commitShift}>
          <DoneIcon fontSize="inherit" />
        </IconButton>
      </div>
    </div>
  );

  const workingIds = useMemo(
    () => new Set(members.map((s) => s.id)),
    [members]
  );

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddTemporary(trimmed, department.trim());
    setName("");
    setDepartment("");
  };

  const startEdit = (staff: Staff) => {
    setEditingId(staff.id);
    setEditName(staff.name);
    setEditDepartment(staff.department);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDepartment("");
  };

  const commitEdit = (id: string) => {
    const name = editName.trim();
    // 名前は空にできない（行の見出しが消えてしまう）。部署は空でよい（＝未設定）
    if (name) onEditTemporary(id, { name, department: editDepartment.trim() });
    cancelEdit();
  };

  const endDrag = () => {
    setDraggingId(null);
    setOverIndex(null);
  };

  const dropOn = (index: number) => {
    if (draggingId) onMove(draggingId, index);
    endDrag();
  };

  return (
    <StyledContainer>
      <div className="e-cols">
        <aside className="e-roster">
          <h4>名簿（この世界に焼き付け）</h4>
          <ul>
            {roster.length === 0 ? (
              <li className="e-empty">名簿が空です</li>
            ) : (
              roster.map((staff) => {
                const working = workingIds.has(staff.id);
                return (
                  <li
                    key={staff.id}
                    className={`e-roster-item${working ? " is-working" : ""}`}
                  >
                    <ObjectView
                      object={staff}
                      label={staff.name}
                      draggable={true}
                      openingPosition="bubble-side-left"
                      fullWidth={true}
                    >
                      <span
                        className="e-name"
                        title="ダブルクリックでスタッフ詳細を開く"
                      >
                        <PersonIcon fontSize="small" className="e-icon" />
                        <span className="e-label">{staff.name}</span>
                      </span>
                    </ObjectView>
                    {working ? (
                      <span className="e-in" title="この勤務表で働いています">
                        ✓
                      </span>
                    ) : (
                      <IconButton
                        size="small"
                        disabled={!editable}
                        title="この勤務表に加える"
                        onClick={() => onAddFromRoster(staff.id)}
                      >
                        <AddIcon fontSize="inherit" />
                      </IconButton>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <div className="e-members">
          <h4>この勤務表で働く人（上から勤務表の行順）</h4>
          {members.length === 0 ? (
            <p className="e-empty">この勤務表で働く人がいません</p>
          ) : (
            <table className="e-table">
              <thead>
                <tr>
                  <th className="e-th-handle" />
                  <th className="e-th-name">名前</th>
                  {workShifts.map((shift) => (
                    <th key={shift.id} className="e-th-shift" title={shift.name}>
                      {shiftColumnsEditable && shiftDraft?.id === shift.id ? (
                        renderShiftForm(shiftDraft)
                      ) : (
                        <>
                          <span className="e-shift-name">{shift.name}</span>
                          <span className="e-shift-time">{shift.startTimeLabel}</span>
                          {shiftColumnsEditable && (
                            <IconButton
                              size="small"
                              className="e-shift-edit-btn"
                              title="この勤務帯を編集"
                              onClick={() =>
                                setShiftDraft({
                                  id: shift.id,
                                  name: shift.name,
                                  hour: shift.startHour,
                                })
                              }
                            >
                              <EditIcon fontSize="inherit" />
                            </IconButton>
                          )}
                        </>
                      )}
                    </th>
                  ))}
                  {shiftColumnsEditable && (
                    <th className="e-th-add-shift">
                      {shiftDraft?.id === null ? (
                        renderShiftForm(shiftDraft)
                      ) : (
                        <IconButton
                          size="small"
                          title="勤務帯を追加"
                          onClick={() => setShiftDraft({ id: null, name: "", hour: 9 })}
                        >
                          <AddIcon fontSize="inherit" />
                        </IconButton>
                      )}
                    </th>
                  )}
                  <th className="e-th-remove" />
                </tr>
              </thead>
              <tbody>
                {members.map((staff, index) => (
                  <tr
                    key={staff.id}
                    className={`e-row${draggingId === staff.id ? " is-dragging" : ""}${
                      overIndex === index ? " is-over" : ""
                    }`}
                    onDragOver={(e) => {
                      if (!draggingId) return;
                      e.preventDefault();
                      setOverIndex(index);
                    }}
                    onDragLeave={() =>
                      setOverIndex((prev) => (prev === index ? null : prev))
                    }
                    onDrop={(e) => {
                      if (!draggingId) return;
                      e.preventDefault();
                      e.stopPropagation();
                      dropOn(index);
                    }}
                  >
                    <td className="e-handle-cell">
                      <span
                        className="e-handle"
                        draggable={editable}
                        title="ドラッグして並び替え"
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          // 並び替えはこのバブルの中だけの操作。外へは渡さない
                          e.dataTransfer.setData("text/plain", staff.id);
                          setDraggingId(staff.id);
                        }}
                        onDragEnd={endDrag}
                      >
                        <DragIndicatorIcon fontSize="inherit" />
                      </span>
                    </td>

                    <td className="e-name-cell">
                      {isTemporary(staff.id) ? (
                        editingId === staff.id ? (
                          <span className="e-name e-editing">
                            <TextField
                              className="e-edit-name"
                              variant="standard"
                              size="small"
                              autoFocus
                              label="名前"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(staff.id);
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                            <TextField
                              className="e-edit-dept"
                              variant="standard"
                              size="small"
                              label="部署"
                              value={editDepartment}
                              onChange={(e) => setEditDepartment(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(staff.id);
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                            <IconButton
                              size="small"
                              title="確定"
                              onClick={() => commitEdit(staff.id)}
                            >
                              <CheckIcon fontSize="inherit" />
                            </IconButton>
                            <IconButton size="small" title="やめる" onClick={cancelEdit}>
                              <CloseIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        ) : (
                          <span className="e-name">
                            <PersonAddAlt1Icon fontSize="small" className="e-icon" />
                            <span className="e-label">{staff.name}</span>
                            <span
                              className="e-badge"
                              title="この勤務表の中だけで足した人。名簿には載っていません"
                            >
                              臨時
                            </span>
                            {staff.department && (
                              <span className="e-dept">{staff.department}</span>
                            )}
                            <IconButton
                              size="small"
                              disabled={!editable}
                              title="名前と部署を直す"
                              onClick={() => startEdit(staff)}
                            >
                              <EditIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        )
                      ) : (
                        <ObjectView
                          object={staff}
                          label={staff.name}
                          draggable={true}
                          openingPosition="bubble-side-right"
                          fullWidth={true}
                        >
                          <span
                            className="e-name"
                            title="ダブルクリックでスタッフ詳細を開く"
                          >
                            <PersonIcon fontSize="small" className="e-icon" />
                            <span className="e-label">{staff.name}</span>
                            {staff.department && (
                              <span className="e-dept">{staff.department}</span>
                            )}
                          </span>
                        </ObjectView>
                      )}
                    </td>

                    {workShifts.map((shift) => (
                      <td key={shift.id} className="e-shift-cell">
                        <input
                          type="checkbox"
                          checked={isAllowed(staff.id, shift.id)}
                          disabled={!editable}
                          title={`${staff.name} は ${shift.name} に入れる`}
                          onChange={() => onToggleShift(staff.id, shift.id)}
                        />
                      </td>
                    ))}

                    {shiftColumnsEditable && <td className="e-add-shift-cell" />}

                    <td className="e-remove-cell">
                      <IconButton
                        size="small"
                        disabled={!editable}
                        title={
                          isTemporary(staff.id)
                            ? "この勤務表から外す（臨時の人なので実体ごと消えます）"
                            : "この勤務表から外す（名簿はそのまま）"
                        }
                        onClick={() => onRemove(staff.id)}
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="e-add">
            <TextField
              variant="standard"
              size="small"
              label="臨時スタッフの名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <TextField
              variant="standard"
              size="small"
              label="部署"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={!editable || !name.trim()}
              onClick={handleAdd}
            >
              臨時で追加
            </Button>
          </div>
        </div>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  font-size: 0.9em;

  .e-cols {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  h4 {
    margin: 0 0 4px;
    font-size: 0.8em;
    font-weight: normal;
    color: #888;
  }

  .e-empty {
    padding: 8px;
    color: #888;
  }

  .e-name {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .e-editing {
    align-items: flex-end;

    .e-edit-name {
      width: 100px;
    }

    .e-edit-dept {
      width: 80px;
    }
  }

  .e-icon {
    color: #789;
  }

  .e-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .e-badge {
    font-size: 0.7em;
    padding: 0 4px;
    border-radius: 8px;
    background: #f3e5c0;
    color: #7a5c10;
    white-space: nowrap;
  }

  .e-dept {
    font-size: 0.75em;
    color: #888;
    white-space: nowrap;
  }

  /* ---- 左：名簿（焼き付け） ---- */
  .e-roster {
    flex: 0 0 auto;
    min-width: 132px;
    max-width: 180px;
    border-right: 1px solid #eee;
    padding-right: 8px;

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .e-roster-item {
      display: flex;
      align-items: center;
      gap: 2px;

      &.is-working {
        color: #aaa;

        .e-icon {
          color: #ccc;
        }
      }
    }

    .e-in {
      color: #7cb342;
      font-size: 0.8em;
      padding: 0 6px;
    }
  }

  /* ---- 右：メンバー ---- */
  .e-members {
    flex: 1 1 auto;
    min-width: 0;
  }

  .e-table {
    border-collapse: collapse;
    width: 100%;

    th,
    td {
      padding: 1px 2px;
      border-bottom: 1px solid #eee;
    }

    .e-th-shift {
      font-weight: normal;
      font-size: 0.72em;
      color: #666;
      line-height: 1.1;
      padding: 0 3px;
      white-space: nowrap;
    }

    .e-shift-name {
      display: block;
    }

    .e-shift-time {
      display: block;
      color: #aaa;
    }

    .e-th-name {
      text-align: left;
      font-weight: normal;
      font-size: 0.75em;
      color: #888;
    }

    .e-shift-cell,
    .e-handle-cell,
    .e-remove-cell,
    .e-add-shift-cell {
      text-align: center;
      width: 1%;
    }

    .e-th-shift .e-shift-edit-btn {
      font-size: 0.9rem;
      padding: 0;
      color: #bbb;
    }

    .e-th-shift:hover .e-shift-edit-btn {
      color: #789;
    }
  }

  .e-shift-edit {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    padding: 2px;

    .e-shift-hour {
      width: 48px;
    }

    .e-shift-edit-actions {
      display: flex;
      font-size: 0.9rem;
    }
  }

  .e-handle {
    display: inline-flex;
    color: #bbb;
    cursor: grab;
    font-size: 1rem;

    &:active {
      cursor: grabbing;
    }
  }

  .e-row {
    &.is-dragging {
      opacity: 0.4;
    }

    &.is-over {
      box-shadow: inset 0 2px 0 0 #42a5f5;
    }
  }

  .e-add {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
`;
