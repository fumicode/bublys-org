'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import { Staff } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { Button, IconButton, TextField } from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";

type StaffListViewProps = {
  staffList: Staff[];
  onCreate: (name: string) => void;
  /** スタッフ名を変更する */
  onRename?: (id: string, name: string) => void;
  /** スタッフを削除する */
  onRemove?: (id: string) => void;
};

export const StaffListView: FC<StaffListViewProps> = ({
  staffList,
  onCreate,
  onRename,
  onRemove,
}) => {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
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
    if (trimmed) onRename?.(id, trimmed);
    cancelEdit();
  };

  return (
    <StyledContainer>
      <StyledStaffList>
        {staffList.length === 0 ? (
          <li className="e-empty">スタッフがいません</li>
        ) : (
          staffList.map((staff) =>
            editingId === staff.id ? (
              <li key={staff.id} className="e-item e-editing">
                <TextField
                  className="e-edit-input"
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
                <IconButton
                  className="e-confirm"
                  size="small"
                  aria-label="保存"
                  onClick={() => commitEdit(staff.id)}
                  disabled={!editName.trim()}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton
                  className="e-cancel"
                  size="small"
                  aria-label="キャンセル"
                  onClick={cancelEdit}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </li>
            ) : (
              <li key={staff.id} className="e-item">
                {/* ObjectView: ダブルクリックで詳細バブルを開く / ドラッグでポケットへ */}
                <ObjectView
                  object={staff}
                  label={staff.name}
                  draggable={true}
                  openingPosition="left-side"
                  fullWidth={true}
                >
                  <div className="e-content">
                    <PersonIcon fontSize="small" className="e-avatar" />
                    <div className="e-name">{staff.name}</div>
                  </div>
                </ObjectView>
                {onRename && (
                  <IconButton
                    className="e-edit"
                    size="small"
                    aria-label="編集"
                    onClick={() => startEdit(staff)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {onRemove && (
                  <IconButton
                    className="e-remove"
                    size="small"
                    aria-label="削除"
                    onClick={() => onRemove(staff.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </li>
            )
          )
        )}
      </StyledStaffList>

      <div className="e-create">
        <TextField
          className="e-name-input"
          variant="standard"
          size="small"
          label="スタッフ名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          追加
        </Button>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-create {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #eee;

    .e-name-input {
      flex: 1;
    }
  }
`;

const StyledStaffList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;

  > .e-empty {
    padding: 16px;
    text-align: center;
    color: #666;
  }

  > .e-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    transition: background-color 0.15s;

    &:hover {
      background-color: #f5f5f5;
    }

    &:last-child {
      border-bottom: none;
    }

    /* ObjectView を行いっぱいに広げ、ボタンを右端へ寄せる */
    > *:first-child {
      flex: 1;
      min-width: 0;
    }

    .e-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }

    .e-avatar {
      color: #666;
      flex-shrink: 0;
    }

    .e-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .e-edit {
      color: #b0b0b0;
      flex-shrink: 0;

      &:hover {
        color: #1976d2;
      }
    }

    .e-remove {
      color: #b0b0b0;
      flex-shrink: 0;

      &:hover {
        color: #d32f2f;
      }
    }

    &.e-editing .e-edit-input {
      flex: 1;
      min-width: 0;
    }

    .e-confirm {
      color: #2e7d32;
      flex-shrink: 0;
    }

    .e-cancel {
      color: #999;
      flex-shrink: 0;
    }
  }
`;
