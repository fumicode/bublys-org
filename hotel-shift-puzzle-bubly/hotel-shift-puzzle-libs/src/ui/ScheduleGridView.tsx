'use client';

import { FC, Fragment, useState } from "react";
import styled from "styled-components";
import PersonIcon from "@mui/icons-material/Person";
import { Menu, MenuItem, ListItemText } from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";
import {
  Staff,
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  ScheduleAvailability,
  ConstraintViolation,
  type ShiftCell,
} from "../domain/index.js";

type ScheduleGridViewProps = {
  schedule: MonthlyStaffSchedule;
  staffList: Staff[];
  /** 勤務帯（独立集約）。勤務帯ID の解決に使う */
  workShifts: WorkShift[];
  /** 可能勤務帯。あればセル編集メニューを「そのスタッフが入れる勤務帯」に絞る */
  availability?: ScheduleAvailability;
  /** 制約違反の一覧。該当セルに赤線を引き、クリックで違反バブルを開く */
  violations?: ConstraintViolation[];
  /** セルの勤務割当を変更する */
  onChangeCell: (staffId: string, day: WorkingDay, to: ShiftCell) => void;
  /** 違反（赤線）をクリックしたとき */
  onOpenViolation?: (violation: ConstraintViolation) => void;
};

// 勤務帯ごとの色（背景・文字）
const SHIFT_BG: Record<string, string> = {
  early: "#e3f2fd",
  middle: "#fff8e1",
  late: "#f3e5f5",
};
const SHIFT_FG: Record<string, string> = {
  early: "#1565c0",
  middle: "#ef6c00",
  late: "#6a1b9a",
};

const STAFF_COL_WIDTH = 132;
const DAY_COL_WIDTH = 60;

type EditingCell = {
  anchor: HTMLElement;
  staffId: string;
  day: WorkingDay;
};

export const ScheduleGridView: FC<ScheduleGridViewProps> = ({
  schedule,
  staffList,
  workShifts,
  availability,
  violations = [],
  onChangeCell,
  onOpenViolation,
}) => {
  const days = schedule.workingDays();

  // そのセルを含む違反（最初の1件）を返す
  const violationAt = (staffId: string, day: WorkingDay): ConstraintViolation | undefined =>
    violations.find((v) => v.coversCell(staffId, day));

  // 勤務帯ID → WorkShift の解決マップ（独立集約から渡される）
  const shiftMap = new Map(workShifts.map((w) => [w.id, w]));

  // この勤務表で選べる勤務帯（workShiftIds を解決したもの）
  const shiftOptions = schedule.workShiftIds
    .map((id) => shiftMap.get(id))
    .filter((w): w is WorkShift => !!w);

  // 集計用：勤務帯を「名前」で束ねる（名前が同じなら同一勤務帯とみなす）。
  // 出現順を保ちつつ、同名の勤務帯ID をまとめる。色は代表（先頭）勤務帯ID から引く。
  const shiftGroups: { name: string; shiftIds: string[] }[] = [];
  const groupIndexByName = new Map<string, number>();
  for (const w of shiftOptions) {
    let idx = groupIndexByName.get(w.name);
    if (idx === undefined) {
      idx = shiftGroups.length;
      groupIndexByName.set(w.name, idx);
      shiftGroups.push({ name: w.name, shiftIds: [] });
    }
    shiftGroups[idx].shiftIds.push(w.id);
  }

  // 各稼働日の勤務帯ID別人数 / 休み人数（集約のクエリ）。
  const countsByDay = days.map((day) => schedule.countWorkingByShift(day));
  const dayOffByDay = days.map((day) => schedule.countDayOffOn(day));

  // 集計行（勤務帯ごと＋休み）。勤務帯はセルと同じ色で色分けする。
  // 勤務帯行は必要スタッフ数（分母）を持ち、達成度を背景バーで表す。
  type SummaryRow = {
    key: string;
    label: string;
    bg: string;
    fg: string;
    count: (dayIndex: number) => number;
    /** 必要人数（分母）。休みなど必要数の概念が無い行は undefined */
    required?: (dayIndex: number) => number;
  };
  const summaryRows: SummaryRow[] = [
    ...shiftGroups.map((g) => {
      const colorId = g.shiftIds[0];
      return {
        key: `shift:${g.name}`,
        label: g.name,
        bg: SHIFT_BG[colorId] ?? "#eceff1",
        fg: SHIFT_FG[colorId] ?? "#455a64",
        count: (i: number) =>
          g.shiftIds.reduce((sum, id) => sum + (countsByDay[i].get(id) ?? 0), 0),
        required: (i: number) => schedule.requiredFor(days[i], g.name),
      };
    }),
    {
      key: "day-off",
      label: "休み",
      bg: "#f5f5f5",
      fg: "#9e9e9e",
      count: (i: number) => dayOffByDay[i],
    },
  ];

  const [editing, setEditing] = useState<EditingCell | null>(null);

  const applyChange = (to: ShiftCell) => {
    if (editing) onChangeCell(editing.staffId, editing.day, to);
    setEditing(null);
  };

  const gridTemplateColumns = `${STAFF_COL_WIDTH}px repeat(${days.length}, ${DAY_COL_WIDTH}px)`;

  const renderCell = (staff: Staff, day: WorkingDay) => {
    const cell = schedule.statusOf(staff.id, day);
    let className = "e-cell";
    let style: React.CSSProperties | undefined;
    let content: React.ReactNode;

    if (cell.kind === "work") {
      const id = cell.shiftId;
      const shift = shiftMap.get(id);
      className += " e-work";
      style = { background: SHIFT_BG[id] ?? "#eee", color: SHIFT_FG[id] ?? "#333" };
      content = (
        <>
          <span className="e-shift-name">{shift?.name ?? id}</span>
          {shift && <span className="e-shift-time">{shift.startTimeLabel}</span>}
        </>
      );
    } else if (cell.kind === "day-off") {
      className += " e-off";
      content = "休";
    } else {
      className += " e-undecided";
      content = "·";
    }

    const violation = violationAt(staff.id, day);
    if (violation) className += " is-violation";

    return (
      <div
        className={className}
        style={style}
        role="button"
        onClick={(e) => setEditing({ anchor: e.currentTarget, staffId: staff.id, day })}
      >
        {content}
        {violation && (
          <span
            className="e-violation-bar"
            role="button"
            title={violation.message}
            onClick={(e) => {
              e.stopPropagation(); // セル編集メニューは開かず、違反バブルを開く
              onOpenViolation?.(violation);
            }}
          />
        )}
      </div>
    );
  };

  return (
    <StyledWrap>
      <div className="e-grid" style={{ gridTemplateColumns }}>
        {/* 左上の角 */}
        <div className="e-corner">
          {schedule.year}年{schedule.month}月
        </div>

        {/* 日付ヘッダ（列） */}
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

        {/* スタッフ行 */}
        {staffList.map((staff) => (
          <Fragment key={staff.id}>
            {/* スタッフ名（行ヘッダ）: ObjectView でダブルクリック展開 / ドラッグ */}
            <div className="e-staff-cell">
              <ObjectView
                object={staff}
                label={staff.name}
                draggable={true}
                openingPosition="origin-side"
                fullWidth={true}
              >
                <div className="e-staff">
                  <PersonIcon fontSize="small" className="e-staff-icon" />
                  <span className="e-staff-name">{staff.name}</span>
                </div>
              </ObjectView>
            </div>

            {/* 各稼働日のセル */}
            {days.map((day) => (
              <Fragment key={`${staff.id}:${day.key}`}>{renderCell(staff, day)}</Fragment>
            ))}
          </Fragment>
        ))}

        {/* 勤務帯ごと＋休みの人数集計（スタッフ行の後）。名前が同じ勤務帯は合算し、
            セルと同じ色で色分けする */}
        {summaryRows.map((row, rowIndex) => (
          <Fragment key={`sum:${row.key}`}>
            <div
              className={`e-sum-head${rowIndex === 0 ? " is-first" : ""}`}
              style={{ background: row.bg, color: row.fg }}
            >
              {row.label}
            </div>
            {days.map((day, i) => {
              const n = row.count(i);
              const req = row.required?.(i) ?? 0;

              // 必要数あり: 「現在/必要」を分母付きで表示。色は勤務帯ではなく
              // 「満たされているか」で決める（達成=緑 / 不足=赤）。
              // 背景バーは充足率ぶんを下から上に伸ばす。
              if (req > 0) {
                const pct = Math.min(100, Math.round((n / req) * 100));
                const met = n >= req;
                const fill = met ? "#c8e6c9" : "#ffcdd2"; // 達成=緑 / 不足=赤
                const track = "#f7f7f7"; // 未充足ぶん（上側）
                return (
                  <div
                    key={`sum:${row.key}:${day.key}`}
                    className={`e-sum-cell is-ratio${rowIndex === 0 ? " is-first" : ""}${
                      met ? " is-met" : " is-under"
                    }`}
                    style={{
                      background: `linear-gradient(to top, ${fill} ${pct}%, ${track} ${pct}%)`,
                    }}
                    title={`${row.label}: ${n}/${req}名（${met ? "達成" : "不足"}）`}
                  >
                    <span className="e-cur">{n}</span>
                    <span className="e-den">/{req}</span>
                  </div>
                );
              }

              // 必要数なし（休み等）: 人数のみ（時間帯色は付けない）
              return (
                <div
                  key={`sum:${row.key}:${day.key}`}
                  className={`e-sum-cell${rowIndex === 0 ? " is-first" : ""}${
                    n === 0 ? " is-zero" : ""
                  }`}
                >
                  {n}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* セル編集メニュー（可能勤務帯があれば、そのスタッフが入れる勤務帯に絞る） */}
      <Menu
        anchorEl={editing?.anchor ?? null}
        open={!!editing}
        onClose={() => setEditing(null)}
      >
        {shiftOptions
          .filter(
            (shift) =>
              !availability ||
              !editing ||
              availability.isAllowed(editing.staffId, shift.id)
          )
          .map((shift) => (
            <MenuItem
              key={shift.id}
              onClick={() => applyChange({ kind: "work", shiftId: shift.id })}
            >
              <ListItemText primary={shift.name} secondary={shift.startTimeLabel} />
            </MenuItem>
          ))}
        <MenuItem onClick={() => applyChange({ kind: "day-off" })}>
          <ListItemText primary="休み" />
        </MenuItem>
        <MenuItem onClick={() => applyChange({ kind: "undecided" })}>
          <ListItemText primary="未定（クリア）" />
        </MenuItem>
      </Menu>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  .e-grid {
    display: grid;
    max-height: 70vh;
    max-width: 100%;
    overflow: auto;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    font-size: 0.8em;
  }

  /* 共通セル */
  .e-corner,
  .e-day-head,
  .e-staff-cell,
  .e-cell,
  .e-sum-head,
  .e-sum-cell {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
  }

  /* 勤務帯ごと＋休みの人数集計行（背景・文字色は行ごとにインラインで色分け） */
  .e-sum-head {
    position: sticky;
    left: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-weight: bold;
  }
  .e-sum-cell {
    display: flex;
    align-items: baseline;
    justify-content: center;
    min-height: 28px;
    font-weight: bold;
    font-variant-numeric: tabular-nums;

    &.is-zero {
      background: #fafafa;
      color: #cfd5d8;
      font-weight: normal;
    }

    /* 現在/必要 の分母表示 */
    .e-cur {
      font-size: 1em;
    }
    .e-den {
      font-size: 0.75em;
      opacity: 0.7;
    }
    /* 達成/不足を文字色でも表す（勤務帯色は使わない） */
    &.is-met {
      color: #2e7d32;
    }
    &.is-under {
      color: #c62828;
    }
  }

  /* 集計ブロックの先頭行だけ、スタッフ行との区切り罫線を引く */
  .e-sum-head.is-first,
  .e-sum-cell.is-first {
    border-top: 2px solid #b0bec5;
  }

  /* 左上の角（縦横どちらにも固定） */
  .e-corner {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 3;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #555;
    padding: 4px;
  }

  /* 日付ヘッダ（上に固定） */
  .e-day-head {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 0;

    .e-day-num {
      font-weight: bold;
    }
    .e-day-wd {
      font-size: 0.8em;
      color: #888;
    }

    &.is-sun .e-day-num,
    &.is-sun .e-day-wd {
      color: #d32f2f;
    }
    &.is-sat .e-day-num,
    &.is-sat .e-day-wd {
      color: #1976d2;
    }
  }

  /* スタッフ名（左に固定） */
  .e-staff-cell {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #fff;

    .e-staff {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      width: 100%;
      box-sizing: border-box;
    }
    .e-staff-icon {
      color: #888;
      flex-shrink: 0;
    }
    .e-staff-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: bold;
    }
  }

  /* データセル */
  .e-cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px;
    min-height: 36px;
    cursor: pointer;
    transition: box-shadow 0.1s;

    &:hover {
      box-shadow: inset 0 0 0 2px #90caf9;
    }
  }

  /* 制約違反セル: 下端に連続した赤線を引く（連勤の塊が1本の線に見える） */
  .e-violation-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    background: #e53935;
    cursor: pointer;
    z-index: 1;
    transition: height 0.1s;

    &:hover {
      height: 7px;
    }
  }
  .e-work {
    .e-shift-name {
      font-weight: bold;
    }
    .e-shift-time {
      font-size: 0.78em;
      opacity: 0.8;
    }
  }
  .e-off {
    background: #f5f5f5;
    color: #9e9e9e;
    font-weight: bold;
  }
  .e-undecided {
    color: #d0d0d0;
  }
`;
