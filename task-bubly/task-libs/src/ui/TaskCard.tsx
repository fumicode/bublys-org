'use client';
/**
 * タスク 1 件の札 ── **一覧の中で 1 つの泡になる**中身。
 *
 * 前は巻物（スクロールする行の一覧）の中の行だった。泡にすると、並べ方の道具が
 * そのまま効く（縦に並べる／奥行きに重ねる）し、掴んで外へ出すこともできる。
 * 描くものは行のときと同じ ── 見出し・説明・ステータス。
 */
import { FC } from "react";
import styled from "styled-components";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { ObjectView } from "@bublys-org/bubbles-ui";
import {
  useAppSelector,
} from "@bublys-org/state-management";
import { Task_タスク, TaskStatus_ステータス } from "../domain/Task.domain.js";
import { selectTaskList } from "../slice/task-slice.js";

export const TaskCard: FC<{ taskId: string }> = ({ taskId }) => {
  const task = useAppSelector(selectTaskList).find((t) => t.id === taskId);
  if (!task) return <StyledCard>このタスクは見つかりませんでした。</StyledCard>;

  return (
    <StyledCard>
      {/* ダブルクリックで開く（開く先は**外の海**）／ドラッグでポケットや岸へ */}
      {/* ★ `openingPosition` は「開いてよい」の合図として要る（旧 ObjectView の決まり）。
          どこに置くかは新しい模型では親の View が決めるので、値そのものは使われない */}
      <ObjectView
        type="Task"
        url={`task-management/tasks/${taskId}`}
        label={task.title}
        openingPosition="bubble-side-right"
        draggable
        fullWidth
      >
        <div className="e-content">
          <AssignmentIcon fontSize="small" className="e-icon" />
          <div className="e-text">
            <div className="e-title">{task.title}</div>
            {task.description && <div className="e-description">{task.description}</div>}
          </div>
          <span className={`e-badge e-badge--${task.status}`}>
            {Task_タスク.getStatusLabel(task.status as TaskStatus_ステータス)}
          </span>
        </div>
      </ObjectView>
    </StyledCard>
  );
};

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 8px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-content {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }
  .e-icon { color: #666; }
  .e-text { flex: 1; min-width: 0; }
  .e-title { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .e-description { color: #666; font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .e-badge {
    flex-shrink: 0;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: bold;

    &.e-badge--todo { background-color: #f5f5f5; color: #666; }
    &.e-badge--doing { background-color: #e3f2fd; color: #1976d2; }
    &.e-badge--done { background-color: #e8f5e9; color: #2e7d32; }
  }
`;
