'use client';

/**
 * MemberGanttEditor — 局員ガントビューフィーチャー
 *
 * Redux連携：シフト案の配置データを読み書きする。
 * シフトパレットからのD&Dで ShiftAssignment を生成する。
 */

import { FC, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
  addShiftPlan,
  updateShiftPlan,
  setMemberList,
} from '../slice/index.js';
import {
  ShiftPlan,
  ShiftAssignment,
  type DayType,
} from '../domain/index.js';
import { createSampleMemberList } from '../data/sampleMember.js';
import { createDefaultShifts, DAY_TYPE_ORDER } from '../data/sampleData.js';
import { MemberGanttView, type GanttConfig } from '../ui/MemberGanttView.js';
import { UrledPlace } from '@bublys-org/bubbles-ui';
import WarningIcon from '@mui/icons-material/Warning';
import TableChartIcon from '@mui/icons-material/TableChart';
import { Button, Slider, ToggleButton, ToggleButtonGroup } from '@mui/material';

// ========== 型定義 ==========

type MemberGanttEditorProps = {
  shiftPlanId: string;
  initialDayType?: DayType;
  onAssignmentClick?: (assignmentId: string) => void;
  onOpenPaletteClick?: () => void;
  onTableViewClick?: () => void;
};

// ========== コンポーネント ==========

export const MemberGanttEditor: FC<MemberGanttEditorProps> = ({
  shiftPlanId,
  initialDayType,
  onAssignmentClick,
  onOpenPaletteClick,
  onTableViewClick,
}) => {
  const dispatch = useAppDispatch();
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  const [selectedDayType, setSelectedDayType] = useState<DayType | undefined>(initialDayType);
  const [hourPx, setHourPx] = useState(80);
  const [minuteGranularity, setMinuteGranularity] = useState<GanttConfig['minuteGranularity']>(60);

  // マスターデータ
  const shifts = useMemo(() => createDefaultShifts(), []);

  // 初期データのロード
  useEffect(() => {
    if (memberList.length === 0) {
      const sampleData = createSampleMemberList();
      dispatch(setMemberList(sampleData.map((m) => m.state)));
    }
  }, [dispatch, memberList.length]);

  // シフト案がなければ作成
  useEffect(() => {
    if (!shiftPlan) {
      const newPlan = ShiftPlan.create('シフト案1', '晴れ');
      dispatch(addShiftPlan({ ...newPlan.state, id: shiftPlanId }));
    }
  }, [dispatch, shiftPlan, shiftPlanId]);

  // ---------------------------------------------------------------
  // ハンドラ
  // ---------------------------------------------------------------

  const handleDropShift = (
    memberId: string,
    shiftId: string,
    assignedStartMinute: number,
    assignedEndMinute: number,
  ) => {
    if (!shiftPlan) return;

    // 重複チェック（同じ局員×シフト×開始時刻の配置を排除）
    const exists = shiftPlan.assignments.some(
      (a) => a.staffId === memberId && a.shiftId === shiftId && a.assignedStartMinute === assignedStartMinute,
    );
    if (exists) return;

    const assignment = ShiftAssignment.create(shiftId, memberId, assignedStartMinute, assignedEndMinute, false);
    const updated = shiftPlan.addAssignment(assignment);
    dispatch(updateShiftPlan(updated.state));
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    if (!shiftPlan) return;
    const updated = shiftPlan.removeAssignment(assignmentId);
    dispatch(updateShiftPlan(updated.state));
  };

  const ganttConfig: GanttConfig = useMemo(
    () => ({ hourPx, minuteGranularity }),
    [hourPx, minuteGranularity],
  );

  const violations = shiftPlan?.constraintViolations ?? [];

  if (!shiftPlan) {
    return <div style={{ padding: 16 }}>読み込み中...</div>;
  }

  return (
    <StyledContainer>
      {/* ヘッダー */}
      <div className="e-header">
        <div className="e-header-left">
          <h3>{shiftPlan.name} — ガント配置</h3>
        </div>
        <div className="e-header-right">
          {/* dayType セレクター */}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={selectedDayType ?? null}
            onChange={(_, v) => setSelectedDayType(v ?? undefined)}
          >
            {DAY_TYPE_ORDER.map((dt) => (
              <ToggleButton key={dt} value={dt} sx={{ fontSize: '0.72em', py: 0.3, px: 0.8 }}>
                {dt}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* シフトパレットを開く */}
          <UrledPlace url={`shift-puzzle/shifts/palette?shiftPlanId=${shiftPlanId}${selectedDayType ? `&dayType=${encodeURIComponent(selectedDayType)}` : ''}`}>
            <Button
              variant="outlined"
              size="small"
              onClick={onOpenPaletteClick}
              sx={{ ml: 1 }}
            >
              シフトパレット
            </Button>
          </UrledPlace>

          {/* 既存の表形式ビューへ */}
          <UrledPlace url={`shift-puzzle/shift-plans/${shiftPlanId}`}>
            <Button
              variant="text"
              size="small"
              startIcon={<TableChartIcon />}
              onClick={onTableViewClick}
              sx={{ ml: 1 }}
            >
              表形式
            </Button>
          </UrledPlace>

          {violations.length > 0 && (
            <span className="e-violation-warning">
              <WarningIcon fontSize="small" />
              制約違反: {violations.length}件
            </span>
          )}
          <span className="e-stats">配置: {shiftPlan.assignments.length}件</span>
        </div>
      </div>

      {/* ガント設定バー */}
      <div className="e-config-bar">
        <div className="e-config-item">
          <span className="e-config-label">スケール</span>
          <Slider
            size="small"
            min={40}
            max={120}
            step={10}
            value={hourPx}
            onChange={(_, v) => setHourPx(v as number)}
            sx={{ width: 100, mx: 1 }}
          />
          <span className="e-config-value">{hourPx}px/h</span>
        </div>
        <div className="e-config-item">
          <span className="e-config-label">グリッド粒度</span>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={minuteGranularity}
            onChange={(_, v) => { if (v) setMinuteGranularity(v); }}
          >
            <ToggleButton value={60} sx={{ fontSize: '0.72em', py: 0.2, px: 0.8 }}>1h</ToggleButton>
            <ToggleButton value={30} sx={{ fontSize: '0.72em', py: 0.2, px: 0.8 }}>30m</ToggleButton>
            <ToggleButton value={15} sx={{ fontSize: '0.72em', py: 0.2, px: 0.8 }}>15m</ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>

      {/* ガント本体 */}
      <div className="e-gantt-area">
        <MemberGanttView
          shifts={shifts}
          members={memberList}
          assignments={shiftPlan.assignments}
          selectedDayType={selectedDayType}
          ganttConfig={ganttConfig}
          buildAssignmentUrl={(id) =>
            `shift-puzzle/shift-plans/${shiftPlanId}/assignments/${id}/evaluation`
          }
          onDropShift={handleDropShift}
          onRemoveAssignment={handleRemoveAssignment}
          onAssignmentClick={onAssignmentClick}
        />
      </div>
    </StyledContainer>
  );
};

// ========== スタイル ==========

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    gap: 8px;
    flex-wrap: wrap;

    h3 {
      margin: 0;
      font-size: 1em;
    }
  }

  .e-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .e-stats {
    font-size: 0.85em;
    color: #666;
  }

  .e-violation-warning {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #ff9800;
    font-weight: bold;
    font-size: 0.85em;
    background: #fff3e0;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #ff9800;
  }

  .e-config-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 4px 12px;
    background: #fafafa;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .e-config-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82em;
    color: #555;
  }

  .e-config-label {
    white-space: nowrap;
  }

  .e-config-value {
    white-space: nowrap;
    color: #888;
    min-width: 48px;
  }

  .e-gantt-area {
    flex: 1;
    overflow: auto;
  }
`;
