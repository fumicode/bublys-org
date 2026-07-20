'use client';

import { FC } from "react";
import type { ShiftCell } from "@bublys-org/hotel-shift-puzzle-model";
import styled from "styled-components";

type ShiftSuggestionItem = {
  id: string;
  cell: ShiftCell;
  score: number;
  reasons: string[];
  wouldConcede: boolean;
};

type CellSuggestionPanelProps = {
  staffName: string;
  dayLabel: string;
  suggestions: ShiftSuggestionItem[];
  onAccept: (s: ShiftSuggestionItem) => void;
  onDismiss?: () => void;
};

function formatCellLabel(cell: ShiftCell): string {
  if (cell.kind === "day-off") return "休み";
  if (cell.kind === "undecided") return "未定";
  return cell.shiftId;
}

export const CellSuggestionPanel: FC<CellSuggestionPanelProps> = ({
  staffName,
  dayLabel,
  suggestions,
  onAccept,
  onDismiss,
}) => {
  const top3 = suggestions.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <StyledPanel>
      <div className="e-header">
        <div className="e-title">
          提案: {staffName} / {dayLabel}
        </div>
        {onDismiss && (
          <button
            type="button"
            className="e-dismiss"
            onClick={onDismiss}
            aria-label="閉じる"
          >
            ×
          </button>
        )}
      </div>
      <div className="e-list">
        {top3.map((s, i) => (
          <div key={s.id} className="e-item">
            <div className="e-item-main">
              <span className="e-rank">#{i + 1}</span>
              <span className="e-cell">{formatCellLabel(s.cell)}</span>
              <span className="e-score">{s.score.toFixed(1)}</span>
            </div>
            {s.reasons.length > 0 && (
              <div className="e-reasons">{s.reasons.join(" · ")}</div>
            )}
            {s.wouldConcede && (
              <div className="e-warning">
                ⚠ 制約上の譲歩が必要になる可能性があります
              </div>
            )}
            <button
              type="button"
              className="e-accept"
              onClick={() => onAccept(s)}
            >
              採用
            </button>
          </div>
        ))}
      </div>
    </StyledPanel>
  );
};

const StyledPanel = styled.div`
  margin: 8px 0;
  padding: 10px 12px;
  border: 1px solid #c5cae9;
  border-radius: 8px;
  background: #f5f5ff;

  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .e-title {
    font-size: 0.85em;
    font-weight: 600;
    color: #3949ab;
  }

  .e-dismiss {
    border: none;
    background: transparent;
    color: #7986cb;
    font-size: 1.1em;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;

    &:hover {
      color: #3949ab;
    }
  }

  .e-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-item {
    padding: 8px 10px;
    border: 1px solid #e8eaf6;
    border-radius: 6px;
    background: #fff;
  }

  .e-item-main {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-rank {
    font-size: 0.75em;
    font-weight: 700;
    color: #5c6bc0;
  }

  .e-cell {
    font-weight: 600;
    color: #283593;
  }

  .e-score {
    margin-left: auto;
    font-size: 0.8em;
    color: #666;
  }

  .e-reasons {
    margin-top: 4px;
    font-size: 0.75em;
    color: #546e7a;
  }

  .e-warning {
    margin-top: 4px;
    font-size: 0.75em;
    color: #e65100;
  }

  .e-accept {
    margin-top: 6px;
    border: 1px solid #7986cb;
    border-radius: 4px;
    background: #e8eaf6;
    color: #3949ab;
    font-size: 0.78em;
    font-weight: 600;
    padding: 3px 10px;
    cursor: pointer;

    &:hover {
      background: #c5cae9;
    }
  }
`;
