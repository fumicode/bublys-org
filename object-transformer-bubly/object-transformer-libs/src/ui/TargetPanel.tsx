'use client';

import { FC } from "react";
import styled from "styled-components";
import type { SchemaProperty, FieldMapping } from "@bublys-org/object-transformer-model";

type TargetPanelProps = {
  schemaName: string | null;
  properties: SchemaProperty[];
  mappings: FieldMapping[];
  suggestions: FieldMapping[];
  targetSampleValues: Record<string, string>;
  onDropTarget: (e: React.DragEvent) => void;
  onDragOverTarget: (e: React.DragEvent) => void;
  onDropOnSlot: (targetProperty: string, e: React.DragEvent) => void;
  onDragOverSlot: (e: React.DragEvent) => void;
  onUnmapField: (targetProperty: string) => void;
  onAcceptSuggestion: (targetProperty: string) => void;
};

export const TargetPanel: FC<TargetPanelProps> = ({
  schemaName,
  properties,
  mappings,
  suggestions,
  targetSampleValues,
  onDropTarget,
  onDragOverTarget,
  onDropOnSlot,
  onDragOverSlot,
  onUnmapField,
  onAcceptSuggestion,
}) => {
  if (!schemaName) {
    return (
      <StyledTargetPanel>
        <div
          className="e-dropzone"
          onDrop={onDropTarget}
          onDragOver={onDragOverTarget}
        >
          <p className="e-dropzone-text">
            ドメインオブジェクトをここにドロップ
          </p>
        </div>
      </StyledTargetPanel>
    );
  }

  const getMappingForTarget = (propName: string) =>
    mappings.find((m) => m.targetProperty === propName);

  const getSuggestionForTarget = (propName: string) =>
    suggestions.find((s) => s.targetProperty === propName);

  return (
    <StyledTargetPanel>
      <div className="e-header">
        <h4 className="e-title">{schemaName}</h4>
        <div
          className="e-dropzone-mini"
          onDrop={onDropTarget}
          onDragOver={onDragOverTarget}
        >
          変更
        </div>
      </div>
      <ul className="e-slots">
        {properties.map((prop) => {
          const mapping = getMappingForTarget(prop.name);
          const suggestion = getSuggestionForTarget(prop.name);
          const sampleValue = targetSampleValues[prop.name];

          return (
            <li
              key={prop.name}
              className={`e-slot ${mapping ? "is-mapped" : ""}`}
              onDrop={(e) => onDropOnSlot(prop.name, e)}
              onDragOver={onDragOverSlot}
            >
              <div className="e-slot-header">
                <span className="e-slot-label">
                  {prop.label ?? prop.name}
                </span>
                <span className="e-slot-type">
                  {prop.type}
                  {prop.required ? " *" : ""}
                </span>
              </div>

              <div className="e-slot-content">
                {mapping ? (
                  <div className="e-mapped-value">
                    <span className="e-mapped-source">
                      {mapping.sourceKey}
                    </span>
                    <button
                      className="e-unmap-btn"
                      onClick={() => onUnmapField(prop.name)}
                      title="マッピングを解除"
                    >
                      ×
                    </button>
                  </div>
                ) : suggestion ? (
                  <div className="e-suggestion">
                    <span className="e-suggestion-text">
                      提案: {suggestion.sourceKey}
                    </span>
                    <button
                      className="e-accept-btn"
                      onClick={() => onAcceptSuggestion(prop.name)}
                    >
                      適用
                    </button>
                  </div>
                ) : (
                  <div className="e-empty-slot">
                    {sampleValue && (
                      <span className="e-sample-value">{sampleValue}</span>
                    )}
                    <span className="e-drop-hint">ドロップ</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </StyledTargetPanel>
  );
};

const StyledTargetPanel = styled.div`
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

  .e-slots {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .e-slot {
    padding: 8px 10px;
    border: 1px solid #eee;
    border-radius: 6px;
    margin-bottom: 4px;
    transition: border-color 0.2s, background-color 0.15s;

    &:hover {
      border-color: #b3d9ff;
    }

    &.is-mapped {
      background-color: #f0f7ff;
      border-color: #b3d9ff;
    }
  }

  .e-slot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .e-slot-label {
    font-weight: 600;
    font-size: 0.9em;
    color: #333;
  }

  .e-slot-type {
    font-size: 0.75em;
    color: #999;
  }

  .e-slot-content {
    min-height: 24px;
  }

  .e-mapped-value {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-mapped-source {
    font-size: 0.85em;
    padding: 2px 8px;
    background: #d4edff;
    border-radius: 4px;
    color: #1a73e8;
  }

  .e-unmap-btn {
    border: none;
    background: none;
    cursor: pointer;
    color: #999;
    font-size: 1em;
    padding: 0 4px;

    &:hover {
      color: #e53935;
    }
  }

  .e-suggestion {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px dashed #ffc107;
    border-radius: 4px;
    padding: 4px 8px;
  }

  .e-suggestion-text {
    font-size: 0.8em;
    color: #f57f17;
    flex: 1;
  }

  .e-accept-btn {
    font-size: 0.75em;
    padding: 2px 8px;
    border: 1px solid #ffc107;
    border-radius: 3px;
    background: #fff8e1;
    cursor: pointer;
    color: #f57f17;

    &:hover {
      background: #ffc107;
      color: #fff;
    }
  }

  .e-empty-slot {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 24px;
  }

  .e-sample-value {
    font-size: 0.8em;
    color: #ccc;
    font-style: italic;
  }

  .e-drop-hint {
    font-size: 0.75em;
    color: #ccc;
  }
`;
