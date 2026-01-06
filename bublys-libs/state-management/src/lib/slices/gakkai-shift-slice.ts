import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

// ドメインモデルからインポート
import {
  Staff_スタッフ,
  type StaffJSON,
  type StaffStatus_ステータス,
} from "@bublys-org/gakkai-shift-model";

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
  selectShiftPlans as selectGakkaiShiftPlans,
  selectCurrentShiftPlanId as selectGakkaiShiftCurrentPlanId,
  selectShiftPlanById as selectGakkaiShiftPlanById,
  selectCurrentShiftPlan as selectGakkaiShiftCurrentPlan,
  ShiftPlan_シフト案,
  type ShiftPlanState,
} from "./shift-plan-slice.js";

// ========== State ==========

type GakkaiShiftStaffState = {
  staffList: StaffJSON[];
  selectedStaffId: string | null;
};

const initialState: GakkaiShiftStaffState = {
  staffList: [],
  selectedStaffId: null,
};

// ========== Slice ==========

export const gakkaiShiftSlice = createSlice({
  name: "gakkaiShift",
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
} = gakkaiShiftSlice.actions;

// ========== Selectors ==========

// 基本セレクター
const selectStaffListRaw = (state: RootState) => state.gakkaiShift.staffList;

/** スタッフ一覧を取得（ドメインオブジェクト） */
export const selectGakkaiShiftStaffList = createSelector(
  [selectStaffListRaw],
  (staffList): Staff_スタッフ[] => staffList.map((json) => Staff_スタッフ.fromJSON(json))
);

/** 選択中のスタッフIDを取得 */
export const selectGakkaiShiftSelectedStaffId = (state: RootState): string | null =>
  state.gakkaiShift.selectedStaffId;

/** IDでスタッフを取得（ドメインオブジェクト） */
export const selectGakkaiShiftStaffById = (id: string) =>
  createSelector(
    [(state: RootState) => state.gakkaiShift.staffList.find((s) => s.id === id)],
    (json): Staff_スタッフ | undefined => {
      return json ? Staff_スタッフ.fromJSON(json) : undefined;
    }
  );

/** ステータスでスタッフを絞り込み（ドメインオブジェクト） */
export const selectGakkaiShiftStaffByStatus = (status: StaffStatus_ステータス) =>
  createSelector(
    [selectStaffListRaw],
    (staffList): Staff_スタッフ[] =>
      staffList
        .filter((s) => s.status === status)
        .map((json) => Staff_スタッフ.fromJSON(json))
  );

/** 選択中のスタッフを取得（ドメインオブジェクト） */
export const selectGakkaiShiftSelectedStaff = createSelector(
  [(state: RootState) => {
    const id = state.gakkaiShift.selectedStaffId;
    if (!id) return undefined;
    return state.gakkaiShift.staffList.find((s) => s.id === id);
  }],
  (json): Staff_スタッフ | undefined => {
    return json ? Staff_スタッフ.fromJSON(json) : undefined;
  }
);
