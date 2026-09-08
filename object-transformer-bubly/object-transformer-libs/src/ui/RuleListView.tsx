'use client';

import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import type { MappingRuleState } from "@bublys-org/object-transformer-model";

type RuleListViewProps = {
  rules: MappingRuleState[];
  /** ルールのURLを生成（ダブルクリックで開く先） */
  buildRuleUrl: (ruleId: string) => string;
  onDeleteRule: (ruleId: string) => void;
  onNavigateToEditor: () => void;
};

export const RuleListView: FC<RuleListViewProps> = ({
  rules,
  buildRuleUrl,
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
              <ObjectView
                type="MappingRule"
                url={buildRuleUrl(rule.id)}
                label={rule.name}
                openingPosition="bubble-side-right"
                className="e-rule-card-slot"
              >
                <div className="e-rule-card" title="ダブルクリックで変換を開く">
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
              </ObjectView>
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

  /* ObjectView のラッパ span。.e-item は display:flex なので、
     元の .e-rule-card が持っていた flex:1 はラッパ側に載せる必要がある */
  .e-rule-card-slot {
    flex: 1;
    min-width: 0;
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
