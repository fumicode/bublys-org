import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";

// ドメインモデルからインポート
import { Member, type MemberState } from "@bublys-org/event-shift-puzzle-model";

export { Member };
export type { MemberState };

// ========== State ==========

type MemberSliceState = {
  memberList: MemberState[];
  selectedMemberId: string | null;
};

const initialState: MemberSliceState = {
  memberList: [],
  selectedMemberId: null,
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

export const memberSlice = createSlice({
  name: "member",
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
  },
});

export const {
  setMemberList,
  addMember,
  updateMember,
  deleteMember,
  setSelectedMemberId,
} = memberSlice.actions;

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof memberSlice> {}
}

// rootReducerに注入（副作用として実行）
memberSlice.injectInto(rootReducer);

// ========== Selectors ==========

// セレクター用の型
type StateWithMember = RootState & { member: MemberSliceState };

// 基本セレクター
const selectMemberListRaw = (state: StateWithMember) => state.member?.memberList ?? [];

/** 局員一覧を取得（ドメインオブジェクト） */
export const selectShiftPuzzleMemberList = createSelector(
  [selectMemberListRaw],
  (memberList): Member[] => memberList.map((s) => new Member(s))
);

/** 選択中の局員IDを取得 */
export const selectShiftPuzzleSelectedMemberId = (state: StateWithMember): string | null =>
  state.member?.selectedMemberId ?? null;

/** IDで局員を取得（ドメインオブジェクト） */
export const selectShiftPuzzleMemberById = (id: string) =>
  createSelector(
    [(state: StateWithMember) => (state.member?.memberList ?? []).find((m) => m.id === id)],
    (memberState): Member | undefined => {
      return memberState ? new Member(memberState) : undefined;
    }
  );

/** 選択中の局員を取得（ドメインオブジェクト） */
export const selectShiftPuzzleSelectedMember = createSelector(
  [(state: StateWithMember) => {
    const id = state.member?.selectedMemberId;
    if (!id) return undefined;
    return (state.member?.memberList ?? []).find((m) => m.id === id);
  }],
  (memberState): Member | undefined => {
    return memberState ? new Member(memberState) : undefined;
  }
);
