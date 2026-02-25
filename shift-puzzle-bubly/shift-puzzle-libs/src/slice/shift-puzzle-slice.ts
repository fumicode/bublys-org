import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";

// ドメインモデルからインポート
import {
  Staff_スタッフ,
  type StaffJSON,
  type StaffStatus_ステータス,
} from "@bublys-org/shift-puzzle-model";

// Re-export for convenience
export { Staff_スタッフ };
export type { StaffJSON, StaffStatus_ステータス };

// ShiftPlan関連は shift-plan-slice から再エクスポート（後方互換性）
export {
  shiftPlanSlice,
  addShiftPlan,
  updateShiftPlan,
  deleteShiftPlan,
  setCurrentShiftPlanId,
  selectShiftPlans as selectShiftPuzzlePlans,
  selectCurrentShiftPlanId as selectShiftPuzzleCurrentPlanId,
  selectShiftPlanById as selectShiftPuzzlePlanById,
  selectCurrentShiftPlan as selectShiftPuzzleCurrentPlan,
  ShiftPlan_シフト案,
  type ShiftPlanState,
} from "./shift-plan-slice.js";

// ========== State ==========

type ShiftPuzzleStaffState = {
  staffList: StaffJSON[];
  selectedStaffId: string | null;
};

const initialState: ShiftPuzzleStaffState = {
  staffList: [],
  selectedStaffId: null,
};

// ========== Slice ==========

export const shiftPuzzleSlice = createSlice({
  name: "shiftPuzzle",
  initialState,
  reducers: {
    setStaffList: (state, action: PayloadAction<StaffJSON[]>) => {
      state.staffList = action.payload;
    },
    addStaff: (state, action: PayloadAction<StaffJSON>) => {
      state.staffList.push(action.payload);
    },
    updateStaff: (state, action: PayloadAction<StaffJSON>) => {
      const index = state.staffList.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.staffList[index] = action.payload;
      }
    },
    deleteStaff: (state, action: PayloadAction<string>) => {
      state.staffList = state.staffList.filter((s) => s.id !== action.payload);
    },
    setSelectedStaffId: (state, action: PayloadAction<string | null>) => {
      state.selectedStaffId = action.payload;
    },
    updateStaffStatus: (
      state,
      action: PayloadAction<{ id: string; status: StaffStatus_ステータス }>
    ) => {
      const staff = state.staffList.find((s) => s.id === action.payload.id);
      if (staff) {
        staff.status = action.payload.status;
        staff.updatedAt = new Date().toISOString();
      }
    },
  },
});

export const {
  setStaffList,
  addStaff,
  updateStaff,
  deleteStaff,
  setSelectedStaffId,
  updateStaffStatus,
} = shiftPuzzleSlice.actions;

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof shiftPuzzleSlice> {}
}

// rootReducerに注入（副作用として実行）
shiftPuzzleSlice.injectInto(rootReducer);

// ========== Selectors ==========

// セレクター用の型
type StateWithShiftPuzzle = RootState & { shiftPuzzle: ShiftPuzzleStaffState };

// 基本セレクター
const selectStaffListRaw = (state: StateWithShiftPuzzle) => state.shiftPuzzle?.staffList ?? [];

/** スタッフ一覧を取得（ドメインオブジェクト） */
export const selectShiftPuzzleStaffList = createSelector(
  [selectStaffListRaw],
  (staffList): Staff_スタッフ[] => staffList.map((json) => Staff_スタッフ.fromJSON(json))
);

/** 選択中のスタッフIDを取得 */
export const selectShiftPuzzleSelectedStaffId = (state: StateWithShiftPuzzle): string | null =>
  state.shiftPuzzle?.selectedStaffId ?? null;

/** IDでスタッフを取得（ドメインオブジェクト） */
export const selectShiftPuzzleStaffById = (id: string) =>
  createSelector(
    [(state: StateWithShiftPuzzle) => (state.shiftPuzzle?.staffList ?? []).find((s) => s.id === id)],
    (json): Staff_スタッフ | undefined => {
      return json ? Staff_スタッフ.fromJSON(json) : undefined;
    }
  );

/** ステータスでスタッフを絞り込み（ドメインオブジェクト） */
export const selectShiftPuzzleStaffByStatus = (status: StaffStatus_ステータス) =>
  createSelector(
    [selectStaffListRaw],
    (staffList): Staff_スタッフ[] =>
      staffList
        .filter((s) => s.status === status)
        .map((json) => Staff_スタッフ.fromJSON(json))
  );

/** 選択中のスタッフを取得（ドメインオブジェクト） */
export const selectShiftPuzzleSelectedStaff = createSelector(
  [(state: StateWithShiftPuzzle) => {
    const id = state.shiftPuzzle?.selectedStaffId;
    if (!id) return undefined;
    return (state.shiftPuzzle?.staffList ?? []).find((s) => s.id === id);
  }],
  (json): Staff_スタッフ | undefined => {
    return json ? Staff_スタッフ.fromJSON(json) : undefined;
  }
);
