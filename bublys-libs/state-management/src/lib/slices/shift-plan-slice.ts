import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

import {
  type ShiftPlanState,
  ShiftPlan_シフト案,
} from "@bublys-org/gakkai-shift-model";

// Re-export for convenience
export { ShiftPlan_シフト案 };
export type { ShiftPlanState };

// ========== State ==========

type ShiftPlanSliceState = {
  shiftPlans: ShiftPlanState[];
  currentShiftPlanId: string | null;
};

const initialState: ShiftPlanSliceState = {
  shiftPlans: [],
  currentShiftPlanId: null,
};

// ========== Helper ==========

/** readonlyなShiftPlanStateをmutableに変換（Immer用） */
const toMutableShiftPlanState = (plan: ShiftPlanState) => ({
  ...plan,
  assignments: [...plan.assignments],
  constraintViolations: (plan.constraintViolations ?? []).map((v) => ({
    ...v,
    assignmentIds: [...v.assignmentIds],
  })),
});

// ========== Slice ==========

export const shiftPlanSlice = createSlice({
  name: "shiftPlan",
  initialState,
  reducers: {
    addShiftPlan: (state, action: PayloadAction<ShiftPlanState>) => {
      if (!state.shiftPlans) {
        state.shiftPlans = [];
      }
      const mutablePlan = toMutableShiftPlanState(action.payload);
      state.shiftPlans.push(mutablePlan);
    },
    updateShiftPlan: (state, action: PayloadAction<ShiftPlanState>) => {
      if (!state.shiftPlans) state.shiftPlans = [];
      const index = state.shiftPlans.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.shiftPlans[index] = toMutableShiftPlanState(action.payload);
      }
    },
    setCurrentShiftPlanId: (state, action: PayloadAction<string | null>) => {
      state.currentShiftPlanId = action.payload;
    },
    deleteShiftPlan: (state, action: PayloadAction<string>) => {
      if (!state.shiftPlans) state.shiftPlans = [];
      state.shiftPlans = state.shiftPlans.filter((p) => p.id !== action.payload);
      if (state.currentShiftPlanId === action.payload) {
        state.currentShiftPlanId = state.shiftPlans.length > 0 ? state.shiftPlans[0].id : null;
      }
    },
  },
});

export const {
  addShiftPlan,
  updateShiftPlan,
  deleteShiftPlan,
  setCurrentShiftPlanId,
} = shiftPlanSlice.actions;

// ========== Selectors ==========

/** シフト案一覧を取得（ドメインオブジェクト） */
export const selectShiftPlans = (state: RootState): ShiftPlan_シフト案[] =>
  (state.shiftPlan.shiftPlans ?? []).map((s) => new ShiftPlan_シフト案(s));

/** 現在のシフト案IDを取得 */
export const selectCurrentShiftPlanId = (state: RootState): string | null =>
  state.shiftPlan.currentShiftPlanId ?? null;

/** IDでシフト案を取得（ドメインオブジェクト） */
export const selectShiftPlanById = (id: string) => (state: RootState): ShiftPlan_シフト案 | undefined => {
  const plans = state.shiftPlan.shiftPlans ?? [];
  const plan = plans.find((p) => p.id === id);
  return plan ? new ShiftPlan_シフト案(plan) : undefined;
};

/** 現在のシフト案を取得（ドメインオブジェクト） */
export const selectCurrentShiftPlan = (state: RootState): ShiftPlan_シフト案 | undefined => {
  const id = state.shiftPlan.currentShiftPlanId;
  if (!id) return undefined;
  const plans = state.shiftPlan.shiftPlans ?? [];
  const plan = plans.find((p) => p.id === id);
  return plan ? new ShiftPlan_シフト案(plan) : undefined;
};
