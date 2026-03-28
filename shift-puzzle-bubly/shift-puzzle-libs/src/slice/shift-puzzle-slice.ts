import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";

// ドメインモデルからインポート
import {
  Member,
  type MemberState,
} from "@bublys-org/shift-puzzle-model";

// Re-export for convenience
export { Member };
export type { MemberState };

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
  ShiftPlan,
  type ShiftPlanState,
} from "./shift-plan-slice.js";

// ========== State ==========

type ShiftPuzzleMemberState = {
  memberList: MemberState[];
  selectedMemberId: string | null;
};

const initialState: ShiftPuzzleMemberState = {
  memberList: [],
  selectedMemberId: null,
};

// ========== Slice ==========

export const shiftPuzzleSlice = createSlice({
  name: "shiftPuzzle",
  initialState,
  reducers: {
    setMemberList: (state, action: PayloadAction<MemberState[]>) => {
      state.memberList = action.payload.map((m) => ({
        ...m,
        availableShiftIds: [...m.availableShiftIds],
      }));
    },
    addMember: (state, action: PayloadAction<MemberState>) => {
      const m = action.payload;
      state.memberList.push({
        ...m,
        availableShiftIds: [...m.availableShiftIds],
      });
    },
    updateMember: (state, action: PayloadAction<MemberState>) => {
      const index = state.memberList.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        const m = action.payload;
        state.memberList[index] = {
          ...m,
          availableShiftIds: [...m.availableShiftIds],
        };
      }
    },
    deleteMember: (state, action: PayloadAction<string>) => {
      state.memberList = state.memberList.filter((m) => m.id !== action.payload);
    },
    setSelectedMemberId: (state, action: PayloadAction<string | null>) => {
      state.selectedMemberId = action.payload;
    },
  },
});

export const {
  setMemberList,
  addMember,
  updateMember,
  deleteMember,
  setSelectedMemberId,
} = shiftPuzzleSlice.actions;

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof shiftPuzzleSlice> {}
}

// rootReducerに注入（副作用として実行）
shiftPuzzleSlice.injectInto(rootReducer);

// ========== Selectors ==========

// セレクター用の型
type StateWithShiftPuzzle = RootState & { shiftPuzzle: ShiftPuzzleMemberState };

// 基本セレクター
const selectMemberListRaw = (state: StateWithShiftPuzzle) => state.shiftPuzzle?.memberList ?? [];

/** 局員一覧を取得（ドメインオブジェクト） */
export const selectShiftPuzzleMemberList = createSelector(
  [selectMemberListRaw],
  (memberList): Member[] => memberList.map((s) => new Member(s))
);

/** 選択中の局員IDを取得 */
export const selectShiftPuzzleSelectedMemberId = (state: StateWithShiftPuzzle): string | null =>
  state.shiftPuzzle?.selectedMemberId ?? null;

/** IDで局員を取得（ドメインオブジェクト） */
export const selectShiftPuzzleMemberById = (id: string) =>
  createSelector(
    [(state: StateWithShiftPuzzle) => (state.shiftPuzzle?.memberList ?? []).find((m) => m.id === id)],
    (memberState): Member | undefined => {
      return memberState ? new Member(memberState) : undefined;
    }
  );

/** 選択中の局員を取得（ドメインオブジェクト） */
export const selectShiftPuzzleSelectedMember = createSelector(
  [(state: StateWithShiftPuzzle) => {
    const id = state.shiftPuzzle?.selectedMemberId;
    if (!id) return undefined;
    return (state.shiftPuzzle?.memberList ?? []).find((m) => m.id === id);
  }],
  (memberState): Member | undefined => {
    return memberState ? new Member(memberState) : undefined;
  }
);
