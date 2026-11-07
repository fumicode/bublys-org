import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * henge-app を**スタンドアロンバブリ**としてビルドする設定。
 *
 * ビルド:  npx vite build -c vite.config.bubly.ts
 * 出力:    public/bubly.js
 *
 * 規約: バブリは {origin}/bubly.js として配信される。
 * 共有依存（react / redux / @bublys-org/* / MUI）はホストが渡すので外に出し、
 * 自分の henge-libs だけは中に抱える（単体で開いても動くように）。
 */
export default defineConfig({
  plugins: [react()],

  define: {
    // styled-components などが process.env を参照するため
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },

  build: {
    outDir: "public",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/bubly.ts"),
      name: "HengeBubly",
      fileName: () => "bubly.js",
      formats: ["iife"],
    },
    rollupOptions: {
      external: (id) => {
        // 自分の libs はバンドルに含める
        if (id === "@bublys-org/henge-libs" || id.startsWith("@bublys-org/henge-libs/")) {
          return false;
        }
        if (id === "@bublys-org/henge-model" || id.startsWith("@bublys-org/henge-model/")) {
          return false;
        }
        // 自動 JSX ランタイムは含める
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
          if (id === "react" || id.startsWith("react/")) return "React";
          if (id === "react-dom" || id.startsWith("react-dom/")) return "ReactDOM";
          if (id === "styled-components") return "styled";
          if (id === "@reduxjs/toolkit" || id.startsWith("@reduxjs/toolkit/")) {
            return "window.__BUBLYS_SHARED__.Redux";
          }
          if (id === "react-redux") return "window.__BUBLYS_SHARED__.ReactRedux";
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
          if (id.startsWith("@mui/material")) return "window.__BUBLYS_SHARED__.MuiMaterial";
          if (id.startsWith("@mui/icons-material/")) {
            const iconName = id.replace("@mui/icons-material/", "");
            return `window.__BUBLYS_SHARED__.MuiIcons.${iconName}`;
          }
          if (id === "@mui/icons-material") return "window.__BUBLYS_SHARED__.MuiIcons";
          if (id.startsWith("@mui/")) return "window.__BUBLYS_SHARED__.Mui";
          if (id.startsWith("@emotion/")) return "window.__BUBLYS_SHARED__.Emotion";
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
