'use client';

import { FC, useState, useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import type { CsvColumnState, CsvRowState } from "@bublys-org/csv-importer-model";

type SheetEditorViewProps = {
  sheetName: string;
  columns: CsvColumnState[];
  rows: CsvRowState[];
  onUpdateCell: (rowId: string, columnId: string, value: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onAddColumn: (name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onOpenWorldLine?: () => void;
  onExportCsv?: () => void;
};

type EditingCell = {
  rowId: string;
  columnId: string;
};

type EditingHeader = {
  columnId: string;
};

export const SheetEditorView: FC<SheetEditorViewProps> = ({
  sheetName,
  columns,
  rows,
  onUpdateCell,
  onRenameColumn,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onDeleteColumn,
  onOpenWorldLine,
  onExportCsv,
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingHeader, setEditingHeader] = useState<EditingHeader | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commitEditing = useCallback(() => {
    if (editingCell) {
      onUpdateCell(editingCell.rowId, editingCell.columnId, editValue);
      setEditingCell(null);
    }
    if (editingHeader) {
      onRenameColumn(editingHeader.columnId, editValue);
      setEditingHeader(null);
    }
  }, [editingCell, editingHeader, editValue, onUpdateCell, onRenameColumn]);

  useEffect(() => {
    if (editingCell || editingHeader) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingCell, editingHeader]);

  // Ctrl+S: 編集中のセルを確定（ブラウザのデフォルト保存を防止）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        commitEditing();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [commitEditing]);

  const handleCellClick = (rowId: string, columnId: string, currentValue: string) => {
    commitEditing();
    setEditingCell({ rowId, columnId });
    setEditValue(currentValue);
  };

  const handleHeaderClick = (columnId: string, currentName: string) => {
    commitEditing();
    setEditingHeader({ columnId });
    setEditValue(currentName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitEditing();
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditingHeader(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      commitEditing();
      // Tab で次のセルへ移動
      if (editingCell) {
        const colIdx = columns.findIndex((c) => c.id === editingCell.columnId);
        const rowIdx = rows.findIndex((r) => r.id === editingCell.rowId);
        if (colIdx < columns.length - 1) {
          // 次のカラムへ
          const nextCol = columns[colIdx + 1];
          const currentVal = rows[rowIdx].cells[nextCol.id] ?? "";
          setEditingCell({ rowId: editingCell.rowId, columnId: nextCol.id });
          setEditValue(currentVal);
        } else if (rowIdx < rows.length - 1) {
          // 次の行の最初のカラムへ
          const nextRow = rows[rowIdx + 1];
          const firstCol = columns[0];
          const currentVal = nextRow.cells[firstCol.id] ?? "";
          setEditingCell({ rowId: nextRow.id, columnId: firstCol.id });
          setEditValue(currentVal);
        }
      }
    }
  };

  const handleAddColumn = () => {
    const name = `列${columns.length + 1}`;
    onAddColumn(name);
  };

  return (
    <StyledEditor>
      <div className="e-header">
        <h3 className="e-title">{sheetName}</h3>
        <div className="e-header-actions">
          {onExportCsv && (
            <button className="e-export-btn" onClick={onExportCsv}>
              エクスポート
            </button>
          )}
          {onOpenWorldLine && (
            <button className="e-worldline-btn" onClick={onOpenWorldLine}>
              世界線
            </button>
          )}
        </div>
      </div>

      <div className="e-table-wrapper">
        <table className="e-table">
          <thead>
            <tr>
              <th className="e-row-num">#</th>
              {columns.map((col) => (
                <th key={col.id} className="e-header-cell">
                  {editingHeader?.columnId === col.id ? (
                    <input
                      ref={inputRef}
                      className="e-input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEditing}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <div className="e-header-content">
                      <span
                        className="e-header-name"
                        onClick={() => handleHeaderClick(col.id, col.name)}
                      >
                        {col.name}
                      </span>
                      <button
                        className="e-delete-col"
                        onClick={() => onDeleteColumn(col.id)}
                        title="列を削除"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </th>
              ))}
              <th className="e-add-col">
                <button onClick={handleAddColumn} title="列を追加">+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.id}>
                <td className="e-row-num">{rowIdx + 1}</td>
                {columns.map((col) => {
                  const value = row.cells[col.id] ?? "";
                  const isEditing =
                    editingCell?.rowId === row.id &&
                    editingCell?.columnId === col.id;
                  return (
                    <td key={col.id} className="e-cell">
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          className="e-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEditing}
                          onKeyDown={handleKeyDown}
                        />
                      ) : (
                        <div
                          className="e-cell-value"
                          onClick={() => handleCellClick(row.id, col.id, value)}
                        >
                          {value || "\u00A0"}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="e-row-actions">
                  <button
                    className="e-delete-row"
                    onClick={() => onDeleteRow(row.id)}
                    title="行を削除"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="e-footer-actions">
        <button className="e-btn" onClick={onAddRow}>
          + 行を追加
        </button>
      </div>
    </StyledEditor>
  );
};

const StyledEditor = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .e-title {
    margin: 0;
  }

  .e-header-actions {
    display: flex;
    gap: 8px;
  }

  .e-export-btn {
    padding: 4px 12px;
    border: 1px solid #a5d6a7;
    border-radius: 4px;
    background: #e8f5e9;
    color: #2e7d32;
    cursor: pointer;
    font-size: 0.8em;
    white-space: nowrap;

    &:hover {
      background: #c8e6c9;
    }
  }

  .e-worldline-btn {
    padding: 4px 12px;
    border: 1px solid #90caf9;
    border-radius: 4px;
    background: #e3f2fd;
    color: #1565c0;
    cursor: pointer;
    font-size: 0.8em;
    white-space: nowrap;

    &:hover {
      background: #bbdefb;
    }
  }

  .e-table-wrapper {
    overflow-x: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .e-table {
    border-collapse: collapse;
    width: 100%;
    min-width: 400px;
    font-size: 0.9em;

    th,
    td {
      border: 1px solid #ddd;
      padding: 0;
    }

    .e-row-num {
      width: 40px;
      text-align: center;
      background: #f8f8f8;
      color: #999;
      font-size: 0.85em;
      padding: 4px;
    }
  }

  .e-header-cell {
    background: #f0f0f0;
    min-width: 120px;

    .e-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
    }

    .e-header-name {
      cursor: pointer;
      flex: 1;
      font-weight: bold;

      &:hover {
        background: #e0e0e0;
        border-radius: 2px;
      }
    }

    .e-delete-col {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 1em;
      padding: 0 4px;
      line-height: 1;

      &:hover {
        color: #d32f2f;
      }
    }
  }

  .e-add-col {
    width: 32px;
    background: #f8f8f8;

    button {
      background: none;
      border: none;
      cursor: pointer;
      color: #1976d2;
      font-size: 1.2em;
      padding: 4px 8px;

      &:hover {
        background: #e3f2fd;
        border-radius: 2px;
      }
    }
  }

  .e-cell {
    min-width: 120px;

    .e-cell-value {
      padding: 4px 8px;
      cursor: text;
      min-height: 24px;

      &:hover {
        background: #f9f9f9;
      }
    }
  }

  .e-input {
    width: 100%;
    border: none;
    outline: 2px solid #1976d2;
    padding: 4px 8px;
    font-size: inherit;
    font-family: inherit;
    box-sizing: border-box;
  }

  .e-row-actions {
    width: 32px;
    text-align: center;
    background: #f8f8f8;
    border: none !important;

    .e-delete-row {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 1em;
      padding: 4px;

      &:hover {
        color: #d32f2f;
      }
    }
  }

  .e-footer-actions {
    margin-top: 8px;

    .e-btn {
      padding: 4px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      font-size: 0.85em;

      &:hover {
        background: #f5f5f5;
      }
    }
  }
`;
