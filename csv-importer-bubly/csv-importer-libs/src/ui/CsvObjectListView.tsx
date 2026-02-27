'use client';

import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import type { CsvColumnState, PlaneObject } from "@bublys-org/csv-importer-model";

type CsvObjectListViewProps = {
  sheetName: string;
  columns: CsvColumnState[];
  objects: PlaneObject[];
  titleColumnId?: string;
  onChangeTitleColumn: (columnId: string) => void;
  onSelectObject: (objectId: string) => void;
  buildObjectUrl: (objectId: string) => string;
};

export const CsvObjectListView: FC<CsvObjectListViewProps> = ({
  sheetName,
  columns,
  objects,
  titleColumnId,
  onChangeTitleColumn,
  onSelectObject,
  buildObjectUrl,
}) => {
  const getPreviewProperties = (obj: PlaneObject): { key: string; value: string }[] => {
    return Object.entries(obj)
      .filter(([key]) => key !== "id" && key !== "name")
      .slice(0, 3)
      .map(([key, value]) => ({ key, value: String(value) }));
  };

  return (
    <StyledObjectList>
      <div className="e-header">
        <h3 className="e-title">{sheetName}</h3>
        <div className="e-title-selector">
          <label className="e-label">タイトル列:</label>
          <select
            className="e-select"
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
        </div>
      </div>

      {objects.length === 0 ? (
        <p className="e-empty">オブジェクトがありません</p>
      ) : (
        <ul className="e-list">
          {objects.map((obj) => {
            const preview = getPreviewProperties(obj);
            return (
              <li
                key={obj.id}
                className="e-item"
                onDragStart={(e) => {
                  // ObjectViewの標準ペイロードに加えてPlaneObjectデータを載せる
                  e.dataTransfer.setData("application/json", JSON.stringify(obj));
                }}
              >
                <ObjectView
                  type="CsvObject"
                  url={buildObjectUrl(obj.id)}
                  label={obj.name}
                  draggable={true}
                  onClick={() => onSelectObject(obj.id)}
                >
                  <div className="e-card">
                    <div className="e-card-title">{obj.name}</div>
                    {preview.length > 0 && (
                      <div className="e-card-preview">
                        {preview.map((p, i) => (
                          <span key={i} className="e-card-prop">
                            <span className="e-card-key">{p.key}:</span>{" "}
                            <span className="e-card-value">{p.value || "—"}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </ObjectView>
              </li>
            );
          })}
        </ul>
      )}
    </StyledObjectList>
  );
};

const StyledObjectList = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 12px;
  }

  .e-title {
    margin: 0;
  }

  .e-title-selector {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .e-label {
    font-size: 0.85em;
    color: #666;
    white-space: nowrap;
  }

  .e-select {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.85em;
    background: #fff;
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
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }
  }

  .e-card {
    padding: 10px 12px;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background-color: #f5f5f5;
    }
  }

  .e-card-title {
    font-weight: bold;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .e-card-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.85em;
    color: #666;
  }

  .e-card-key {
    color: #999;
  }

  .e-card-value {
    color: #333;
  }
`;
