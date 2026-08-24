'use client';

import { FC } from "react";
import styled from "styled-components";
import type { SourceLeaf } from "@bublys-org/object-transformer-model";

type SourcePanelProps = {
  sourceLabel: string | null;
  sourceLeaves: SourceLeaf[];
  mappedSourcePaths: string[];
  onDropSource: (e: React.DragEvent) => void;
  onDragOverSource: (e: React.DragEvent) => void;
  onDragStartField: (sourcePath: string, e: React.DragEvent) => void;
};

const formatSample = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value) || "—";
};

export const SourcePanel: FC<SourcePanelProps> = ({
  sourceLabel,
  sourceLeaves,
  mappedSourcePaths,
  onDropSource,
  onDragOverSource,
  onDragStartField,
}) => {
  if (sourceLabel === null) {
    return (
      <StyledSourcePanel>
        <div
          className="e-dropzone"
          onDrop={onDropSource}
          onDragOver={onDragOverSource}
        >
          <p className="e-dropzone-text">ソースオブジェクトをここにドロップ</p>
        </div>
      </StyledSourcePanel>
    );
  }

  return (
    <StyledSourcePanel>
      <div className="e-header">
        <h4 className="e-title">{sourceLabel}</h4>
        <div
          className="e-dropzone-mini"
          onDrop={onDropSource}
          onDragOver={onDragOverSource}
        >
          変更
        </div>
      </div>
      <ul className="e-fields">
        {sourceLeaves.map(({ path, label, sampleValue }) => {
          const isMapped = mappedSourcePaths.includes(path);
          return (
            <li
              key={path}
              className={`e-field ${isMapped ? "is-mapped" : ""}`}
              draggable={!isMapped}
              onDragStart={(e) => onDragStartField(path, e)}
            >
              <span className="e-field-key">{label ?? path}</span>
              <span className="e-field-value">{formatSample(sampleValue)}</span>
              {isMapped && <span className="e-mapped-badge">mapped</span>}
            </li>
          );
        })}
      </ul>
    </StyledSourcePanel>
  );
};

const StyledSourcePanel = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  min-height: 200px;

  .e-dropzone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 48px 24px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s;

    &:hover {
      border-color: #999;
    }
  }

  .e-dropzone-text {
    color: #999;
    margin: 0;
  }

  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .e-title {
    margin: 0;
    font-size: 1em;
  }

  .e-dropzone-mini {
    font-size: 0.75em;
    padding: 4px 8px;
    border: 1px dashed #ccc;
    border-radius: 4px;
    cursor: pointer;
    color: #999;

    &:hover {
      border-color: #999;
      color: #666;
    }
  }

  .e-fields {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .e-field {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid #eee;
    border-radius: 6px;
    margin-bottom: 4px;
    cursor: grab;
    transition: background-color 0.15s, opacity 0.15s;

    &:hover {
      background-color: #f0f7ff;
    }

    &.is-mapped {
      opacity: 0.5;
      cursor: default;
      background-color: #f5f5f5;
    }
  }

  .e-field-key {
    font-weight: 600;
    font-size: 0.9em;
    min-width: 80px;
    color: #333;
  }

  .e-field-value {
    font-size: 0.85em;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .e-mapped-badge {
    font-size: 0.7em;
    padding: 2px 6px;
    border-radius: 3px;
    background: #e0e0e0;
    color: #666;
    flex-shrink: 0;
  }
`;
