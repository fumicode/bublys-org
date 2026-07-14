'use client';

import { DragEvent, FC, useState } from "react";
import type { HTMLAttributes } from "react";
import styled from "styled-components";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { ObjectView, parseDragPayload } from "@bublys-org/bubbles-ui";
import { ScheduleReport } from "../domain/index.js";

type LinkedReportsViewProps = {
  /** この勤務表に紐づいたシフト完成レポート */
  reports: ScheduleReport[];
  /**
   * レポートの URL をドロップしたとき呼ぶ。渡すとエリアが drop を受け付け、
   * そのレポートを紐づけられる。dropAcceptTypes と併せて指定する。
   */
  onDropUrl?: (url: string) => void;
  /** 受け付けるドラッグ型（ScheduleReport の drag type）。 */
  dropAcceptTypes?: string[];
  /** 紐づけを解除するとき呼ぶ。渡すと各バッジに × が付く。 */
  onUnlink?: (reportId: string) => void;
};

/**
 * 勤務表に紐づけたシフト完成レポートを表示する（プレゼンテーショナル）。
 * 責任者ルールに Staff をドロップで追加する {@link LeaderRuleDiagram} と同じ drop パターン
 * （dragover で型だけ判定→drop で parseDragPayload）で、ScheduleReport のドロップを受け付ける。
 * バッジはダブルクリックでレポートバブルを開く（ObjectView の既定挙動）。
 */
export const LinkedReportsView: FC<LinkedReportsViewProps> = ({
  reports,
  onDropUrl,
  dropAcceptTypes,
  onUnlink,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const droppable = !!onDropUrl;

  const handleDragOver = (e: DragEvent) => {
    if (!onDropUrl) return;
    const types = Array.from(e.dataTransfer.types);
    if (!(dropAcceptTypes ?? []).some((t) => types.includes(t))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dragOver) setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: DragEvent) => {
    const payload = parseDragPayload(e, { acceptTypes: dropAcceptTypes });
    if (!payload || !onDropUrl) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    onDropUrl(payload.url);
  };

  if (reports.length === 0 && !droppable) return null;

  return (
    <StyledWrap
      className={droppable && dragOver ? "is-dragover" : undefined}
      onDragOver={droppable ? handleDragOver : undefined}
      onDragLeave={droppable ? handleDragLeave : undefined}
      onDrop={droppable ? handleDrop : undefined}
    >
      <span className="e-label">
        <AssessmentIcon fontSize="inherit" className="e-icon" />
        参照レポート
      </span>
      {reports.length === 0 ? (
        <span className="e-hint">📎 レポートをドラッグして紐づけ</span>
      ) : (
        reports.map((report) => (
          <span key={report.id} className="e-chip">
            <ObjectView
              object={report}
              label={report.title}
              draggable={false}
              openingPosition="bubble-side-right"
            >
              <span className="e-chip-text">{report.title}</span>
            </ObjectView>
            {onUnlink && (
              <button
                type="button"
                className="e-unlink"
                onClick={() => onUnlink(report.id)}
                title={`「${report.title}」の紐づけを解除`}
                aria-label={`「${report.title}」の紐づけを解除`}
              >
                ×
              </button>
            )}
          </span>
        ))
      )}
    </StyledWrap>
  );
};

/**
 * ヘッダ行（可能勤務帯の右）にインラインで並ぶ想定なので、独立行だった頃の
 * margin-bottom は持たない（縦を食わないようにする）。
 */
const StyledWrap = styled.div<HTMLAttributes<HTMLDivElement>>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 8px;
  min-width: 0;
  outline: 2px dashed transparent;
  outline-offset: -3px;
  transition: outline-color 0.12s ease, background 0.12s ease;

  &.is-dragover {
    outline-color: #f9a825;
    background: rgba(249, 168, 37, 0.08);
  }

  .e-label {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.75em;
    color: #999;
    flex-shrink: 0;

    .e-icon {
      color: #f9a825;
    }
  }

  .e-hint {
    font-size: 0.78em;
    color: #bbb;
  }

  .e-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border: 1px solid #ffe082;
    background: #fffde7;
    border-radius: 999px;
    padding: 2px 4px 2px 8px;
    font-size: 0.78em;
    color: #8d6e00;

    .e-chip-text {
      max-width: 12em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .e-unlink {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: currentColor;
    opacity: 0.5;
    font-size: 1.05em;
    line-height: 1;
    padding: 0 4px;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
  }
`;
