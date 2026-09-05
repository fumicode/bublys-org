"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import {
  SheetListFeature,
  SheetEditorFeature,
  WorldLineFeature,
  CsvObjectListFeature,
  CsvObjectDetailFeature,
  CsvSheetProvider,
} from "@bublys-org/csv-importer-libs";

// シート一覧バブル
const SheetListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleSheetSelect = (sheetId: string) => {
    openBubble(`csv-importer/sheets/${sheetId}`, bubble.id);
  };
  return (
    <CsvSheetProvider>
      <SheetListFeature onSheetSelect={handleSheetSelect} />
    </CsvSheetProvider>
  );
};

// シート編集バブル
const SheetEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvSheetProvider>
      <SheetEditorFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />
    </CsvSheetProvider>
  );
};

// オブジェクト一覧バブル
const ObjectListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvSheetProvider>
      <CsvObjectListFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />
    </CsvSheetProvider>
  );
};

// オブジェクト詳細バブル
const ObjectDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvSheetProvider>
      <CsvObjectDetailFeature sheetId={bubble.params.sheetId} rowId={bubble.params.rowId} />
    </CsvSheetProvider>
  );
};

// 世界線ビューバブル
const WorldLineBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvSheetProvider>
      <WorldLineFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />
    </CsvSheetProvider>
  );
};

/** CSV Importer のバブルルート定義 */
export const csvImporterBubbleRoutes: BubbleRoute[] = [
  { pattern: "csv-importer/sheets/:sheetId/objects/:rowId", type: "object-detail", Component: ObjectDetailBubble },
  { pattern: "csv-importer/sheets/:sheetId/objects", type: "object-list", Component: ObjectListBubble },
  {
    pattern: "csv-importer/sheets/:sheetId/world-line",
    type: "sheet-world-line",
    // canvas は固有サイズを持たず容器いっぱいに広がるので窓型（fillsContainer）で開く。
    // 世界線はセル編集のたびに右へ伸びるので、高さより幅を取る。
    bubbleOptions: {
      contentBackground: "rgba(15,18,28,0.3)",
      fillsContainer: true,
      defaultSize: { width: 520, height: 340 },
    },
    Component: WorldLineBubble,
  },
  { pattern: "csv-importer/sheets/:sheetId", type: "sheet-editor", Component: SheetEditorBubble },
  { pattern: "csv-importer/sheets", type: "sheet-list", Component: SheetListBubble },
];
