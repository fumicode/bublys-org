import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";

import {
  type ShiftPlanState,
  ShiftPlan_シフト案,
} from "@bublys-org/shift-puzzle-model";

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

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof shiftPlanSlice> {}
}

// rootReducerに注入（副作用として実行）
shiftPlanSlice.injectInto(rootReducer);

// ========== Selectors ==========

// セレクター用の型
type StateWithShiftPlan = RootState & { shiftPlan: ShiftPlanSliceState };

// 基本セレクター
const selectShiftPlansRaw = (state: StateWithShiftPlan) => state.shiftPlan?.shiftPlans ?? [];

/** シフト案一覧を取得（ドメインオブジェクト） */
export const selectShiftPlans = createSelector(
  [selectShiftPlansRaw],
  (shiftPlans): ShiftPlan_シフト案[] => shiftPlans.map((s) => new ShiftPlan_シフト案(s))
);

/** 現在のシフト案IDを取得 */
export const selectCurrentShiftPlanId = (state: StateWithShiftPlan): string | null =>
  state.shiftPlan?.currentShiftPlanId ?? null;

/** IDでシフト案を取得（ドメインオブジェクト） */
export const selectShiftPlanById = (id: string) =>
  createSelector(
    [(state: StateWithShiftPlan) => (state.shiftPlan?.shiftPlans ?? []).find((p) => p.id === id)],
    (plan): ShiftPlan_シフト案 | undefined => {
      return plan ? new ShiftPlan_シフト案(plan) : undefined;
    }
  );

/** 現在のシフト案を取得（ドメインオブジェクト） */
export const selectCurrentShiftPlan = createSelector(
  [(state: StateWithShiftPlan) => {
    const id = state.shiftPlan?.currentShiftPlanId;
    if (!id) return undefined;
    return (state.shiftPlan?.shiftPlans ?? []).find((p) => p.id === id);
  }],
  (plan): ShiftPlan_シフト案 | undefined => {
    return plan ? new ShiftPlan_シフト案(plan) : undefined;
  }
);
