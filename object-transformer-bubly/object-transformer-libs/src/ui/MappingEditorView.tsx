'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import type {
  DomainSchema,
  FieldMapping,
  SourceLeaf,
} from "@bublys-org/object-transformer-model";
import { SourcePanel } from "./SourcePanel.js";
import { TargetPanel } from "./TargetPanel.js";

export type MappingEditorViewProps = {
  sourceLabel: string | null;
  sourceLeaves: SourceLeaf[];
  targetLabel: string | null;
  targetSchema: DomainSchema | null;
  mappings: FieldMapping[];
  suggestions: FieldMapping[];
  onDropSource: (e: React.DragEvent) => void;
  onDropTarget: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onMapField: (sourcePath: string, targetPath: string) => void;
  onUnmapField: (targetPath: string) => void;
  onAcceptSuggestion: (targetPath: string) => void;
  onAcceptAllSuggestions: () => void;
  onSaveRule: (name: string) => void;
};

const FIELD_DND_TYPE = "application/x-object-transformer-field";

export const MappingEditorView: FC<MappingEditorViewProps> = ({
  sourceLabel,
  sourceLeaves,
  targetLabel,
  targetSchema,
  mappings,
  suggestions,
  onDropSource,
  onDropTarget,
  onDragOver,
  onMapField,
  onUnmapField,
  onAcceptSuggestion,
  onAcceptAllSuggestions,
  onSaveRule,
}) => {
  const [ruleName, setRuleName] = useState("");
  const mappedSourcePaths = mappings.map((m) => m.sourcePath);

  const handleDragStartField = (sourcePath: string, e: React.DragEvent) => {
    e.dataTransfer.setData(FIELD_DND_TYPE, sourcePath);
    e.dataTransfer.effectAllowed = "link";
  };

  const handleDropOnSlot = (targetPath: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sourcePath = e.dataTransfer.getData(FIELD_DND_TYPE);
    if (sourcePath) onMapField(sourcePath, targetPath);
  };

  const handleDragOverSlot = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "link";
  };

  const activeSuggestions = suggestions.filter(
    (s) => !mappings.some((m) => m.targetPath === s.targetPath)
  );

  const canSave = sourceLabel && targetSchema && mappings.length > 0;

  return (
    <StyledMappingEditor>
      <div className="e-panels">
        <div className="e-panel-left">
          <h3 className="e-panel-title">ソース</h3>
          <SourcePanel
            sourceLabel={sourceLabel}
            sourceLeaves={sourceLeaves}
            mappedSourcePaths={mappedSourcePaths}
            onDropSource={onDropSource}
            onDragOverSource={onDragOver}
            onDragStartField={handleDragStartField}
          />
        </div>
        <div className="e-panel-right">
          <h3 className="e-panel-title">ターゲット</h3>
          <TargetPanel
            targetLabel={targetLabel}
            targetShape={targetSchema?.root ?? null}
            mappings={mappings}
            suggestions={activeSuggestions}
            onDropTarget={onDropTarget}
            onDragOverTarget={onDragOver}
            onDropOnSlot={handleDropOnSlot}
            onDragOverSlot={handleDragOverSlot}
            onUnmapField={onUnmapField}
            onAcceptSuggestion={onAcceptSuggestion}
          />
        </div>
      </div>

      {activeSuggestions.length > 0 && (
        <div className="e-suggestions-bar">
          <span className="e-suggestions-count">
            {activeSuggestions.length}件の提案があります
          </span>
          <button className="e-accept-all-btn" onClick={onAcceptAllSuggestions}>
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
