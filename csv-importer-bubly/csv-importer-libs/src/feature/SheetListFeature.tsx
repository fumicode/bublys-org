'use client';

import { FC, useContext } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { selectCsvSheetList, setSheet } from "../slice/index.js";
import { SheetListView } from "../ui/SheetListView.js";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { BubblesContext } from "@bublys-org/bubbles-ui";

type SheetListFeatureProps = {
  onSheetSelect?: (sheetId: string) => void;
};

const buildSheetUrl = (sheetId: string) => `csv-importer/sheets/${sheetId}`;

export const SheetListFeature: FC<SheetListFeatureProps> = ({
  onSheetSelect,
}) => {
  const dispatch = useAppDispatch();
  const sheets = useAppSelector(selectCsvSheetList);
  const { openBubble } = useContext(BubblesContext);

  const handleCreateSheet = () => {
    const sheet = CsvSheet.create("新しいシート", ["列1", "列2", "列3"]);
    dispatch(setSheet(sheet.toJSON()));
    openBubble(buildSheetUrl(sheet.id), "root");
  };

  const handleImportCsv = (name: string, csvText: string) => {
    const sheet = CsvSheet.fromCsvText(name, csvText);
    dispatch(setSheet(sheet.toJSON()));
    openBubble(buildSheetUrl(sheet.id), "root");
  };

  const handleSheetClick = (sheetId: string) => {
    onSheetSelect?.(sheetId);
  };

  return (
    <SheetListView
      sheets={sheets}
      buildSheetUrl={buildSheetUrl}
      onSheetClick={handleSheetClick}
      onCreateSheet={handleCreateSheet}
      onImportCsv={handleImportCsv}
    />
  );
};
