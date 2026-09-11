'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  pathToString,
  shapeKindLabel,
  type SchemaField,
  type SchemaShape,
} from "@bublys-org/object-transformer-model";
import type { FieldMapping } from "@bublys-org/object-transformer-model";

type TargetPanelProps = {
  targetLabel: string | null;
  targetShape: SchemaShape | null;
  mappings: FieldMapping[];
  suggestions: FieldMapping[];
  onDropTarget: (e: React.DragEvent) => void;
  onDragOverTarget: (e: React.DragEvent) => void;
  onDropOnSlot: (targetPath: string, e: React.DragEvent) => void;
  onDragOverSlot: (e: React.DragEvent) => void;
  onUnmapField: (targetPath: string) => void;
  onAcceptSuggestion: (targetPath: string) => void;
};

/** リーフフィールド1つを描画（drop zone として機能） */
const LeafFieldRow: FC<{
  path: string;
  field: SchemaField;
  mapping: FieldMapping | undefined;
  suggestion: FieldMapping | undefined;
  onDropOnSlot: (targetPath: string, e: React.DragEvent) => void;
  onDragOverSlot: (e: React.DragEvent) => void;
  onUnmapField: (targetPath: string) => void;
  onAcceptSuggestion: (targetPath: string) => void;
}> = ({
  path,
  field,
  mapping,
  suggestion,
  onDropOnSlot,
  onDragOverSlot,
  onUnmapField,
  onAcceptSuggestion,
}) => (
  <div
    className={`e-slot ${mapping ? "is-mapped" : ""}`}
    onDrop={(e) => onDropOnSlot(path, e)}
    onDragOver={onDragOverSlot}
  >
    <div className="e-slot-header">
      <span className="e-slot-label">{field.label ?? field.name}</span>
      <span className="e-slot-type">
        {shapeKindLabel(field.shape)}
        {field.required ? " *" : ""}
      </span>
    </div>
    <div className="e-slot-content">
      {mapping ? (
        <div className="e-mapped-value">
          <span className="e-mapped-source">{mapping.sourcePath}</span>
          <button
            className="e-unmap-btn"
            onClick={() => onUnmapField(path)}
            title="マッピングを解除"
          >
            ×
          </button>
        </div>
      ) : suggestion ? (
        <div className="e-suggestion">
          <span className="e-suggestion-text">提案: {suggestion.sourcePath}</span>
          <button
            className="e-accept-btn"
            onClick={() => onAcceptSuggestion(path)}
          >
            適用
          </button>
        </div>
      ) : (
        <div className="e-empty-slot">
          <span className="e-drop-hint">ドロップ</span>
        </div>
      )}
    </div>
  </div>
);

/** shape を再帰的に描画する。オブジェクトは折れ込み表示、リーフは drop zone */
const ShapeTree: FC<{
  shape: SchemaShape;
  prefix: readonly string[];
  mappings: FieldMapping[];
  suggestions: FieldMapping[];
  onDropOnSlot: (targetPath: string, e: React.DragEvent) => void;
  onDragOverSlot: (e: React.DragEvent) => void;
  onUnmapField: (targetPath: string) => void;
  onAcceptSuggestion: (targetPath: string) => void;
}> = ({
  shape,
  prefix,
  mappings,
  suggestions,
  onDropOnSlot,
  onDragOverSlot,
  onUnmapField,
  onAcceptSuggestion,
}) => {
  if (shape.kind !== "object") {
    // ルートがオブジェクトでない特殊ケース。単一のリーフとして表示
    const path = pathToString(prefix);
    const field: SchemaField = {
      name: prefix[prefix.length - 1] ?? "value",
      shape,
      required: true,
    };
    return (
      <LeafFieldRow
        path={path}
        field={field}
        mapping={mappings.find((m) => m.targetPath === path)}
        suggestion={suggestions.find((s) => s.targetPath === path)}
        onDropOnSlot={onDropOnSlot}
        onDragOverSlot={onDragOverSlot}
        onUnmapField={onUnmapField}
        onAcceptSuggestion={onAcceptSuggestion}
      />
    );
  }

  return (
    <div className="e-tree">
      {shape.fields.map((field) => {
        const nextPrefix = [...prefix, field.name];
        const path = pathToString(nextPrefix);
        if (field.shape.kind === "object") {
          return (
            <div key={path} className="e-branch">
              <div className="e-branch-header">
                <span className="e-branch-label">{field.label ?? field.name}</span>
                <span className="e-branch-type">object{field.required ? " *" : ""}</span>
              </div>
              <div className="e-branch-body">
                <ShapeTree
                  shape={field.shape}
                  prefix={nextPrefix}
                  mappings={mappings}
                  suggestions={suggestions}
                  onDropOnSlot={onDropOnSlot}
                  onDragOverSlot={onDragOverSlot}
                  onUnmapField={onUnmapField}
                  onAcceptSuggestion={onAcceptSuggestion}
                />
              </div>
            </div>
          );
        }
        return (
          <LeafFieldRow
            key={path}
            path={path}
            field={field}
            mapping={mappings.find((m) => m.targetPath === path)}
            suggestion={suggestions.find((s) => s.targetPath === path)}
            onDropOnSlot={onDropOnSlot}
            onDragOverSlot={onDragOverSlot}
            onUnmapField={onUnmapField}
            onAcceptSuggestion={onAcceptSuggestion}
          />
        );
      })}
    </div>
  );
};

export const TargetPanel: FC<TargetPanelProps> = ({
  targetLabel,
  targetShape,
  mappings,
  suggestions,
  onDropTarget,
  onDragOverTarget,
  onDropOnSlot,
  onDragOverSlot,
  onUnmapField,
  onAcceptSuggestion,
}) => {
  if (!targetShape || targetLabel === null) {
    return (
      <StyledTargetPanel>
        <div
          className="e-dropzone"
          onDrop={onDropTarget}
          onDragOver={onDragOverTarget}
        >
          <p className="e-dropzone-text">ドメインオブジェクトをここにドロップ</p>
        </div>
      </StyledTargetPanel>
    );
  }

  return (
    <StyledTargetPanel>
      <div className="e-header">
        <h4 className="e-title">{targetLabel}</h4>
        <div
          className="e-dropzone-mini"
          onDrop={onDropTarget}
          onDragOver={onDragOverTarget}
        >
          変更
        </div>
      </div>
      <ShapeTree
        shape={targetShape}
        prefix={[]}
        mappings={mappings}
        suggestions={suggestions}
        onDropOnSlot={onDropOnSlot}
        onDragOverSlot={onDragOverSlot}
        onUnmapField={onUnmapField}
        onAcceptSuggestion={onAcceptSuggestion}
      />
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

  .e-tree {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-branch {
    border-left: 2px solid #d0e3ff;
    padding-left: 8px;
    margin-bottom: 4px;
  }

  .e-branch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
  }

  .e-branch-label {
    font-weight: 600;
    color: #333;
    font-size: 0.9em;
  }

  .e-branch-type {
    font-size: 0.75em;
    color: #999;
  }

  .e-branch-body {
    padding-left: 4px;
  }

  .e-slot {
    padding: 8px 10px;
    border: 1px solid #eee;
    border-radius: 6px;
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

  .e-drop-hint {
    font-size: 0.75em;
    color: #ccc;
  }
`;
