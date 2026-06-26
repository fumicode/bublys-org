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
import { HOTEL_SHIFT_LEADER_ROLES, resolveShiftLeaderRoles } from "./shiftLeaderRoles.js";
import { AUTO_SHIFT_STEPS, runAutoShiftStep, type AutoShiftStep } from "./autoShift.js";

/**
 * 自動シフトのツールバー項目。group を持たないステップは単独ボタン、
 * 同じ group のステップ群は「戦略を切り替えるトグル＋実行ボタン」の1組にまとめる。
 * AUTO_SHIFT_STEPS は定数なので一度だけ組み立てる。
 */
type AutoBarItem =
  | { kind: "single"; step: AutoShiftStep }
  | { kind: "group"; key: string; label: string; variants: AutoShiftStep[] };

const AUTO_BAR_ITEMS: AutoBarItem[] = (() => {
  const items: AutoBarItem[] = [];
  const seen = new Set<string>();
  for (const step of AUTO_SHIFT_STEPS) {
    if (!step.group) {
      items.push({ kind: "single", step });
      continue;
    }
    if (seen.has(step.group)) continue;
    seen.add(step.group);
    items.push({
      kind: "group",
      key: step.group,
      label: step.groupLabel ?? step.group,
      variants: AUTO_SHIFT_STEPS.filter((s) => s.group === step.group),
    });
  }
  return items;
})();
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
  /**
   * 稼働日詳細バブルの URL を作る（稼働日キーを渡す）。URL スキームは app 層の関心事なので
   * バブルルート側から注入してもらう。グリッドはこれを ObjectView に渡すだけ。
   */
  dayBubbleUrl?: (dayKey: string) => string;
  /** 違反バブルの URL を作る（違反 key を渡す）。同上・app 層から注入。 */
  violationBubbleUrl?: (violationKey: string) => string;
};

/**
 * 勤務表グリッド。編集はシェル経由：update(s => s.setCell(...)) を呼ぶだけで、
 * その勤務表を監視している世界線すべて（アプリ全体＋ローカル）へ自動保存される。
 */
export const ScheduleGrid: FC<ScheduleGridProps> = ({
  scheduleId,
  onOpenHistory,
  onOpenAvailability,
  dayBubbleUrl,
  violationBubbleUrl,
}) => {
  useSeedHotelData();
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  // グループ（同目的の別戦略）ごとに、選択中の戦略キーを保持する
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
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

  // 責任者ロール（昼責/夜責）。部署フィルタに関わらず全スタッフから責任者を解決する
  // （会計を絞ると昼責が常に✕になる、といった取りこぼしを防ぐ）。
  const leaderRoles = useMemo(
    () => resolveShiftLeaderRoles(HOTEL_SHIFT_LEADER_ROLES, staffList),
    [staffList]
  );

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

  // 段階的な自動シフト：選んだステップ（コマンド）を1つ実行する。
  // 人間入力済みのセルは上書きしない／休み希望の人は勤務させない（各ステップ共通の原則）。
  const handleRunStep = (step: AutoShiftStep) => {
    const result = runAutoShiftStep(step, {
      schedule,
      staffList,
      workShifts,
      wishByStaff,
      availability,
    });
    update(() => result.schedule);
    setAutoMessage(`${step.label}: ${result.message}`);
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
      <div className="e-auto-bar">
        <span className="e-auto-label">🪄 自動シフト</span>
        {AUTO_BAR_ITEMS.map((item, i) => {
          const num = <span className="e-auto-num">{i + 1}</span>;
          if (item.kind === "single") {
            return (
              <button
                key={item.step.key}
                type="button"
                className="e-link e-auto"
                title={item.step.description}
                onClick={() => handleRunStep(item.step)}
              >
                {num}
                {item.step.label}
              </button>
            );
          }
          // group: 戦略トグル ＋ 実行ボタン（切り替えて使う代替アルゴリズム）
          const selectedKey = selectedVariant[item.key] ?? item.variants[0].key;
          const selectedStep =
            item.variants.find((v) => v.key === selectedKey) ?? item.variants[0];
          return (
            <div key={item.key} className="e-auto-group">
              {num}
              <span className="e-auto-glabel">{item.label}</span>
              <div className="e-seg" role="group" aria-label={`${item.label}の方式`}>
                {item.variants.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className={"e-seg-btn" + (v.key === selectedKey ? " is-on" : "")}
                    title={v.description}
                    onClick={() =>
                      setSelectedVariant((prev) => ({ ...prev, [item.key]: v.key }))
                    }
                  >
                    {v.variantLabel ?? v.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="e-link e-auto e-run"
                title={selectedStep.description}
                onClick={() => handleRunStep(selectedStep)}
              >
                実行
              </button>
            </div>
          );
        })}
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
        staffList={filteredStaffList}
        workShifts={workShifts}
        availability={availability}
        wishByStaff={wishByStaff}
        violations={violations}
        groupByDepartment={groupByDept}
        leaderRoles={leaderRoles}
        onChangeCell={handleChangeCell}
        onChangeRequired={handleChangeRequired}
        onChangeRequiredAllDays={handleChangeRequiredAllDays}
        dayBubbleUrl={dayBubbleUrl ? (day) => dayBubbleUrl(day.key) : undefined}
        violationUrl={
          violationBubbleUrl ? (v) => violationBubbleUrl(v.key) : undefined
        }
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

  .e-auto-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;

    .e-auto-label {
      font-size: 0.8em;
      font-weight: 600;
      color: #5e35b1;
      margin-right: 2px;
    }
    .e-auto {
      display: inline-flex;
      align-items: center;
      gap: 6px;
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
    .e-auto-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ede7f6;
      color: #5e35b1;
      font-size: 0.85em;
      line-height: 1;
    }

    /* group: 戦略トグル ＋ 実行ボタン */
    .e-auto-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #d1c4e9;
      border-radius: 8px;
      background: #faf7ff;
      padding: 3px 6px;

      .e-auto-glabel {
        font-size: 0.8em;
        font-weight: 600;
        color: #5e35b1;
      }
      .e-auto-num {
        background: #fff;
      }
    }
    /* セグメント（戦略の切り替え）。選択中を塗りで示す */
    .e-seg {
      display: inline-flex;
      border: 1px solid #b39ddb;
      border-radius: 6px;
      overflow: hidden;

      .e-seg-btn {
        border: none;
        border-left: 1px solid #d1c4e9;
        background: #fff;
        color: #6a4bb0;
        font-size: 0.78em;
        padding: 4px 10px;
        cursor: pointer;
        transition: background 0.1s, color 0.1s;

        &:first-child {
          border-left: none;
        }
        &:hover {
          background: #ede7f6;
        }
        &.is-on {
          background: #7e57c2;
          color: #fff;
          font-weight: 600;
        }
      }
    }
    .e-run {
      background: #ede7f6;
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
