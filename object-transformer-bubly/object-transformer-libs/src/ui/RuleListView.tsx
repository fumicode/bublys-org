'use client';

import { FC } from "react";
import styled from "styled-components";
import type { MappingRuleState } from "@bublys-org/object-transformer-model";

type RuleListViewProps = {
  rules: MappingRuleState[];
  onSelectRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onNavigateToEditor: () => void;
};

export const RuleListView: FC<RuleListViewProps> = ({
  rules,
  onSelectRule,
  onDeleteRule,
  onNavigateToEditor,
}) => {
  return (
    <StyledRuleList>
      <div className="e-header">
        <h3 className="e-title">マッピングルール一覧</h3>
        <button className="e-new-btn" onClick={onNavigateToEditor}>
          新規作成
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="e-empty">ルールがありません</p>
      ) : (
        <ul className="e-list">
          {rules.map((rule) => (
            <li key={rule.id} className="e-item">
              <div
                className="e-rule-card"
                onClick={() => onSelectRule(rule.id)}
              >
                <div className="e-rule-name">{rule.name}</div>
                <div className="e-rule-meta">
                  <span className="e-rule-schema">
                    → {rule.targetSchemaId}
                  </span>
                  <span className="e-rule-count">
                    {rule.mappings.length}フィールド
                  </span>
                </div>
              </div>
              <button
                className="e-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRule(rule.id);
                }}
                title="ルールを削除"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </StyledRuleList>
  );
};

const StyledRuleList = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .e-title {
    margin: 0;
  }

  .e-new-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: #1a73e8;
    color: #fff;
    cursor: pointer;
    font-size: 0.9em;

    &:hover {
      background: #1557b0;
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
    display: flex;
    align-items: center;
    border: 1px solid #eee;
    border-radius: 6px;
    margin-bottom: 8px;
    transition: border-color 0.15s;

    &:hover {
      border-color: #b3d9ff;
    }
  }

  .e-rule-card {
    flex: 1;
    padding: 12px;
    cursor: pointer;
  }

  .e-rule-name {
    font-weight: 600;
    margin-bottom: 4px;
  }

  .e-rule-meta {
    display: flex;
    gap: 12px;
    font-size: 0.8em;
    color: #999;
  }

  .e-delete-btn {
    border: none;
    background: none;
    cursor: pointer;
    color: #ccc;
    font-size: 1.2em;
    padding: 12px;

    &:hover {
      color: #e53935;
    }
  }
`;
