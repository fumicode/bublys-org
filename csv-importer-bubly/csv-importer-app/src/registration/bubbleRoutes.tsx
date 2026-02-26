"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import {
  SheetListFeature,
  SheetEditorFeature,
  WorldLineFeature,
  CsvObjectListFeature,
  CsvObjectDetailFeature,
} from "@bublys-org/csv-importer-libs";

// シート一覧バブル
const SheetListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleSheetSelect = (sheetId: string) => {
    openBubble(`csv-importer/sheets/${sheetId}`, bubble.id);
  };
  return <SheetListFeature onSheetSelect={handleSheetSelect} />;
};

// シート編集バブル
const SheetEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <SheetEditorFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />;
};

// オブジェクト一覧バブル
const ObjectListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <CsvObjectListFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />;
};

// オブジェクト詳細バブル
const ObjectDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <CsvObjectDetailFeature sheetId={bubble.params.sheetId} rowId={bubble.params.rowId} />;
};

// 世界線ビューバブル
const WorldLineBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return <WorldLineFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />;
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
