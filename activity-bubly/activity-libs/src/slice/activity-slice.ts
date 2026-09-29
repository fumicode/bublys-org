/**
 * アクティビティの**入れ物**（リポジトリ）。集約を保存して取り出すだけを持つ。
 */
import { createSelector, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
import { Activity_アクティビティ, type ActivityPlain } from "../domain/Activity.domain.js";

export type ActivityState = {
  activityList: ActivityPlain[];
};

const initialState: ActivityState = { activityList: [] };

export const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {
    setActivityList: (state, action: PayloadAction<ActivityPlain[]>) => {
      state.activityList = action.payload;
    },
    addActivity: (state, action: PayloadAction<ActivityPlain>) => {
      state.activityList.push(action.payload);
    },
    /** 集約を丸ごと置く（保存だけ） */
    updateActivity: (state, action: PayloadAction<ActivityPlain>) => {
      const i = state.activityList.findIndex((a) => a.id === action.payload.id);
      if (i !== -1) state.activityList[i] = action.payload;
    },
    removeActivity: (state, action: PayloadAction<string>) => {
      state.activityList = state.activityList.filter((a) => a.id !== action.payload);
    },
  },
});

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof activitySlice> {}
}

injectSlice(activitySlice);

type StateWithActivity = RootState & { activity: ActivityState };

export const { setActivityList, addActivity, updateActivity, removeActivity } = activitySlice.actions;

const selectActivityListRaw = (state: StateWithActivity): ActivityPlain[] =>
  state.activity?.activityList ?? [];

export const selectActivities = createSelector(
  [selectActivityListRaw],
  (list): Activity_アクティビティ[] => list.map(Activity_アクティビティ.fromPlain),
);

export const selectActivityById = (id: string) =>
  createSelector([selectActivityListRaw], (list): Activity_アクティビティ | undefined => {
    const plain = list.find((a) => a.id === id);
    return plain ? Activity_アクティビティ.fromPlain(plain) : undefined;
  });

export { Activity_アクティビティ };
export type { ActivityPlain };
