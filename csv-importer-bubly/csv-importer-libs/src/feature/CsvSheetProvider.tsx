"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import {
  useCasScope,
  createScope as createScopeAction,
  deleteScope as deleteScopeAction,
} from "@bublys-org/world-line-graph";
import { DomainRegistryProvider, defineDomainObjects } from "@bublys-org/domain-registry";
import { useAppDispatch } from "@bublys-org/state-management";
import { CsvSheet, type CsvSheetState } from "@bublys-org/csv-importer-model";

// ============================================================================
// Sheet scope prefix
// ============================================================================

const SHEET_SCOPE_PREFIX = "csv-sheet-";

export function sheetScopeId(sheetId: string): string {
  return `${SHEET_SCOPE_PREFIX}${sheetId}`;
}

// ============================================================================
// Pending Sheets — 作成〜エディタマウント間のCsvSheetを一時保持
// ============================================================================

const pendingSheets = new Map<string, CsvSheet>();

/** 一時保持されたシートを取得して削除する（1回限り） */
export function popPendingSheet(sheetId: string): CsvSheet | undefined {
  const sheet = pendingSheets.get(sheetId);
  if (sheet) {
    pendingSheets.delete(sheetId);
  }
  return sheet;
}

// ============================================================================
// Domain Objects — 全型のシリアライズ/デシリアライズ設定を1箇所で定義
// ============================================================================

/** シートメタデータ（グローバルスコープで管理） */
interface CsvSheetMeta {
  id: string;
  name: string;
}

const CSV_DOMAIN_OBJECTS = defineDomainObjects({
  "csv-sheet": {
    class: CsvSheet,
    fromJSON: (json) => CsvSheet.fromJSON(json as CsvSheetState),
    toJSON: (s: CsvSheet) => s.toJSON(),
    getId: (s: CsvSheet) => s.id,
  },
  "csv-sheet-meta": {
    class: Object,
    fromJSON: (json) => json as CsvSheetMeta,
    toJSON: (obj: CsvSheetMeta) => obj,
    getId: (obj: CsvSheetMeta) => obj.id,
  },
});

// ============================================================================
// Context — 内部実装。公開APIはフック経由
// ============================================================================

interface CsvSheetContextValue {
  sheetMetas: CsvSheetMeta[];
  addSheet: (sheet: CsvSheet) => void;
  deleteSheet: (sheetId: string) => void;
  updateSheetMeta: (sheetId: string, name: string) => void;
}

const CsvSheetContext = createContext<CsvSheetContextValue | null>(null);

// ============================================================================
// Inner Provider — CasProvider の内側で動作
// ============================================================================

function CsvSheetInner({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  // グローバルスコープ: CsvSheetMeta を管理
  const scope = useCasScope("csv-importer");

  const metaShells = scope.shells<CsvSheetMeta>("csv-sheet-meta");

  const sheetMetas = useMemo(
    () => metaShells.map((s) => s.object),
    [metaShells]
  );

  // シート作成: グローバルにmeta追加 + シート用スコープを作成 + 一時保持
  const addSheet = useCallback(
    (sheet: CsvSheet) => {
      const meta: CsvSheetMeta = { id: sheet.id, name: sheet.name };
      scope.addObject("csv-sheet-meta", meta);
      pendingSheets.set(sheet.id, sheet);
      dispatch(createScopeAction(sheetScopeId(sheet.id)));
    },
    [scope, dispatch]
  );

  // シート削除: グローバルからmeta削除 + シート用スコープを削除
  const deleteSheet = useCallback(
    (sheetId: string) => {
      scope.removeObject("csv-sheet-meta", sheetId);
      dispatch(deleteScopeAction(sheetScopeId(sheetId)));
    },
    [scope, dispatch]
  );

  // シートメタ更新（名前変更時）
  const updateSheetMeta = useCallback(
    (sheetId: string, name: string) => {
      const shell = metaShells.find((s) => s.id === sheetId);
      if (shell) {
        shell.update(() => ({ id: sheetId, name }));
      }
    },
    [metaShells]
  );

  const value = useMemo<CsvSheetContextValue>(
    () => ({
      sheetMetas,
      addSheet,
      deleteSheet,
      updateSheetMeta,
    }),
    [sheetMetas, addSheet, deleteSheet, updateSheetMeta]
  );

  return (
    <CsvSheetContext.Provider value={value}>
      {children}
    </CsvSheetContext.Provider>
  );
}

// ============================================================================
// Provider — DomainRegistryProvider でラップ
// ============================================================================

export function CsvSheetProvider({ children }: { children: React.ReactNode }) {
  return (
    <DomainRegistryProvider registry={CSV_DOMAIN_OBJECTS}>
      <CsvSheetInner>{children}</CsvSheetInner>
    </DomainRegistryProvider>
  );
}

// ============================================================================
// Hooks — 公開API
// ============================================================================

function useContextValue(): CsvSheetContextValue {
  const context = useContext(CsvSheetContext);
  if (!context) {
    throw new Error("useCsvSheets must be used within a CsvSheetProvider");
  }
  return context;
}

/** CSVシート管理のグローバル状態 */
export function useCsvSheets(): CsvSheetContextValue {
  return useContextValue();
}
