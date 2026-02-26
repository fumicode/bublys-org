'use client';

import { FC, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectCsvSheetById,
  updateCell,
  renameColumn,
  addRow,
  deleteRow,
  addColumn,
  deleteColumn,
} from "../slice/index.js";
import { SheetEditorView } from "../ui/SheetEditorView.js";

type SheetEditorFeatureProps = {
  sheetId: string;
  onSave?: () => void;
};

export const SheetEditorFeature: FC<SheetEditorFeatureProps> = ({
  sheetId,
  onSave,
}) => {
  const dispatch = useAppDispatch();
  const sheet = useAppSelector(selectCsvSheetById(sheetId));

  const handleUpdateCell = useCallback(
    (rowId: string, columnId: string, value: string) => {
      dispatch(updateCell({ sheetId, rowId, columnId, value }));
    },
    [dispatch, sheetId]
  );

  const handleRenameColumn = useCallback(
    (columnId: string, name: string) => {
      dispatch(renameColumn({ sheetId, columnId, name }));
    },
    [dispatch, sheetId]
  );

  const handleAddRow = useCallback(() => {
    dispatch(addRow(sheetId));
  }, [dispatch, sheetId]);

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      dispatch(deleteRow({ sheetId, rowId }));
    },
    [dispatch, sheetId]
  );

  const handleAddColumn = useCallback(
    (name: string) => {
      dispatch(addColumn({ sheetId, columnName: name }));
    },
    [dispatch, sheetId]
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      dispatch(deleteColumn({ sheetId, columnId }));
    },
    [dispatch, sheetId]
  );

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
      onSave={onSave}
    />
  );
};
