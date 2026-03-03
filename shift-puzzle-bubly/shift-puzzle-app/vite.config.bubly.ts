import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * shift-puzzle-app をスタンドアロンバブリとしてビルドする設定
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
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },

  build: {
    outDir: "public",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/bubly.ts"),
      name: "ShiftPuzzleBubly",
      fileName: () => "bubly.js",
      formats: ["iife"],
    },
    rollupOptions: {
      external: (id) => {
        if (
          id === "@bublys-org/shift-puzzle-libs" ||
          id.startsWith("@bublys-org/shift-puzzle-libs/") ||
          id === "@bublys-org/shift-puzzle-model" ||
          id.startsWith("@bublys-org/shift-puzzle-model/")
        ) {
          return false;
        }
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
          if (id === "react" || id.startsWith("react/")) {
            return "React";
          }
          if (id === "react-dom" || id.startsWith("react-dom/")) {
            return "ReactDOM";
          }
          if (id === "styled-components") {
            return "styled";
          }
          if (id === "@reduxjs/toolkit" || id.startsWith("@reduxjs/toolkit/")) {
            return "window.__BUBLYS_SHARED__.Redux";
          }
          if (id === "react-redux") {
            return "window.__BUBLYS_SHARED__.ReactRedux";
          }
          if (id === "@bublys-org/state-management") {
            return "window.__BUBLYS_SHARED__.StateManagement";
          }
          if (id === "@bublys-org/bubbles-ui" || id.startsWith("@bublys-org/bubbles-ui/")) {
            return "window.__BUBLYS_SHARED__.BubblesUI";
          }
          if (id.startsWith("@mui/material")) {
            return "window.__BUBLYS_SHARED__.MuiMaterial";
          }
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
