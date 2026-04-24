'use client';

import { FC } from 'react';
import styled from 'styled-components';
import {
  type ShiftAssignmentStatus,
} from '../domain/index.js';
import { AssignedMembersView } from './AssignedMembersView.js';
import { CoverageTetrisView } from './CoverageTetrisView.js';

// ========== 型定義 ==========

export type TaskAssignmentStatusViewProps = {
  /** Shift表示用のヘッダ情報 */
  header: {
    taskName: string;
    dayType: string;
    startTime: string;
    endTime: string;
    responsibleDepartment: string;
  };
  status: ShiftAssignmentStatus;
  memberNameMap: ReadonlyMap<string, string>;
  /** AカードまたはBカードをバブルとして昇格するコールバック */
  onExpandMembers?: () => void;
  onExpandCoverage?: () => void;
  /** 配置メンバー → 局員/参加可能シフトバブル展開 */
  buildMemberUrl?: (memberId: string) => string;
  buildMemberAvailabilityUrl?: (memberId: string) => string;
  onMemberClick?: (memberId: string) => void;
  onAvailabilityClick?: (memberId: string) => void;
};

// ========== コンポーネント ==========

export const TaskAssignmentStatusView: FC<TaskAssignmentStatusViewProps> = ({
  header,
  status,
  memberNameMap,
  onExpandMembers,
  onExpandCoverage,
  buildMemberUrl,
  buildMemberAvailabilityUrl,
  onMemberClick,
  onAvailabilityClick,
}) => {
  const rate = Math.round(status.fulfillmentRate);
  const rateColor = rate >= 100 ? '#2e7d32' : rate >= 60 ? '#ef6c00' : '#c62828';

  return (
    <StyledStatus>
      <header className="ts-header">
        <div className="ts-header-main">
          <h3 className="ts-task">{header.taskName}</h3>
          <span className="ts-meta">
            {header.dayType} · {header.startTime}–{header.endTime}
          </span>
          {header.responsibleDepartment && (
            <span className="ts-dept">{header.responsibleDepartment}</span>
          )}
        </div>
        <div className="ts-header-stats">
          <div className="ts-stat">
            <span className="ts-stat-label">必要</span>
            <span className="ts-stat-value">{status.requiredCount}名</span>
          </div>
          <div className="ts-stat">
            <span className="ts-stat-label">配置</span>
            <span className="ts-stat-value">{status.memberSummaries.length}名</span>
          </div>
          <div className="ts-stat">
            <span className="ts-stat-label">充足率</span>
            <span className="ts-stat-value" style={{ color: rateColor }}>
              {rate}%
            </span>
          </div>
        </div>
      </header>

      <div className="ts-cards">
        <section className="ts-card">
          <AssignedMembersView
            memberSummaries={status.memberSummaries}
            shiftViolations={status.shiftViolations}
            density="compact"
            onExpand={onExpandMembers}
            buildMemberUrl={buildMemberUrl}
            buildAvailabilityUrl={buildMemberAvailabilityUrl}
            onMemberClick={onMemberClick}
            onAvailabilityClick={onAvailabilityClick}
          />
        </section>

        <section className="ts-card">
          <CoverageTetrisView
            blockCoverages={status.blockCoverages}
            requiredCount={status.requiredCount}
            memberNameMap={memberNameMap}
            density="compact"
            onExpand={onExpandCoverage}
          />
        </section>
      </div>
    </StyledStatus>
  );
};

// ========== スタイル ==========

const StyledStatus = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;

  .ts-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e0e0e0;
  }
  .ts-header-main {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ts-task {
    margin: 0;
    font-size: 1.05em;
    color: #222;
  }
  .ts-meta {
    font-size: 0.85em;
    color: #666;
  }
  .ts-dept {
    font-size: 0.78em;
    padding: 1px 8px;
    background: #e3f2fd;
    color: #1565c0;
    border-radius: 10px;
  }
  .ts-header-stats {
    display: flex;
    gap: 16px;
  }
  .ts-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ts-stat-label {
    font-size: 0.72em;
    color: #888;
  }
  .ts-stat-value {
    font-size: 1em;
    font-weight: 600;
    color: #333;
  }

  .ts-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ts-card {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
`;
