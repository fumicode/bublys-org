import {
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit';
import { counterSlice } from "./slices/counter-slice.js";
import {
  bubblesSlice,
} from "@bublys-org/bubbles-ui-state";
import { bubblesListener } from "@bublys-org/bubbles-ui-state";
import { worldSlice } from "./slices/world-slice.js";

// Reducers 定義
const reducers = combineReducers({
  counter: counterSlice.reducer,
  bubbleState: bubblesSlice.reducer,
  worldLine: worldSlice.reducer,
});

// RootState を reducers から推論
export type RootState = ReturnType<typeof reducers>;

// Store 作成関数
export const makeStore = () =>
  configureStore({
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(bubblesListener.middleware),
  });

// ストア、ディスパッチ型
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
