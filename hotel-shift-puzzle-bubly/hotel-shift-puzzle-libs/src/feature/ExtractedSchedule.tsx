'use client';

import { FC, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShift,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  StaffMonthlyShiftWish,
  fulfillWishesStep,
  makePartnerCoverStep,
  type AutoShiftStep,
  type WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import { useObjects, useObject, useObjectShell } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { buildScheduleConstraints } from "./scheduleConstraints.js";
import { HOTEL_SHIFT_LEADER_ROLES, resolveShiftLeaderRoles } from "./shiftLeaderRoles.js";
import { runAutoShiftStep } from "./autoShift.js";
import {
  STAFF_TYPE,
  WORKSHIFT_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

type ExtractedScheduleProps = {
  scheduleId?: string;
  /** 抽出対象のスタッフID（元の勤務表で選択した人たち） */
  staffIds: string[];
};

/**
 * 抽出勤務表バブル。
 * 元の勤務表（同じ MonthlyStaffSchedule 集約）を、選択したスタッフだけに絞って表示・編集する
 * ビュー。編集・自動シフトはシェル経由で同じ集約へ保存されるため、元のグリッドにも即反映される。
 *
 * 「その選択スタッフだけ」を対象に自動シフトのコマンドを実行できる:
 *   - 希望を叶える（既存ステップ。対象スタッフだけに限定）
 *   - 相方裏（早責ペアの一方が休みの日にもう一方を早番に入れる）
 * 対象スタッフ＝抽出した subset を staffList として渡すことで、各ステップが自然に subset 限定になる。
 */
export const ExtractedSchedule: FC<ExtractedScheduleProps> = ({ scheduleId, staffIds }) => {
  useSeedHotelData();
  const [autoMessage, setAutoMessage] = useState<string | null>(null);

  const allStaff = useObjects<Staff>(STAFF_TYPE);
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

  // 抽出対象（元の並び順を保つ）
  const idSet = useMemo(() => new Set(staffIds), [staffIds]);
  const subset = useMemo(() => allStaff.filter((s) => idSet.has(s.id)), [allStaff, idSet]);

  // 責任者ルールは全スタッフから解決し、subset に関係するルールだけ footer に出す
  const allLeaderRules = useMemo(
    () => resolveShiftLeaderRoles(HOTEL_SHIFT_LEADER_ROLES, allStaff),
    [allStaff]
  );
  const relevantRules = useMemo(
    () => allLeaderRules.filter((r) => r.leaderStaffIds.some((id) => idSet.has(id))),
    [allLeaderRules, idSet]
  );

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

  // 自動シフトコマンド。相方裏は「この選択に関係する責任者ルール」ごとに作る。
  // 早番固定ではなく各ルール（早責→早番 / 夜責→遅番）から導出し、関係するルールが
  // 無ければ相方裏ボタンは出ない（選択が責任者ペアとは限らないため）。
  const steps = useMemo<AutoShiftStep[]>(
    () => [
      fulfillWishesStep,
      ...relevantRules.map((rule) => makePartnerCoverStep(rule)),
    ],
    [relevantRules]
  );

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

  const handleChangeCell = (staffId: string, day: WorkingDay, to: ShiftCell) => {
    update((s) => s.setCell(staffId, day, to));
  };

  // 自動シフト：対象スタッフ（subset）だけを staffList として渡す → ステップが subset 限定になる
  const handleRunStep = (step: AutoShiftStep) => {
    const result = runAutoShiftStep(step, {
      schedule,
      staffList: subset,
      workShifts,
      wishByStaff,
      availability,
    });
    update(() => result.schedule);
    setAutoMessage(`${step.label}: ${result.message}`);
  };

  return (
    <StyledContainer>
      {/* 必要最低限：自動コマンド・日付・人・該当制約の充足行だけ。見出し/説明は出さない */}
      <div className="e-auto-bar">
        {steps.map((step) => (
          <button
            key={step.key}
            type="button"
            className="e-auto"
            title={step.description}
            onClick={() => handleRunStep(step)}
          >
            {step.label}
          </button>
        ))}
      </div>

      {autoMessage && (
        <div className="e-auto-message">
          {autoMessage}
          <button
            type="button"
            className="e-auto-close"
            aria-label="閉じる"
            onClick={() => setAutoMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      <ScheduleGridView
        schedule={schedule}
        staffList={subset}
        workShifts={workShifts}
        availability={availability}
        wishByStaff={wishByStaff}
        violations={violations}
        leaderRules={relevantRules}
        leaderRulesOnlyFooter
        onChangeCell={handleChangeCell}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-auto-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;

    .e-auto {
      border: 1px solid #b39ddb;
      border-radius: 6px;
      background: #fff;
      color: #5e35b1;
      font-size: 0.8em;
      font-weight: 600;
      padding: 4px 10px;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s;

      &:hover {
        background: #ede7f6;
        border-color: #9575cd;
      }
    }
  }

  .e-auto-message {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 6px 10px;
    background: #ede7f6;
    border: 1px solid #d1c4e9;
    border-radius: 6px;
    color: #4527a0;
    font-size: 0.82em;

    .e-auto-close {
      margin-left: auto;
      border: none;
      background: transparent;
      color: #7e57c2;
      font-size: 1.1em;
      line-height: 1;
      cursor: pointer;
      padding: 0 2px;

      &:hover {
        color: #4527a0;
      }
    }
  }
`;
