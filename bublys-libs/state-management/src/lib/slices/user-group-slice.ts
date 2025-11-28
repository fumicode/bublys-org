import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";

export type UserGroupState = {
  id: string;
  name: string;
  userIds: string[];
};

type UserGroupsState = {
  groups: UserGroupState[];
};

const initialState: UserGroupsState = {
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

export const { setUserGroups, addUserGroup, updateUserGroup, deleteUserGroup } =
  userGroupSlice.actions;

export const selectUserGroups = (state: RootState) => state.userGroup.groups;
export const selectUserGroupById = (id: string) => (state: RootState) =>
  state.userGroup.groups.find((g) => g.id === id);
