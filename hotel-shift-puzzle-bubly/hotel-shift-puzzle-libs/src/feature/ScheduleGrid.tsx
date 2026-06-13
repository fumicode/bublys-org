'use client';

import { FC, useEffect } from "react";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  MonthlyStaffSchedule,
  type WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  selectStaffList,
  setStaffList,
  selectWorkShiftList,
  setWorkShiftList,
  selectScheduleList,
  selectScheduleById,
  setScheduleList,
  updateSchedule,
} from "../slice/index.js";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import { createSampleStaffList } from "../data/sampleStaff.js";
import { createSampleWorkShifts } from "../data/sampleWorkShifts.js";
import { createSampleSchedule } from "../data/sampleSchedule.js";
import { buildStaffDetailUrl } from "./StaffCollection.js";
import { scheduleScopeId, SCHEDULE_OBJECT_TYPE } from "./ScheduleWorldLineProvider.js";

type ScheduleGridProps = {
  scheduleId?: string;
  /** 世界線ビューを開くハンドラ（ヘッダ右上のリンク用） */
  onOpenHistory?: () => void;
};

/**
 * 勤務表グリッド。世界線スコープ（useCasScope）を編集の源泉とし、
 * 集約メソッド経由で編集（shell.update(s => s.setCell(...))）して履歴を記録する。
 */
export const ScheduleGrid: FC<ScheduleGridProps> = ({ scheduleId, onOpenHistory }) => {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectStaffList);
  const workShifts = useAppSelector(selectWorkShiftList);
  const scheduleList = useAppSelector(selectScheduleList);
  const initialSchedule = useAppSelector(
    scheduleId ? selectScheduleById(scheduleId) : () => undefined
  );

  // 初期データのロード（空ならサンプルを投入）
  useEffect(() => {
    if (staffList.length === 0) {
      dispatch(setStaffList(createSampleStaffList().map((s) => s.state)));
    }
  }, [dispatch, staffList.length]);

  useEffect(() => {
    if (workShifts.length === 0) {
      dispatch(setWorkShiftList(createSampleWorkShifts().map((w) => w.state)));
    }
  }, [dispatch, workShifts.length]);

  useEffect(() => {
    if (scheduleList.length === 0) {
      dispatch(setScheduleList([createSampleSchedule().toPlain()]));
    }
  }, [dispatch, scheduleList.length]);

  if (!scheduleId || !initialSchedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  // 初期勤務表が確定してから内部を mount（useCasScope の初期化に初期オブジェクトが必要）
  return (
    <ScheduleGridInner
      scheduleId={scheduleId}
      initialSchedule={initialSchedule}
      staffList={staffList}
      workShifts={workShifts}
      onOpenHistory={onOpenHistory}
    />
  );
};

type InnerProps = {
  scheduleId: string;
  initialSchedule: MonthlyStaffSchedule;
  staffList: ReturnType<typeof selectStaffList>;
  workShifts: ReturnType<typeof selectWorkShiftList>;
  onOpenHistory?: () => void;
};

const ScheduleGridInner: FC<InnerProps> = ({
  scheduleId,
  initialSchedule,
  staffList,
  workShifts,
  onOpenHistory,
}) => {
  const dispatch = useAppDispatch();

  // 世界線スコープ。空なら初期勤務表で root ノードを作る
  const scope = useCasScope(scheduleScopeId(scheduleId), {
    initialObjects: [{ type: SCHEDULE_OBJECT_TYPE, object: initialSchedule }],
  });

  const shell = scope.getShell<MonthlyStaffSchedule>(SCHEDULE_OBJECT_TYPE, scheduleId);
  const current = shell?.object ?? initialSchedule;
  const apexId = scope.graph.getApex()?.id ?? null;

  // 現在のスコープ状態を一覧用リポジトリ（slice）へ射影（apex 変化時に保存）
  useEffect(() => {
    if (shell) dispatch(updateSchedule(shell.object.toPlain()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId]);

  // セル編集: 集約のメソッドを shell 経由で呼び、世界線に記録する
  const handleChangeCell = (staffId: string, day: WorkingDay, to: ShiftCell) => {
    shell?.update((s) => s.setCell(staffId, day, to));
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          勤務表{" "}
          <span className="e-sub">
            {current.year}年{current.month}月 / {current.storeId}
          </span>
        </h3>
        {onOpenHistory && (
          <button type="button" className="e-history" onClick={onOpenHistory}>
            🌐 世界線ビュー
          </button>
        )}
      </div>
      <ScheduleGridView
        schedule={current}
        staffList={staffList}
        workShifts={workShifts}
        buildStaffUrl={buildStaffDetailUrl}
        onChangeCell={handleChangeCell}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;

    h3 {
      margin: 0;
    }
    .e-sub {
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
    .e-history {
      flex-shrink: 0;
      border: 1px solid #cfd8dc;
      border-radius: 6px;
      background: #fff;
      color: #37474f;
      font-size: 0.8em;
      padding: 4px 10px;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s;

      &:hover {
        background: #eceff1;
        border-color: #90a4ae;
      }
    }
  }
`;
