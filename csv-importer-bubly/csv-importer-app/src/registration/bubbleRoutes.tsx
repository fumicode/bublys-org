"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { SheetListFeature, SheetEditorFeature } from "@bublys-org/csv-importer-libs";

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
  return <SheetEditorFeature sheetId={bubble.params.sheetId} />;
};

/** CSV Importer のバブルルート定義 */
export const csvImporterBubbleRoutes: BubbleRoute[] = [
  { pattern: "csv-importer/sheets/:sheetId", type: "sheet-editor", Component: SheetEditorBubble },
  { pattern: "csv-importer/sheets", type: "sheet-list", Component: SheetListBubble },
];
