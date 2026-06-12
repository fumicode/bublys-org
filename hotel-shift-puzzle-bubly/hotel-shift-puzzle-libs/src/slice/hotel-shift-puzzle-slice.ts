import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";

// ドメインモデルからインポート
import {
  Member,
  type MemberState,
  ShiftPreference,
  type ShiftPreferenceState,
} from "@bublys-org/hotel-shift-puzzle-model";

export { ShiftPreference };
export type { ShiftPreferenceState };

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
  // プリミティブUI用 BlockList アクション
  addUserToBlock,
  removeUserFromBlock,
  addUserToBlockRange,
  selectShiftPlans as selectHotelShiftPuzzlePlans,
  selectCurrentShiftPlanId as selectHotelShiftPuzzleCurrentPlanId,
  selectShiftPlanById as selectHotelShiftPuzzlePlanById,
  selectCurrentShiftPlan as selectHotelShiftPuzzleCurrentPlan,
  ShiftPlan,
  type ShiftPlanState,
} from "./shift-plan-slice.js";

// ========== State ==========

type HotelShiftPuzzleMemberState = {
  memberList: MemberState[];
  selectedMemberId: string | null;
  shiftPreferences: ShiftPreferenceState[];
};

const initialState: HotelShiftPuzzleMemberState = {
  memberList: [],
  selectedMemberId: null,
  shiftPreferences: [],
};

// ========== 内部ユーティリティ ==========

/** availability の DayType→TimeRange[] を深くクローンする（Reduxのserializable性保持のため） */
const cloneMemberState = (m: MemberState): MemberState => ({
  ...m,
  availability: Object.fromEntries(
    Object.entries(m.availability ?? {}).map(([dt, ranges]) => [
      dt,
      (ranges ?? []).map((r) => ({ ...r })),
    ]),
  ) as MemberState['availability'],
});

// ========== Slice ==========

export const hotelShiftPuzzleSlice = createSlice({
  name: "hotelShiftPuzzle",
  initialState,
  reducers: {
    setMemberList: (state, action: PayloadAction<MemberState[]>) => {
      state.memberList = action.payload.map(cloneMemberState);
    },
    addMember: (state, action: PayloadAction<MemberState>) => {
      state.memberList.push(cloneMemberState(action.payload));
    },
    updateMember: (state, action: PayloadAction<MemberState>) => {
      const index = state.memberList.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        state.memberList[index] = cloneMemberState(action.payload);
      }
    },
    deleteMember: (state, action: PayloadAction<string>) => {
      state.memberList = state.memberList.filter((m) => m.id !== action.payload);
    },
    setSelectedMemberId: (state, action: PayloadAction<string | null>) => {
      state.selectedMemberId = action.payload;
    },
    setShiftPreference: (state, action: PayloadAction<ShiftPreferenceState>) => {
      const cloned = {
        ...action.payload,
        entries: action.payload.entries.map((e) => ({ ...e, availableRanges: [...e.availableRanges] })),
      };
      const idx = state.shiftPreferences.findIndex((p) => p.memberId === cloned.memberId);
      if (idx >= 0) {
        state.shiftPreferences[idx] = cloned;
      } else {
        state.shiftPreferences.push(cloned);
      }
    },
    removeShiftPreference: (state, action: PayloadAction<string /* memberId */>) => {
      state.shiftPreferences = state.shiftPreferences.filter((p) => p.memberId !== action.payload);
    },
  },
});

export const {
  setMemberList,
  addMember,
  updateMember,
  deleteMember,
  setSelectedMemberId,
  setShiftPreference,
  removeShiftPreference,
} = hotelShiftPuzzleSlice.actions;

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof hotelShiftPuzzleSlice> {}
}

// rootReducerに注入（副作用として実行）
hotelShiftPuzzleSlice.injectInto(rootReducer);

// ========== Selectors ==========

// セレクター用の型
type StateWithHotelShiftPuzzle = RootState & { hotelShiftPuzzle: HotelShiftPuzzleMemberState };

// 基本セレクター
const selectMemberListRaw = (state: StateWithHotelShiftPuzzle) => state.hotelShiftPuzzle?.memberList ?? [];

/** 局員一覧を取得（ドメインオブジェクト） */
export const selectHotelShiftPuzzleMemberList = createSelector(
  [selectMemberListRaw],
  (memberList): Member[] => memberList.map((s) => new Member(s))
);

/** 選択中の局員IDを取得 */
export const selectHotelShiftPuzzleSelectedMemberId = (state: StateWithHotelShiftPuzzle): string | null =>
  state.hotelShiftPuzzle?.selectedMemberId ?? null;

/** IDで局員を取得（ドメインオブジェクト） */
export const selectHotelShiftPuzzleMemberById = (id: string) =>
  createSelector(
    [(state: StateWithHotelShiftPuzzle) => (state.hotelShiftPuzzle?.memberList ?? []).find((m) => m.id === id)],
    (memberState): Member | undefined => {
      return memberState ? new Member(memberState) : undefined;
    }
  );

/** 選択中の局員を取得（ドメインオブジェクト） */
export const selectHotelShiftPuzzleSelectedMember = createSelector(
  [(state: StateWithHotelShiftPuzzle) => {
    const id = state.hotelShiftPuzzle?.selectedMemberId;
    if (!id) return undefined;
    return (state.hotelShiftPuzzle?.memberList ?? []).find((m) => m.id === id);
  }],
  (memberState): Member | undefined => {
    return memberState ? new Member(memberState) : undefined;
  }
);

/** メンバーIDでシフト希望を取得（ドメインオブジェクト） */
export const selectShiftPreferenceByMemberId = (memberId: string) =>
  (state: StateWithHotelShiftPuzzle): ShiftPreference | undefined => {
    const found = (state.hotelShiftPuzzle?.shiftPreferences ?? []).find((p) => p.memberId === memberId);
    return found ? new ShiftPreference(found) : undefined;
  };
