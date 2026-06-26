import { FC } from "react";
import { ObjectView } from "@bublys-org/bubbles-ui";
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
  /**
   * 違反バブルの URL を作る。違反マーカー（赤帯・⊿）を ObjectView で包んで渡し、
   * ダブルクリックで違反バブルを開く。ObjectView が data-url も埋めるので、
   * origin-side で開いたバブルがそのマーカーの近くに出る。
   */
  violationUrl?: (violation: ConstraintViolation) => string;
};

/**
 * 勤務表の 1 セル（スタッフ×日）の純粋表示。
 * 出勤＝開始時刻の「時」だけ（勤務帯は背景色で区別）、休み＝「休」、未定＝希望ヒント or「·」。
 * 違反は範囲（下端の赤帯）と単日（右上の ⊿）の 2 種に描き分ける。
 */
export const ScheduleDataCell: FC<ScheduleDataCellProps> = ({
  cell,
  shift,
  wishEntries,
  rangeViolation,
  pointViolation,
  onClick,
  violationUrl,
}) => {
  let className = "e-cell";
  let style: React.CSSProperties | undefined;
  let content: React.ReactNode;
  let title: string | undefined;

  if (cell.kind === "work") {
    const id = cell.shiftId;
    className += " e-work";
    style = { background: SHIFT_BG[id] ?? "#eee", color: SHIFT_FG[id] ?? "#333" };
    // 勤務帯は背景色で区別できるので、セルは開始時刻の「時」だけを大きく出す。
    // 勤務帯名・開始時刻はホバーで分かるよう title に入れる。
    content = <span className="e-shift-hour">{shift ? shift.startHour : id}</span>;
    if (shift) title = `${shift.name}（${shift.startTimeLabel}）`;
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

  // 違反マーカー（赤帯・⊿）。ObjectView がダブルクリックでの違反バブル展開と data-url
  // （origin-side でマーカーの近くに出す）を担う。単クリックはセル編集を開かないよう止める。
  const violationMarker = (violation: ConstraintViolation, markerClass: string) => {
    const marker = (
      <span
        className={markerClass}
        title={`${violation.message}（ダブルクリックで詳細）`}
        onClick={(e) => e.stopPropagation()}
      />
    );
    return violationUrl ? (
      <ObjectView url={violationUrl(violation)} openingPosition="origin-side" draggable={false}>
        {marker}
      </ObjectView>
    ) : (
      marker
    );
  };

  return (
    <div
      className={className}
      style={style}
      role="button"
      title={title}
      onClick={(e) => onClick(e.currentTarget)}
    >
      {content}
      {pointViolation && violationMarker(pointViolation, "e-wish-flag")}
      {rangeViolation && violationMarker(rangeViolation, "e-violation-bar")}
    </div>
  );
};
