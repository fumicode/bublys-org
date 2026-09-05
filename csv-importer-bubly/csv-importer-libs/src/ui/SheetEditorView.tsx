'use client';

import { FC, ReactNode, useState, useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import { setDragPayload, getDragType } from "@bublys-org/bubbles-ui";
import type { CsvColumnState, CsvRowState, PlaneObject } from "@bublys-org/csv-importer-model";

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
  /** オブジェクト表示で使う。行 → PlaneObject（行と同じ並び）。 */
  objects?: PlaneObject[];
  /** どの列を「名前」にするか。オブジェクト表示でそのセルを強調する。 */
  titleColumnId?: string;
  onChangeTitleColumn?: (columnId: string) => void;
  /** オブジェクト表示で行をクリックしたとき（詳細を開く）。 */
  onSelectObject?: (objectId: string) => void;
  /** 行 → ドラッグで渡す URL。 */
  buildObjectUrl?: (objectId: string) => string;
  onOpenWorldLine?: () => void;
  onExportCsv?: () => void;
  googleSheetsPanel?: ReactNode;
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
  objects,
  titleColumnId,
  onChangeTitleColumn,
  onSelectObject,
  buildObjectUrl,
  onOpenWorldLine,
  onExportCsv,
  googleSheetsPanel,
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingHeader, setEditingHeader] = useState<EditingHeader | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showSheetsPanel, setShowSheetsPanel] = useState(false);
  // 表 ⇄ オブジェクト の表示切り替え。骨格（列・行・セル位置）は共通で、
  // 行の「意味」（掴めるオブジェクトかどうか）だけが変わる。
  const [isObjectMode, setIsObjectMode] = useState(false);
  const canShowObjects = !!objects && !!buildObjectUrl;
  const objectMode = isObjectMode && canShowObjects;
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
          {canShowObjects && (
            <button
              className={`e-objects-btn ${objectMode ? "active" : ""}`}
              onClick={() => setIsObjectMode((v) => !v)}
              title={objectMode ? "表に戻す" : "行を掴めるオブジェクトとして表示する"}
            >
              オブジェクト
            </button>
          )}
          {onExportCsv && (
            <button className="e-export-btn" onClick={onExportCsv}>
              エクスポート
            </button>
          )}
          {googleSheetsPanel && (
            <button
              className={`e-sheets-btn ${showSheetsPanel ? "active" : ""}`}
              onClick={() => setShowSheetsPanel((v) => !v)}
            >
              Sheets
            </button>
          )}
          {onOpenWorldLine && (
            <button className="e-worldline-btn" onClick={onOpenWorldLine}>
              世界線
            </button>
          )}
        </div>
      </div>

      {showSheetsPanel && googleSheetsPanel}

      <div className="e-table-wrapper">
        <table className="e-table">
          <thead>
            <tr>
              <th className="e-row-num">
                <span className="e-row-num-inner">
                  <span className="e-drag-handle" style={{ visibility: "hidden" }} aria-hidden>
                    ⠿
                  </span>
                  <span className="e-row-index">#</span>
                </span>
              </th>
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
                        style={objectMode ? { visibility: "hidden" } : undefined}
                        tabIndex={objectMode ? -1 : undefined}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </th>
              ))}
              <th className="e-add-col">
                <button
                  onClick={handleAddColumn}
                  title="列を追加"
                  style={objectMode ? { visibility: "hidden" } : undefined}
                  tabIndex={objectMode ? -1 : undefined}
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const obj = objects?.[rowIdx];
              return (
              <tr
                key={row.id}
                className={objectMode ? "is-object" : ""}
                draggable={objectMode}
                onDragStart={
                  objectMode && obj && buildObjectUrl
                    ? (e) => {
                        // ObjectView と同じ規約: 型つきドラッグ + application/json で実データも運ぶ
                        setDragPayload(e, {
                          type: getDragType("CsvObject"),
                          url: buildObjectUrl(row.id),
                          label: String(obj.name),
                          objectId: row.id,
                        });
                        e.dataTransfer.setData("application/json", JSON.stringify(obj));
                      }
                    : undefined
                }
              >
                <td className="e-row-num">
                  {/* 行番号は位置の目印なので常に出す。つまみは表示のときも
                      visibility: hidden で場所だけ確保し、番号が動かないようにする。 */}
                  <span className="e-row-num-inner">
                    <span
                      className="e-drag-handle"
                      title="ドラッグして他のバブリへ渡す"
                      style={objectMode ? undefined : { visibility: "hidden" }}
                      aria-hidden={!objectMode}
                    >
                      ⠿
                    </span>
                    <span className="e-row-index">{rowIdx + 1}</span>
                  </span>
                </td>
                {columns.map((col) => {
                  const value = row.cells[col.id] ?? "";
                  const isEditing =
                    editingCell?.rowId === row.id &&
                    editingCell?.columnId === col.id;
                  const isTitle = objectMode && titleColumnId === col.id;
                  return (
                    <td
                      key={col.id}
                      className={`e-cell ${isTitle ? "is-title" : ""}`}
                    >
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
                          onClick={() =>
                            objectMode
                              ? onSelectObject?.(row.id)
                              : handleCellClick(row.id, col.id, value)
                          }
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
                    style={objectMode ? { visibility: "hidden" } : undefined}
                    tabIndex={objectMode ? -1 : undefined}
                  >
                    ×
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="e-footer-actions">
        <button className="e-btn" onClick={onAddRow}>
          + 行を追加
        </button>
        {/* オブジェクト表示の操作は表の「下」に置く。上に置くと表がその分だけ
            下へずれ、切り替えのたびに値の位置が動いてしまうため。 */}
        {objectMode && onChangeTitleColumn && (
          <div className="e-object-bar">
            <span className="e-object-hint">⠿ を掴んでドラッグ</span>
            <label className="e-title-col">
              名前列
              <select
                value={titleColumnId ?? ""}
                onChange={(e) => onChangeTitleColumn(e.target.value)}
              >
                <option value="">（行番号）</option>
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
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

  .e-objects-btn {
    padding: 4px 12px;
    border: 1px solid #ce93d8;
    border-radius: 4px;
    background: #f3e5f5;
    color: #7b1fa2;
    cursor: pointer;
    font-size: 0.8em;
    white-space: nowrap;

    &:hover {
      background: #e1bee7;
    }

    &.active {
      background: #7b1fa2;
      border-color: #7b1fa2;
      color: #fff;
    }
  }

  .e-footer-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    /* フッターが表より広くならないように（bubble は fit-content なので、
       ここが広いと表ごと横に伸びて列位置が動く）。 */
    max-width: 100%;
    min-width: 0;
  }

  .e-object-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 100%;
    min-width: 0;
    padding: 4px 10px;
    border: 1px solid #e1bee7;
    border-radius: 4px;
    background: #faf5fc;
    font-size: 0.8em;
    color: #7b1fa2;
  }

  .e-object-hint {
    /* nowrap にするとバーの最小幅が表より広くなり、bubble（fit-content）が
       横に伸びて列位置がずれる。折り返しを許して幅を表側に決めさせる。 */
    flex: 0 1 auto;
    min-width: 0;
  }

  .e-title-col {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    select {
      font-size: inherit;
      padding: 2px 4px;
      border: 1px solid #ce93d8;
      border-radius: 3px;
      background: #fff;
      color: #7b1fa2;
    }
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

  .e-sheets-btn {
    padding: 4px 12px;
    border: 1px solid #34a853;
    border-radius: 4px;
    background: #e6f4ea;
    color: #137333;
    cursor: pointer;
    font-size: 0.8em;
    white-space: nowrap;

    &:hover {
      background: #ceead6;
    }

    &.active {
      background: #34a853;
      color: #fff;
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
      width: 44px;
      background: #f8f8f8;
      color: #999;
      font-size: 0.85em;
      padding: 4px 6px;
    }

    .e-row-num-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2px;
    }

    .e-row-index {
      font-variant-numeric: tabular-nums;
    }

    /* --- オブジェクト表示 --- */
    /* 骨格は表と共通。行の質感とタイトル列の強調だけが変わる。 */
    /* --- 1行＝ひとつのオブジェクト --- */
    /* 「モノ」に見せているのは分離と囲い。ただし行間を実際に空けると値が縦に
       ずれるので、行の高さは変えずに背景の上下 3px だけ透明にした
       グラデーションで塗る。隙間があるように見えて、値は 1px も動かない。
       角丸はこの「隙間」があって初めて効く（隙間なしだと升目の角が丸いだけ）。 */
    tr.is-object {
      cursor: grab;

      td {
        background: linear-gradient(
          to bottom,
          transparent 0 3px,
          #f3e8fa 3px calc(100% - 3px),
          transparent calc(100% - 3px)
        );
        border-color: transparent;
        transition: background 0.12s ease;
      }

      td:first-child {
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
      }

      td:last-child {
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
      }

      /* つまみ側は一段濃く塗って、掴む場所であることを示す */
      .e-row-num {
        background: linear-gradient(
          to bottom,
          transparent 0 3px,
          #e7d3f2 3px calc(100% - 3px),
          transparent calc(100% - 3px)
        );
        color: #7b1fa2;
      }

      .e-cell-value {
        cursor: grab;
      }

      .e-cell.is-title .e-cell-value {
        font-weight: bold;
        color: #6a1b9a;
      }

      &:hover td {
        background: linear-gradient(
          to bottom,
          transparent 0 3px,
          #e9d5f5 3px calc(100% - 3px),
          transparent calc(100% - 3px)
        );
      }

      &:hover .e-row-num {
        background: linear-gradient(
          to bottom,
          transparent 0 3px,
          #d9b6ec 3px calc(100% - 3px),
          transparent calc(100% - 3px)
        );
      }

      &:active {
        cursor: grabbing;
      }
    }

    .e-drag-handle {
      display: inline-block;
      line-height: 1;
      font-size: 1em;
      letter-spacing: -0.15em;
      user-select: none;
      flex: none;
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
