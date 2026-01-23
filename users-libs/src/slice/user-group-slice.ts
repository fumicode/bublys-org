import { createSlice, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import type { UserGroupState } from "../domain/UserGroup.domain.js";

type UserGroupsSliceState = {
  groups: UserGroupState[];
};

const initialState: UserGroupsSliceState = {
  groups: [],
};

export const userGroupSlice = createSlice({
  name: "userGroup",
  initialState,
  reducers: {
    setUserGroups: (state, action: PayloadAction<UserGroupState[]>) => {
      state.groups = action.payload;
    },
    addUserGroup: (state, action: PayloadAction<UserGroupState>) => {
      state.groups.push(action.payload);
    },
    updateUserGroup: (state, action: PayloadAction<UserGroupState>) => {
      const idx = state.groups.findIndex((g) => g.id === action.payload.id);
      if (idx >= 0) {
        state.groups[idx] = action.payload;
      }
    },
    deleteUserGroup: (state, action: PayloadAction<string>) => {
      state.groups = state.groups.filter((g) => g.id !== action.payload);
    },
  },
});

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof userGroupSlice> {}
}

// rootReducerに注入（副作用として実行）
userGroupSlice.injectInto(rootReducer);

// アクションをエクスポート
export const { setUserGroups, addUserGroup, updateUserGroup, deleteUserGroup } =
  userGroupSlice.actions;

// セレクターを直接定義（RootState & LazyLoadedSlices を使用）
type StateWithUserGroup = RootState & { userGroup: UserGroupsSliceState };

export const selectUserGroups = (state: StateWithUserGroup) => state.userGroup?.groups ?? [];

export const selectUserGroupById = (id: string) => (state: StateWithUserGroup) =>
  state.userGroup?.groups.find((g) => g.id === id);
