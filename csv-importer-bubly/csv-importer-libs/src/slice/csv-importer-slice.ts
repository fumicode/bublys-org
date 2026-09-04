import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { rootReducer, type RootState } from "@bublys-org/state-management";
import { CsvSheet, type CsvSheetState } from "@bublys-org/csv-importer-model";

// ========== State ==========

type CsvImporterState = {
  sheets: Record<string, CsvSheetState>; // sheetId → state
};

const initialState: CsvImporterState = {
  sheets: {},
};

// ========== Slice ==========

export const csvImporterSlice = createSlice({
  name: "csvImporter",
  initialState,
  reducers: {
    setSheet: (state, action: PayloadAction<CsvSheetState>) => {
      state.sheets[action.payload.id] = action.payload;
    },
    deleteSheet: (state, action: PayloadAction<string>) => {
      delete state.sheets[action.payload];
    },
    updateCell: (
      state,
      action: PayloadAction<{
        sheetId: string;
        rowId: string;
        columnId: string;
        value: string;
      }>
    ) => {
      const { sheetId, rowId, columnId, value } = action.payload;
      const sheet = state.sheets[sheetId];
      if (!sheet) return;
      const row = sheet.rows.find((r) => r.id === rowId);
      if (row) {
        row.cells[columnId] = value;
        sheet.updatedAt = new Date().toISOString();
      }
    },
    addRow: (state, action: PayloadAction<string>) => {
      const sheet = state.sheets[action.payload];
      if (!sheet) return;
      const cells: Record<string, string> = {};
      sheet.columns.forEach((col) => {
        cells[col.id] = "";
      });
      sheet.rows.push({ id: crypto.randomUUID(), cells });
      sheet.updatedAt = new Date().toISOString();
    },
    deleteRow: (
      state,
      action: PayloadAction<{ sheetId: string; rowId: string }>
    ) => {
      const sheet = state.sheets[action.payload.sheetId];
      if (!sheet) return;
      sheet.rows = sheet.rows.filter((r) => r.id !== action.payload.rowId);
      sheet.updatedAt = new Date().toISOString();
    },
    addColumn: (
      state,
      action: PayloadAction<{ sheetId: string; columnName: string }>
    ) => {
      const sheet = state.sheets[action.payload.sheetId];
      if (!sheet) return;
      const newCol = { id: crypto.randomUUID(), name: action.payload.columnName };
      sheet.columns.push(newCol);
      sheet.rows.forEach((row) => {
        row.cells[newCol.id] = "";
      });
      sheet.updatedAt = new Date().toISOString();
    },
    deleteColumn: (
      state,
      action: PayloadAction<{ sheetId: string; columnId: string }>
    ) => {
      const sheet = state.sheets[action.payload.sheetId];
      if (!sheet) return;
      sheet.columns = sheet.columns.filter(
        (c) => c.id !== action.payload.columnId
      );
      sheet.rows.forEach((row) => {
        delete row.cells[action.payload.columnId];
      });
      sheet.updatedAt = new Date().toISOString();
    },
    renameColumn: (
      state,
      action: PayloadAction<{
        sheetId: string;
        columnId: string;
        name: string;
      }>
    ) => {
      const sheet = state.sheets[action.payload.sheetId];
      if (!sheet) return;
      const col = sheet.columns.find(
        (c) => c.id === action.payload.columnId
      );
      if (col) {
        col.name = action.payload.name;
        sheet.updatedAt = new Date().toISOString();
      }
    },
  },
});

export const {
  setSheet,
  deleteSheet,
  updateCell,
  addRow,
  deleteRow,
  addColumn,
  deleteColumn,
  renameColumn,
} = csvImporterSlice.actions;

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices
    extends WithSlice<typeof csvImporterSlice> {}
}

// rootReducerに注入（副作用として実行）
csvImporterSlice.injectInto(rootReducer);

// ========== Selectors ==========

type StateWithCsvImporter = RootState & {
  csvImporter: CsvImporterState;
};

const selectSheetsRecord = (state: StateWithCsvImporter) =>
  state.csvImporter?.sheets ?? {};

/** シート一覧を取得（ドメインオブジェクト） */
export const selectCsvSheetList = createSelector(
  [selectSheetsRecord],
  (sheets): CsvSheet[] =>
    Object.values(sheets).map((json) => CsvSheet.fromJSON(json))
);

/** IDでシートを取得（ドメインオブジェクト） */
export const selectCsvSheetById = (sheetId: string) =>
  createSelector(
    [(state: StateWithCsvImporter) => state.csvImporter?.sheets?.[sheetId]],
    (json): CsvSheet | undefined =>
      json ? CsvSheet.fromJSON(json) : undefined
  );
