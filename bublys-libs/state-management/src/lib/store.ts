import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { counterSlice } from "./slices/counter-slice.js";
import { bubblesSlice } from "./slices/bubbles-slice.js";
import { worldSlice } from "./slices/world-slice.js";

const reducers = combineReducers({
  counter: counterSlice.reducer,
  bubbleState: bubblesSlice.reducer,
  worldLine: worldSlice.reducer,
});

export const makeStore = () => {
  return configureStore({
    reducer: reducers
  })
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']