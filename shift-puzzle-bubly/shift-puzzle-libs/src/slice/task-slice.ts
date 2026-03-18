import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import { Task, type TaskState } from "@bublys-org/shift-puzzle-model";

export { Task };
export type { TaskState };

// ========== State ==========

type TaskSliceState = {
  taskList: TaskState[];
  selectedTaskId: string | null;
};

const initialState: TaskSliceState = {
  taskList: [],
  selectedTaskId: null,
};

// ========== Slice ==========

export const taskSlice = createSlice({
  name: "shiftPuzzleTask",
  initialState,
  reducers: {
    setTaskList: (state, action: PayloadAction<TaskState[]>) => {
      state.taskList = action.payload;
    },
    setSelectedTaskId: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
  },
});

export const { setTaskList, setSelectedTaskId } = taskSlice.actions;

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof taskSlice> {}
}

taskSlice.injectInto(rootReducer);

// ========== Selectors ==========

type StateWithTask = RootState & { shiftPuzzleTask: TaskSliceState };

const selectTaskListRaw = (state: StateWithTask) =>
  state.shiftPuzzleTask?.taskList ?? [];

/** タスク一覧を取得（ドメインオブジェクト） */
export const selectTaskList = createSelector(
  [selectTaskListRaw],
  (taskList): Task[] => taskList.map((t) => new Task(t))
);

/** 選択中のタスクIDを取得 */
export const selectSelectedTaskId = (state: StateWithTask): string | null =>
  state.shiftPuzzleTask?.selectedTaskId ?? null;

/** IDでタスクを取得（ドメインオブジェクト） */
export const selectTaskById = (id: string) =>
  createSelector(
    [
      (state: StateWithTask) =>
        (state.shiftPuzzleTask?.taskList ?? []).find((t) => t.id === id),
    ],
    (taskState): Task | undefined =>
      taskState ? new Task(taskState) : undefined
  );

/** 選択中のタスクを取得（ドメインオブジェクト） */
export const selectSelectedTask = createSelector(
  [
    (state: StateWithTask) => {
      const id = state.shiftPuzzleTask?.selectedTaskId;
      if (!id) return undefined;
      return (state.shiftPuzzleTask?.taskList ?? []).find((t) => t.id === id);
    },
  ],
  (taskState): Task | undefined =>
    taskState ? new Task(taskState) : undefined
);
