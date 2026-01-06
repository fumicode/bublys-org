'use client';

import { FC, useEffect } from "react";
import {
  useAppDispatch,
  useAppSelector,
  selectTaskList,
  selectSelectedTaskId,
  setTaskList,
  setSelectedTaskId,
  addTask,
  TaskJSON,
} from "@bublys-org/state-management";
import { TaskListView } from "../ui/TaskListView";
import { Button, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import styled from "styled-components";

type TaskCollectionProps = {
  onTaskSelect?: (taskId: string) => void;
};

const buildDetailUrl = (taskId: string) => `task-management/tasks/${taskId}`;

// サンプルデータ生成
const createSampleTasks = (): TaskJSON[] => {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      title: "プロジェクト計画書の作成",
      description: "来月のプロジェクト計画書を作成する",
      status: "todo",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "コードレビュー",
      description: "PRのレビューを完了させる",
      status: "doing",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "ミーティング資料準備",
      description: "",
      status: "done",
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const TaskCollection: FC<TaskCollectionProps> = ({ onTaskSelect }) => {
  const dispatch = useAppDispatch();
  const taskList = useAppSelector(selectTaskList);
  const selectedTaskId = useAppSelector(selectSelectedTaskId);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // 初期データのロード
  useEffect(() => {
    if (taskList.length === 0) {
      dispatch(setTaskList(createSampleTasks()));
    }
  }, [dispatch, taskList.length]);

  const handleTaskClick = (taskId: string) => {
    dispatch(setSelectedTaskId(taskId));
    onTaskSelect?.(taskId);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const now = new Date().toISOString();
    const newTask: TaskJSON = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      description: "",
      status: "todo",
      createdAt: now,
      updatedAt: now,
    };
    dispatch(addTask(newTask));
    setNewTaskTitle("");
  };

  return (
    <StyledContainer>
      <h3>タスク一覧 ({taskList.length}件)</h3>
      <div className="e-add-form">
        <TextField
          size="small"
          placeholder="新しいタスク..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          fullWidth
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddTask}
          disabled={!newTaskTitle.trim()}
        >
          追加
        </Button>
      </div>
      <TaskListView
        taskList={taskList}
        selectedTaskId={selectedTaskId}
        buildDetailUrl={buildDetailUrl}
        onTaskClick={handleTaskClick}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;

  h3 {
    margin: 0 0 12px 0;
    font-size: 1em;
  }

  .e-add-form {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
`;
