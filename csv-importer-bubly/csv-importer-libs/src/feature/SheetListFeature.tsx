'use client';

import { FC, useContext } from "react";
import { SheetListView } from "../ui/SheetListView.js";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useCsvSheets } from "./CsvSheetProvider.js";

type SheetListFeatureProps = {
  onSheetSelect?: (sheetId: string) => void;
};

const buildSheetUrl = (sheetId: string) => `csv-importer/sheets/${sheetId}`;

export const SheetListFeature: FC<SheetListFeatureProps> = ({
  onSheetSelect,
}) => {
  const { sheetMetas, addSheet, deleteSheet } = useCsvSheets();
  const { openBubble } = useContext(BubblesContext);

  const handleCreateSheet = () => {
    const sheet = CsvSheet.create("新しいシート", ["列1", "列2", "列3"]);
    addSheet(sheet);
    openBubble(buildSheetUrl(sheet.id), "root");
  };

  const handleImportCsv = (name: string, csvText: string) => {
    const sheet = CsvSheet.fromCsvText(name, csvText);
    addSheet(sheet);
    openBubble(buildSheetUrl(sheet.id), "root");
  };

  const handleDeleteSheet = (sheetId: string) => {
    deleteSheet(sheetId);
  };

  const handleSheetClick = (sheetId: string) => {
    onSheetSelect?.(sheetId);
  };

  return (
    <SheetListView
      sheets={sheetMetas}
      buildSheetUrl={buildSheetUrl}
      onSheetClick={handleSheetClick}
      onCreateSheet={handleCreateSheet}
      onImportCsv={handleImportCsv}
      onDeleteSheet={handleDeleteSheet}
    />
  );
};
