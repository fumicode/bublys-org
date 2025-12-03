import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

export type UserState = {
  id: string;
  name: string;
  birthday: string;
};

type UsersState = {
  users: UserState[];
};

const initialState: UsersState = {
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

export const { setUsers, addUser, deleteUser } = userSlice.actions;

export const selectUsers = (state: RootState) => state.user.users;
export const selectUserById = (id: string) => (state: RootState) =>
  state.user.users.find((user) => user.id === id);
