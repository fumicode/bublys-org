import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppData {
  uuid: string;
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
    addApp: (state, action: PayloadAction<Omit<AppData, 'uuid'>>) => {
      const newApp = {
        ...action.payload,
        uuid: Date.now().toString(),
      };
      state.apps.push(newApp);
    },
    removeApp: (state, action: PayloadAction<string>) => {
      state.apps = state.apps.filter((app) => app.uuid !== action.payload);
      if (state.activeAppIds.includes(action.payload)) {
        state.activeAppIds = state.activeAppIds.filter(
          (id) => id !== action.payload
        );
      }
    },
    setActiveApp: (state, action: PayloadAction<string>) => {
      state.appDiff = action.payload;
      state.activeAppIds = [...state.activeAppIds, action.payload];
      if (state.activeAppIds.length >= state.displayedAppLimit) {
        state.activeAppIds = state.activeAppIds.slice(
          state.activeAppIds.length - state.displayedAppLimit + 1
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

// 状態が変更されるたびにローカルストレージに保存するミドルウェア
export const localStorageMiddleware =
  (store: any) => (next: any) => (action: any) => {
    const result = next(action);
    if (action.type.startsWith('app/')) {
      const state = store.getState().app;
      try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem('iframeViewerState', serializedState);
      } catch (e) {
        console.warn('ローカルストレージへの保存に失敗しました', e);
      }
    }
    return result;
  };

export const handShakeMiddleware =
  (store: any) => (next: any) => (action: any) => {
    const result = next(action);
    if (action.type.startsWith('app/setActiveApp')) {
      const state = store.getState().app;
      try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem('iframeViewerState', serializedState);
      } catch (e) {
        console.warn('ローカルストレージへの保存に失敗しました', e);
      }
    }
    return result;
  };

export const { addApp, removeApp, setActiveApp, setInActiveApp, hydrate } =
  appSlice.actions;
export default appSlice.reducer;
