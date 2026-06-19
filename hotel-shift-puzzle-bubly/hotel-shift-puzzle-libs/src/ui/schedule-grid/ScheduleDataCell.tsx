import { FC } from "react";
import type { WorkShift, ConstraintViolation, ShiftCell } from "../../domain/index.js";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";
import { wishText, type WishEntry } from "./wishSummary.js";

type ScheduleDataCellProps = {
  /** セルの状態（出勤・休み・未定） */
  cell: ShiftCell;
  /** 出勤のとき解決済みの勤務帯（未解決/休み/未定なら undefined） */
  shift?: WorkShift;
  /** 未割当セルに薄く出す希望ヒント */
  wishEntries: WishEntry[];
  /** 範囲違反（連勤など複数日）。下端の赤帯で表す */
  rangeViolation?: ConstraintViolation;
  /** 単日違反（希望の食い違いなど）。右上の ⊿ で表す */
  pointViolation?: ConstraintViolation;
  /** クリックでセル編集メニューを開く */
  onClick: (anchor: HTMLElement) => void;
  onOpenViolation?: (violation: ConstraintViolation) => void;
};

/**
 * 勤務表の 1 セル（スタッフ×日）の純粋表示。
 * 出勤＝勤務帯名＋開始時刻、休み＝「休」、未定＝希望ヒント or「·」。
 * 違反は範囲（下端の赤帯）と単日（右上の ⊿）の 2 種に描き分ける。
 */
export const ScheduleDataCell: FC<ScheduleDataCellProps> = ({
  cell,
  shift,
  wishEntries,
  rangeViolation,
  pointViolation,
  onClick,
  onOpenViolation,
}) => {
  let className = "e-cell";
  let style: React.CSSProperties | undefined;
  let content: React.ReactNode;

  if (cell.kind === "work") {
    const id = cell.shiftId;
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
    // 未割当: 希望があれば薄く表示（書き込むと隠れる）。無ければ "·"
    className += " e-undecided";
    content = wishEntries.length > 0 ? wishEntries.map(wishText).join(" ") : "·";
    if (wishEntries.length > 0) className += " has-wish-hint";
  }

  if (pointViolation || rangeViolation) className += " is-violation";

  return (
    <div
      className={className}
      style={style}
      role="button"
      onClick={(e) => onClick(e.currentTarget)}
    >
      {content}
      {pointViolation && (
        <span
          className="e-wish-flag"
          role="button"
          title={pointViolation.message}
          onClick={(e) => {
            e.stopPropagation(); // セル編集は開かず、違反バブルを開く
            onOpenViolation?.(pointViolation);
          }}
        />
      )}
      {rangeViolation && (
        <span
          className="e-violation-bar"
          role="button"
          title={rangeViolation.message}
          onClick={(e) => {
            e.stopPropagation();
            onOpenViolation?.(rangeViolation);
          }}
        />
      )}
    </div>
  );
};
