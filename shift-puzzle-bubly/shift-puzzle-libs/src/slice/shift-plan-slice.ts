import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";

import {
  type ShiftPlanState,
  ShiftPlan,
} from "@bublys-org/shift-puzzle-model";
import type { ShiftState } from "@bublys-org/shift-puzzle-model";

// Re-export TimeSchedule / BlockList for convenience
export { TimeSchedule, BlockList } from "@bublys-org/shift-puzzle-model";

// Re-export for convenience
export { ShiftPlan };
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
  assignments: [...(plan.assignments ?? [])],
  constraintViolations: (plan.constraintViolations ?? []).map((v) => ({
    ...v,
    assignmentIds: [...v.assignmentIds],
  })),
  timeSchedules: (plan.timeSchedules ?? []).map((ts) => ({ ...ts })),
  shifts: (plan.shifts ?? []).map((s) => ({
    ...s,
    blockList: s.blockList
      ? { blocks: s.blockList.blocks.map((row) => [...row]) }
      : undefined,
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

    // ========== プリミティブUI: BlockList操作 ==========

    addUserToBlock: (
      state,
      action: PayloadAction<{ planId: string; shiftId: string; blockIndex: number; userId: string }>
    ) => {
      if (!state.shiftPlans) return;
      const { planId, shiftId, blockIndex, userId } = action.payload;
      const planIndex = state.shiftPlans.findIndex((p) => p.id === planId);
      if (planIndex === -1) return;
      const plan = new ShiftPlan(state.shiftPlans[planIndex]);
      const updated = plan.addUserToBlock(shiftId, blockIndex, userId);
      state.shiftPlans[planIndex] = toMutableShiftPlanState(updated.state);
    },

    removeUserFromBlock: (
      state,
      action: PayloadAction<{ planId: string; shiftId: string; blockIndex: number; userId: string }>
    ) => {
      if (!state.shiftPlans) return;
      const { planId, shiftId, blockIndex, userId } = action.payload;
      const planIndex = state.shiftPlans.findIndex((p) => p.id === planId);
      if (planIndex === -1) return;
      const plan = new ShiftPlan(state.shiftPlans[planIndex]);
      const updated = plan.removeUserFromBlock(shiftId, blockIndex, userId);
      state.shiftPlans[planIndex] = toMutableShiftPlanState(updated.state);
    },

    addUserToBlockRange: (
      state,
      action: PayloadAction<{ planId: string; shiftId: string; startBlock: number; endBlock: number; userId: string }>
    ) => {
      if (!state.shiftPlans) return;
      const { planId, shiftId, startBlock, endBlock, userId } = action.payload;
      const planIndex = state.shiftPlans.findIndex((p) => p.id === planId);
      if (planIndex === -1) return;
      const plan = new ShiftPlan(state.shiftPlans[planIndex]);
      const updated = plan.addUserToBlockRange(shiftId, startBlock, endBlock, userId);
      state.shiftPlans[planIndex] = toMutableShiftPlanState(updated.state);
    },

    removeUserFromBlockRange: (
      state,
      action: PayloadAction<{ planId: string; shiftId: string; startBlock: number; endBlock: number; userId: string }>
    ) => {
      if (!state.shiftPlans) return;
      const { planId, shiftId, startBlock, endBlock, userId } = action.payload;
      const planIndex = state.shiftPlans.findIndex((p) => p.id === planId);
      if (planIndex === -1) return;
      const plan = new ShiftPlan(state.shiftPlans[planIndex]);
      const updated = plan.removeUserFromBlockRange(shiftId, startBlock, endBlock, userId);
      state.shiftPlans[planIndex] = toMutableShiftPlanState(updated.state);
    },

    /**
     * world-line タブ切替時の shifts 復元。
     *
     * payload.shifts は **完全な置換対象** として扱う（マージしない）。
     * 呼び出し側 thunk は、CAS にあるシフトはその版、CAS に無いシフトは
     * blockList を空にリセットしたものを並べて全 shift 配列を作って渡す責務を持つ。
     * これにより「ノード時点の正確な状態」を再現できる（部分マージだと、
     * 比較対象に無い shift の placement が残ってしまい、後続の差分表示で誤検知される）。
     *
     * 注意: 本アクションは world-line listener の matcher に含めない。
     * （含めると復元 → 再記録 → 復元 ... の無限ループになる）
     */
    restoreShiftPlanFromWorldLine: (
      state,
      action: PayloadAction<{ planId: string; shifts: ShiftState[] }>
    ) => {
      if (!state.shiftPlans) return;
      const { planId, shifts } = action.payload;
      const planIndex = state.shiftPlans.findIndex((p) => p.id === planId);
      if (planIndex === -1) return;
      const current = state.shiftPlans[planIndex];
      state.shiftPlans[planIndex] = toMutableShiftPlanState({
        ...current,
        shifts,
        updatedAt: new Date().toISOString(),
      });
    },

    /**
     * 既配置の移動・リサイズ用アトミック操作。
     * - 同一userId: 移動 or リサイズ
     * - 異なるuserId: 局員変更（旧userIdを除去、新userIdで追加）
     */
    moveUserBlocks: (
      state,
      action: PayloadAction<{
        planId: string;
        shiftId: string;
        oldUserId: string;
        oldStart: number;
        oldEnd: number;
        newUserId: string;
        newStart: number;
        newEnd: number;
      }>
    ) => {
      if (!state.shiftPlans) return;
      const { planId, shiftId, oldUserId, oldStart, oldEnd, newUserId, newStart, newEnd } = action.payload;
      const planIndex = state.shiftPlans.findIndex((p) => p.id === planId);
      if (planIndex === -1) return;
      let plan = new ShiftPlan(state.shiftPlans[planIndex]);
      plan = plan.removeUserFromBlockRange(shiftId, oldStart, oldEnd, oldUserId);
      plan = plan.addUserToBlockRange(shiftId, newStart, newEnd, newUserId);
      state.shiftPlans[planIndex] = toMutableShiftPlanState(plan.state);
    },
  },
});

export const {
  addShiftPlan,
  updateShiftPlan,
  deleteShiftPlan,
  setCurrentShiftPlanId,
  addUserToBlock,
  removeUserFromBlock,
  addUserToBlockRange,
  removeUserFromBlockRange,
  moveUserBlocks,
  restoreShiftPlanFromWorldLine,
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
  (shiftPlans): ShiftPlan[] => shiftPlans.map((s) => new ShiftPlan(s))
);

/** 現在のシフト案IDを取得 */
export const selectCurrentShiftPlanId = (state: StateWithShiftPlan): string | null =>
  state.shiftPlan?.currentShiftPlanId ?? null;

/** IDでシフト案を取得（ドメインオブジェクト） */
export const selectShiftPlanById = (id: string) =>
  createSelector(
    [(state: StateWithShiftPlan) => (state.shiftPlan?.shiftPlans ?? []).find((p) => p.id === id)],
    (plan): ShiftPlan | undefined => {
      return plan ? new ShiftPlan(plan) : undefined;
    }
  );

/** 現在のシフト案を取得（ドメインオブジェクト） */
export const selectCurrentShiftPlan = createSelector(
  [(state: StateWithShiftPlan) => {
    const id = state.shiftPlan?.currentShiftPlanId;
    if (!id) return undefined;
    return (state.shiftPlan?.shiftPlans ?? []).find((p) => p.id === id);
  }],
  (plan): ShiftPlan | undefined => {
    return plan ? new ShiftPlan(plan) : undefined;
  }
);
