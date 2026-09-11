'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { Button, IconButton, TextField } from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { Staff } from "../domain/index.js";

type WorkingStaffListViewProps = {
  /** この勤務表で働く人たち（並び順のまま＝勤務表の行順） */
  members: Staff[];
  /** その人がこの勤務表の中だけで足した臨時の人か */
  isTemporary: (staffId: string) => boolean;
  /** 名簿には居るが、この勤務表では働かない人たち（戻せる候補） */
  absentRoster: Staff[];
  /** 状態が揃うまでは編集させない（読めないだけのものを作り直さないため） */
  editable?: boolean;
  /** この勤務表の中だけの臨時スタッフを足す */
  onAddTemporary: (name: string, department: string) => void;
  /** 名簿の人をこの勤務表に戻す */
  onAddFromRoster: (staffId: string) => void;
  /** この勤務表から外す */
  onRemove: (staffId: string) => void;
  /** 行の並びを変える */
  onMove: (staffId: string, toIndex: number) => void;
  /** 臨時の人の名前を変える */
  onRenameTemporary: (staffId: string, name: string) => void;
};

/**
 * 勤務スタッフ群（この勤務表で働く人たち）の一覧。
 *
 * 名簿から来た人と臨時の人を**見た目で区別する**。名簿の人は実体が名簿側にあるので
 * ここからは名前を直せない（ダブルクリックでスタッフ詳細が開く）。臨時の人は実体が
 * この群の中にしか無いので、ここで直す。
 */
export const WorkingStaffListView: FC<WorkingStaffListViewProps> = ({
  members,
  isTemporary,
  absentRoster,
  editable = true,
  onAddTemporary,
  onAddFromRoster,
  onRemove,
  onMove,
  onRenameTemporary,
}) => {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const commitEdit = (id: string) => {
    const trimmed = editName.trim();
    if (trimmed) onRenameTemporary(id, trimmed);
    cancelEdit();
  };

  return (
    <StyledContainer>
      <ol className="e-members">
        {members.length === 0 ? (
          <li className="e-empty">この勤務表で働く人がいません</li>
        ) : (
          members.map((staff, index) => (
            <li key={staff.id} className="e-member">
              <span className="e-order">
                <IconButton
                  size="small"
                  disabled={!editable || index === 0}
                  title="1つ上へ"
                  onClick={() => onMove(staff.id, index - 1)}
                >
                  <ArrowUpwardIcon fontSize="inherit" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={!editable || index === members.length - 1}
                  title="1つ下へ"
                  onClick={() => onMove(staff.id, index + 1)}
                >
                  <ArrowDownwardIcon fontSize="inherit" />
                </IconButton>
              </span>

              {isTemporary(staff.id) ? (
                editingId === staff.id ? (
                  <span className="e-name e-editing">
                    <TextField
                      variant="standard"
                      size="small"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(staff.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <IconButton size="small" title="確定" onClick={() => commitEdit(staff.id)}>
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
                    <span className="e-badge" title="この勤務表の中だけで足した人。名簿には載っていません">
                      臨時
                    </span>
                    {staff.department && <span className="e-dept">{staff.department}</span>}
                    <IconButton
                      size="small"
                      disabled={!editable}
                      title="名前を変える"
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
                  <span className="e-name" title="ダブルクリックでスタッフ詳細を開く">
                    <PersonIcon fontSize="small" className="e-icon" />
                    <span className="e-label">{staff.name}</span>
                    {staff.department && <span className="e-dept">{staff.department}</span>}
                  </span>
                </ObjectView>
              )}

              <IconButton
                size="small"
                className="e-remove"
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
            </li>
          ))
        )}
      </ol>

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

      {absentRoster.length > 0 && (
        <div className="e-absent">
          <h4>この勤務表では働かない人（名簿より）</h4>
          <ul>
            {absentRoster.map((staff) => (
              <li key={staff.id}>
                <span className="e-label">{staff.name}</span>
                {staff.department && <span className="e-dept">{staff.department}</span>}
                <IconButton
                  size="small"
                  disabled={!editable}
                  title="この勤務表に戻す"
                  onClick={() => onAddFromRoster(staff.id)}
                >
                  <AddIcon fontSize="inherit" />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  font-size: 0.9em;

  .e-members {
    list-style: none;
    margin: 0;
    padding: 0;
    counter-reset: member;
  }

  .e-empty {
    padding: 8px;
    color: #888;
  }

  .e-member {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    border-bottom: 1px solid #eee;

    .e-order {
      display: flex;
      flex-direction: column;
      line-height: 0.6;

      button {
        padding: 0;
        font-size: 0.8rem;
      }
    }

    .e-name {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .e-icon {
      color: #789;
    }

    .e-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .e-remove {
      margin-left: auto;
    }
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

  .e-add {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .e-absent {
    margin-top: 12px;

    h4 {
      margin: 0 0 4px;
      font-size: 0.8em;
      font-weight: normal;
      color: #888;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #666;
    }
  }
`;
