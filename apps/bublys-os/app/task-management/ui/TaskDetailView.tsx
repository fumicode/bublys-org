'use client';

import { FC, useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { Task_タスク, TaskStatus_ステータス } from "@bublys-org/state-management";
import { UserState } from "@bublys-org/users-libs";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonIcon from "@mui/icons-material/Person";
import { Button, Select, MenuItem, FormControl } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckIcon from "@mui/icons-material/Check";
import ReplayIcon from "@mui/icons-material/Replay";
import { EditableText } from "@/lib/EditableText";
import EditIcon from "@mui/icons-material/Edit";
import { UrledPlace } from "../../bubble-ui/components";
import { getDragType, parseDragPayload, extractIdFromUrl } from "@bublys-org/bubbles-ui";

type TaskDetailViewProps = {
  task: Task_タスク;
  users?: UserState[];
  onStatusChange?: (status: TaskStatus_ステータス) => void;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onAssigneeChange?: (assigneeId: string | undefined) => void;
  buildUserDetailUrl?: (userId: string) => string;
  onUserClick?: (userId: string) => void;
};

export const TaskDetailView: FC<TaskDetailViewProps> = ({
  task,
  users = [],
  onStatusChange,
  onTitleChange,
  onDescriptionChange,
  onAssigneeChange,
  buildUserDetailUrl,
  onUserClick,
}) => {
  const assignee = users.find(u => u.id === task.assigneeId);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!onAssigneeChange) return;
    // Check if drag contains user type (can only check types during dragover, not data)
    const types = Array.from(e.dataTransfer.types);
    if (!types.includes(getDragType('User'))) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    const payload = parseDragPayload(e, { acceptTypes: [getDragType('User')] });
    const url = payload?.url || e.dataTransfer.getData(getDragType('User'));
    const userId = url ? extractIdFromUrl(url) : undefined;
    if (!userId) return;
    e.preventDefault();
    onAssigneeChange?.(userId);
  };

  return (
    <StyledTaskDetail>
      <div className="e-header">
        <AssignmentIcon className="e-icon" />
        <div className="e-title">
          <h3 className="e-name">
            <EditableText
              value={task.title}
              onSave={(newTitle) => onTitleChange?.(newTitle)}
            />
          </h3>
          <StatusBadge status={task.status} />
        </div>
      </div>

      <section
        className={`e-section e-assignee-section ${isDragOver ? "is-drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h4>担当者 {isDragOver && <span className="e-drop-hint">ここにドロップ</span>}</h4>
        <div className="e-assignee">
          {assignee && buildUserDetailUrl ? (
            <UrledPlace url={buildUserDetailUrl(assignee.id)}>
              <Button
                variant="text"
                size="small"
                startIcon={<PersonIcon />}
                onClick={() => onUserClick?.(assignee.id)}
                className="e-assignee-link"
              >
                {assignee.name}
              </Button>
            </UrledPlace>
          ) : assignee ? (
            <span className="e-assignee-name">
              <PersonIcon fontSize="small" /> {assignee.name}
            </span>
          ) : null}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={task.assigneeId || ""}
              onChange={(e) => onAssigneeChange?.(e.target.value || undefined)}
              displayEmpty
              size="small"
            >
              <MenuItem value="">
                <em>未割当</em>
              </MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </section>

      <section className="e-section">
        <h4>説明</h4>
        <EditableDescription
          value={task.description}
          onSave={(newDesc) => onDescriptionChange?.(newDesc)}
        />
      </section>

      <section className="e-section">
        <h4>ステータス操作</h4>
        <div className="e-actions">
          {task.status === 'todo' && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={() => onStatusChange?.('doing')}
            >
              作業開始
            </Button>
          )}
          {task.status === 'doing' && (
            <>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<CheckIcon />}
                onClick={() => onStatusChange?.('done')}
              >
                完了
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ReplayIcon />}
                onClick={() => onStatusChange?.('todo')}
              >
                未着手に戻す
              </Button>
            </>
          )}
          {task.status === 'done' && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ReplayIcon />}
              onClick={() => onStatusChange?.('todo')}
            >
              再オープン
            </Button>
          )}
        </div>
      </section>

      <section className="e-section e-meta">
        <h4>情報</h4>
        <dl className="e-dl">
          <dt>作成日時</dt>
          <dd>{formatDate(task.createdAt)}</dd>
          <dt>更新日時</dt>
          <dd>{formatDate(task.updatedAt)}</dd>
        </dl>
      </section>
    </StyledTaskDetail>
  );
};

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP');
};

const StatusBadge: FC<{ status: TaskStatus_ステータス }> = ({ status }) => {
  const label = Task_タスク.getStatusLabel(status);
  return <span className={`e-badge e-badge--${status}`}>{label}</span>;
};

// 説明編集コンポーネント
type EditableDescriptionProps = {
  value: string;
  onSave: (newValue: string) => void;
};

const EditableDescription: FC<EditableDescriptionProps> = ({ value, onSave }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditingValue(value);
  }, [value]);

  const handleStartEdit = () => {
    setEditingValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editingValue.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    // Ctrl+Enter or Cmd+Enter で保存
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className="e-description-edit">
        <textarea
          ref={textareaRef}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="説明を入力..."
        />
        <div className="e-edit-hint">Ctrl+Enter で保存、Esc でキャンセル</div>
      </div>
    );
  }

  return (
    <div
      className="e-description"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleStartEdit}
      style={{ cursor: "pointer" }}
    >
      {value || <span className="e-placeholder">クリックして説明を追加...</span>}
      <EditIcon
        fontSize="small"
        style={{
          marginLeft: 6,
          opacity: isHovering ? 1 : 0,
          transition: "opacity 0.2s",
          color: "#666",
          verticalAlign: "middle",
        }}
      />
    </div>
  );
};

const StyledTaskDetail = styled.div`
  padding: 16px;

  .e-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
  }

  .e-icon {
    font-size: 48px;
    color: #666;
  }

  .e-title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .e-name {
    margin: 0;
    font-size: 1.25em;
  }

  .e-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.85em;
    font-weight: bold;

    &.e-badge--todo {
      background-color: #f5f5f5;
      color: #666;
    }

    &.e-badge--doing {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    &.e-badge--done {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
  }

  .e-section {
    margin-bottom: 16px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #666;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
  }

  .e-assignee-section {
    border-radius: 8px;
    padding: 12px;
    margin: -12px;
    margin-bottom: 4px;
    transition: background-color 0.2s, border-color 0.2s;
    border: 2px dashed transparent;

    &.is-drag-over {
      background-color: #e3f2fd;
      border-color: #1976d2;
    }

    .e-drop-hint {
      font-size: 0.85em;
      color: #1976d2;
      font-weight: normal;
    }
  }

  .e-assignee {
    display: flex;
    align-items: center;
    gap: 12px;

    .e-assignee-link {
      text-transform: none;
    }

    .e-assignee-name {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #333;
    }
  }

  .e-description {
    margin: 0;
    white-space: pre-wrap;
    color: #333;
    min-height: 1.5em;

    .e-placeholder {
      color: #999;
      font-style: italic;
    }
  }

  .e-description-edit {
    textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: inherit;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;

      &:focus {
        outline: none;
        border-color: #1976d2;
      }
    }

    .e-edit-hint {
      font-size: 0.75em;
      color: #999;
      margin-top: 4px;
    }
  }

  .e-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .e-dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0;

    dt {
      color: #666;
      font-size: 0.9em;
    }

    dd {
      margin: 0;
    }
  }
`;
