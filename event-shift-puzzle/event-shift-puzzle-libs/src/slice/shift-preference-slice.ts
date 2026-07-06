import { createSlice, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";

// ドメインモデルからインポート
import { ShiftPreference, type ShiftPreferenceState } from "@bublys-org/event-shift-puzzle-model";

export { ShiftPreference };
export type { ShiftPreferenceState };

// ========== State ==========

type ShiftPreferenceSliceState = {
  shiftPreferences: ShiftPreferenceState[];
};

const initialState: ShiftPreferenceSliceState = {
  shiftPreferences: [],
};

// ========== Slice ==========

export const shiftPreferenceSlice = createSlice({
  name: "shiftPreference",
  initialState,
  reducers: {
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

export const { setShiftPreference, removeShiftPreference } = shiftPreferenceSlice.actions;

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof shiftPreferenceSlice> {}
}

// rootReducerに注入（副作用として実行）
shiftPreferenceSlice.injectInto(rootReducer);

// ========== Selectors ==========

type StateWithShiftPreference = RootState & { shiftPreference: ShiftPreferenceSliceState };

/** メンバーIDでシフト希望を取得（ドメインオブジェクト） */
export const selectShiftPreferenceByMemberId = (memberId: string) =>
  (state: StateWithShiftPreference): ShiftPreference | undefined => {
    const found = (state.shiftPreference?.shiftPreferences ?? []).find((p) => p.memberId === memberId);
    return found ? new ShiftPreference(found) : undefined;
  };
