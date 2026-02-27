'use client';
import React, { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  getDragType,
  DRAG_KEYS,
} from '@bublys-org/bubbles-ui';
import type {
  MemberState,
  RoleState,
  TimeSlotState,
  AssignmentState,
  AssignmentReasonState,
  ConstraintViolation,
} from '@bublys-org/shift-puzzle-model';
import { TimeAxis } from './TimeAxis.js';
import { MemberRow } from './MemberRow.js';
import { ReasonInputDialog } from './ReasonInputDialog.js';

// ========== Props ==========

export interface GanttChartViewProps {
  /** メンバー一覧 */
  members: MemberState[];
  /** 役割一覧 */
  roles: RoleState[];
  /** このシフト案のTimeSlot一覧 */
  timeSlots: TimeSlotState[];
  /** 配置一覧 */
  assignments: AssignmentState[];
  /** 制約違反一覧（F-2-6） */
  violations?: ConstraintViolation[];
  /** 表示するdayIndex（デフォルト: 0） */
  dayIndex?: number;
  /** 1時間あたりのピクセル幅 */
  hourPx?: number;
  /** 行の高さ */
  rowHeight?: number;
  /** 行モード: role = 役割行（メンバーをD&D配置）/ member = メンバー行（配置を確認） */
  axisMode?: 'role' | 'member';
  /** 新規配置コールバック */
  onCreateAssignment?: (
    memberId: string,
    timeSlotId: string,
    roleId: string,
    reason: AssignmentReasonState
  ) => void;
  /** 配置移動コールバック（timeSlotId変更） */
  onMoveAssignment?: (assignmentId: string, newTimeSlotId: string) => void;
  /** 配置クリックコールバック */
  onAssignmentClick?: (assignmentId: string) => void;
}

// ========== 内部型 ==========

interface PendingDrop {
  memberId: string;
  timeSlotId: string;
  /** roleモード時のrowId（roleId）*/
  rowId: string;
}

// ========== コンポーネント ==========

const LABEL_WIDTH = 140;
const AXIS_HEIGHT = 36;

export const GanttChartView: React.FC<GanttChartViewProps> = ({
  members,
  roles,
  timeSlots,
  assignments,
  violations = [],
  dayIndex = 0,
  hourPx = 80,
  rowHeight = 48,
  axisMode = 'role',
  onCreateAssignment,
  onMoveAssignment,
  onAssignmentClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [pendingRoleId, setPendingRoleId] = useState<string>('');

  // このdayのTimeSlot一覧
  const daySlots = useMemo(
    () => timeSlots.filter((s) => s.dayIndex === dayIndex),
    [timeSlots, dayIndex]
  );

  // 時刻範囲の計算
  const { dayStartMinute, dayEndMinute, dayWidth } = useMemo(() => {
    if (daySlots.length === 0) {
      return { dayStartMinute: 540, dayEndMinute: 1200, dayWidth: 0 };
    }
    const starts = daySlots.map((s) => s.startMinute);
    const ends = daySlots.map((s) => s.startMinute + s.durationMinutes);
    const start = Math.min(...starts);
    const end = Math.max(...ends);
    const width = (end - start) * (hourPx / 60);
    return { dayStartMinute: start, dayEndMinute: end, dayWidth: width };
  }, [daySlots, hourPx]);

  const minutePx = hourPx / 60;

  // ルックアップマップ
  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // ========== 行データ ==========

  type RowData = {
    id: string;
    label: string;
    assignments: AssignmentState[];
    availableSlotIds?: ReadonlyArray<string>;
  };

  const rows: RowData[] = useMemo(() => {
    if (axisMode === 'role') {
      return roles.map((role) => ({
        id: role.id,
        label: role.name,
        assignments: assignments.filter(
          (a) => a.roleId === role.id && daySlots.some((s) => s.id === a.timeSlotId)
        ),
      }));
    } else {
      return members.map((member) => ({
        id: member.id,
        label: member.name,
        assignments: assignments.filter(
          (a) => a.memberId === member.id && daySlots.some((s) => s.id === a.timeSlotId)
        ),
        availableSlotIds: member.availableSlotIds,
      }));
    }
  }, [axisMode, roles, members, assignments, daySlots]);

  // ========== D&D ハンドラ ==========

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const types = Array.from(e.dataTransfer.types);
    const memberDragType = getDragType('Member');
    const isInternal = types.includes('text/assignment-id');
    const isMemberDrag = types.includes(memberDragType);
    if (isInternal || isMemberDrag || types.includes('text/member-id')) {
      e.preventDefault();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, rowId: string) => {
    e.preventDefault();

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // ドロップ位置 → TimeSlot特定
    const rect = scrollEl.getBoundingClientRect();
    const px = e.clientX - rect.left + scrollEl.scrollLeft - LABEL_WIDTH;
    const targetSlot = findSlotAtPx(px);
    if (!targetSlot) return;

    // 内部移動（既存配置のドラッグ）
    const assignmentId = e.dataTransfer.getData('text/assignment-id');
    if (assignmentId) {
      onMoveAssignment?.(assignmentId, targetSlot.id);
      return;
    }

    // ObjectViewからのメンバードラッグ（新規配置）
    const memberDragType = getDragType('Member');
    const types = Array.from(e.dataTransfer.types);
    let memberId: string | null = null;

    if (types.includes('text/member-id')) {
      memberId = e.dataTransfer.getData('text/member-id');
    } else if (types.includes(memberDragType)) {
      const url =
        e.dataTransfer.getData(memberDragType) || e.dataTransfer.getData(DRAG_KEYS.url);
      const match = url.match(/members?\/([^/]+)/);
      if (match) memberId = match[1];
    }

    if (!memberId) return;

    // roleモード: rowId = roleId として直接使用
    // memberモード: ダイアログで役割を選択
    const roleId = axisMode === 'role' ? rowId : '';

    setPendingDrop({ memberId, timeSlotId: targetSlot.id, rowId });
    setPendingRoleId(roleId);
  };

  const findSlotAtPx = (px: number): TimeSlotState | undefined => {
    const minute = px / minutePx + dayStartMinute;
    return daySlots.find(
      (s) => s.startMinute <= minute && minute < s.startMinute + s.durationMinutes
    );
  };

  // 配置確定
  const handleConfirmReason = (reason: AssignmentReasonState) => {
    if (!pendingDrop) return;
    const roleId = pendingRoleId || pendingDrop.rowId;
    if (!roleId) return;
    onCreateAssignment?.(pendingDrop.memberId, pendingDrop.timeSlotId, roleId, reason);
    setPendingDrop(null);
    setPendingRoleId('');
  };

  // ダイアログ用情報
  const pendingMember = pendingDrop ? memberMap.get(pendingDrop.memberId) : undefined;
  const pendingRole =
    pendingDrop && axisMode === 'role' ? roleMap.get(pendingDrop.rowId) : undefined;

  // ========== 役割充足状況バッジ（F-2-6補足） ==========

  const roleFulfillment = useMemo(() => {
    if (axisMode !== 'role') return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    for (const role of roles) {
      for (const slot of daySlots) {
        const count = assignments.filter(
          (a) => a.roleId === role.id && a.timeSlotId === slot.id
        ).length;
        if (count < role.minRequired) {
          map.set(role.id, false);
          break;
        }
        map.set(role.id, true);
      }
    }
    return map;
  }, [axisMode, roles, assignments, daySlots]);

  // ========== レンダリング ==========

  return (
    <StyledGantt>
      {/* ヘッダー行 */}
      <div className="e-header-row" style={{ height: AXIS_HEIGHT }}>
        <div className="e-label-header" style={{ width: LABEL_WIDTH }} />
        <div className="e-timeline-header-scroll">
          <div className="e-timeline-header-inner" style={{ width: dayWidth }}>
            <TimeAxis
              dayStartMinute={dayStartMinute}
              dayEndMinute={dayEndMinute}
              hourPx={hourPx}
            />
          </div>
        </div>
      </div>

      {/* ボディ */}
      <div className="e-body" ref={scrollRef}>
        {/* ラベル列（固定） */}
        <div className="e-label-column" style={{ width: LABEL_WIDTH }}>
          {rows.map((row) => (
            <div key={row.id} className="e-row-label" style={{ height: rowHeight }}>
              <span className="e-label-text">{row.label}</span>
              {axisMode === 'role' && roleFulfillment.get(row.id) === false && (
                <span className="e-badge-shortage">不足</span>
              )}
            </div>
          ))}
        </div>

        {/* タイムライン列 */}
        <div className="e-timeline-column" style={{ width: dayWidth }}>
          {rows.map((row) => (
            <MemberRow
              key={row.id}
              label={row.label}
              availableSlotIds={row.availableSlotIds}
              assignments={row.assignments}
              roleMap={roleMap}
              memberMap={memberMap}
              dayTimeSlots={daySlots}
              violations={violations}
              rowHeight={rowHeight}
              dayStartMinute={dayStartMinute}
              hourPx={hourPx}
              dayWidth={dayWidth}
              barLabelMode={axisMode === 'role' ? 'member' : 'role'}
              onAssignmentClick={onAssignmentClick}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, row.id)}
            />
          ))}
        </div>
      </div>

      {/* F-2-5: 配置理由入力ダイアログ */}
      <ReasonInputDialog
        open={pendingDrop !== null}
        memberName={pendingMember?.name}
        roleName={pendingRole?.name}
        roles={axisMode === 'member' ? roles.map((r) => ({ id: r.id, name: r.name, color: r.color })) : undefined}
        selectedRoleId={pendingRoleId}
        onRoleChange={setPendingRoleId}
        onConfirm={handleConfirmReason}
        onCancel={() => { setPendingDrop(null); setPendingRoleId(''); }}
      />
    </StyledGantt>
  );
};

// ========== スタイル ==========

const StyledGantt = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 0.85em;
  background: white;

  .e-header-row {
    display: flex;
    flex-shrink: 0;
    border-bottom: 2px solid #c5cae9;
    background: #f5f5f5;
  }

  .e-label-header {
    flex-shrink: 0;
    border-right: 1px solid #ddd;
    background: #f5f5f5;
  }

  .e-timeline-header-scroll {
    flex: 1;
    overflow: hidden;
  }

  .e-timeline-header-inner {
    height: 100%;
  }

  .e-body {
    flex: 1;
    overflow: auto;
    display: flex;
  }

  .e-label-column {
    flex-shrink: 0;
    position: sticky;
    left: 0;
    z-index: 5;
    background: #fafafa;
    border-right: 1px solid #ddd;
  }

  .e-row-label {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border-bottom: 1px solid #eee;
    font-weight: 500;
    font-size: 0.9em;

    .e-label-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .e-badge-shortage {
      background: #ffecb3;
      color: #e65100;
      font-size: 0.7em;
      font-weight: bold;
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid #ff8f00;
      white-space: nowrap;
    }
  }

  .e-timeline-column {
    flex-shrink: 0;
  }
` as React.FC<React.HTMLAttributes<HTMLDivElement>>;
