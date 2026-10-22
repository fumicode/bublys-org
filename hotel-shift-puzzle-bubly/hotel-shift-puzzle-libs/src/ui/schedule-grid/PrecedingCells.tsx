/**
 * 前月の末尾の列（月跨ぎのつなぎ）
 *
 * 勤務表の左端、スタッフ列と今月1日の間に、前月の確定版から写し取った末尾の日を
 * 灰色・読み取り専用で並べる。今月の行の順に、同じ staffId の前月セルを引くだけなので、
 * 前月と今月で行の並びや顔ぶれが違っても、その人の前月末がそのまま横につながる。
 *
 * grid の自動配置で並んでいるので、前月の列を持つ勤務表では**全ての行**がこの列ぶんの
 * セルを出す必要がある。人の行は {@link PrecedingStaffCells}、日付ヘッダは
 * {@link PrecedingHeadCells}、それ以外の行（集計・予約情報）は {@link PrecedingFiller} で跨ぐ。
 */
import type { FC } from "react";
import type {
  PrecedingMonthTail,
  WorkingDay,
  WorkShift,
} from "@bublys-org/hotel-shift-puzzle-model";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const weekdayCls = (day: WorkingDay): string =>
  day.weekday === 0 ? " is-sun" : day.weekday === 6 ? " is-sat" : "";

/** 前月の列の日付ヘッダ */
export const PrecedingHeadCells: FC<{ days: WorkingDay[] }> = ({ days }) => (
  <>
    {days.map((day, i) => (
      <div
        key={`prev-head:${day.key}`}
        className={`e-prev-head${weekdayCls(day)}${i === days.length - 1 ? " is-last" : ""}`}
        title={`前月 ${day.label}（確定版から写し取った読み取り専用の列）`}
      >
        {i === 0 && <span className="e-prev-month">{day.month}月</span>}
        <span className="e-day-num">{day.day}</span>
        <span className="e-day-wd">{WEEKDAYS[day.weekday]}</span>
      </div>
    ))}
  </>
);

/** その人の前月末尾のセル。勤務帯は今月の同名の勤務帯の色・開始時刻で描く */
export const PrecedingStaffCells: FC<{
  tail: PrecedingMonthTail;
  staffId: string;
  staffName: string;
  /** 今月の勤務帯（名前で引いて、色と開始時刻を借りる） */
  shiftMap: Map<string, WorkShift>;
  className?: string;
}> = ({ tail, staffId, staffName, shiftMap, className }) => {
  const shiftByName = new Map<string, WorkShift>();
  for (const w of shiftMap.values()) if (!shiftByName.has(w.name)) shiftByName.set(w.name, w);
  return (
    <>
      {tail.days.map((day, i) => {
        const cell = tail.cellOf(staffId, day);
        const last = i === tail.days.length - 1 ? " is-last" : "";
        const extra = className ? ` ${className}` : "";
        const base = `前月 ${day.label} ${staffName}`;
        if (cell?.shiftName !== undefined) {
          const shift = shiftByName.get(cell.shiftName);
          return (
            <div
              key={`prev:${staffId}:${day.key}`}
              className={`e-prev-cell e-work${last}${extra}`}
              style={
                shift
                  ? { background: SHIFT_BG[shift.id] ?? "#eee", color: SHIFT_FG[shift.id] ?? "#333" }
                  : undefined
              }
              title={`${base}: ${cell.shiftName}`}
            >
              {shift ? shift.startHour : cell.shiftName.slice(0, 1)}
            </div>
          );
        }
        if (cell) {
          return (
            <div
              key={`prev:${staffId}:${day.key}`}
              className={`e-prev-cell e-off${last}${extra}`}
              title={`${base}: 休み`}
            >
              休
            </div>
          );
        }
        return (
          <div
            key={`prev:${staffId}:${day.key}`}
            className={`e-prev-cell is-empty${last}${extra}`}
            title={`${base}: 記録なし（未定・前月に居なかった）`}
          />
        );
      })}
    </>
  );
};

/** 前月の列を跨ぐだけの見た目のないセル（集計行・予約情報行など、前月に中身が無い行用） */
export const PrecedingFiller: FC<{ count: number; className?: string }> = ({
  count,
  className,
}) =>
  count > 0 ? (
    <div
      className={`e-prev-filler${className ? ` ${className}` : ""}`}
      style={{ gridColumn: `span ${count}` }}
    />
  ) : null;
