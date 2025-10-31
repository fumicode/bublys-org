import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppData {
  id: string;
  name: string;
  url: string;
}

export interface AppState {
  apps: AppData[];
  activeAppIds: string[];
}

// 初期状態は常に空（サーバーとクライアントで一致させる）
const initialState: AppState = { apps: [], activeAppIds: [] };

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
    setActiveApp: (state, action: PayloadAction<string[] | null>) => {
      state.activeAppIds = action.payload ? action.payload : [];
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

export const { addApp, removeApp, setActiveApp, hydrate } = appSlice.actions;
export default appSlice.reducer;
