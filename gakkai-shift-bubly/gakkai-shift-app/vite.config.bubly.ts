import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * gakkai-shift-app をスタンドアロンバブリとしてビルドする設定
 *
 * ビルドコマンド:
 *   npx vite build -c vite.config.bubly.ts
 *
 * 出力:
 *   public/bubly.js
 *
 * 規約: バブリは {origin}/bubly.js として配信される
 */
export default defineConfig({
  plugins: [react()],

  define: {
    // styled-componentsなどがprocess.envを参照するため
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },

  build: {
    outDir: "public",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/bubly.ts"),
      name: "GakkaiShiftBubly",
      fileName: () => "bubly.js",
      formats: ["iife"],
    },
    rollupOptions: {
      // 共有依存関係は外部化（ホストアプリから提供される）
      // gakkai-shift-libs と gakkai-shift-model はバンドルに含める（完全分離のため）
      external: (id) => {
        // gakkai-shift-libs と gakkai-shift-model はバンドルに含める
        if (
          id === "@bublys-org/gakkai-shift-libs" ||
          id.startsWith("@bublys-org/gakkai-shift-libs/") ||
          id === "@bublys-org/gakkai-shift-model" ||
          id.startsWith("@bublys-org/gakkai-shift-model/")
        ) {
          return false;
        }
        // react/jsx-runtime はバンドルに含める（自動 JSX ランタイム用）
        if (id === "react/jsx-runtime" || id === "react/jsx-dev-runtime") {
          return false;
        }
        if (
          id === "react" ||
          id === "react-dom" ||
          id.startsWith("react/") ||
          id.startsWith("react-dom/") ||
          id === "@reduxjs/toolkit" ||
          id.startsWith("@reduxjs/toolkit/") ||
          id === "react-redux" ||
          id === "styled-components" ||
          id.startsWith("@bublys-org/") ||
          id.startsWith("@mui/") ||
          id.startsWith("@emotion/")
        ) {
          return true;
        }
        return false;
      },
      output: {
        globals: (id) => {
          // React - グローバル変数を直接参照
          if (id === "react" || id.startsWith("react/")) {
            return "React";
          }
          if (id === "react-dom" || id.startsWith("react-dom/")) {
            return "ReactDOM";
          }
          // styled-components - グローバル変数を直接参照
          if (id === "styled-components") {
            return "styled";
          }
          // Redux Toolkit
          if (id === "@reduxjs/toolkit" || id.startsWith("@reduxjs/toolkit/")) {
            return "window.__BUBLYS_SHARED__.Redux";
          }
          if (id === "react-redux") {
            return "window.__BUBLYS_SHARED__.ReactRedux";
          }
          // 内部パッケージ
          if (id === "@bublys-org/state-management") {
            return "window.__BUBLYS_SHARED__.StateManagement";
          }
          if (id === "@bublys-org/bubbles-ui" || id.startsWith("@bublys-org/bubbles-ui/")) {
            return "window.__BUBLYS_SHARED__.BubblesUI";
          }
          // gakkai-shift-libs はバンドルに含まれるため、ここには来ない
          // MUI関連
          if (id.startsWith("@mui/material")) {
            return "window.__BUBLYS_SHARED__.MuiMaterial";
          }
          // @mui/icons-material/FilterList -> window.__BUBLYS_SHARED__.MuiIcons.FilterList
          if (id.startsWith("@mui/icons-material/")) {
            const iconName = id.replace("@mui/icons-material/", "");
            return `window.__BUBLYS_SHARED__.MuiIcons.${iconName}`;
          }
          if (id === "@mui/icons-material") {
            return "window.__BUBLYS_SHARED__.MuiIcons";
          }
          if (id.startsWith("@mui/")) {
            return "window.__BUBLYS_SHARED__.Mui";
          }
          if (id.startsWith("@emotion/")) {
            return "window.__BUBLYS_SHARED__.Emotion";
          }
          // その他の@bublys-org パッケージ
          if (id.startsWith("@bublys-org/")) {
            console.warn(`[vite] Unknown @bublys-org package: ${id}`);
            return `window.__BUBLYS_SHARED__["${id}"]`;
          }
          return id;
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});
