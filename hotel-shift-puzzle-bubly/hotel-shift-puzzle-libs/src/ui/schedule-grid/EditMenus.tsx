import { FC } from "react";
import { Menu, MenuItem, ListItemText } from "@mui/material";
import type {
  WorkShift,
  ScheduleAvailability,
  ShiftCell,
} from "../../domain/index.js";
import type { EditingCell, EditingRequired } from "./types.js";

type CellEditMenuProps = {
  editing: EditingCell | null;
  /** 選べる勤務帯 */
  shiftOptions: WorkShift[];
  /** あれば「そのスタッフが入れる勤務帯」に絞る */
  availability?: ScheduleAvailability;
  onClose: () => void;
  onApply: (to: ShiftCell) => void;
};

/** セルの勤務割当を選ぶメニュー（勤務帯 / 休み / 未定）。 */
export const CellEditMenu: FC<CellEditMenuProps> = ({
  editing,
  shiftOptions,
  availability,
  onClose,
  onApply,
}) => (
  <Menu anchorEl={editing?.anchor ?? null} open={!!editing} onClose={onClose}>
    {shiftOptions
      .filter(
        (shift) =>
          !availability || !editing || availability.isAllowed(editing.staffId, shift.id)
      )
      .map((shift) => (
        <MenuItem
          key={shift.id}
          onClick={() => onApply({ kind: "work", shiftId: shift.id })}
        >
          <ListItemText primary={shift.name} secondary={shift.startTimeLabel} />
        </MenuItem>
      ))}
    <MenuItem onClick={() => onApply({ kind: "day-off" })}>
      <ListItemText primary="休み" />
    </MenuItem>
    <MenuItem onClick={() => onApply({ kind: "undecided" })}>
      <ListItemText primary="未定（クリア）" />
    </MenuItem>
  </Menu>
);

type RequiredEditMenuProps = {
  editingRequired: EditingRequired | null;
  /** 選べる必要人数の最大値（スタッフ総数まで） */
  maxRequired: number;
  onClose: () => void;
  onApply: (count: number) => void;
};

/** 必要スタッフ数を選ぶメニュー（0〜スタッフ総数）。 */
export const RequiredEditMenu: FC<RequiredEditMenuProps> = ({
  editingRequired,
  maxRequired,
  onClose,
  onApply,
}) => (
  <Menu
    anchorEl={editingRequired?.anchor ?? null}
    open={!!editingRequired}
    onClose={onClose}
  >
    {editingRequired && (
      <div
        style={{
          padding: "4px 16px 6px",
          fontSize: "0.8em",
          color: "#888",
          borderBottom: "1px solid #eee",
        }}
      >
        {editingRequired.shiftName}・必要人数
        {editingRequired.day ? `（${editingRequired.day.label}）` : "（全稼働日）"}
      </div>
    )}
    {Array.from({ length: maxRequired + 1 }, (_, count) => (
      <MenuItem
        key={count}
        selected={count === editingRequired?.current}
        onClick={() => onApply(count)}
      >
        <ListItemText primary={count === 0 ? "0（設定なし）" : `${count} 名`} />
      </MenuItem>
    ))}
  </Menu>
);
