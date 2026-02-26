'use client';

import { FC } from "react";
import styled from "styled-components";
import TableChartIcon from "@mui/icons-material/TableChart";
import { ObjectView } from "@bublys-org/bubbles-ui";

/** シート一覧に表示するための最小情報 */
export type SheetListItem = {
  id: string;
  name: string;
};

type SheetListViewProps = {
  sheets: SheetListItem[];
  buildSheetUrl: (sheetId: string) => string;
  onSheetClick?: (sheetId: string) => void;
  onCreateSheet?: () => void;
  onImportCsv?: (name: string, csvText: string) => void;
};

export const SheetListView: FC<SheetListViewProps> = ({
  sheets,
  buildSheetUrl,
  onSheetClick,
  onCreateSheet,
  onImportCsv,
}) => {
  const handleFileImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const name = file.name.replace(/\.csv$/i, "");
        onImportCsv?.(name, text);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <StyledSheetList>
      <div className="e-actions">
        <button className="e-btn e-btn--primary" onClick={onCreateSheet}>
          + 新規作成
        </button>
        <button className="e-btn" onClick={handleFileImport}>
          CSVインポート
        </button>
      </div>

      {sheets.length === 0 ? (
        <p className="e-empty">シートがありません</p>
      ) : (
        <ul className="e-list">
          {sheets.map((sheet) => (
            <li key={sheet.id} className="e-item">
              <ObjectView
                type="CsvSheet"
                url={buildSheetUrl(sheet.id)}
                label={sheet.name}
                draggable={true}
                onClick={() => onSheetClick?.(sheet.id)}
              >
                <div className="e-content">
                  <TableChartIcon fontSize="small" className="e-icon" />
                  <div className="e-text">
                    <div className="e-name">{sheet.name}</div>
                  </div>
                </div>
              </ObjectView>
            </li>
          ))}
        </ul>
      )}
    </StyledSheetList>
  );
};

const StyledSheetList = styled.div`
  .e-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .e-btn {
    padding: 6px 16px;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    font-size: 0.9em;

    &:hover {
      background: #f5f5f5;
    }

    &.e-btn--primary {
      background: #1976d2;
      color: #fff;
      border-color: #1976d2;

      &:hover {
        background: #1565c0;
      }
    }
  }

  .e-empty {
    color: #666;
    text-align: center;
    padding: 32px;
  }

  .e-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .e-item {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background-color: #f5f5f5;
    }

    &:last-child {
      border-bottom: none;
    }

    .e-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .e-icon {
      color: #666;
      flex-shrink: 0;
    }

    .e-text {
      flex: 1;
      min-width: 0;
    }

    .e-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
