'use client';

import { FC } from "react";
import styled from "styled-components";
import type { MappingRuleState } from "@bublys-org/object-transformer-model";

type BatchConvertViewProps = {
  rule: MappingRuleState;
  sourceCount: number;
  results: Record<string, unknown>[] | null;
  onConvert: () => void;
  onBack: () => void;
};

export const BatchConvertView: FC<BatchConvertViewProps> = ({
  rule,
  sourceCount,
  results,
  onConvert,
  onBack,
}) => {
  return (
    <StyledBatchConvert>
      <div className="e-header">
        <button className="e-back-btn" onClick={onBack}>
          ← 戻る
        </button>
        <h3 className="e-title">一括変換: {rule.name}</h3>
      </div>

      <div className="e-info">
        <p className="e-info-text">
          マッピング: {rule.mappings.length}フィールド / ソース:{" "}
          {sourceCount}件
        </p>
        <button
          className="e-convert-btn"
          onClick={onConvert}
          disabled={sourceCount === 0}
        >
          変換実行
        </button>
      </div>

      {results && (
        <div className="e-results">
          <h4 className="e-results-title">
            変換結果（{results.length}件）
          </h4>
          <div className="e-results-table-wrap">
            <table className="e-results-table">
              <thead>
                <tr>
                  <th>#</th>
                  {rule.mappings.map((m) => (
                    <th key={m.targetProperty}>{m.targetProperty}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    {rule.mappings.map((m) => (
                      <td key={m.targetProperty}>
                        {String(row[m.targetProperty] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </StyledBatchConvert>
  );
};

const StyledBatchConvert = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .e-back-btn {
    border: none;
    background: none;
    cursor: pointer;
    color: #1a73e8;
    font-size: 0.9em;
    padding: 4px 0;

    &:hover {
      text-decoration: underline;
    }
  }

  .e-title {
    margin: 0;
  }

  .e-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .e-info-text {
    margin: 0;
    color: #666;
    font-size: 0.9em;
  }

  .e-convert-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    background: #4caf50;
    color: #fff;
    cursor: pointer;
    font-size: 0.9em;

    &:disabled {
      background: #ccc;
      cursor: default;
    }

    &:not(:disabled):hover {
      background: #388e3c;
    }
  }

  .e-results {
    margin-top: 16px;
  }

  .e-results-title {
    margin: 0 0 8px 0;
    font-size: 0.95em;
  }

  .e-results-table-wrap {
    overflow-x: auto;
  }

  .e-results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;

    th,
    td {
      padding: 8px 12px;
      border: 1px solid #eee;
      text-align: left;
      white-space: nowrap;
    }

    th {
      background: #f5f5f5;
      font-weight: 600;
      color: #333;
    }

    tr:hover td {
      background-color: #fafafa;
    }
  }
`;
