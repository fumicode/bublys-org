import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store.js";
import type { Size2 } from "@bublys-org/bubbles-ui-util";

/** バブル間の帯（リンク）をいつ見せるか。hover = どちらかの端のバブルにホバーしたときだけ */
export type LinkDisplay = "hover" | "always";

export interface EnvironmentState {
  windowSize: Size2;
  lightweightMode: boolean;
  linkDisplay: LinkDisplay;
}

const initialState: EnvironmentState = {
  windowSize: { width: 0, height: 0 },
  lightweightMode: false,
  linkDisplay: "hover",
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
    setLinkDisplay: (state, action: PayloadAction<LinkDisplay>) => {
      state.linkDisplay = action.payload;
    },
    toggleLinkDisplay: (state) => {
      state.linkDisplay = state.linkDisplay === "hover" ? "always" : "hover";
    },
  },
});

export const { setWindowSize, toggleLightweightMode, setLinkDisplay, toggleLinkDisplay } =
  environmentSlice.actions;

export const selectWindowSize = (state: RootState) =>
  state.environment.windowSize;

export const selectLightweightMode = (state: RootState) =>
  state.environment.lightweightMode;

export const selectLinkDisplay = (state: RootState): LinkDisplay =>
  state.environment.linkDisplay ?? "hover";
