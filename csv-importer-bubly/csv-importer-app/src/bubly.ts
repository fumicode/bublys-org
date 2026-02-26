/**
 * Bublys Bubly Entry Point for csv-importer
 *
 * このファイルはスタンドアロンバンドルとしてビルドされ、
 * 動的にロードされるバブリとして動作する
 */

import React from "react";
import { registerBubly, Bubly } from "@bublys-org/bubbles-ui";
import TableChartIcon from "@mui/icons-material/TableChart";

// ライブラリインポート（Redux slice注入の副作用を含む）
import "@bublys-org/csv-importer-libs";

// Bubble Routes
import { csvImporterBubbleRoutes } from "./registration/index.js";

const CsvImporterBubly: Bubly = {
  name: "csv-importer",
  version: "0.0.1",

  menuItems: [
    {
      label: "シート一覧",
      url: "csv-importer/sheets",
      icon: React.createElement(TableChartIcon, { color: "action" }),
    },
  ],

  register(context) {
    context.registerBubbleRoutes(csvImporterBubbleRoutes);
  },

  unregister() {
    // cleanup if needed
  },
};

// 公式APIを使って登録
registerBubly(CsvImporterBubly);

export default CsvImporterBubly;
