'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import type {
  PlaneObjectLike,
  SchemaProperty,
  FieldMapping,
} from "@bublys-org/object-transformer-model";
import { SourcePanel } from "./SourcePanel.js";
import { TargetPanel } from "./TargetPanel.js";

export type MappingEditorViewProps = {
  // ソース
  sourceObject: PlaneObjectLike | null;
  onDropSource: (e: React.DragEvent) => void;
  onDragOverSource: (e: React.DragEvent) => void;
  // ターゲット
  schemaName: string | null;
  targetProperties: SchemaProperty[];
  targetSampleValues: Record<string, string>;
  onDropTarget: (e: React.DragEvent) => void;
  onDragOverTarget: (e: React.DragEvent) => void;
  // マッピング
  mappings: FieldMapping[];
  suggestions: FieldMapping[];
  onMapField: (sourceKey: string, targetProperty: string) => void;
  onUnmapField: (targetProperty: string) => void;
  onAcceptSuggestion: (targetProperty: string) => void;
  // ルール保存
  onSaveRule: (name: string) => void;
  // 全提案を適用
  onAcceptAllSuggestions?: () => void;
};

const FIELD_DND_TYPE = "application/x-object-transformer-field";

export const MappingEditorView: FC<MappingEditorViewProps> = ({
  sourceObject,
  onDropSource,
  onDragOverSource,
  schemaName,
  targetProperties,
  targetSampleValues,
  onDropTarget,
  onDragOverTarget,
  mappings,
  suggestions,
  onMapField,
  onUnmapField,
  onAcceptSuggestion,
  onSaveRule,
  onAcceptAllSuggestions,
}) => {
  const [ruleName, setRuleName] = useState("");
  const mappedSourceKeys = mappings.map((m) => m.sourceKey);

  // ソースフィールドのドラッグ開始
  const handleDragStartField = (sourceKey: string, e: React.DragEvent) => {
    e.dataTransfer.setData(FIELD_DND_TYPE, sourceKey);
    e.dataTransfer.effectAllowed = "link";
  };

  // ターゲットスロットへのドロップ
  const handleDropOnSlot = (targetProperty: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceKey = e.dataTransfer.getData(FIELD_DND_TYPE);
    if (sourceKey) {
      onMapField(sourceKey, targetProperty);
    }
  };

  const handleDragOverSlot = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "link";
  };

  // 未マッピングの提案を抽出（既にマッピング済みのターゲットは除く）
  const activeSuggestions = suggestions.filter(
    (s) => !mappings.some((m) => m.targetProperty === s.targetProperty)
  );

  const canSave = sourceObject && schemaName && mappings.length > 0;

  return (
    <StyledMappingEditor>
      <div className="e-panels">
        <div className="e-panel-left">
          <h3 className="e-panel-title">ソース（PlaneObject）</h3>
          <SourcePanel
            sourceObject={sourceObject}
            mappedSourceKeys={mappedSourceKeys}
            onDropSource={onDropSource}
            onDragOverSource={onDragOverSource}
            onDragStartField={handleDragStartField}
          />
        </div>
        <div className="e-panel-right">
          <h3 className="e-panel-title">ターゲット（ドメインオブジェクト）</h3>
          <TargetPanel
            schemaName={schemaName}
            properties={targetProperties}
            mappings={mappings}
            suggestions={activeSuggestions}
            targetSampleValues={targetSampleValues}
            onDropTarget={onDropTarget}
            onDragOverTarget={onDragOverTarget}
            onDropOnSlot={handleDropOnSlot}
            onDragOverSlot={handleDragOverSlot}
            onUnmapField={onUnmapField}
            onAcceptSuggestion={onAcceptSuggestion}
          />
        </div>
      </div>

      {activeSuggestions.length > 0 && onAcceptAllSuggestions && (
        <div className="e-suggestions-bar">
          <span className="e-suggestions-count">
            {activeSuggestions.length}件の提案があります
          </span>
          <button
            className="e-accept-all-btn"
            onClick={onAcceptAllSuggestions}
          >
            すべて適用
          </button>
        </div>
      )}

      {canSave && (
        <div className="e-save-bar">
          <input
            className="e-rule-name-input"
            type="text"
            placeholder="ルール名を入力..."
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
          />
          <button
            className="e-save-btn"
            disabled={!ruleName.trim()}
            onClick={() => {
              onSaveRule(ruleName.trim());
              setRuleName("");
            }}
          >
            ルールを保存
          </button>
        </div>
      )}
    </StyledMappingEditor>
  );
};

const StyledMappingEditor = styled.div`
  .e-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .e-panel-title {
    font-size: 0.9em;
    color: #666;
    margin: 0 0 8px 0;
  }

  .e-suggestions-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    margin-top: 12px;
    background: #fff8e1;
    border: 1px solid #ffc107;
    border-radius: 6px;
  }

  .e-suggestions-count {
    font-size: 0.85em;
    color: #f57f17;
  }

  .e-accept-all-btn {
    font-size: 0.8em;
    padding: 4px 12px;
    border: 1px solid #ffc107;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    color: #f57f17;

    &:hover {
      background: #ffc107;
      color: #fff;
    }
  }

  .e-save-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #fafafa;
  }

  .e-rule-name-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9em;

    &:focus {
      outline: none;
      border-color: #1a73e8;
    }
  }

  .e-save-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: #1a73e8;
    color: #fff;
    cursor: pointer;
    font-size: 0.9em;

    &:disabled {
      background: #ccc;
      cursor: default;
    }

    &:not(:disabled):hover {
      background: #1557b0;
    }
  }
`;
