'use client';

/**
 * EntityListView — 現場/社員/機械などの一覧＋追加/リネーム/削除の汎用プレゼンテーショナル。
 *
 * Redux を直接触らず props で受け取る。name（主）と任意の sub（役割・種別など）を扱う。
 * sub は subOptions を渡すとセレクト、なければテキスト入力になる。
 */
import { FC, ReactNode, useState } from "react";
import styled from "styled-components";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  IconButton,
  MenuItem,
  TextField,
} from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";

export type EntityRow = {
  id: string;
  name: string;
  /** 役割・種別などの補足表示 */
  sub?: string;
  /**
   * ドラッグ元にするドメインオブジェクト（社員/機械など）。
   * 渡すと ObjectView でラップされ、配置表セルなどへドラッグできる。
   * 型・URL は登録済みレジストリ（registerObjects / registerObjectUrl）から解決される。
   */
  object?: unknown;
};

type EntityListViewProps = {
  title: string;
  icon?: ReactNode;
  rows: EntityRow[];
  emptyLabel: string;
  nameLabel: string;
  /** 補足フィールドのラベル（未指定なら補足入力を出さない） */
  subLabel?: string;
  /** 補足フィールドをセレクトにする場合の選択肢 */
  subOptions?: string[];
  onCreate: (name: string, sub: string) => void;
  onRename?: (id: string, name: string) => void;
  onRemove?: (id: string) => void;
};

export const EntityListView: FC<EntityListViewProps> = ({
  title,
  icon,
  rows,
  emptyLabel,
  nameLabel,
  subLabel,
  subOptions,
  onCreate,
  onRename,
  onRemove,
}) => {
  const [name, setName] = useState("");
  const [sub, setSub] = useState(subOptions?.[0] ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, sub.trim());
    setName("");
    setSub(subOptions?.[0] ?? "");
  };

  const startEdit = (row: EntityRow) => {
    setEditingId(row.id);
    setEditName(row.name);
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
      <div className="e-header">
        <h3>
          {icon}
          {title} ({rows.length})
        </h3>
      </div>

      <StyledList>
        {rows.length === 0 ? (
          <li className="e-empty">{emptyLabel}</li>
        ) : (
          rows.map((row) =>
            editingId === row.id ? (
              <li key={row.id} className="e-item e-editing">
                <TextField
                  className="e-edit-input"
                  variant="standard"
                  size="small"
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(row.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <IconButton size="small" aria-label="保存" onClick={() => commitEdit(row.id)} disabled={!editName.trim()}>
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="キャンセル" onClick={cancelEdit}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </li>
            ) : (
              <li key={row.id} className="e-item">
                {row.object !== undefined ? (
                  <ObjectView object={row.object} label={row.name} draggable fullWidth>
                    <div className="e-content e-draggable">
                      <div className="e-name">{row.name}</div>
                      {row.sub && <div className="e-sub">{row.sub}</div>}
                    </div>
                  </ObjectView>
                ) : (
                  <div className="e-content">
                    <div className="e-name">{row.name}</div>
                    {row.sub && <div className="e-sub">{row.sub}</div>}
                  </div>
                )}
                {onRename && (
                  <IconButton className="e-edit" size="small" aria-label="編集" onClick={() => startEdit(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {onRemove && (
                  <IconButton className="e-remove" size="small" aria-label="削除" onClick={() => onRemove(row.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </li>
            )
          )
        )}
      </StyledList>

      <div className="e-create">
        <TextField
          className="e-name-input"
          variant="standard"
          size="small"
          label={nameLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        {subLabel &&
          (subOptions ? (
            <TextField
              className="e-sub-input"
              variant="standard"
              size="small"
              select
              label={subLabel}
              value={sub}
              onChange={(e) => setSub(e.target.value)}
            >
              {subOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              className="e-sub-input"
              variant="standard"
              size="small"
              label={subLabel}
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          ))}
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleCreate} disabled={!name.trim()}>
          追加
        </Button>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  min-width: 260px;

  .e-header h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 4px;
  }

  .e-create {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #eee;

    .e-name-input {
      flex: 2;
    }
    .e-sub-input {
      flex: 1;
      min-width: 96px;
    }
  }
`;

const StyledList = styled.ul`
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

    &:hover {
      background-color: #f5f5f5;
    }
    &:last-child {
      border-bottom: none;
    }

    /* ObjectView / .e-content いずれが先頭でも行いっぱいに広げる */
    > *:first-child {
      flex: 1;
      min-width: 0;
    }

    .e-content {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .e-draggable {
      cursor: grab;
    }
    .e-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .e-sub {
      font-size: 0.78em;
      color: #3949ab;
    }
    .e-edit {
      color: #b0b0b0;
      &:hover { color: #1976d2; }
    }
    .e-remove {
      color: #b0b0b0;
      &:hover { color: #d32f2f; }
    }
    &.e-editing .e-edit-input {
      flex: 1;
      min-width: 0;
    }
  }
`;
