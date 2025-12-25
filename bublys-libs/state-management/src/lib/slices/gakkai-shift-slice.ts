import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

// ドメインモデルからインポート
import {
  Staff_スタッフ,
  type StaffJSON,
  type StaffStatus_ステータス,
  type ShiftAssignmentState,
  type ShiftPlanState,
  ShiftPlan_シフト案,
  ShiftAssignment_シフト配置,
} from "@bublys-org/gakkai-shift-model";

// Re-export for convenience
export { Staff_スタッフ, ShiftPlan_シフト案, ShiftAssignment_シフト配置 };
export type { StaffJSON, StaffStatus_ステータス, ShiftAssignmentState, ShiftPlanState };

/** gakkai-shiftスライスの状態（内部はJSON） */
type GakkaiShiftState = {
  staffList: StaffJSON[];
  selectedStaffId: string | null;
  // ShiftPlan関連
  shiftPlans: ShiftPlanState[];
  currentShiftPlanId: string | null;
};

const initialState: GakkaiShiftState = {
  staffList: [],
  selectedStaffId: null,
  shiftPlans: [],
  currentShiftPlanId: null,
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
    // ShiftPlan関連
    addShiftPlan: (state, action: PayloadAction<ShiftPlanState>) => {
      // redux-persistで古い状態の場合に初期化
      if (!state.shiftPlans) {
        state.shiftPlans = [];
      }
      // readonlyをmutableに変換
      const mutablePlan = {
        ...action.payload,
        assignments: [...action.payload.assignments],
      };
      state.shiftPlans.push(mutablePlan);
    },
    setCurrentShiftPlanId: (state, action: PayloadAction<string | null>) => {
      state.currentShiftPlanId = action.payload;
    },
    addAssignmentToShiftPlan: (
      state,
      action: PayloadAction<{ shiftPlanId: string; assignment: ShiftAssignmentState }>
    ) => {
      if (!state.shiftPlans) state.shiftPlans = [];
      const plan = state.shiftPlans.find((p) => p.id === action.payload.shiftPlanId);
      if (plan) {
        (plan.assignments as ShiftAssignmentState[]).push(action.payload.assignment);
        plan.updatedAt = new Date().toISOString();
      }
    },
    removeAssignmentFromShiftPlan: (
      state,
      action: PayloadAction<{ shiftPlanId: string; assignmentId: string }>
    ) => {
      if (!state.shiftPlans) state.shiftPlans = [];
      const plan = state.shiftPlans.find((p) => p.id === action.payload.shiftPlanId);
      if (plan) {
        (plan as { assignments: ShiftAssignmentState[] }).assignments =
          plan.assignments.filter((a) => a.id !== action.payload.assignmentId);
        plan.updatedAt = new Date().toISOString();
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
  addShiftPlan,
  setCurrentShiftPlanId,
  addAssignmentToShiftPlan,
  removeAssignmentFromShiftPlan,
} = gakkaiShiftSlice.actions;

// ========== Selectors (ドメインオブジェクトを返す) ==========

/** スタッフ一覧を取得（ドメインオブジェクト） */
export const selectGakkaiShiftStaffList = (state: RootState): Staff_スタッフ[] =>
  state.gakkaiShift.staffList.map((json) => Staff_スタッフ.fromJSON(json));

/** 選択中のスタッフIDを取得 */
export const selectGakkaiShiftSelectedStaffId = (state: RootState): string | null =>
  state.gakkaiShift.selectedStaffId;

/** IDでスタッフを取得（ドメインオブジェクト） */
export const selectGakkaiShiftStaffById = (id: string) => (state: RootState): Staff_スタッフ | undefined => {
  const json = state.gakkaiShift.staffList.find((s) => s.id === id);
  return json ? Staff_スタッフ.fromJSON(json) : undefined;
};

/** ステータスでスタッフを絞り込み（ドメインオブジェクト） */
export const selectGakkaiShiftStaffByStatus = (status: StaffStatus_ステータス) => (state: RootState): Staff_スタッフ[] =>
  state.gakkaiShift.staffList
    .filter((s) => s.status === status)
    .map((json) => Staff_スタッフ.fromJSON(json));

/** 選択中のスタッフを取得（ドメインオブジェクト） */
export const selectGakkaiShiftSelectedStaff = (state: RootState): Staff_スタッフ | undefined => {
  const id = state.gakkaiShift.selectedStaffId;
  if (!id) return undefined;
  const json = state.gakkaiShift.staffList.find((s) => s.id === id);
  return json ? Staff_スタッフ.fromJSON(json) : undefined;
};

// ========== ShiftPlan Selectors ==========

/** シフト案一覧を取得（ドメインオブジェクト） */
export const selectGakkaiShiftPlans = (state: RootState): ShiftPlan_シフト案[] =>
  (state.gakkaiShift.shiftPlans ?? []).map((s) => new ShiftPlan_シフト案(s));

/** 現在のシフト案IDを取得 */
export const selectGakkaiShiftCurrentPlanId = (state: RootState): string | null =>
  state.gakkaiShift.currentShiftPlanId ?? null;

/** IDでシフト案を取得（ドメインオブジェクト） */
export const selectGakkaiShiftPlanById = (id: string) => (state: RootState): ShiftPlan_シフト案 | undefined => {
  const plans = state.gakkaiShift.shiftPlans ?? [];
  const plan = plans.find((p) => p.id === id);
  return plan ? new ShiftPlan_シフト案(plan) : undefined;
};

/** 現在のシフト案を取得（ドメインオブジェクト） */
export const selectGakkaiShiftCurrentPlan = (state: RootState): ShiftPlan_シフト案 | undefined => {
  const id = state.gakkaiShift.currentShiftPlanId;
  if (!id) return undefined;
  const plans = state.gakkaiShift.shiftPlans ?? [];
  const plan = plans.find((p) => p.id === id);
  return plan ? new ShiftPlan_シフト案(plan) : undefined;
};
