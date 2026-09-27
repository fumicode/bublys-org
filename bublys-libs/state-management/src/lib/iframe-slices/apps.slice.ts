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
    /**
     * ★ **id を作るのは reducer の外**（`prepare`）。
     *   中で `Date.now()` を読んでいたので、**同じ操作をやり直すと違う id**になっていた
     *   ── 世界線（やり直し）が土台のこの場所では、それがいちばん困る。
     *   `prepare` は配るときに 1 回だけ走り、id は action に載って残るので、
     *   同じ action を再生すれば必ず同じ結果になる。呼ぶ側は今までどおり。
     */
    addApp: {
      reducer: (state, action: PayloadAction<AppData>) => {
        state.apps.push(action.payload);
      },
      prepare: (app: Omit<AppData, 'id'>) => ({
        // 時計を読んでよいのはここだけ（配るとき 1 回・prepare）── 下の見張りが見ている
        payload: { ...app, id: Date.now().toString() } as AppData,
      }),
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
