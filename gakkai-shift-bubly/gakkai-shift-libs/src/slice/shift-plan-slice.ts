import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";

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
  /**
   * **置き場の名前は、バブリごとに分ける。**
   *
   * ★ イベントシフトと同じ `shiftPlan` を名乗っていたので、OS に両方ロードすると
   *   **2 つのバブリが 1 つの引き出しを分け合って**いた（片方のシフト案が
   *   もう片方を上書きする）。置き場は保存の住所そのものなので、
   *   同じ名前は同じ場所を意味する。
   * ★ 前の名前（`shiftPlan`）で保存されていたものは読めなくなる。
   *   分け合っていた時点でどちらのものか言えないので、持ち越さない。
   */
  name: "gakkaiShiftPlan",
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

// 注入（副作用として実行）。口は 1 つ ── `injectSlice` を通す
injectSlice(shiftPlanSlice);

// ========== Selectors ==========

// セレクター用の型
type StateWithShiftPlan = RootState & { gakkaiShiftPlan: ShiftPlanSliceState };

// 基本セレクター
const selectShiftPlansRaw = (state: StateWithShiftPlan) => state.gakkaiShiftPlan?.shiftPlans ?? [];

/** シフト案一覧を取得（ドメインオブジェクト） */
export const selectShiftPlans = createSelector(
  [selectShiftPlansRaw],
  (shiftPlans): ShiftPlan_シフト案[] => shiftPlans.map((s) => new ShiftPlan_シフト案(s))
);

/** 現在のシフト案IDを取得 */
export const selectCurrentShiftPlanId = (state: StateWithShiftPlan): string | null =>
  state.gakkaiShiftPlan?.currentShiftPlanId ?? null;

/** IDでシフト案を取得（ドメインオブジェクト） */
export const selectShiftPlanById = (id: string) =>
  createSelector(
    [(state: StateWithShiftPlan) => (state.gakkaiShiftPlan?.shiftPlans ?? []).find((p) => p.id === id)],
    (plan): ShiftPlan_シフト案 | undefined => {
      return plan ? new ShiftPlan_シフト案(plan) : undefined;
    }
  );

/** 現在のシフト案を取得（ドメインオブジェクト） */
export const selectCurrentShiftPlan = createSelector(
  [(state: StateWithShiftPlan) => {
    const id = state.gakkaiShiftPlan?.currentShiftPlanId;
    if (!id) return undefined;
    return (state.gakkaiShiftPlan?.shiftPlans ?? []).find((p) => p.id === id);
  }],
  (plan): ShiftPlan_シフト案 | undefined => {
    return plan ? new ShiftPlan_シフト案(plan) : undefined;
  }
);
