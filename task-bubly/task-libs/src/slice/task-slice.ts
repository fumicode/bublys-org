/**
 * タスクの**入れ物**（リポジトリ）。集約を保存して取り出すだけを持つ。
 *
 * ★ 前は `state-management` に同梱されていた。バブリが自分の slice を持つのが筋なので
 *   こちらへ移した ── `reducerPath` は `task` のまま（`persist:root` に貯まっている
 *   保存済みのタスクをそのまま引き継ぐため）。
 */
import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import { Task_タスク, type TaskJSON, type TaskStatus_ステータス } from "../domain/Task.domain.js";

// ========== State ==========

export type TaskState = {
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

// LazyLoadedSlices を拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof taskSlice> {}
}

// rootReducer に注入（副作用として実行）
taskSlice.injectInto(rootReducer);

/** この slice が注入された後の状態 */
type StateWithTask = RootState & { task: TaskState };

export const {
  setTaskList,
  addTask,
  updateTask,
  deleteTask,
  setSelectedTaskId,
  updateTaskStatus,
} = taskSlice.actions;

// ========== Selectors ==========

// 基本セレクター
const selectTaskListRaw = (state: StateWithTask) => state.task?.taskList ?? [];

/** タスク一覧を取得（ドメインオブジェクト） */
export const selectTaskList = createSelector(
  [selectTaskListRaw],
  (taskList): Task_タスク[] => taskList.map((json) => Task_タスク.fromJSON(json))
);

/** 選択中のタスクIDを取得 */
export const selectSelectedTaskId = (state: StateWithTask): string | null =>
  state.task.selectedTaskId;

/** IDでタスクを取得（ドメインオブジェクト） */
export const selectTaskById = (id: string) =>
  createSelector(
    [(state: StateWithTask) => state.task.taskList.find((t) => t.id === id)],
    (json): Task_タスク | undefined => {
      return json ? Task_タスク.fromJSON(json) : undefined;
    }
  );

/** ステータスでタスクを絞り込み（ドメインオブジェクト） */
export const selectTasksByStatus = (status: TaskStatus_ステータス) =>
  createSelector(
    [selectTaskListRaw],
    (taskList): Task_タスク[] =>
      taskList
        .filter((t) => t.status === status)
        .map((json) => Task_タスク.fromJSON(json))
  );

/** 選択中のタスクを取得（ドメインオブジェクト） */
export const selectSelectedTask = createSelector(
  [(state: StateWithTask) => {
    const id = state.task.selectedTaskId;
    if (!id) return undefined;
    return state.task.taskList.find((t) => t.id === id);
  }],
  (json): Task_タスク | undefined => {
    return json ? Task_タスク.fromJSON(json) : undefined;
  }
);

export { Task_タスク };
export type { TaskJSON, TaskStatus_ステータス };
