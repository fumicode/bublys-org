'use client';

import { FC, ReactNode, useMemo, useState } from "react";
import styled from "styled-components";
import { UrledPlace } from "@bublys-org/bubbles-ui";
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
import {
  STAFF_TYPE,
  WORKSHIFT_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

type ScheduleGridProps = {
  scheduleId?: string;
  /** 世界線ビュー（左下）を開くハンドラ */
  onOpenHistory?: () => void;
  /** 可能勤務帯エディタ（左・スタッフ関連）を開くハンドラ */
  onOpenAvailability?: () => void;
  /** 自動シフトパネル（右上）を開くハンドラ */
  onOpenAutoShift?: () => void;
  /**
   * 各アクションバブルの URL（data-url アンカー用）。ボタンを UrledPlace で包むと、
   * そのボタンから link bubble が伸びる。openBubble する URL と一致させる。
   * URL スキームは app 層の関心事なので注入で受ける。
   */
  worldLineUrl?: string;
  availabilityUrl?: string;
  autoShiftUrl?: string;
  /**
   * 稼働日詳細バブルの URL を作る（稼働日キーを渡す）。URL スキームは app 層の関心事なので
   * バブルルート側から注入してもらう。グリッドはこれを ObjectView に渡すだけ。
   */
  dayBubbleUrl?: (dayKey: string) => string;
  /** 違反バブルの URL を作る（違反 key を渡す）。同上・app 層から注入。 */
  violationBubbleUrl?: (violationKey: string) => string;
  /** 抽出バブルを開くハンドラ。選択中スタッフID群を渡す */
  onOpenExtract?: (staffIds: string[]) => void;
  /** 抽出バブルの URL を作る（選択中スタッフID群）。抽出ボタンの data-url に使う */
  extractBubbleUrl?: (staffIds: string[]) => string;
};

/**
 * 勤務表グリッド。編集はシェル経由：update(s => s.setCell(...)) を呼ぶだけで、
 * その勤務表を監視している世界線すべて（アプリ全体＋ローカル）へ自動保存される。
 */
export const ScheduleGrid: FC<ScheduleGridProps> = ({
  scheduleId,
  onOpenHistory,
  onOpenAvailability,
  onOpenAutoShift,
  worldLineUrl,
  availabilityUrl,
  autoShiftUrl,
  dayBubbleUrl,
  violationBubbleUrl,
  onOpenExtract,
  extractBubbleUrl,
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

  // ----- 抽出のためのスタッフ選択状態 -----
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const toggleStaffSelected = (staffId: string) =>
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  // 選択中スタッフID（勤務表の並び順を保つ。URL/抽出の引数を安定させる）
  const selectedIds = useMemo(
    () => staffList.filter((s) => selectedStaffIds.has(s.id)).map((s) => s.id),
    [staffList, selectedStaffIds]
  );

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

  // 責任者ルール（早責/夜責）。部署フィルタに関わらず全スタッフから責任者を解決する
  // （会計を絞ると早責が常に✕になる、といった取りこぼしを防ぐ）。
  const leaderRules = useMemo(
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

  // アクションボタンを URL（data-url）で包む。url があると、その URL のバブルを開いたとき
  // link bubble がこのボタンから伸びる（openBubble する URL と一致している必要がある）。
  const withUrl = (url: string | undefined, node: ReactNode): ReactNode =>
    url ? <UrledPlace url={url}>{node}</UrledPlace> : node;

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          勤務表{" "}
          <span className="e-sub">
            {schedule.year}年{schedule.month}月 / {schedule.storeId}
          </span>
        </h3>

        {/* 左：スタッフ（左列）に関わる操作をまとめる */}
        <div className="e-actions e-actions-left">
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

          {onOpenAvailability &&
            withUrl(
              availabilityUrl,
              <button type="button" className="e-link" onClick={onOpenAvailability}>
                可能勤務帯
              </button>
            )}
        </div>

        {/* 右：自動シフトは独立バブル。ここはそれを開くボタンだけ */}
        <div className="e-actions e-actions-right">
          {onOpenAutoShift &&
            withUrl(
              autoShiftUrl,
              <button
                type="button"
                className="e-link e-auto-open"
                onClick={onOpenAutoShift}
                title="自動シフトのパネルを開く"
              >
                🪄 自動シフト
              </button>
            )}
        </div>
      </div>

      {/* スタッフを選択しているときだけ浮かぶ「抽出」バー（選択スタッフだけの勤務表を開く） */}
      {onOpenExtract && selectedIds.length > 0 && (
        <div className="e-extract-bar">
          {withUrl(
            extractBubbleUrl?.(selectedIds),
            <button
              type="button"
              className="e-link e-extract"
              onClick={() => onOpenExtract(selectedIds)}
              title="選択したスタッフだけの勤務表を開く"
            >
              抽出 ({selectedIds.length})
            </button>
          )}
          <button
            type="button"
            className="e-link e-extract-clear"
            onClick={() => setSelectedStaffIds(new Set())}
            title="選択を解除"
          >
            選択解除
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
        leaderRules={leaderRules}
        selectedStaffIds={selectedStaffIds}
        onToggleStaffSelected={onOpenExtract ? toggleStaffSelected : undefined}
        onChangeCell={handleChangeCell}
        onChangeRequired={handleChangeRequired}
        onChangeRequiredAllDays={handleChangeRequiredAllDays}
        dayBubbleUrl={dayBubbleUrl ? (day) => dayBubbleUrl(day.key) : undefined}
        violationUrl={
          violationBubbleUrl ? (v) => violationBubbleUrl(v.key) : undefined
        }
      />

      {/* 左下：世界線ビュー。ボタンから link bubble が伸びる（bubble-side で開く） */}
      {onOpenHistory && (
        <div className="e-footer">
          {withUrl(
            worldLineUrl,
            <button
              type="button"
              className="e-link e-worldline"
              onClick={onOpenHistory}
              title="この勤務表の世界線ビューを開く"
            >
              🌐 世界線ビュー
            </button>
          )}
        </div>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    display: flex;
    align-items: center;
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
    /* スタッフ関連の操作は左に、自動シフトは右に寄せる */
    .e-actions-right {
      margin-left: auto;
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
    /* 自動シフトを開くボタンは紫系で自動シフトらしさを出す */
    .e-auto-open {
      border-color: #b39ddb;
      color: #5e35b1;
      font-weight: 600;
      &:hover {
        background: #ede7f6;
        border-color: #9575cd;
      }
    }
  }

  /* 選択中だけ浮かぶ抽出バー（左寄せ） */
  .e-extract-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    padding: 4px 8px;
    background: #e8f5e9;
    border: 1px solid #a5d6a7;
    border-radius: 8px;
    width: fit-content;

    .e-extract {
      background: #43a047;
      border-color: #2e7d32;
      color: #fff;
      font-weight: 600;
      &:hover {
        background: #388e3c;
      }
    }
    .e-extract-clear {
      font-size: 0.78em;
      color: #555;
    }
  }

  /* 左下：世界線ビュー */
  .e-footer {
    margin-top: 8px;
    display: flex;
    align-items: center;
  }

  /* ヘッダ・フッタ共通のリンク風ボタン */
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
`;
