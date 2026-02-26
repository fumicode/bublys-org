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
export interface GoogleSheetsLink {
  spreadsheetId: string;
  sheetName?: string;
  lastSyncedAt?: string;
}

export interface CsvSheetMeta {
  id: string;
  name: string;
  googleSheets?: GoogleSheetsLink;
  titleColumnId?: string;
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
  getSheetMeta: (sheetId: string) => CsvSheetMeta | undefined;
  setTitleColumn: (sheetId: string, columnId: string) => void;
  linkGoogleSheets: (sheetId: string, spreadsheetId: string, sheetName?: string) => void;
  unlinkGoogleSheets: (sheetId: string) => void;
  updateLastSyncedAt: (sheetId: string) => void;
}

const CsvSheetContext = createContext<CsvSheetContextValue | null>(null);

/** Google Client ID を子コンポーネントに提供するコンテキスト */
const GoogleClientIdContext = createContext<string | undefined>(undefined);

export function useGoogleClientId(): string | undefined {
  return useContext(GoogleClientIdContext);
}

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
        shell.update((prev) => ({ ...prev, name }));
      }
    },
    [metaShells]
  );

  // 特定シートのメタを取得
  const getSheetMeta = useCallback(
    (sheetId: string): CsvSheetMeta | undefined => {
      return sheetMetas.find((m) => m.id === sheetId);
    },
    [sheetMetas]
  );

  // タイトル列を設定
  const setTitleColumn = useCallback(
    (sheetId: string, columnId: string) => {
      const shell = metaShells.find((s) => s.id === sheetId);
      if (shell) {
        shell.update((prev) => ({ ...prev, titleColumnId: columnId }));
      }
    },
    [metaShells]
  );

  // Google Sheetsリンクを設定
  const linkGoogleSheets = useCallback(
    (sheetId: string, spreadsheetId: string, sheetName?: string) => {
      const shell = metaShells.find((s) => s.id === sheetId);
      if (shell) {
        shell.update((prev) => ({
          ...prev,
          googleSheets: { spreadsheetId, sheetName },
        }));
      }
    },
    [metaShells]
  );

  // Google Sheetsリンクを解除
  const unlinkGoogleSheets = useCallback(
    (sheetId: string) => {
      const shell = metaShells.find((s) => s.id === sheetId);
      if (shell) {
        shell.update((prev) => {
          const { googleSheets: _, ...rest } = prev;
          return rest as CsvSheetMeta;
        });
      }
    },
    [metaShells]
  );

  // 最終同期日時を更新
  const updateLastSyncedAt = useCallback(
    (sheetId: string) => {
      const shell = metaShells.find((s) => s.id === sheetId);
      if (shell?.object.googleSheets) {
        shell.update((prev) => ({
          ...prev,
          googleSheets: {
            ...prev.googleSheets!,
            lastSyncedAt: new Date().toISOString(),
          },
        }));
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
      getSheetMeta,
      setTitleColumn,
      linkGoogleSheets,
      unlinkGoogleSheets,
      updateLastSyncedAt,
    }),
    [sheetMetas, addSheet, deleteSheet, updateSheetMeta, getSheetMeta, setTitleColumn, linkGoogleSheets, unlinkGoogleSheets, updateLastSyncedAt]
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

type CsvSheetProviderProps = {
  children: React.ReactNode;
  googleClientId?: string;
};

export function CsvSheetProvider({ children, googleClientId }: CsvSheetProviderProps) {
  return (
    <DomainRegistryProvider registry={CSV_DOMAIN_OBJECTS}>
      <GoogleClientIdContext.Provider value={googleClientId}>
        <CsvSheetInner>{children}</CsvSheetInner>
      </GoogleClientIdContext.Provider>
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
