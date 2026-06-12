import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import { WorkShift, type WorkShiftState } from "@bublys-org/hotel-shift-puzzle-model";

export { WorkShift };
export type { WorkShiftState };

// ========== State ==========
// WorkShift（勤務帯）は独立した集約。勤務表は勤務帯を ID で参照する。

type WorkShiftSliceState = {
  workShiftList: WorkShiftState[];
};

const initialState: WorkShiftSliceState = {
  workShiftList: [],
};

// ========== Slice ==========

export const workShiftSlice = createSlice({
  name: "hotelShiftPuzzleWorkShift",
  initialState,
  reducers: {
    setWorkShiftList: (state, action: PayloadAction<WorkShiftState[]>) => {
      state.workShiftList = action.payload;
    },
  },
});

export const { setWorkShiftList } = workShiftSlice.actions;

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof workShiftSlice> {}
}

workShiftSlice.injectInto(rootReducer);

// ========== Selectors ==========

type StateWithWorkShift = RootState & { hotelShiftPuzzleWorkShift: WorkShiftSliceState };

const selectWorkShiftListRaw = (state: StateWithWorkShift) =>
  state.hotelShiftPuzzleWorkShift?.workShiftList ?? [];

/** 勤務帯一覧（ドメインオブジェクト） */
export const selectWorkShiftList = createSelector(
  [selectWorkShiftListRaw],
  (list): WorkShift[] => list.map((w) => new WorkShift(w))
);

/** IDで勤務帯を取得（ドメインオブジェクト） */
export const selectWorkShiftById = (id: string) =>
  createSelector([selectWorkShiftListRaw], (list): WorkShift | undefined => {
    const found = list.find((w) => w.id === id);
    return found ? new WorkShift(found) : undefined;
  });
