import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

// ========== 型定義（ドメインモデルと同期） ==========

/** タスクのステータス */
export type TaskStatus_ステータス = 'todo' | 'doing' | 'done';

/** Redux/JSON用のシリアライズ型 */
export type TaskJSON = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus_ステータス;
  createdAt: string;
  updatedAt: string;
};

// ========== ドメインクラス ==========

export class Task_タスク {
  constructor(readonly state: TaskJSON) {}

  get id(): string { return this.state.id; }
  get title(): string { return this.state.title; }
  get description(): string { return this.state.description; }
  get status(): TaskStatus_ステータス { return this.state.status; }
  get createdAt(): string { return this.state.createdAt; }
  get updatedAt(): string { return this.state.updatedAt; }

  isDone(): boolean { return this.state.status === 'done'; }
  isInProgress(): boolean { return this.state.status === 'doing'; }

  /** 作業を開始する */
  start(): Task_タスク {
    return this.withUpdatedState({ status: 'doing' });
  }

  /** 完了する */
  complete(): Task_タスク {
    return this.withUpdatedState({ status: 'done' });
  }

  /** 未完了に戻す */
  reopen(): Task_タスク {
    return this.withUpdatedState({ status: 'todo' });
  }

  /** タイトルを更新 */
  withTitle(title: string): Task_タスク {
    return this.withUpdatedState({ title });
  }

  /** 説明を更新 */
  withDescription(description: string): Task_タスク {
    return this.withUpdatedState({ description });
  }

  /** 内部用：状態更新ヘルパー */
  protected withUpdatedState(partial: Partial<TaskJSON>): Task_タスク {
    return new Task_タスク({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): TaskJSON { return { ...this.state }; }

  static fromJSON(json: TaskJSON): Task_タスク {
    return new Task_タスク(json);
  }

  static getStatusLabel(status: TaskStatus_ステータス): string {
    const labels: Record<TaskStatus_ステータス, string> = {
      todo: '未着手',
      doing: '進行中',
      done: '完了',
    };
    return labels[status];
  }

  static getStatusColor(status: TaskStatus_ステータス): string {
    const colors: Record<TaskStatus_ステータス, string> = {
      todo: '#666',
      doing: '#1976d2',
      done: '#2e7d32',
    };
    return colors[status];
  }
}

// ========== State ==========

type TaskState = {
  taskList: TaskJSON[];
  selectedTaskId: string | null;
};

const initialState: TaskState = {
  taskList: [],
  selectedTaskId: null,
};

// ========== Slice ==========

export const taskSlice = createSlice({
  name: "task",
  initialState,
  reducers: {
    setTaskList: (state, action: PayloadAction<TaskJSON[]>) => {
      state.taskList = action.payload;
    },
    addTask: (state, action: PayloadAction<TaskJSON>) => {
      state.taskList.push(action.payload);
    },
    updateTask: (state, action: PayloadAction<TaskJSON>) => {
      const index = state.taskList.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.taskList[index] = action.payload;
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.taskList = state.taskList.filter((t) => t.id !== action.payload);
    },
    setSelectedTaskId: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
    updateTaskStatus: (
      state,
      action: PayloadAction<{ id: string; status: TaskStatus_ステータス }>
    ) => {
      const task = state.taskList.find((t) => t.id === action.payload.id);
      if (task) {
        task.status = action.payload.status;
        task.updatedAt = new Date().toISOString();
      }
    },
  },
});

export const {
  setTaskList,
  addTask,
  updateTask,
  deleteTask,
  setSelectedTaskId,
  updateTaskStatus,
} = taskSlice.actions;

// ========== Selectors ==========

/** タスク一覧を取得（ドメインオブジェクト） */
export const selectTaskList = (state: RootState): Task_タスク[] =>
  state.task.taskList.map((json) => Task_タスク.fromJSON(json));

/** 選択中のタスクIDを取得 */
export const selectSelectedTaskId = (state: RootState): string | null =>
  state.task.selectedTaskId;

/** IDでタスクを取得（ドメインオブジェクト） */
export const selectTaskById = (id: string) => (state: RootState): Task_タスク | undefined => {
  const json = state.task.taskList.find((t) => t.id === id);
  return json ? Task_タスク.fromJSON(json) : undefined;
};

/** ステータスでタスクを絞り込み（ドメインオブジェクト） */
export const selectTasksByStatus = (status: TaskStatus_ステータス) => (state: RootState): Task_タスク[] =>
  state.task.taskList
    .filter((t) => t.status === status)
    .map((json) => Task_タスク.fromJSON(json));

/** 選択中のタスクを取得（ドメインオブジェクト） */
export const selectSelectedTask = (state: RootState): Task_タスク | undefined => {
  const id = state.task.selectedTaskId;
  if (!id) return undefined;
  const json = state.task.taskList.find((t) => t.id === id);
  return json ? Task_タスク.fromJSON(json) : undefined;
};
