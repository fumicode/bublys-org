import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import { Staff, type StaffState } from "@bublys-org/hotel-shift-puzzle-model";

export { Staff };
export type { StaffState };

// ========== State ==========

type StaffSliceState = {
  staffList: StaffState[];
  selectedStaffId: string | null;
};

const initialState: StaffSliceState = {
  staffList: [],
  selectedStaffId: null,
};

// ========== Slice ==========

export const staffSlice = createSlice({
  name: "hotelShiftPuzzleStaff",
  initialState,
  reducers: {
    setStaffList: (state, action: PayloadAction<StaffState[]>) => {
      state.staffList = action.payload;
    },
    setSelectedStaffId: (state, action: PayloadAction<string | null>) => {
      state.selectedStaffId = action.payload;
    },
  },
});

export const { setStaffList, setSelectedStaffId } = staffSlice.actions;

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof staffSlice> {}
}

staffSlice.injectInto(rootReducer);

// ========== Selectors ==========

type StateWithStaff = RootState & { hotelShiftPuzzleStaff: StaffSliceState };

const selectStaffListRaw = (state: StateWithStaff) =>
  state.hotelShiftPuzzleStaff?.staffList ?? [];

/** スタッフ一覧を取得（ドメインオブジェクト） */
export const selectStaffList = createSelector(
  [selectStaffListRaw],
  (staffList): Staff[] => staffList.map((s) => new Staff(s))
);

/** 選択中のスタッフIDを取得 */
export const selectSelectedStaffId = (state: StateWithStaff): string | null =>
  state.hotelShiftPuzzleStaff?.selectedStaffId ?? null;

/** IDでスタッフを取得（ドメインオブジェクト） */
export const selectStaffById = (id: string) =>
  createSelector(
    [
      (state: StateWithStaff) =>
        (state.hotelShiftPuzzleStaff?.staffList ?? []).find((s) => s.id === id),
    ],
    (staffState): Staff | undefined =>
      staffState ? new Staff(staffState) : undefined
  );

/** 選択中のスタッフを取得（ドメインオブジェクト） */
export const selectSelectedStaff = createSelector(
  [
    (state: StateWithStaff) => {
      const id = state.hotelShiftPuzzleStaff?.selectedStaffId;
      if (!id) return undefined;
      return (state.hotelShiftPuzzleStaff?.staffList ?? []).find((s) => s.id === id);
    },
  ],
  (staffState): Staff | undefined =>
    staffState ? new Staff(staffState) : undefined
);
