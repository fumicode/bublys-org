"use client";

import { FC, ReactNode, useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import {
  SheetListFeature,
  SheetEditorFeature,
  WorldLineFeature,
  CsvObjectListFeature,
  CsvObjectDetailFeature,
  CsvSheetProvider,
} from "@bublys-org/csv-importer-libs";

/**
 * Google OAuth クライアントID。
 * スタンドアロン（vite.config.mts）・バブリ（vite.config.bubly.ts）どちらのビルドでも
 * Vite が build 時に .env の値へ置換する。未設定なら undefined のまま
 * （= Google Sheets 連携だけが無効になり、他の機能は動く）。
 */
const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * 各バブルは CsvSheetProvider でラップする必要がある。
 * 直接 CsvSheetProvider を書くと googleClientId の指定を忘れて Google Sheets 連携が
 * 無言で死ぬので、必ずこのラッパー経由にする。
 */
const CsvBubbleProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <CsvSheetProvider googleClientId={GOOGLE_CLIENT_ID}>{children}</CsvSheetProvider>
);

// シート一覧バブル
const SheetListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleSheetSelect = (sheetId: string) => {
    openBubble(`csv-importer/sheets/${sheetId}`, bubble.id);
  };
  return (
    <CsvBubbleProvider>
      <SheetListFeature onSheetSelect={handleSheetSelect} />
    </CsvBubbleProvider>
  );
};

// シート編集バブル
const SheetEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      <SheetEditorFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />
    </CsvBubbleProvider>
  );
};

// オブジェクト一覧バブル
const ObjectListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      <CsvObjectListFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />
    </CsvBubbleProvider>
  );
};

// オブジェクト詳細バブル
const ObjectDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      <CsvObjectDetailFeature sheetId={bubble.params.sheetId} rowId={bubble.params.rowId} />
    </CsvBubbleProvider>
  );
};

// 世界線ビューバブル
const WorldLineBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      <WorldLineFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />
    </CsvBubbleProvider>
  );
};

/** CSV Importer のバブルルート定義 */
export const csvImporterBubbleRoutes: BubbleRoute[] = [
  { pattern: "csv-importer/sheets/:sheetId/objects/:rowId", type: "object-detail", Component: ObjectDetailBubble },
  { pattern: "csv-importer/sheets/:sheetId/objects", type: "object-list", Component: ObjectListBubble },
  {
    pattern: "csv-importer/sheets/:sheetId/world-line",
    type: "sheet-world-line",
    bubbleOptions: { contentBackground: "transparent" },
    Component: WorldLineBubble,
  },
  { pattern: "csv-importer/sheets/:sheetId", type: "sheet-editor", Component: SheetEditorBubble },
  { pattern: "csv-importer/sheets", type: "sheet-list", Component: SheetListBubble },
];
