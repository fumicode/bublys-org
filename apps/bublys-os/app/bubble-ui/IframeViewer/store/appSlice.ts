import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppData {
  id: string;
  name: string;
  url: string;
}

export interface AppState {
  apps: AppData[];
  activeAppId: string | null;
}

// ローカルストレージから状態を読み込む
const loadState = (): AppState => {
  try {
    const serializedState = localStorage.getItem('iframeViewerState');
    if (serializedState === null) {
      return { apps: [], activeAppId: null };
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.warn('ローカルストレージからの読み込みに失敗しました', err);
    return { apps: [], activeAppId: null };
  }
};

const initialState: AppState = loadState();

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
      state.apps = state.apps.filter(app => app.id !== action.payload);
      if (state.activeAppId === action.payload) {
        state.activeAppId = null;
      }
    },
    setActiveApp: (state, action: PayloadAction<string | null>) => {
      state.activeAppId = action.payload;
    },
  },
});

// 状態が変更されるたびにローカルストレージに保存するミドルウェア
export const localStorageMiddleware = (store: any) => (next: any) => (action: any) => {
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

export const { addApp, removeApp, setActiveApp } = appSlice.actions;
export default appSlice.reducer;