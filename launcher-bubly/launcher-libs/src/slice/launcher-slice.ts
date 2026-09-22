import { createSlice, type PayloadAction, type WithSlice } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import type { LauncherPlain } from "@bublys-org/launcher-model";

/**
 * ランチャーのリポジトリ。保存・取得だけを持ち、並び替えや分割のロジックは
 * {@link Launcher} 集約側にある。feature 層が「取る → 集約のメソッド → toPlain → set」する。
 */
type LaunchersSliceState = {
  list: Record<string, LauncherPlain>;
};

const initialState: LaunchersSliceState = {
  list: {},
};

export const launcherSlice = createSlice({
  name: "launchers",
  initialState,
  reducers: {
    /** 集約を丸ごと保存（新規も更新もこれ） */
    setLauncher: (state, action: PayloadAction<LauncherPlain>) => {
      state.list[action.payload.id] = action.payload;
    },
    removeLauncher: (state, action: PayloadAction<string>) => {
      delete state.list[action.payload];
    },
  },
});

declare module "@bublys-org/state-management" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
  export interface LazyLoadedSlices extends WithSlice<typeof launcherSlice> {}
}

launcherSlice.injectInto(rootReducer);

export const { setLauncher, removeLauncher } = launcherSlice.actions;

type StateWithLaunchers = RootState & { launchers?: LaunchersSliceState };

export const selectLauncherPlain =
  (id: string) =>
  (state: StateWithLaunchers): LauncherPlain | undefined =>
    state.launchers?.list[id];

export const selectAllLauncherPlains = (state: StateWithLaunchers): LauncherPlain[] =>
  Object.values(state.launchers?.list ?? {});
