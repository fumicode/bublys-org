import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import {
  MonthlyStaffSchedule,
  type MonthlyStaffSchedulePlain,
} from "@bublys-org/hotel-shift-puzzle-model";

export { MonthlyStaffSchedule };
export type { MonthlyStaffSchedulePlain };

// ========== State ==========
// Redux には plain（MonthlyStaffSchedulePlain）で保持し、
// セレクタで MonthlyStaffSchedule インスタンスへ復元する。

type ScheduleSliceState = {
  scheduleList: MonthlyStaffSchedulePlain[];
  currentScheduleId: string | null;
};

const initialState: ScheduleSliceState = {
  scheduleList: [],
  currentScheduleId: null,
};

// ========== Slice ==========

export const scheduleSlice = createSlice({
  name: "hotelShiftPuzzleSchedule",
  initialState,
  reducers: {
    setScheduleList: (state, action: PayloadAction<MonthlyStaffSchedulePlain[]>) => {
      state.scheduleList = action.payload;
    },
    setCurrentScheduleId: (state, action: PayloadAction<string | null>) => {
      state.currentScheduleId = action.payload;
    },
  },
});

export const { setScheduleList, setCurrentScheduleId } = scheduleSlice.actions;

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof scheduleSlice> {}
}

scheduleSlice.injectInto(rootReducer);

// ========== Selectors ==========

type StateWithSchedule = RootState & { hotelShiftPuzzleSchedule: ScheduleSliceState };

const selectScheduleListRaw = (state: StateWithSchedule) =>
  state.hotelShiftPuzzleSchedule?.scheduleList ?? [];

/** 勤務表一覧（ドメインオブジェクト） */
export const selectScheduleList = createSelector(
  [selectScheduleListRaw],
  (list): MonthlyStaffSchedule[] => list.map((p) => MonthlyStaffSchedule.fromPlain(p))
);

/** IDで勤務表を取得（ドメインオブジェクト） */
export const selectScheduleById = (id: string) =>
  createSelector([selectScheduleListRaw], (list): MonthlyStaffSchedule | undefined => {
    const plain = list.find((p) => p.id === id);
    return plain ? MonthlyStaffSchedule.fromPlain(plain) : undefined;
  });
