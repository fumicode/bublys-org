'use client';

import { FC, useCallback, useContext, useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { SheetEditorView } from "../ui/SheetEditorView.js";
import { sheetScopeId, popPendingSheet } from "./CsvSheetProvider.js";

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

  const handleOpenWorldLine = useCallback(() => {
    if (bubbleId) {
      openBubble(`csv-importer/sheets/${sheetId}/world-line`, bubbleId);
    }
  }, [openBubble, sheetId, bubbleId]);

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
      onOpenWorldLine={bubbleId ? handleOpenWorldLine : undefined}
    />
  );
};
