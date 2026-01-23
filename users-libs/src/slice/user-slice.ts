import { createSlice, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import type { UserState } from "../domain/User.domain.js";

type UsersSliceState = {
  users: UserState[];
};

const initialState: UsersSliceState = {
  users: [],
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<UserState[]>) => {
      state.users = action.payload;
    },
    addUser: (state, action: PayloadAction<UserState>) => {
      state.users.push(action.payload);
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter((user) => user.id !== action.payload);
    },
  },
});

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof userSlice> {}
}

// rootReducerに注入（副作用として実行）
userSlice.injectInto(rootReducer);

// アクションをエクスポート
export const { setUsers, addUser, deleteUser } = userSlice.actions;

// セレクターを直接定義（RootState & LazyLoadedSlices を使用）
type StateWithUser = RootState & { user: UsersSliceState };

export const selectUsers = (state: StateWithUser) => state.user?.users ?? [];

export const selectUserById = (id: string) => (state: StateWithUser) =>
  state.user?.users.find((user) => user.id === id);
