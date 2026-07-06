import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";
import type { Size2 } from "@bublys-org/bubbles-ui-util";

export interface EnvironmentState {
  windowSize: Size2;
  lightweightMode: boolean;
}

const initialState: EnvironmentState = {
  windowSize: { width: 0, height: 0 },
  lightweightMode: false,
};

export const environmentSlice = createSlice({
  name: "environment",
  initialState,
  reducers: {
    setWindowSize: (state, action: PayloadAction<Size2>) => {
      state.windowSize = action.payload;
    },
    toggleLightweightMode: (state) => {
      state.lightweightMode = !state.lightweightMode;
    },
  },
});

export const { setWindowSize, toggleLightweightMode } = environmentSlice.actions;

export const selectWindowSize = (state: RootState) =>
  state.environment.windowSize;

export const selectLightweightMode = (state: RootState) =>
  state.environment.lightweightMode;

