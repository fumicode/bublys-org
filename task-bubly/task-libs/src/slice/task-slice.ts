/**
 * タスクの**入れ物**（リポジトリ）。集約を保存して取り出すだけを持つ。
 *
 * ★ 前は `state-management` に同梱されていた。バブリが自分の slice を持つのが筋なので
 *   こちらへ移した ── `reducerPath` は `task` のまま（`persist:root` に貯まっている
 *   保存済みのタスクをそのまま引き継ぐため）。
 */
import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
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
    /**
     * ★ **集約を丸ごと置く（保存だけ）。**
     *   前はここに `updateTaskStatus` があり、reducer の中で `task.status = …` と
     *   集約のロジックを書き、さらに `new Date()` で時刻まで読んでいた
     *   ── **同じ入力で違う結果になる reducer** は、やり直し（世界線）と正面から喧嘩する。
     *   ステータスを変えるのは集約（`Task_タスク.withStatus`）、ここは置くだけ。
     */
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
  },
});

// LazyLoadedSlices を拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof taskSlice> {}
}

// 注入（副作用として実行）。口は 1 つ ── `injectSlice` を通す
injectSlice(taskSlice);

/** この slice が注入された後の状態 */
type StateWithTask = RootState & { task: TaskState };

export const {
  setTaskList,
  addTask,
  updateTask,
  deleteTask,
  setSelectedTaskId,
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
