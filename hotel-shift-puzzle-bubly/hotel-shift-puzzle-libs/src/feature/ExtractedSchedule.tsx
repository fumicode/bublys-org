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
  makeSatisfyLeaderRulesStep,
  makeMinDayOffStep,
  type AutoShiftStep,
  type WorkingDay,
  type ShiftCell,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useAppStore } from "@bublys-org/state-management";
import { ScheduleGridView } from "../ui/ScheduleGridView.js";
import { useObjects, useObject, useObjectShell } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { commitCandidates, localScopeId } from "../objects/commit.js";
import {
  buildScheduleConstraints,
  MIN_MONTHLY_DAY_OFF,
  MAX_DAY_OFF_PER_DAY,
  DAY_OFF_CANDIDATE_COUNT,
} from "./scheduleConstraints.js";
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
export const ExtractedSchedule: FC<ExtractedScheduleProps> = ({
  scheduleId,
  staffIds,
}) => {
  useSeedHotelData();
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const store = useAppStore();

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

  // 責任者ルールは全スタッフから解決する。
  // 抽出ビューで「対象」とするのは、メンバー全員が抽出 subset に含まれるルールだけ。
  // （例: 早責3人を抽出 → 早責は対象。予責は山本が兼務でも田中が subset 外なので対象外
  //   ＝ subset 外の人を動かさない。予責は予責メンバーを抽出したとき別途満たす。）
  const allLeaderRules = useMemo(
    () => resolveShiftLeaderRoles(HOTEL_SHIFT_LEADER_ROLES, allStaff),
    [allStaff]
  );
  const relevantRules = useMemo(
    () =>
      allLeaderRules.filter(
        (r) => r.leaderStaffIds.length > 0 && r.leaderStaffIds.every((id) => idSet.has(id))
      ),
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

  // 完成案の複数生成：抽出中の人について「毎日 担当勤務帯に責任者が最低1人いる（責任者ルール）」
  // かつ「全員が月◯日休む（1日◯人まで）」を満たす完成案を、phase 違いで N 案つくり、
  // それぞれ独立した世界線（兄弟ブランチ）に書く。world-line バブルは開かない
  // （たいてい既に開いているため）。
  const handleGenerateCandidates = () => {
    if (!scheduleId) return;
    const runOn = (sched: MonthlyStaffSchedule, step: AutoShiftStep) =>
      runAutoShiftStep(step, {
        schedule: sched,
        staffList: subset,
        workShifts,
        wishByStaff,
        availability,
      }).schedule;
    // 1案 = 希望を叶える → 責任者を満たす（担当は輪番・phase で交代） → 月の休みを入れる（phase）
    const buildCandidate = (phase: number): MonthlyStaffSchedule => {
      let s = schedule;
      s = runOn(s, fulfillWishesStep);
      s = runOn(s, makeSatisfyLeaderRulesStep(relevantRules, { phase }));
      s = runOn(
        s,
        makeMinDayOffStep(MIN_MONTHLY_DAY_OFF, { maxPerDay: MAX_DAY_OFF_PER_DAY, phase })
      );
      return s;
    };
    const candidates = Array.from({ length: DAY_OFF_CANDIDATE_COUNT }, (_, i) => ({
      obj: buildCandidate(i),
      label: `案${i + 1}`,
    }));
    commitCandidates(store, localScopeId(SCHEDULE_TYPE, scheduleId), SCHEDULE_TYPE, schedule, candidates);
    setAutoMessage(
      `${DAY_OFF_CANDIDATE_COUNT}案を世界線に作成し、案1を表示中です。世界線ビューで切り替えて見比べてください。`
    );
  };

  return (
    <StyledContainer>
      {/* 必要最低限：表（日付・人・該当制約の充足行）→ その下に自動コマンド。見出し/説明は出さない */}
      <ScheduleGridView
        schedule={schedule}
        staffList={subset}
        workShifts={workShifts}
        availability={availability}
        wishByStaff={wishByStaff}
        violations={violations}
        leaderRules={relevantRules}
        leaderRulesOnlyFooter
        minDayOff={MIN_MONTHLY_DAY_OFF}
        onChangeCell={handleChangeCell}
      />

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
        <button
          type="button"
          className="e-candidate-run"
          title={`この ${subset.length} 名について「毎日 責任者が入る＋全員 月${MIN_MONTHLY_DAY_OFF}日休む（1日${MAX_DAY_OFF_PER_DAY}人まで）」完成案を ${DAY_OFF_CANDIDATE_COUNT} つくり、それぞれ別の世界線に書いて見比べます。`}
          onClick={handleGenerateCandidates}
        >
          🌱 完成案を{DAY_OFF_CANDIDATE_COUNT}つ世界線に作る
        </button>
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
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  /* 半透明（バブル側 contentBackground で付与）に合わせ、中の白い面も半透明にして
     裏がうっすら見えるようにする。ぼかしは無し。 */

  /* グリッドの白い面を半透明へ上書き（&& で StyledWrap のルールより優先） */
  && {
    .e-grid {
      background: transparent;
    }
    .e-corner,
    .e-day-head,
    .e-off-head,
    .e-off-total,
    .e-staff-cell {
      background: hsla(0, 0%, 100%, 0.4);
    }
    .e-off {
      background: hsla(0, 0%, 100%, 0.2);
    }
  }

  .e-auto-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;

    .e-auto {
      border: 1px solid #b39ddb;
      border-radius: 6px;
      background: hsla(0, 0%, 100%, 0.55);
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

    /* 複数案（世界線）生成ボタン */
    .e-candidate-run {
      border: 1px solid #a5d6a7;
      border-radius: 6px;
      background: #e8f5e9;
      color: #2e7d32;
      font-size: 0.8em;
      font-weight: 600;
      padding: 4px 10px;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s;

      &:hover {
        background: #c8e6c9;
        border-color: #66bb6a;
      }
    }
  }

  .e-auto-message {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
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
