'use client';

import { FC, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  StaffMonthlyShiftWish,
  type WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import { useObjects, useObject, useObjectShell } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { buildScheduleConstraints } from "./scheduleConstraints.js";
import {
  STAFF_TYPE,
  WORKSHIFT_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

type ScheduleGridProps = {
  scheduleId?: string;
  /** 世界線ビューを開くハンドラ（ヘッダ右上のリンク用） */
  onOpenHistory?: () => void;
  /** 可能勤務帯エディタを開くハンドラ */
  onOpenAvailability?: () => void;
  /** 制約違反（赤線）クリック時のハンドラ。違反 key を渡す */
  onOpenViolation?: (violationKey: string) => void;
};

/**
 * 勤務表グリッド。編集はシェル経由：update(s => s.setCell(...)) を呼ぶだけで、
 * その勤務表を監視している世界線すべて（アプリ全体＋ローカル）へ自動保存される。
 */
export const ScheduleGrid: FC<ScheduleGridProps> = ({
  scheduleId,
  onOpenHistory,
  onOpenAvailability,
  onOpenViolation,
}) => {
  useSeedHotelData();
  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShifts = useObjects<WorkShift>(WORKSHIFT_TYPE);
  const availability = useObject<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
    scheduleId
  );
  const allWishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const { object: schedule, update } = useObjectShell<MonthlyStaffSchedule>(
    SCHEDULE_TYPE,
    scheduleId
  );

  // ----- 部署フィルタ / グルーピング状態 -----
  const [groupByDept, setGroupByDept] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>(""); // "" = 全部署

  // 重複なしの部署一覧（未設定を除く）
  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const s of staffList) {
      if (s.department) set.add(s.department);
    }
    return Array.from(set).sort();
  }, [staffList]);

  // フィルタ適用後のスタッフ一覧
  const filteredStaffList = useMemo(() => {
    if (!deptFilter) return staffList;
    return staffList.filter((s) => s.department === deptFilter);
  }, [staffList, deptFilter]);

  // この勤務表と同じ年月のシフト希望を staffId 別に引けるようにする
  const wishByStaff = useMemo(() => {
    const map = new Map<string, StaffMonthlyShiftWish>();
    if (schedule) {
      for (const w of allWishes) {
        if (w.year === schedule.year && w.month === schedule.month) {
          map.set(w.staffId, w);
        }
      }
    }
    return map;
  }, [allWishes, schedule]);

  // 制約チェックは変更のたびに再計算する（割当・希望が変わるたび）。
  // 連勤などに加え、シフト希望との食い違いも違反として拾う（希望の文脈を注入）。
  const violations = useMemo(() => {
    if (!schedule) return [];
    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    return schedule.checkConstraints(
      buildScheduleConstraints({ wishByStaff, shiftNameById })
    );
  }, [schedule, wishByStaff, workShifts]);

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  // セル編集: シェルにメソッドを実行するだけ → 監視している世界線すべてへ自動保存
  const handleChangeCell = (staffId: string, day: WorkingDay, to: ShiftCell) => {
    update((s) => s.setCell(staffId, day, to));
  };

  // 必要スタッフ数の編集（その日・全日）。同じくシェル経由で保存される
  const handleChangeRequired = (day: WorkingDay, shiftName: string, count: number) => {
    update((s) => s.setRequired(day, shiftName, count));
  };
  const handleChangeRequiredAllDays = (shiftName: string, count: number) => {
    update((s) => s.setRequiredForAllDays(shiftName, count));
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          勤務表{" "}
          <span className="e-sub">
            {schedule.year}年{schedule.month}月 / {schedule.storeId}
          </span>
        </h3>
        <div className="e-actions">
          {/* 部署別グルーピングトグル */}
          <button
            type="button"
            className={`e-link${groupByDept ? " is-active" : ""}`}
            onClick={() => setGroupByDept((v) => !v)}
            title="部署別にグループ化して表示"
          >
            部署別
          </button>

          {/* 部署フィルタ（ドロップダウン） */}
          {departments.length > 0 && (
            <select
              className="e-dept-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              title="表示する部署を絞り込む"
            >
              <option value="">全部署</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {onOpenAvailability && (
            <button type="button" className="e-link" onClick={onOpenAvailability}>
              可能勤務帯
            </button>
          )}
          {onOpenHistory && (
            <button type="button" className="e-link" onClick={onOpenHistory}>
              🌐 世界線ビュー
            </button>
          )}
        </div>
      </div>
      <ScheduleGridView
        schedule={schedule}
        staffList={filteredStaffList}
        workShifts={workShifts}
        availability={availability}
        wishByStaff={wishByStaff}
        violations={violations}
        groupByDepartment={groupByDept}
        onChangeCell={handleChangeCell}
        onOpenViolation={(v) => onOpenViolation?.(v.key)}
        onChangeRequired={handleChangeRequired}
        onChangeRequiredAllDays={handleChangeRequiredAllDays}
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
    .e-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .e-link {
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

      &.is-active {
        background: #e8eaf6;
        border-color: #3949ab;
        color: #3949ab;
        font-weight: bold;
      }
    }
    .e-dept-select {
      border: 1px solid #cfd8dc;
      border-radius: 6px;
      background: #fff;
      color: #37474f;
      font-size: 0.8em;
      padding: 4px 8px;
      cursor: pointer;
      outline: none;

      &:hover {
        border-color: #90a4ae;
      }
      &:focus {
        border-color: #3949ab;
      }
    }
  }
`;
