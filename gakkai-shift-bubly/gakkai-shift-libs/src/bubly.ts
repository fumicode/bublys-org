/**
 * Bublys Bubly Entry Point for gakkai-shift
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import EventNoteIcon from "@mui/icons-material/EventNote";

// Bubble Routes
import { gakkaiShiftBubbleRoutes } from "./registration/index.js";

// バブリインターフェース
type BublyMenuItem = {
  label: string;
  url: string | (() => string);
  icon: React.ReactNode;
};

type Bubly = {
  name: string;
  version: string;
  menuItems?: BublyMenuItem[];
  register: (context: BublyContext) => void;
  unregister?: () => void;
};

type BublyContext = {
  registerBubbleRoutes: (routes: BubbleRoute[]) => void;
  injectSlice: (slice: unknown) => void;
};

const GakkaiShiftBubly: Bubly = {
  name: "gakkai-shift",
  version: "0.0.1",

  menuItems: [
    {
      label: "スタッフ一覧",
      url: "gakkai-shift/staffs",
      icon: React.createElement(EventNoteIcon, { color: "action" }),
    },
    {
      label: "シフト配置表",
      url: "gakkai-shift/shift-plans",
      icon: React.createElement(EventNoteIcon, { color: "primary" }),
    },
  ],

  register(context: BublyContext) {
    console.log("[GakkaiShiftBubly] Registering...");

    // NOTE: Redux slicesはsliceファイルのimport時に自動注入される（injectIntoパターン）
    // gakkai-shift-slice.ts と shift-plan-slice.ts が読み込まれた時点で注入済み
    console.log("[GakkaiShiftBubly] Slices auto-injected: gakkaiShift, shiftPlan");

    // Bubble routesを登録
    context.registerBubbleRoutes(gakkaiShiftBubbleRoutes);
    console.log("[GakkaiShiftBubly] Registered", gakkaiShiftBubbleRoutes.length, "bubble routes");

    console.log("[GakkaiShiftBubly] Registration complete");
  },

  unregister() {
    console.log("[GakkaiShiftBubly] Unregistering...");
  },
};

// グローバルに登録
declare global {
  interface Window {
    __BUBLYS_BUBLIES__?: Record<string, Bubly>;
  }
}

window.__BUBLYS_BUBLIES__ = window.__BUBLYS_BUBLIES__ || {};
window.__BUBLYS_BUBLIES__["gakkai-shift"] = GakkaiShiftBubly;

console.log("[GakkaiShiftBubly] Bubly loaded and registered to window.__BUBLYS_BUBLIES__");

export default GakkaiShiftBubly;
