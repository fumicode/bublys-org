import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * sekaisen-igo-app をスタンドアロンバブリとしてビルドする設定
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
      name: "SekaisenIgoBubly",
      fileName: () => "bubly.js",
      formats: ["iife"],
    },
    rollupOptions: {
      // 共有依存関係は外部化（ホストアプリから提供される）
      // sekaisen-igo-libs と sekaisen-igo-model はバンドルに含める（完全分離のため）
      external: (id) => {
        // sekaisen-igo-libs と sekaisen-igo-model はバンドルに含める
        if (
          id === "@bublys-org/sekaisen-igo-libs" ||
          id.startsWith("@bublys-org/sekaisen-igo-libs/") ||
          id === "@bublys-org/sekaisen-igo-model" ||
          id.startsWith("@bublys-org/sekaisen-igo-model/")
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
          if (id === "@bublys-org/world-line-graph" || id.startsWith("@bublys-org/world-line-graph/")) {
            return "window.__BUBLYS_SHARED__.WorldLineGraph";
          }
          if (id === "@bublys-org/domain-registry" || id.startsWith("@bublys-org/domain-registry/")) {
            return "window.__BUBLYS_SHARED__.DomainRegistry";
          }
          // MUI関連
          if (id.startsWith("@mui/material")) {
            return "window.__BUBLYS_SHARED__.MuiMaterial";
          }
          // @mui/icons-material/SportsEsports -> window.__BUBLYS_SHARED__.MuiIcons.SportsEsports
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
