import { createSlice, createSelector, type WithSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
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
  /**
   * ★ **入れ物に徹する**（CLAUDE.md 規則6）。置く・消すだけ。
   *
   *   前はここに `updateCell` / `addRow` / `deleteRow` / `addColumn` / `deleteColumn` /
   *   `renameColumn` があった。**どれも集約（`CsvSheet`）に同じ名前で同じものがある**うえ、
   *   reducer の中で `new Date()` と `crypto.randomUUID()` を読んでいた
   *   ── **同じ入力で違う結果になる reducer** は、世界線（やり直し）と正面から喧嘩する。
   *   しかも誰も dispatch していなかった（画面は `sheetShell.update((s) => s.updateCell(…))` と
   *   集約を通している）。**複製を消しただけで、動きは 1 つも変わらない。**
   */
  reducers: {
    setSheet: (state, action: PayloadAction<CsvSheetState>) => {
      state.sheets[action.payload.id] = action.payload;
    },
    deleteSheet: (state, action: PayloadAction<string>) => {
      delete state.sheets[action.payload];
    },
  },
});

export const { setSheet, deleteSheet } = csvImporterSlice.actions;

// LazyLoadedSlicesを拡張して型を追加
declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices
    extends WithSlice<typeof csvImporterSlice> {}
}

// 注入（副作用として実行）。口は 1 つ ── `injectSlice` を通す
injectSlice(csvImporterSlice);

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
