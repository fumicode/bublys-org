'use client';

import { FC, useCallback, useContext, useMemo, useState } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { SheetEditorView } from "../ui/SheetEditorView.js";
import { GoogleSheetsPanel } from "../ui/GoogleSheetsPanel.js";
import { sheetScopeId, popPendingSheet, useCsvSheets, useGoogleClientId } from "./CsvSheetProvider.js";
import { useGoogleSheetsAuth } from "./useGoogleSheetsAuth.js";
import {
  parseSpreadsheetUrl,
  pushToGoogleSheets,
  pullFromGoogleSheets,
} from "./googleSheetsApi.js";

type SheetEditorFeatureProps = {
  sheetId: string;
  bubbleId?: string;
};

/** sheetId に一致する初期CsvSheetを取得（pending → fallback） */
function getInitialSheet(sheetId: string): CsvSheet {
  const pending = popPendingSheet(sheetId);
  if (pending) return pending;

  // フォールバック: scopeにデータがない場合のデフォルトシート
  const now = new Date().toISOString();
  return new CsvSheet({
    id: sheetId,
    name: "新しいシート",
    columns: [
      { id: crypto.randomUUID(), name: "列1" },
      { id: crypto.randomUUID(), name: "列2" },
      { id: crypto.randomUUID(), name: "列3" },
    ],
    rows: [],
    createdAt: now,
    updatedAt: now,
  });
}

export const SheetEditorFeature: FC<SheetEditorFeatureProps> = ({
  sheetId,
  bubbleId,
}) => {
  const { openBubble } = useContext(BubblesContext);
  const { getSheetMeta, linkGoogleSheets, unlinkGoogleSheets, updateLastSyncedAt } = useCsvSheets();
  const googleClientId = useGoogleClientId();
  const auth = useGoogleSheetsAuth(googleClientId);
  const [isSyncing, setIsSyncing] = useState(false);

  // 初期オブジェクトはマウント時に1回だけ生成
  const initialSheet = useMemo(() => getInitialSheet(sheetId), [sheetId]);

  // シートごとの世界線スコープ
  const scope = useCasScope(sheetScopeId(sheetId), {
    initialObjects: [
      {
        type: "csv-sheet",
        object: initialSheet,
      },
    ],
  });

  const sheetShell = scope.getShell<CsvSheet>("csv-sheet", sheetId);
  const sheet = sheetShell?.object ?? null;

  // セル編集ごとに shell.update() → 自動コミット
  const handleUpdateCell = useCallback(
    (rowId: string, columnId: string, value: string) => {
      sheetShell?.update((s) => s.updateCell(rowId, columnId, value));
    },
    [sheetShell]
  );

  const handleRenameColumn = useCallback(
    (columnId: string, name: string) => {
      sheetShell?.update((s) => s.renameColumn(columnId, name));
    },
    [sheetShell]
  );

  const handleAddRow = useCallback(() => {
    sheetShell?.update((s) => s.addRow());
  }, [sheetShell]);

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      sheetShell?.update((s) => s.deleteRow(rowId));
    },
    [sheetShell]
  );

  const handleAddColumn = useCallback(
    (name: string) => {
      sheetShell?.update((s) => s.addColumn(name));
    },
    [sheetShell]
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      sheetShell?.update((s) => s.deleteColumn(columnId));
    },
    [sheetShell]
  );

  const handleExportCsv = useCallback(() => {
    if (!sheet) return;
    const csvText = sheet.toCsvText();
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sheet]);

  const handleOpenWorldLine = useCallback(() => {
    if (bubbleId) {
      openBubble(`csv-importer/sheets/${sheetId}/world-line`, bubbleId);
    }
  }, [openBubble, sheetId, bubbleId]);

  // --- Google Sheets Sync ---

  const meta = getSheetMeta(sheetId);
  const gsLink = meta?.googleSheets;

  const handleLink = useCallback(
    async (url: string) => {
      try {
        const spreadsheetId = parseSpreadsheetUrl(url);
        await auth.requestAccess();
        linkGoogleSheets(sheetId, spreadsheetId);
      } catch (e) {
        console.error("Google Sheets link failed:", e);
      }
    },
    [auth, sheetId, linkGoogleSheets]
  );

  const handleUnlink = useCallback(() => {
    unlinkGoogleSheets(sheetId);
  }, [sheetId, unlinkGoogleSheets]);

  const handlePush = useCallback(async () => {
    if (!sheet || !gsLink || isSyncing) return;
    setIsSyncing(true);
    try {
      const token = await auth.requestAccess();
      await pushToGoogleSheets(token, gsLink.spreadsheetId, sheet, gsLink.sheetName);
      updateLastSyncedAt(sheetId);
    } catch (e) {
      console.error("Push failed:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [sheet, gsLink, isSyncing, auth, sheetId, updateLastSyncedAt]);

  const handlePull = useCallback(async () => {
    if (!sheet || !gsLink || !sheetShell || isSyncing) return;
    setIsSyncing(true);
    try {
      const token = await auth.requestAccess();
      const updated = await pullFromGoogleSheets(token, gsLink.spreadsheetId, sheet, gsLink.sheetName);
      sheetShell.update(() => updated);
      updateLastSyncedAt(sheetId);
    } catch (e) {
      console.error("Pull failed:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [sheet, gsLink, sheetShell, isSyncing, auth, sheetId, updateLastSyncedAt]);

  if (!sheet) {
    return <div>シートが見つかりません</div>;
  }

  return (
    <SheetEditorView
      sheetName={sheet.name}
      columns={sheet.columns}
      rows={sheet.rows}
      onUpdateCell={handleUpdateCell}
      onRenameColumn={handleRenameColumn}
      onAddRow={handleAddRow}
      onDeleteRow={handleDeleteRow}
      onAddColumn={handleAddColumn}
      onDeleteColumn={handleDeleteColumn}
      onExportCsv={handleExportCsv}
      onOpenWorldLine={bubbleId ? handleOpenWorldLine : undefined}
      googleSheetsPanel={
        <GoogleSheetsPanel
          isLinked={!!gsLink}
          spreadsheetId={gsLink?.spreadsheetId}
          sheetName={gsLink?.sheetName}
          lastSyncedAt={gsLink?.lastSyncedAt}
          isSyncing={isSyncing}
          onLink={handleLink}
          onUnlink={handleUnlink}
          onPush={handlePush}
          onPull={handlePull}
        />
      }
    />
  );
};
