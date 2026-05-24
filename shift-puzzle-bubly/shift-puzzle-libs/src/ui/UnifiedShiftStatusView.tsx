'use client';

import { FC } from 'react';
import styled from 'styled-components';
import { type TaskAssignmentStatusViewProps } from './TaskAssignmentStatusView.js';
import { CoverageTetrisView } from './CoverageTetrisView.js';
import { ObjectView } from '@bublys-org/bubbles-ui';
import { setDraggingTaskId } from './TaskListView.js';

export type UnifiedShiftStatusViewProps = TaskAssignmentStatusViewProps;

export const UnifiedShiftStatusView: FC<UnifiedShiftStatusViewProps> = ({
  header,
  status,
  memberNameMap,
  buildMemberUrl,
  onMemberClick,
  onTaskSelect,
}) => {
  const rate = Math.round(status.fulfillmentRate);
  const rateColor = rate >= 100 ? '#2e7d32' : rate >= 60 ? '#ef6c00' : '#c62828';

  const memberViolations = new Map<string, readonly string[]>();
  for (const s of status.memberSummaries) {
    const msgs = s.violations.filter((v) => !v.isStub).map((v) => v.message);
    if (msgs.length > 0) memberViolations.set(s.memberId, msgs);
  }

  return (
    <StyledUnified>
      <header className="us-header">
        <div className="us-header-main">
          <div
            className="us-task-drag"
            onDragStart={() => {
              setDraggingTaskId(header.taskId);
              onTaskSelect?.(header.taskId);
            }}
            onDragEnd={() => setDraggingTaskId(null)}
          >
            <ObjectView
              type="Task"
              url={`shift-puzzle/tasks/${header.taskId}`}
              label={header.taskName}
              draggable
              onClick={() => onTaskSelect?.(header.taskId)}
            >
              <h3 className="us-task">{header.taskName}</h3>
            </ObjectView>
          </div>
          <span className="us-meta">
            {header.dayType} · {header.startTime}–{header.endTime}
          </span>
          {header.responsibleDepartment && (
            <span className="us-dept">{header.responsibleDepartment}</span>
          )}
        </div>
        <div className="us-header-stats">
          <div className="us-stat">
            <span className="us-stat-label">必要</span>
            <span className="us-stat-value">{status.requiredCount}名</span>
          </div>
          <div className="us-stat">
            <span className="us-stat-label">配置</span>
            <span className="us-stat-value">{status.memberSummaries.length}名</span>
          </div>
          <div className="us-stat">
            <span className="us-stat-label">充足率</span>
            <span className="us-stat-value" style={{ color: rateColor }}>
              {rate}%
            </span>
          </div>
        </div>
      </header>

      <CoverageTetrisView
        blockCoverages={status.blockCoverages}
        requiredCount={status.requiredCount}
        memberNameMap={memberNameMap}
        density="full"
        buildMemberUrl={buildMemberUrl}
        onMemberClick={onMemberClick}
        memberViolations={memberViolations}
      />
    </StyledUnified>
  );
};

const StyledUnified = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;

  .us-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e0e0e0;
  }
  .us-header-main {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .us-task-drag {
    cursor: grab;
    &:active { cursor: grabbing; }
  }
  .us-task {
    margin: 0;
    font-size: 1.05em;
    color: #222;
  }
  .us-meta {
    font-size: 0.85em;
    color: #666;
  }
  .us-dept {
    font-size: 0.78em;
    padding: 1px 8px;
    background: #e3f2fd;
    color: #1565c0;
    border-radius: 10px;
  }
  .us-header-stats {
    display: flex;
    gap: 16px;
  }
  .us-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .us-stat-label {
    font-size: 0.72em;
    color: #888;
  }
  .us-stat-value {
    font-size: 1em;
    font-weight: 600;
    color: #333;
  }
`;
