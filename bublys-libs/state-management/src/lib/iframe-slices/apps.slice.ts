import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store.js';

export interface AppData {
  id: string;
  name: string;
  url: string;
}

export interface AppState {
  apps: AppData[];
  activeAppIds: string[];
  appDiff: string | undefined; //activeAppIdsの差分
  displayedAppLimit: number;
}

// 初期状態は常に空（サーバーとクライアントで一致させる）
const initialState: AppState = {
  apps: [],
  activeAppIds: [],
  appDiff: undefined,
  displayedAppLimit: 2,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    addApp: (state, action: PayloadAction<Omit<AppData, 'id'>>) => {
      const newApp = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.apps.push(newApp);
    },
    removeApp: (state, action: PayloadAction<string>) => {
      state.apps = state.apps.filter((app) => app.id !== action.payload);
      if (state.activeAppIds.includes(action.payload)) {
        state.activeAppIds = state.activeAppIds.filter(
          (id) => id !== action.payload
        );
      }
    },
    setActiveApp: (state, action: PayloadAction<string>) => {
      // 既に含まれている場合は追加しない
      if (state.activeAppIds.includes(action.payload)) {
        return;
      }
      state.appDiff = action.payload;
      state.activeAppIds = [...state.activeAppIds, action.payload];
      if (state.activeAppIds.length > state.displayedAppLimit) {
        state.activeAppIds = state.activeAppIds.slice(
          state.activeAppIds.length - state.displayedAppLimit
        );
      }
    },
    setInActiveApp: (state, action: PayloadAction<string>) => {
      state.appDiff = action.payload;
      state.activeAppIds = state.activeAppIds.filter(
        (id) => id !== action.payload
      );
    },
    hydrate: (_state, action: PayloadAction<AppState>) => {
      return action.payload;
    },
  },
});

export const { addApp, removeApp, setActiveApp, setInActiveApp, hydrate } =
  appSlice.actions;

export const selectAppById = (id: string) => (state: RootState) =>
  state.app.apps.find((app) => app.id === id);

export default appSlice.reducer;
