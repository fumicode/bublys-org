'use client';
/**
 * ★ **バブリの画面としては、もう使っていない。** 行の一覧は並びの空間
 *   （`CsvObjectListFeature` ＋ `CsvObjectCard`）に移った ── 巻物のままだと
 *   ほかの一覧と違って 7 つの並べ方が効かず、余白も箱も自分で抱えることになる。
 *   残してあるのは `docs/bubble-space-prototype/v6-bubly` が
 *   「バブリの本物の画面をそのまま動かす」検証に読んでいるから。
 */

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
  buildObjectUrl: (objectId: string) => string;
  /** この一覧そのものの url。一覧まるごとを掴んで渡すのに要る */
  listUrl: string;
};

export const CsvObjectListView: FC<CsvObjectListViewProps> = ({
  sheetName,
  columns,
  objects,
  titleColumnId,
  onChangeTitleColumn,
  buildObjectUrl,
  listUrl,
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
        {/*
          ★ **一覧まるごとも掴める。** 1 行ずつしか掴めなかったので、
            「この表ぜんぶを変換する」が渡せなかった（変換の相手は 1 件ずつ拾うしかない）。
            渡し方は 1 行のときと同じ規約 ── 型つきのドラッグに `application/json` で
            実データを載せる。載せるのが**行の並び**になるだけ。
        */}
        <div
          className="e-title-grab"
          onDragStart={(e) => {
            e.dataTransfer.setData("application/json", JSON.stringify(objects));
          }}
        >
          <ObjectView
            type="CsvObjectList"
            url={listUrl}
            label={sheetName}
            draggable={true}
            openingPosition="bubble-side-right"
          >
            <h3 className="e-title" title="掴んで渡すと、この表ぜんぶが相手になる">
              {sheetName}
            </h3>
          </ObjectView>
        </div>
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
                  openingPosition="bubble-side-right"
                >
                  <div className="e-card" title="ダブルクリックでオブジェクトを開く">
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
