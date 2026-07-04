import { FC } from "react";
import { Menu, MenuItem, ListItemText } from "@mui/material";
import type { EditingRequired } from "./types.js";

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
