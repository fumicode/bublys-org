'use client';

import { FC, useState } from "react";
import {
  Staff,
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  ScheduleAvailability,
  ConstraintViolation,
  StaffMonthlyShiftWish,
  type ShiftCell,
} from "../domain/index.js";
import { STAFF_COL_WIDTH, DAY_COL_WIDTH, OFF_COL_WIDTH } from "./schedule-grid/constants.js";
import { StyledWrap } from "./schedule-grid/styles.js";
import { wishEntriesFor } from "./schedule-grid/wishSummary.js";
import { buildSummaryRows } from "./schedule-grid/summaryModel.js";
import { StaffScheduleRow } from "./schedule-grid/StaffScheduleRow.js";
import { SummaryRow } from "./schedule-grid/SummaryRow.js";
import { RequiredEditMenu } from "./schedule-grid/EditMenus.js";
import { ShiftSuggestionDropdown } from "./schedule-grid/ShiftSuggestionDropdown.js";
import { useCellKeyboardEditing } from "./schedule-grid/useCellKeyboardEditing.js";
import type { EditingRequired } from "./schedule-grid/types.js";

type ScheduleGridViewProps = {
  schedule: MonthlyStaffSchedule;
  staffList: Staff[];
  /** 勤務帯（独立集約）。勤務帯ID の解決に使う */
  workShifts: WorkShift[];
  /** 可能勤務帯。あればセル編集メニューを「そのスタッフが入れる勤務帯」に絞る */
  availability?: ScheduleAvailability;
  /** スタッフID → その月のシフト希望。各セル隅にマーカーで表示する */
  wishByStaff?: Map<string, StaffMonthlyShiftWish>;
  /** 制約違反の一覧。該当セルに赤線を引き、クリックで違反バブルを開く */
  violations?: ConstraintViolation[];
  /** セルの勤務割当を変更する */
  onChangeCell: (staffId: string, day: WorkingDay, to: ShiftCell) => void;
  /** 違反（赤線）をクリックしたとき */
  onOpenViolation?: (violation: ConstraintViolation) => void;
  /** 必要スタッフ数を変更する（その日・その勤務帯名） */
  onChangeRequired?: (day: WorkingDay, shiftName: string, count: number) => void;
  /** 必要スタッフ数を全稼働日にまとめて変更する（その勤務帯名） */
  onChangeRequiredAllDays?: (shiftName: string, count: number) => void;
};

/**
 * 勤務表グリッド（行=スタッフ / 列=日）のオーケストレーター。
 * 派生データの算出と描画に徹し、キーボード操作（選択・入力・候補）は
 * useCellKeyboardEditing に、見た目は schedule-grid/ 配下の子コンポーネントに委ねる。
 */
export const ScheduleGridView: FC<ScheduleGridViewProps> = ({
  schedule,
  staffList,
  workShifts,
  availability,
  wishByStaff,
  violations = [],
  onChangeCell,
  onOpenViolation,
  onChangeRequired,
  onChangeRequiredAllDays,
}) => {
  const days = schedule.workingDays();

  // 勤務帯ID → WorkShift の解決マップ（独立集約から渡される）
  const shiftMap = new Map(workShifts.map((w) => [w.id, w]));

  // この勤務表で選べる勤務帯（workShiftIds を解決したもの）
  const shiftOptions = schedule.workShiftIds
    .map((id) => shiftMap.get(id))
    .filter((w): w is WorkShift => !!w);

  // 各稼働日の勤務帯ID別人数 / 休み人数（集約のクエリ）→ 集計行を組み立てる。
  const countsByDay = days.map((day) => schedule.countWorkingByShift(day));
  const dayOffByDay = days.map((day) => schedule.countDayOffOn(day));
  const summaryRows = buildSummaryRows(schedule, days, shiftOptions, countsByDay, dayOffByDay);

  const getWishEntries = (staffId: string, day: WorkingDay) =>
    wishEntriesFor(wishByStaff, staffId, day);

  // キーボード操作（セル選択・矢印移動・打ち込みでの勤務帯確定）はフックに委譲
  const kb = useCellKeyboardEditing({
    staffList,
    days,
    shiftOptions,
    availability,
    onChangeCell,
  });

  // 希望と割当を並べて見るために展開中のスタッフID
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (staffId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });

  // ----- 必要人数の編集メニュー -----
  const [editingRequired, setEditingRequired] = useState<EditingRequired | null>(null);
  // 必要人数として選べる最大値（スタッフ総数まで）
  const maxRequired = Math.max(staffList.length, 1);
  const applyRequired = (count: number) => {
    if (editingRequired) {
      if (editingRequired.day) {
        onChangeRequired?.(editingRequired.day, editingRequired.shiftName, count);
      } else {
        onChangeRequiredAllDays?.(editingRequired.shiftName, count);
      }
    }
    setEditingRequired(null);
  };

  const gridTemplateColumns = `${STAFF_COL_WIDTH}px repeat(${days.length}, ${DAY_COL_WIDTH}px) ${OFF_COL_WIDTH}px`;

  return (
    <StyledWrap>
      <div
        className="e-grid"
        style={{ gridTemplateColumns }}
        ref={kb.gridRef}
        tabIndex={0}
        role="grid"
        onKeyDown={kb.handleKeyDown}
      >
        {/* ヘッダ行: 左上の角 + 日付ヘッダ + 右上の休合計ヘッダ */}
        <div className="e-corner">
          {schedule.year}年{schedule.month}月
        </div>
        {days.map((day) => {
          const wd = day.weekday; // 0=日 6=土
          return (
            <div
              key={day.key}
              className={`e-day-head${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}`}
            >
              <span className="e-day-num">{day.day}</span>
              <span className="e-day-wd">{["日", "月", "火", "水", "木", "金", "土"][wd]}</span>
            </div>
          );
        })}
        <div className="e-off-head">休</div>

        {/* スタッフ行 */}
        {staffList.map((staff) => (
          <StaffScheduleRow
            key={staff.id}
            staff={staff}
            days={days}
            schedule={schedule}
            shiftMap={shiftMap}
            violations={violations}
            getWishEntries={getWishEntries}
            expanded={expanded.has(staff.id)}
            selection={kb.selection}
            inputBuffer={kb.inputBuffer}
            onToggleExpand={toggleExpanded}
            onSelectCell={kb.selectCell}
            onOpenEditor={kb.openEditor}
            onOpenViolation={onOpenViolation}
          />
        ))}

        {/* 勤務帯ごと＋休みの人数集計（スタッフ行の後） */}
        {summaryRows.map((row, rowIndex) => (
          <SummaryRow
            key={`sum:${row.key}`}
            row={row}
            days={days}
            rowIndex={rowIndex}
            editable={!!row.required && !!(onChangeRequired || onChangeRequiredAllDays)}
            onEditRequired={setEditingRequired}
          />
        ))}
      </div>

      <RequiredEditMenu
        editingRequired={editingRequired}
        maxRequired={maxRequired}
        onClose={() => setEditingRequired(null)}
        onApply={applyRequired}
      />

      {/* 勤務割当を選ぶ統合ドロップダウン（キーボード入力の候補 / ダブルクリックの選択肢を一本化） */}
      <ShiftSuggestionDropdown
        open={kb.editing}
        anchorEl={kb.anchorEl}
        suggestions={kb.suggestions}
        activeIndex={kb.activeIndex}
        onPick={kb.applySuggestion}
      />
    </StyledWrap>
  );
};
