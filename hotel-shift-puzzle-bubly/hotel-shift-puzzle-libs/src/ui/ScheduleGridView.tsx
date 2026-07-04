'use client';

import { FC, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Popper, Paper, MenuList, MenuItem, ListItemText } from "@mui/material";
import {
  Staff,
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  ScheduleAvailability,
  ConstraintViolation,
  StaffMonthlyShiftWish,
  suggestShiftInputs,
  type ShiftCell,
  type ShiftSuggestion,
} from "../domain/index.js";
import { STAFF_COL_WIDTH, DAY_COL_WIDTH, OFF_COL_WIDTH } from "./schedule-grid/constants.js";
import { StyledWrap } from "./schedule-grid/styles.js";
import { wishEntriesFor } from "./schedule-grid/wishSummary.js";
import { buildSummaryRows } from "./schedule-grid/summaryModel.js";
import { StaffScheduleRow } from "./schedule-grid/StaffScheduleRow.js";
import { SummaryRow } from "./schedule-grid/SummaryRow.js";
import { RequiredEditMenu } from "./schedule-grid/EditMenus.js";
import type { CellSelection, EditingRequired } from "./schedule-grid/types.js";

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
 * 派生データの算出と編集状態の保持に徹し、見た目は schedule-grid/ 配下の
 * 子コンポーネント（行・セル・集計行・メニュー）に委ねる。
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

  // ----- 編集状態 -----
  const [editingRequired, setEditingRequired] = useState<EditingRequired | null>(null);

  // 希望と割当を並べて見るために展開中のスタッフID
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (staffId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });

  // ----- キーボード操作（セル選択 + 打ち込みで勤務帯を確定）-----
  const gridRef = useRef<HTMLDivElement>(null);
  // フォーカス中のセル（1 セル分。いずれ範囲選択へ広げる想定）
  const [selection, setSelection] = useState<CellSelection | null>(null);
  // 選択セルで打ち込み中のバッファ。null は非入力（＝ドロップダウンを閉じている）、
  // "" 以上は入力中（＝ドロップダウンを開いている。"" は全候補を表示）
  const [inputBuffer, setInputBuffer] = useState<string | null>(null);
  // ドロップダウン内でハイライト中の候補インデックス（矢印キーで移動）
  const [activeIndex, setActiveIndex] = useState(0);

  // 選択中スタッフが入れる勤務帯だけに絞る（可能勤務帯があれば。旧メニューと同じ絞り込み）
  const selectableShiftOptions =
    availability && selection
      ? shiftOptions.filter((w) => availability.isAllowed(selection.staffId, w.id))
      : shiftOptions;

  // 打ち込み中の入力候補（前方一致）。バッファが null（非入力）なら候補は出さない
  const suggestions: ShiftSuggestion[] =
    inputBuffer !== null ? suggestShiftInputs(inputBuffer, selectableShiftOptions) : [];
  // 候補が減ったときに範囲外を指さないようクランプした実効インデックス
  const activeClamped = Math.min(activeIndex, Math.max(suggestions.length - 1, 0));

  // 候補ドロップダウンのアンカー要素。選択セルの DOM を data 属性から引く
  // （クリック選択・矢印移動どちらでも同じ経路で取れる）
  const selectionKey = selection ? `${selection.staffId}:${selection.day.key}` : null;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!selectionKey || !gridRef.current) {
      setAnchorEl(null);
      return;
    }
    setAnchorEl(
      gridRef.current.querySelector<HTMLElement>(`[data-cell-key="${selectionKey}"]`)
    );
  }, [selectionKey]);

  // セルを選択し、キー入力を受け取れるようグリッドへフォーカスを移す（ドロップダウンは閉じる）
  const selectCell = (staffId: string, day: WorkingDay) => {
    setSelection({ staffId, day });
    setInputBuffer(null);
    gridRef.current?.focus();
  };

  // セルを選択して候補ドロップダウンを開く（ダブルクリック / Enter で全候補表示）
  const openEditor = (staffId: string, day: WorkingDay) => {
    setSelection({ staffId, day });
    setInputBuffer("");
    setActiveIndex(0);
    gridRef.current?.focus();
  };

  // 候補を割当に変換する
  const suggestionToCell = (s: ShiftSuggestion): ShiftCell => {
    if (s.kind === "work") return { kind: "work", shiftId: s.shift.id };
    if (s.kind === "day-off") return { kind: "day-off" };
    return { kind: "undecided" };
  };

  // 候補を適用（クリック / Enter）。適用後はドロップダウンを閉じグリッドへフォーカスを戻す
  const applySuggestion = (s: ShiftSuggestion) => {
    if (selection) onChangeCell(selection.staffId, selection.day, suggestionToCell(s));
    setInputBuffer(null);
    gridRef.current?.focus();
  };

  // 選択を dStaff 行・dDay 列ぶん動かす（端でクランプ）。入力中バッファは破棄
  const moveSelection = (dStaff: number, dDay: number) => {
    setInputBuffer(null);
    setSelection((prev) => {
      if (staffList.length === 0 || days.length === 0) return prev;
      if (!prev) return { staffId: staffList[0].id, day: days[0] };
      const si = staffList.findIndex((s) => s.id === prev.staffId);
      const di = days.findIndex((d) => d.key === prev.day.key);
      if (si < 0 || di < 0) return { staffId: staffList[0].id, day: days[0] };
      const ns = Math.min(Math.max(si + dStaff, 0), staffList.length - 1);
      const nd = Math.min(Math.max(di + dDay, 0), days.length - 1);
      return { staffId: staffList[ns].id, day: days[nd] };
    });
  };

  const editing = inputBuffer !== null;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // 修飾キー付きはブラウザ/OS のショートカットに委ねる
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // ----- ドロップダウンを開いている間: 矢印は候補移動、Enter で確定 -----
    if (editing && selection) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) =>
            suggestions.length === 0 ? 0 : Math.min(i + 1, suggestions.length - 1)
          );
          return;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          return;
        case "ArrowLeft":
          // 横移動はドロップダウンを閉じて隣のセルへ（表計算的に編集を抜ける）
          e.preventDefault();
          moveSelection(0, -1);
          return;
        case "ArrowRight":
          e.preventDefault();
          moveSelection(0, 1);
          return;
        case "Enter":
          e.preventDefault();
          if (suggestions.length > 0) applySuggestion(suggestions[activeClamped]);
          else setInputBuffer(null);
          return;
        case "Escape":
          e.preventDefault();
          setInputBuffer(null); // 打ち込みを取り消してドロップダウンを閉じる（選択は残す）
          return;
        case "Backspace":
          e.preventDefault();
          if (inputBuffer && inputBuffer.length > 0) {
            setInputBuffer(inputBuffer.slice(0, -1));
            setActiveIndex(0);
          } else {
            // 空の状態でさらに消したらセルを未定（クリア）にして閉じる
            onChangeCell(selection.staffId, selection.day, { kind: "undecided" });
            setInputBuffer(null);
          }
          return;
        default:
          if (e.key.length === 1 && /^[0-9a-zA-Z]$/.test(e.key)) {
            e.preventDefault();
            setInputBuffer((prev) => (prev ?? "") + e.key);
            setActiveIndex(0);
          }
          return;
      }
    }

    // ----- ドロップダウンを閉じている間: 矢印はセル移動 -----
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        moveSelection(-1, 0);
        return;
      case "ArrowDown":
        e.preventDefault();
        moveSelection(1, 0);
        return;
      case "ArrowLeft":
        e.preventDefault();
        moveSelection(0, -1);
        return;
      case "ArrowRight":
        e.preventDefault();
        moveSelection(0, 1);
        return;
    }

    if (!selection) return;

    switch (e.key) {
      case "Enter":
        // 選択セルでドロップダウンを開く（全候補を表示）
        e.preventDefault();
        openEditor(selection.staffId, selection.day);
        return;
      case "Backspace":
        // 打ち込まずにセルを未定（クリア）に戻す
        e.preventDefault();
        onChangeCell(selection.staffId, selection.day, { kind: "undecided" });
        return;
      case "Escape":
        e.preventDefault();
        setSelection(null);
        return;
      default:
        // 英数字を打ち始めたらドロップダウンを開き、その文字をバッファに入れる
        if (e.key.length === 1 && /^[0-9a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          setInputBuffer(e.key);
          setActiveIndex(0);
        }
    }
  };

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
        ref={gridRef}
        tabIndex={0}
        role="grid"
        onKeyDown={handleKeyDown}
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
            selection={selection}
            inputBuffer={inputBuffer}
            onToggleExpand={toggleExpanded}
            onSelectCell={selectCell}
            onOpenEditor={openEditor}
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

      {/* 勤務割当を選ぶ統合ドロップダウン（キーボード入力の候補 / ダブルクリックの選択肢を一本化）。
          矢印↑↓でハイライト移動、Enter・クリックで確定。空バッファ時は全候補（勤務帯＋休み＋未定）。
          グリッドのフォーカスを奪わないよう Popper を使う。 */}
      <Popper
        open={!!anchorEl && editing && suggestions.length > 0}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <Paper elevation={4} sx={{ mt: 0.5, minWidth: 120, maxHeight: 240, overflowY: "auto" }}>
          <MenuList dense disablePadding>
            {suggestions.map((s, i) => (
              <MenuItem
                key={s.kind === "work" ? s.shift.id : s.kind}
                selected={i === activeClamped}
                // クリックでグリッドの blur → 確定前に消えるのを防ぎ、確実に適用する
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySuggestion(s)}
              >
                {s.kind === "work" ? (
                  <ListItemText primary={s.shift.name} secondary={s.shift.startTimeLabel} />
                ) : s.kind === "day-off" ? (
                  <ListItemText primary="休み" />
                ) : (
                  <ListItemText primary="未定（クリア）" />
                )}
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </Popper>
    </StyledWrap>
  );
};
